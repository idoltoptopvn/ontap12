import React, { useEffect, useState } from 'react';
import { adminFetch } from '../../services/api';
import {
  KeyRound,
  Plus,
  Copy,
  Download,
  Search,
  Filter,
  Check,
  RotateCcw,
  Clock,
  Smartphone,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
  X,
  Calendar,
  Layers,
} from 'lucide-react';

export const AdminKeys: React.FC = () => {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create Key Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCount, setCreateCount] = useState(1);
  const [createPrefix, setCreatePrefix] = useState('QUIZ');
  const [createDuration, setCreateDuration] = useState(5);
  const [createNotes, setCreateNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Extend Modal
  const [extendKeyItem, setExtendKeyItem] = useState<any | null>(null);
  const [extendHours, setExtendHours] = useState(5);

  // Feedback toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const url = `/admin/keys?status=${statusFilter}&search=${encodeURIComponent(search)}`;
      const res = await adminFetch(url);
      setKeys(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKeys();
  };

  // Create single or bulk keys
  const handleCreateKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const res = await adminFetch('/admin/keys/create', {
        method: 'POST',
        body: JSON.stringify({
          count: createCount,
          prefix: createPrefix,
          durationHours: createDuration,
          notes: createNotes,
        }),
      });
      showToast(res.message || 'Tạo Key thành công!');
      setIsCreateOpen(false);
      setCreateCount(1);
      setCreateNotes('');
      fetchKeys();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo Key');
    } finally {
      setIsCreating(false);
    }
  };

  // Perform key actions
  const handleKeyAction = async (keyId: string, action: string, extraBody: any = {}) => {
    if (action === 'delete' && !window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn Key này?')) {
      return;
    }
    if (action === 'revoke' && !window.confirm('Bạn có chắc chắn muốn thu hồi quyền sử dụng của Key này?')) {
      return;
    }

    try {
      await adminFetch(`/admin/keys/${keyId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, ...extraBody }),
      });
      showToast('Đã thực hiện thao tác thành công!');
      fetchKeys();
    } catch (err: any) {
      alert(err.message || 'Thao tác thất bại');
    }
  };

  const copyToClipboard = (text: string, label: string = 'Key') => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label} vào bộ nhớ tạm!`);
  };

  const handleDeleteAllActiveKeys = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ Key đang hoạt động? Hành động này sẽ thu hồi quyền truy cập của các thí sinh đang sử dụng Key này.')) {
      return;
    }
    try {
      const res = await adminFetch('/admin/keys/delete-active', { method: 'POST' });
      showToast(res.message || 'Đã xóa toàn bộ Key đang hoạt động!');
      fetchKeys();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa Key');
    }
  };

  const copyAllKeys = () => {
    if (keys.length === 0) return;
    const text = keys.map((k) => k.key).join('\n');
    copyToClipboard(text, `${keys.length} Key`);
  };

  const exportCSV = () => {
    if (keys.length === 0) return;
    const headers = ['Mã Key', 'Trạng thái', 'Thời hạn (giờ)', 'Người dùng', 'Thiết bị', 'Ngày tạo', 'Kích hoạt lúc', 'Hết hạn lúc', 'Ghi chú'];
    const rows = keys.map((k) => [
      `"${k.key}"`,
      `"${k.status}"`,
      k.durationHours,
      `"${k.boundUserName || ''}"`,
      `"${k.boundDeviceId || ''}"`,
      `"${k.createdAt || ''}"`,
      `"${k.activatedAt || ''}"`,
      `"${k.expiresAt || ''}"`,
      `"${k.notes || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_key_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Đã xuất file CSV thành công!');
  };

  const calculateRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 'Chưa kích hoạt';
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    if (diff <= 0) return 'Đã hết hạn';
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return `${h}h ${m}m còn lại`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Quản Lý Key Truy Cập
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tạo key, quản lý thời hạn 5 giờ, kiểm soát 1 thiết bị và giám sát kích hoạt
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Key Mới</span>
          </button>

          <button
            onClick={copyAllKeys}
            disabled={keys.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Sao chép toàn bộ danh sách Key"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Sao chép tất cả</span>
          </button>

          <button
            onClick={exportCSV}
            disabled={keys.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Xuất danh sách ra file CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất CSV</span>
          </button>

          <button
            onClick={handleDeleteAllActiveKeys}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Xóa toàn bộ các Key đang ở trạng thái hoạt động"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Xóa Key đang hoạt động</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto text-xs font-medium">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'unused', label: 'Chưa dùng' },
            { id: 'active', label: 'Đang hoạt động' },
            { id: 'expired', label: 'Đã hết hạn' },
            { id: 'revoked', label: 'Đã thu hồi / Khóa' },
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

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-72">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã key, tên, thiết bị..."
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

      {/* Keys Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Mã Key</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Người dùng</th>
                <th className="py-3.5 px-4">Thiết bị liên kết</th>
                <th className="py-3.5 px-4">Thời gian còn lại</th>
                <th className="py-3.5 px-4">Ghi chú</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {keys.map((k) => {
                let statusBadge = (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Chưa kích hoạt
                  </span>
                );
                if (k.status === 'active') {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Đang hoạt động
                    </span>
                  );
                } else if (k.status === 'expired') {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Đã hết hạn
                    </span>
                  );
                } else if (k.status === 'revoked') {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Đã thu hồi
                    </span>
                  );
                } else if (k.status === 'locked') {
                  statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                      Đã khóa
                    </span>
                  );
                }

                return (
                  <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Key & Copy */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="select-all">{k.key}</span>
                        <button
                          onClick={() => copyToClipboard(k.key, 'Key')}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Sao chép Key"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[10px] font-normal text-slate-400 font-sans mt-0.5">
                        Tạo lúc: {new Date(k.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">{statusBadge}</td>

                    {/* User */}
                    <td className="py-3 px-4">
                      {k.boundUserName ? (
                        <div>
                          <strong className="text-slate-900">{k.boundUserName}</strong>
                          <div className="text-[10px] text-slate-400">
                            Kích hoạt: {k.activatedAt ? new Date(k.activatedAt).toLocaleTimeString('vi-VN') : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa có</span>
                      )}
                    </td>

                    {/* Device */}
                    <td className="py-3 px-4">
                      {k.boundDeviceId ? (
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-mono text-[11px] text-slate-700 truncate max-w-[120px]" title={k.boundDeviceId}>
                            {k.boundDeviceId.substring(0, 10)}...
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa liên kết</span>
                      )}
                    </td>

                    {/* Remaining Time */}
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{calculateRemaining(k.expiresAt)}</span>
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-slate-500 max-w-[140px] truncate" title={k.notes}>
                      {k.notes || <span className="text-slate-300">-</span>}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {/* Extend */}
                        <button
                          onClick={() => {
                            setExtendKeyItem(k);
                            setExtendHours(5);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          title="Gia hạn thời gian (+giờ)"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>

                        {/* Reset Device */}
                        {k.boundDeviceId && (
                          <button
                            onClick={() => handleKeyAction(k.id, 'reset_device')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                            title="Reset thiết bị liên kết (cho phép đổi máy)"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Lock / Unlock */}
                        {k.status === 'locked' ? (
                          <button
                            onClick={() => handleKeyAction(k.id, 'unlock')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                            title="Mở khóa Key"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleKeyAction(k.id, 'lock')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50"
                            title="Khóa Key tạm thời"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Revoke */}
                        {k.status !== 'revoked' && (
                          <button
                            onClick={() => handleKeyAction(k.id, 'revoke')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                            title="Thu hồi Key vĩnh viễn"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleKeyAction(k.id, 'delete')}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-700 hover:bg-red-50"
                          title="Xóa Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {keys.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Không tìm thấy Key nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE KEY MODAL (SINGLE OR BULK) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-blue-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base">
                <KeyRound className="w-5 h-5 text-blue-200" />
                <span>Tạo Key Mới (Đơn Lẻ hoặc Hàng Loạt)</span>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateKeys} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Số lượng Key cần tạo:</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={createCount}
                    onChange={(e) => setCreateCount(parseInt(e.target.value, 10) || 1)}
                    className="w-24 px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-center"
                  />
                  <div className="flex gap-1">
                    {[1, 5, 10, 20, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCreateCount(num)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold ${
                          createCount === num ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiền tố Key (Prefix):</label>
                <input
                  type="text"
                  value={createPrefix}
                  onChange={(e) => setCreatePrefix(e.target.value.toUpperCase())}
                  placeholder="QUIZ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm uppercase"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Thời hạn sử dụng (Giờ):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={createDuration}
                    onChange={(e) => setCreateDuration(parseInt(e.target.value, 10) || 5)}
                    className="w-24 px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-center"
                  />
                  <span className="text-slate-500 font-medium">giờ (mặc định 5 giờ từ lúc kích hoạt)</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Ghi chú (Tùy chọn):</label>
                <input
                  type="text"
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Ví dụ: Đợt thi thử lớp 12A, Khóa ôn cấp tốc..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                >
                  {isCreating ? 'Đang tạo...' : `Xác nhận tạo ${createCount} Key`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTEND TIME MODAL */}
      {extendKeyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Gia Hạn Thời Gian Key</h3>
            <p className="text-xs text-slate-500 font-mono">
              Key: <strong>{extendKeyItem.key}</strong>
            </p>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Cộng thêm số giờ:</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 5, 24].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setExtendHours(h)}
                    className={`py-2 rounded-xl border font-bold text-xs ${
                      extendHours === h ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    +{h} Giờ
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setExtendKeyItem(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await handleKeyAction(extendKeyItem.id, 'extend', { addHours: extendHours });
                  setExtendKeyItem(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Xác nhận gia hạn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
