import React, { useState, useEffect } from 'react';
import { adminGetSettings, adminUpdateSettings, adminDownloadBackup } from '../../services/api';
import { Settings, Shield, HardDrive, Download, Save, RefreshCw, AlertCircle, CheckCircle2, Unlock, Lock } from 'lucide-react';

export default function AdminSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminGetSettings();
      if (res && res.settings) {
        setSettings(res.settings);
      } else if (res && res.siteName) {
        setSettings(res);
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi tải cài đặt' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg(null);
      const res = await adminUpdateSettings(settings);
      if (res.success) {
        setMsg({ type: 'success', text: 'Đã lưu cấu hình hệ thống thành công!' });
        setSettings(res.settings);
      } else {
        setMsg({ type: 'error', text: res.message || 'Lưu thất bại' });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi khi lưu cấu hình' });
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      const data = await adminDownloadBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz_system_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg({ type: 'success', text: 'Đã tải xuống bản sao lưu CSDL thành công!' });
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Lỗi tải sao lưu: ' + err.message });
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" /> Đang tải cài đặt hệ thống...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 text-center text-red-500">
        Không thể tải thông tin cài đặt.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cài đặt & Bảo mật hệ thống</h1>
        <p className="text-slate-500 text-sm mt-1">Cấu hình thời hạn Key mặc định, chính sách bảo mật thiết bị và sao lưu CSDL.</p>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
          <span className="text-sm font-medium">{msg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Thông tin chung</h2>
              <p className="text-xs text-slate-500">Tên hệ thống và hiển thị thương hiệu</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên hệ thống (Site Name)</label>
              <input
                type="text"
                value={settings.siteName || ''}
                onChange={e => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dòng chữ Logo / Thương hiệu</label>
              <input
                type="text"
                value={settings.logoText || ''}
                onChange={e => setSettings({ ...settings, logoText: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Access Mode Configuration */}
        <div className="bg-white rounded-2xl border-2 border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
                  settings.freeAccessMode
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-rose-50 text-rose-600 border-rose-200'
                }`}
              >
                {settings.freeAccessMode ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">CHẾ ĐỘ TRUY CẬP</h2>
                  {settings.freeAccessMode ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      🟢 Đang mở truy cập miễn phí
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      🔴 Đang yêu cầu Key
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">Bật/tắt chế độ vào làm Quiz tự do không cần Key</p>
              </div>
            </div>

            {/* Toggle */}
            <button
              type="button"
              onClick={() => setSettings({ ...settings, freeAccessMode: !settings.freeAccessMode })}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.freeAccessMode ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.freeAccessMode ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div
              onClick={() => setSettings({ ...settings, freeAccessMode: true })}
              className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                settings.freeAccessMode
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <strong className="block text-slate-900 mb-1">🟢 BẬT: Truy cập miễn phí</strong>
              Bỏ qua màn hình nhập Key. Mọi học sinh truy cập link có thể bắt đầu làm bài ngay lập tức, không cần tài khoản, không cần kích hoạt thiết bị.
            </div>

            <div
              onClick={() => setSettings({ ...settings, freeAccessMode: false })}
              className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                !settings.freeAccessMode
                  ? 'bg-rose-50/70 border-rose-300 text-rose-950 font-medium shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <strong className="block text-slate-900 mb-1">🔴 TẮT: Bắt buộc Key 5 giờ</strong>
              Khôi phục màn hình nhập Key. Yêu cầu mã Key hợp lệ có hiệu lực 5 giờ trên 1 thiết bị duy nhất. Toàn bộ Key cũ giữ nguyên.
            </div>
          </div>
        </div>

        {/* Access Key Policies */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Chính sách Access Key & Thiết bị</h2>
              <p className="text-xs text-slate-500">Quy định thời hạn và giới hạn sử dụng của học sinh</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thời hạn Key mặc định (Giờ)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={settings.defaultKeyDurationHours ?? 5}
                  onChange={e => setSettings({ ...settings, defaultKeyDurationHours: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-slate-400">giờ</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Mặc định theo đề bài: 5 giờ tính từ lần kích hoạt đầu tiên.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số thiết bị tối đa cho 1 Key
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="1"
                  value={settings.defaultMaxDevices ?? 1}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm outline-none cursor-not-allowed"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-slate-400">thiết bị</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Cố định 1 thiết bị duy nhất. Ngăn chặn chia sẻ mã bài thi.</p>
            </div>
          </div>

          <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={settings.allowKeyCreation ?? true}
                onChange={e => setSettings({ ...settings, allowKeyCreation: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">Cho phép tạo Key mới</span>
                <p className="text-xs text-slate-500">Mở chức năng sinh mã truy cập cho quản trị viên</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={settings.allowKeyActivation ?? true}
                onChange={e => setSettings({ ...settings, allowKeyActivation: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">Cho phép học sinh kích hoạt Key</span>
                <p className="text-xs text-slate-500">Tắt nếu muốn tạm ngưng nhận bài thi mới</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={settings.allowKeyExtension ?? true}
                onChange={e => setSettings({ ...settings, allowKeyExtension: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">Cho phép gia hạn thời gian Key</span>
                <p className="text-xs text-slate-500">Admin có thể cộng thêm giờ làm bài</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={settings.allowDeviceReset ?? true}
                onChange={e => setSettings({ ...settings, allowDeviceReset: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-semibold text-slate-800">Cho phép Reset thiết bị liên kết</span>
                <p className="text-xs text-slate-500">Hỗ trợ học sinh đổi máy tính khi gặp sự cố</p>
              </div>
            </label>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={settings.lockSystem ?? false}
                onChange={e => setSettings({ ...settings, lockSystem: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-bold text-amber-900">Khóa khẩn cấp toàn hệ thống (Lockdown)</span>
                <p className="text-xs text-amber-700">Khi bật, tất cả bài thi sẽ tạm dừng và không ai có thể làm tiếp cho đến khi mở khóa.</p>
              </div>
            </label>
          </div>
        </div>

        {/* Database & Backup */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Dữ liệu & Sao lưu (Backup)</h2>
              <p className="text-xs text-slate-500">Xuất file JSON chứa toàn bộ 10 collections (Keys, Users, Results, Logs,...)</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Tải xuống bản sao lưu CSDL hoàn chỉnh</h3>
              <p className="text-xs text-slate-500 mt-0.5">Lưu trữ an toàn ngoại tuyến, gồm tất cả tài khoản, đề thi 128 câu và lịch sử nộp bài.</p>
            </div>
            <button
              type="button"
              onClick={handleBackup}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm flex-shrink-0"
            >
              <Download className="w-4 h-4" /> Tải Backup JSON
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu thay đổi cài đặt
          </button>
        </div>
      </form>
    </div>
  );
}
