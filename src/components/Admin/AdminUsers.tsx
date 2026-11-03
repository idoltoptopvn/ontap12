import React, { useEffect, useState } from 'react';
import { adminFetch } from '../../services/api';
import {
  Users,
  Search,
  Lock,
  Unlock,
  Smartphone,
  Trash2,
  AlertTriangle,
  Award,
  KeyRound,
  Clock,
  CheckCircle,
} from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const url = `/admin/users?status=${statusFilter}&search=${encodeURIComponent(search)}`;
      const res = await adminFetch(url);
      setUsers(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter]);

  const handleUserAction = async (userId: string, action: string) => {
    if (action === 'delete' && !window.confirm('Bạn có chắc chắn muốn xóa người chơi này?')) {
      return;
    }

    try {
      await adminFetch(`/admin/users/${userId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Thao tác thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Quản Lý Người Chơi (Thí Sinh)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi danh sách thí sinh, thiết bị liên kết, điểm số cao nhất và trạng thái tài khoản
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-medium">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'active', label: 'Đang hoạt động' },
            { id: 'locked', label: 'Bị khóa' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchUsers();
          }}
          className="flex items-center gap-2 w-full sm:w-80"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, key, thiết bị..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Lọc
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Tên Thí Sinh</th>
                <th className="py-3.5 px-4">Key Sử Dụng</th>
                <th className="py-3.5 px-4">Thiết Bị Liên Kết</th>
                <th className="py-3.5 px-4">Điểm Cao Nhất</th>
                <th className="py-3.5 px-4">Số Lượt Thi</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isActive = u.status === 'active';
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Kích hoạt: {new Date(u.activatedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-blue-700">
                      {u.key}
                    </td>

                    <td className="py-3 px-4">
                      {u.deviceId ? (
                        <div className="flex items-center gap-1 text-slate-700">
                          <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-mono text-[11px] truncate max-w-[130px]" title={u.deviceId}>
                            {u.deviceId.substring(0, 12)}...
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Đã reset thiết bị</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-bold text-emerald-700">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                        {u.highestScore || 0} / 10
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {u.totalAttempts || 0} lần
                    </td>

                    <td className="py-3 px-4">
                      {isActive ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Bị khóa
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {/* Reset Device */}
                        {u.deviceId && (
                          <button
                            onClick={() => handleUserAction(u.id, 'reset_device')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                            title="Reset thiết bị (cho phép thí sinh đăng nhập trên máy khác)"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Lock / Unlock */}
                        {isActive ? (
                          <button
                            onClick={() => handleUserAction(u.id, 'lock')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                            title="Khóa thí sinh"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(u.id, 'unlock')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                            title="Mở khóa thí sinh"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleUserAction(u.id, 'delete')}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-700 hover:bg-red-50"
                          title="Xóa người dùng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Chưa có thí sinh nào kích hoạt Key hoặc không khớp tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
