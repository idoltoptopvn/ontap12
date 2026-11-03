import React, { useEffect, useState } from 'react';
import { adminFetch } from '../../services/api';
import {
  Award,
  Search,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Calendar,
  X,
} from 'lucide-react';

export const AdminResults: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await adminFetch(`/admin/results?search=${encodeURIComponent(search)}`);
      setResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleDeleteResult = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa kết quả bài thi này?')) return;
    try {
      await adminFetch(`/admin/results/${id}`, { method: 'DELETE' });
      fetchResults();
    } catch (err: any) {
      alert(err.message || 'Xóa thất bại');
    }
  };

  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = ['Họ tên', 'Mã Key', 'Bài thi', 'Điểm số', 'Số câu đúng', 'Số câu sai', 'Chưa làm', 'Thời gian làm (giây)', 'Ngày nộp'];
    const rows = results.map((r) => [
      `"${r.userName}"`,
      `"${r.key}"`,
      `"${r.quizTitle}"`,
      r.score,
      r.correctCount,
      r.wrongCount,
      r.unansweredCount,
      r.timeSpentSeconds,
      `"${r.completedAt}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ket_qua_thi_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Quản Lý Kết Quả Bài Thi (Results)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem điểm số, thống kê đúng/sai và chi tiết bài làm của từng thí sinh
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={results.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Xuất File CSV Điểm Số</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchResults();
          }}
          className="flex items-center gap-2 w-full sm:w-80"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên học sinh, key..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Tìm
          </button>
        </form>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Thí Sinh</th>
                <th className="py-3.5 px-4">Key Sử Dụng</th>
                <th className="py-3.5 px-4">Bài Thi</th>
                <th className="py-3.5 px-4">Điểm Số</th>
                <th className="py-3.5 px-4">Đúng / Sai</th>
                <th className="py-3.5 px-4">Thời Gian Làm</th>
                <th className="py-3.5 px-4">Ngày Nộp</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r) => {
                const mins = Math.floor(r.timeSpentSeconds / 60);
                const secs = r.timeSpentSeconds % 60;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.userName}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-700">{r.key}</td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[160px]" title={r.quizTitle}>
                      {r.quizTitle}
                    </td>
                    <td className="py-3 px-4 font-bold text-base text-slate-900">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg border ${
                          r.score >= 8
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : r.score >= 5
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {r.score.toFixed(1)} / 10
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-700 font-semibold">{r.correctCount}Đ</span>
                      <span className="text-slate-300 mx-1">•</span>
                      <span className="text-rose-600 font-semibold">{r.wrongCount}S</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {mins}m {secs < 10 ? '0' : ''}{secs}s
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(r.completedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setSelectedResult(r)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          title="Xem chi tiết bài làm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteResult(r.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-700 hover:bg-red-50"
                          title="Xóa kết quả"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {results.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Chưa có kết quả nộp bài nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Chi Tiết Bài Nộp</h3>
              <button onClick={() => setSelectedResult(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Thí sinh:</span>
                <strong className="text-slate-900">{selectedResult.userName}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Mã Key:</span>
                <span className="font-mono text-blue-700 font-semibold">{selectedResult.key}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Điểm số:</span>
                <strong className="text-emerald-700 font-bold text-sm">{selectedResult.score} / 10</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Số câu đúng:</span>
                <span className="text-emerald-600 font-bold">{selectedResult.correctCount} / {selectedResult.totalQuestions}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Số câu sai:</span>
                <span className="text-rose-600 font-bold">{selectedResult.wrongCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Thời gian làm bài:</span>
                <span>{selectedResult.timeSpentSeconds} giây</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Thời điểm nộp:</span>
                <span>{new Date(selectedResult.completedAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedResult(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
