import React, { useEffect, useState } from 'react';
import { adminFetch, adminUpdateAccessMode } from '../../services/api';
import {
  KeyRound,
  Users,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Award,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  BarChart3,
  RefreshCw,
  Globe,
  Lock,
  Unlock,
  AlertCircle,
  Save,
  Check,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate?: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Access Mode state
  const [freeAccessMode, setFreeAccessMode] = useState<boolean>(false);
  const [accessModeUpdatedAt, setAccessModeUpdatedAt] = useState<string | null>(null);
  const [accessModeUpdatedBy, setAccessModeUpdatedBy] = useState<string | null>(null);
  const [isUpdatingAccessMode, setIsUpdatingAccessMode] = useState<boolean>(false);
  const [pendingModeChange, setPendingModeChange] = useState<boolean | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await adminFetch('/admin/dashboard');
      setData(res);
      if (res?.systemSettings) {
        setFreeAccessMode(!!res.systemSettings.freeAccessMode);
        setAccessModeUpdatedAt(res.systemSettings.freeAccessUpdatedAt || null);
        setAccessModeUpdatedBy(res.systemSettings.freeAccessUpdatedBy || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateToggle = (nextValue: boolean) => {
    if (nextValue === freeAccessMode) return;
    setPendingModeChange(nextValue);
    setShowConfirmModal(true);
  };

  const handleConfirmModeChange = async () => {
    if (pendingModeChange === null) return;
    try {
      setIsUpdatingAccessMode(true);
      setShowConfirmModal(false);
      const res = await adminUpdateAccessMode(pendingModeChange);
      if (res.success) {
        setFreeAccessMode(res.freeAccessMode);
        setAccessModeUpdatedAt(res.updatedAt || new Date().toISOString());
        setAccessModeUpdatedBy(res.updatedBy || 'Admin');
        setToastMessage({
          type: 'success',
          text: res.freeAccessMode
            ? 'Đã BẬT thành công: Cho phép tất cả mọi người truy cập và làm Quiz miễn phí!'
            : 'Đã TẮT chế độ miễn phí: Quay về chế độ yêu cầu Key 5 giờ & 1 thiết bị!',
        });
        // Auto refresh dashboard metrics
        fetchDashboard();
      } else {
        setToastMessage({ type: 'error', text: res.error || 'Cập nhật chế độ truy cập thất bại' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: err.message || 'Lỗi kết nối máy chủ' });
    } finally {
      setIsUpdatingAccessMode(false);
      setPendingModeChange(null);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const scoreDistribution = data?.scoreDistribution || [];
  const recentLogs = data?.recentLogs || [];

  const cards = [
    { label: 'Tổng số Key', value: kpis.totalKeys, icon: KeyRound, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { label: 'Key chưa kích hoạt', value: kpis.unusedKeys, icon: Clock, color: 'text-slate-600 bg-slate-50 border-slate-200' },
    { label: 'Key đang hoạt động', value: kpis.activeKeys, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'Key đã hết hạn', value: kpis.expiredKeys, icon: AlertOctagon, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Key bị thu hồi / khóa', value: kpis.revokedKeys, icon: AlertOctagon, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { label: 'Tổng người dùng', value: kpis.totalUsers, icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { label: 'Đang làm bài', value: kpis.activeUsers, icon: Activity, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    { label: 'Tổng lượt nộp bài', value: kpis.totalResults, icon: Layers, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { label: 'Điểm trung bình', value: `${kpis.avgScore}/10`, icon: Award, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { label: 'Tỷ lệ đạt (≥5đ)', value: `${kpis.passRate}%`, icon: TrendingUp, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  ];

  // Calculate highest score bucket for relative bar scaling
  const maxBucketCount = Math.max(...scoreDistribution.map((d: any) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 border shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-semibold">{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Title & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Tổng Quan Hệ Thống (Dashboard)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thống kê thời gian thực về Key truy cập, người chơi và kết quả thi
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ================= CHẾ ĐỘ TRUY CẬP (ACCESS MODE) ================= */}
      <div className="bg-white rounded-3xl border-2 border-slate-200/90 shadow-sm p-5 sm:p-6 transition-all hover:border-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs shrink-0 transition-colors ${
                freeAccessMode
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}
            >
              {freeAccessMode ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  CHẾ ĐỘ TRUY CẬP
                </h3>
                {/* Status Badges */}
                {freeAccessMode ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    🟢 Đang mở truy cập miễn phí
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 border border-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    🔴 Đang yêu cầu Key
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Cấu hình trực tiếp quyền vào làm bài Quiz cho tất cả học sinh và khách truy cập
              </p>
            </div>
          </div>

          {/* Toggle Switch Component */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-600 hidden sm:inline">
              {freeAccessMode ? 'Chế độ Miễn Phí' : 'Chế độ Yêu Cầu Key'}
            </span>
            <button
              type="button"
              onClick={() => handleInitiateToggle(!freeAccessMode)}
              disabled={isUpdatingAccessMode}
              className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                freeAccessMode ? 'bg-emerald-600 focus:ring-emerald-500' : 'bg-slate-300 focus:ring-slate-400'
              }`}
              role="switch"
              aria-checked={freeAccessMode}
            >
              <span className="sr-only">Chuyển đổi chế độ truy cập</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  freeAccessMode ? 'translate-x-8' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Detailed Explanation & State Summary */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => handleInitiateToggle(true)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              freeAccessMode
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="text-sm">🟢</span> BẬT: Truy Cập Miễn Phí Toàn Bộ
              </span>
              {freeAccessMode && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                  Đang kích hoạt
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tự động bỏ qua màn hình nhập Key. Tất cả mọi người vào link Quiz có thể làm bài ngay mà không cần tài khoản, không cần Key, không giới hạn thiết bị. Kết quả bài thi vẫn được lưu lại đầy đủ.
            </p>
          </div>

          <div
            onClick={() => handleInitiateToggle(false)}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              !freeAccessMode
                ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="text-sm">🔴</span> TẮT: Bắt Buộc Key 5 Giờ (Mặc định)
              </span>
              {!freeAccessMode && (
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold">
                  Đang kích hoạt
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Khôi phục màn hình nhập Key. Thí sinh bắt buộc phải có Key hợp lệ có hiệu lực 5 giờ và bị giới hạn trên 1 thiết bị duy nhất. Toàn bộ Key đã tạo trước đó vẫn giữ nguyên vẹn.
            </p>
          </div>
        </div>

        {/* Footer info & Manual Save Button */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Cập nhật lần cuối:{' '}
              <strong className="text-slate-700">
                {accessModeUpdatedAt
                  ? new Date(accessModeUpdatedAt).toLocaleString('vi-VN')
                  : 'Mặc định hệ thống'}
              </strong>
              {accessModeUpdatedBy && ` • Thực hiện bởi: ${accessModeUpdatedBy}`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleInitiateToggle(!freeAccessMode)}
            disabled={isUpdatingAccessMode}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              freeAccessMode
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
            }`}
          >
            {isUpdatingAccessMode ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : freeAccessMode ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
            <span>{freeAccessMode ? 'Chuyển sang Yêu Cầu Key' : 'Mở Truy Cập Miễn Phí'}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingModeChange !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                pendingModeChange
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
            >
              {pendingModeChange ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                {pendingModeChange ? 'Xác nhận BẬT Chế độ Miễn Phí?' : 'Xác nhận TẮT Chế độ Miễn Phí?'}
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {pendingModeChange
                  ? 'Khi bật chế độ miễn phí, TẤT CẢ mọi người vào link Quiz đều có thể làm bài ngay lập tức mà không cần nhập Key hay xác thực thiết bị. Màn hình nhập Key sẽ được ẩn tự động.'
                  : 'Khi tắt chế độ miễn phí, hệ thống sẽ khôi phục màn hình yêu cầu Key. Học sinh bắt buộc phải nhập mã Key 5 giờ hợp lệ trên 1 thiết bị để có thể làm bài.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-700">Trạng thái mới sẽ là:</div>
              <div className="flex items-center gap-1.5 font-bold">
                {pendingModeChange ? (
                  <span className="text-emerald-700">🟢 Đang mở truy cập miễn phí</span>
                ) : (
                  <span className="text-rose-700">🔴 Đang yêu cầu Key (5 giờ & 1 thiết bị)</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 pt-1">
                Lưu ý: Dữ liệu Key, kết quả thi và tài khoản quản trị viên hoàn toàn được bảo toàn.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingModeChange(null);
                }}
                disabled={isUpdatingAccessMode}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmModeChange}
                disabled={isUpdatingAccessMode}
                className={`py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  pendingModeChange
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                }`}
              >
                {isUpdatingAccessMode ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Xác nhận lưu cài đặt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className={`p-4 rounded-2xl border transition-all shadow-2xs bg-white flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 line-clamp-1">{c.label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
                {c.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Phân Bố Điểm Số Thí Sinh</span>
            </div>
            <span className="text-xs text-slate-500">Thang điểm 10</span>
          </div>

          <div className="space-y-3 pt-2">
            {scoreDistribution.map((item: any, idx: number) => {
              const pct = Math.round((item.count / maxBucketCount) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{item.range}</span>
                    <span className="text-blue-700">{item.count} bài ({item.count > 0 && kpis.totalResults > 0 ? Math.round((item.count / kpis.totalResults) * 100) : 0}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, item.count > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Nhật Ký Hoạt Động Gần Nhất</span>
            </div>
            <span className="text-xs text-slate-400">Tự động cập nhật</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[280px] flex-1 pr-1">
            {recentLogs.map((log: any) => {
              let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
              if (log.status === 'success') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              if (log.status === 'warning') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
              if (log.status === 'error') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';

              const timeFormatted = new Date(log.timestamp).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.action}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badgeColor}`}>
                        {log.actor}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">{timeFormatted}</span>
                </div>
              );
            })}

            {recentLogs.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">Chưa có nhật ký hoạt động nào.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
