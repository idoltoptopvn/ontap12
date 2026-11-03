import React, { useEffect, useState } from 'react';
import { adminFetch } from '../../services/api';
import { Shield, UserPlus, KeyRound, Check, Lock, UserCheck } from 'lucide-react';

interface AdminAccountsProps {
  currentAdmin: any;
}

export const AdminAccounts: React.FC<AdminAccountsProps> = ({ currentAdmin }) => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Admin Form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'moderator'>('admin');
  const [isCreating, setIsCreating] = useState(false);

  // Change Password Form
  const [oldPassword, setOldPassword] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await adminFetch('/admin/admins');
      setAdmins(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      await adminFetch('/admin/admins/create', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          name: newName,
          role: newRole,
        }),
      });
      alert('Tạo tài khoản quản trị viên mới thành công!');
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || 'Tạo quản trị viên thất bại');
    } finally {
      setIsCreating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    try {
      await adminFetch('/admin/admins/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: oldPassword,
          newPassword: newPwd,
        }),
      });
      setPwdMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setOldPassword('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message || 'Đổi mật khẩu thất bại' });
    }
  };

  const isSuperAdmin = currentAdmin?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Quản Lý Tài Khoản Quản Trị (Admin Accounts)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Phân quyền Super Admin, Admin, Moderator và quản lý mật khẩu bảo mật
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin List */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>Danh Sách Quản Trị Viên</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
              {admins.length} Tài khoản
            </span>
          </div>

          <div className="space-y-3">
            {admins.map((a) => (
              <div
                key={a.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 text-sm">{a.name}</strong>
                    <span className="font-mono text-slate-500">(@{a.username})</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Đăng nhập gần nhất: {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider border ${
                    a.role === 'super_admin'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : a.role === 'admin'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {a.role === 'super_admin' ? 'Super Admin' : a.role === 'admin' ? 'Admin' : 'Moderator'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-3">
            <Lock className="w-5 h-5 text-indigo-600" />
            <span>Đổi Mật Khẩu Quản Trị Của Bạn</span>
          </div>

          {pwdMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                pwdMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {pwdMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mật khẩu hiện tại:</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mật khẩu mới (ít nhất 6 ký tự):</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Xác nhận mật khẩu mới:</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-sm"
            >
              Cập Nhật Mật Khẩu
            </button>
          </form>
        </div>
      </div>

      {/* Create New Admin (Super Admin only) */}
      {isSuperAdmin && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-3">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            <span>Thêm Quản Trị Viên Phụ (Chỉ Super Admin)</span>
          </div>

          <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Họ tên hiển thị:</label>
              <input
                type="text"
                placeholder="Ví dụ: Giám thị Nguyễn Văn B"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Tên đăng nhập:</label>
              <input
                type="text"
                placeholder="admin_phu"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mật khẩu:</label>
              <input
                type="password"
                placeholder="Mật khẩu"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phân quyền:</label>
              <div className="flex gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                >
                  <option value="admin">Admin (Key, Quiz, User)</option>
                  <option value="moderator">Moderator (Chỉ xem)</option>
                </select>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer whitespace-nowrap"
                >
                  Thêm
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
