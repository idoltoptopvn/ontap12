import React, { useState } from 'react';
import { Lock, Shield, User, ArrowLeft, AlertCircle } from 'lucide-react';
import { adminLogin } from '../../services/api';

interface AdminLoginProps {
  onSuccess: (adminData: any) => void;
  onBackToPlayer: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToPlayer }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập tài khoản và mật khẩu quản trị.');
      return;
    }

    try {
      setLoading(true);
      const res = await adminLogin(username.trim(), password.trim());
      onSuccess(res.admin);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập quản trị viên thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Back Button */}
        <div>
          <button
            type="button"
            onClick={onBackToPlayer}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Cổng làm bài</span>
          </button>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto border border-blue-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              ÔN TẬP 12 • Quản Trị Hệ Thống
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Đăng nhập để quản lý Key, thí sinh và bài thi
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Tài khoản</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên tài khoản quản trị"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Mật khẩu</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Đăng nhập Quản trị</span>
              )}
            </button>
          </form>

          {/* Security info */}
          <div className="pt-2 border-t border-slate-800 text-center text-[11px] text-slate-500">
            <span>Bảo mật hệ thống SSL/TLS • Phiên đăng nhập được mã hóa</span>
          </div>
        </div>
      </div>
    </div>
  );
};
