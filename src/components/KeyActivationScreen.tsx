import React, { useState, useEffect } from 'react';
import { KeyRound, User, Shield, Clock, Smartphone, AlertCircle, ArrowRight, Lock, CheckCircle2, HelpCircle, Unlock, Sparkles } from 'lucide-react';
import { activateKey, getAccessMode, startGuestSession } from '../services/api';
import { FacebookBrowserNotice } from './FacebookBrowserNotice';

interface KeyActivationScreenProps {
  initialKey?: string;
  onKeyChange?: (key: string) => void;
  onSuccess?: (sessionData: any) => void;
  onActivationSuccess?: (sessionData: any) => void;
  onGoToAdmin?: () => void;
  onAdminClick?: () => void;
}

export const KeyActivationScreen: React.FC<KeyActivationScreenProps> = ({
  initialKey = '',
  onKeyChange,
  onSuccess,
  onActivationSuccess,
  onGoToAdmin,
  onAdminClick,
}) => {
  const triggerSuccess = onSuccess || onActivationSuccess || (() => {});
  const triggerGoToAdmin = onGoToAdmin || onAdminClick || (() => {});
  const [keyInput, setKeyInput] = useState(initialKey);
  const [nameInput, setNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverFreeMode, setServerFreeMode] = useState<boolean>(false);

  useEffect(() => {
    getAccessMode().then((res) => {
      if (res?.freeAccessMode) {
        setServerFreeMode(true);
      }
    }).catch(() => {});
  }, []);

  const handleStartFreeQuiz = async () => {
    try {
      setLoading(true);
      const studentName = nameInput.trim() || 'Học sinh';
      const res = await startGuestSession(studentName);
      triggerSuccess({
        ...res,
        freeAccessMode: true,
        studentName,
        userName: studentName,
      });
    } catch (err: any) {
      setError(err.message || 'Không thể tạo phiên làm bài miễn phí');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialKey && !keyInput) {
      setKeyInput(initialKey);
    }
  }, [initialKey]);

  const handleKeyInputChange = (val: string) => {
    const uppercaseVal = val.toUpperCase();
    setKeyInput(uppercaseVal);
    if (onKeyChange) {
      onKeyChange(uppercaseVal);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanKey = keyInput.trim().toUpperCase();
    const cleanName = nameInput.trim();

    if (!cleanKey) {
      setError('Vui lòng nhập mã Key truy cập.');
      return;
    }
    if (!cleanName) {
      setError('Vui lòng nhập họ và tên thí sinh.');
      return;
    }

    try {
      setLoading(true);
      const res = await activateKey(cleanKey, cleanName);
      triggerSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Không thể kích hoạt Key. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Facebook In-App Browser Notice */}
      <FacebookBrowserNotice currentKey={keyInput} hasActiveSession={false} />

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-xs border border-blue-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              ÔN TẬP 12
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Tin Học 12 • Kỳ Thi Giữa Học Kỳ 1
            </p>
          </div>

          {/* Activation Form Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
            {serverFreeMode && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <Unlock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-white text-sm">🟢 Đang mở truy cập miễn phí!</div>
                    <div className="text-xs text-emerald-300/90 mt-0.5 leading-relaxed">
                      Quản trị viên đã bật chế độ tự do. Bạn có thể vào làm bài ngay mà không cần Key bản quyền.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStartFreeQuiz}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Vào làm bài ngay (Miễn phí)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{error}</div>
                </div>
                {error.includes('thiết bị khác') && (
                  <div className="pl-6 text-[11px] text-amber-300/90 leading-relaxed border-t border-rose-500/20 pt-1.5 flex items-start gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Nếu bạn vừa mở từ Facebook sang Safari/Chrome, hãy quay lại Facebook và nhấn <strong>"Mở bằng trình duyệt ngoài"</strong> để hệ thống tự động đồng bộ phiên, hoặc liên hệ Quản trị viên để reset thiết bị.
                    </span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Họ và tên thí sinh</span>
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Nhập họ và tên thí sinh"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  disabled={loading}
                />
              </div>

              {/* Input Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  <span>Mã Key truy cập</span>
                </label>
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => handleKeyInputChange(e.target.value)}
                  placeholder="QUIZ-XXXX-XXXX-XXXX"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm font-mono tracking-wider focus:outline-none focus:border-blue-500 transition-colors uppercase"
                  disabled={loading}
                />
              </div>

              {/* Submit Button */}
              <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Xác nhận & Bắt đầu làm bài</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Minimal Trust Indicators */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>1 thiết bị</span>
            </span>
            <span className="text-slate-700">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Hiệu lực 5 giờ</span>
            </span>
            <span className="text-slate-700">•</span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bảo mật bài thi</span>
            </span>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-center text-xs text-slate-500 px-1 pt-1">
          <button
            type="button"
            onClick={triggerGoToAdmin}
            className="inline-flex items-center gap-1.5 hover:text-slate-300 transition-colors py-1 px-3 rounded-lg hover:bg-slate-900 cursor-pointer text-slate-400"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Cổng Quản trị viên</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
};
