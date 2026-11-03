import React, { useEffect, useState } from 'react';
import { adminFetch } from '../../services/api';
import { Activity, Search, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const AdminLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await adminFetch('/admin/logs');
      setLogs(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        log.actor.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Nhật Ký Hoạt Động (Activity Logs)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hệ thống ghi nhận minh bạch mọi thao tác của Quản trị viên và người chơi
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1 text-xs font-medium">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'success', label: 'Thành công' },
            { id: 'warning', label: 'Cảnh báo' },
            { id: 'error', label: 'Lỗi' },
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

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm hành động, người thực hiện..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Thời Gian</th>
                <th className="py-3.5 px-4">Người Thực Hiện</th>
                <th className="py-3.5 px-4">Hành Động</th>
                <th className="py-3.5 px-4">Chi Tiết</th>
                <th className="py-3.5 px-4">Địa Chỉ IP</th>
                <th className="py-3.5 px-4 text-right">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.map((log) => {
                let statusBadge = (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Thành công
                  </span>
                );
                if (log.status === 'warning') {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Cảnh báo
                    </span>
                  );
                } else if (log.status === 'error') {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Lỗi
                    </span>
                  );
                }

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{log.actor}</td>
                    <td className="py-3 px-4 font-semibold text-blue-700">{log.action}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{log.ip}</td>
                    <td className="py-3 px-4 text-right">{statusBadge}</td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy nhật ký hoạt động nào.
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
