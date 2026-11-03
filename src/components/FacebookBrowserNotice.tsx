import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  ExternalLink, 
  X, 
  Copy, 
  Check, 
  Smartphone, 
  MoreVertical, 
  Share2, 
  ShieldCheck, 
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { 
  isFacebookBrowser, 
  isIOS, 
  isAndroid, 
  getRecommendedBrowserName, 
  buildExternalUrl, 
  createAndroidIntentUrl 
} from '../utils/browserDetection';
import { createTransferToken } from '../services/api';

interface FacebookBrowserNoticeProps {
  currentKey?: string;
  hasActiveSession?: boolean;
}

export const FacebookBrowserNotice: React.FC<FacebookBrowserNoticeProps> = ({
  currentKey,
  hasActiveSession = false,
}) => {
  const [isFB, setIsFB] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('fb_notice_dismissed') === 'true';
    }
    return false;
  });
  const [showModal, setShowModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [preparedUrl, setPreparedUrl] = useState<string>('');

  useEffect(() => {
    setIsFB(isFacebookBrowser());
  }, []);

  if (!isFB) {
    return null;
  }

  const iosDevice = isIOS();
  const androidDevice = isAndroid();
  const recommendedBrowser = getRecommendedBrowserName();

  // Prepare migration URL (including transfer token if session is already active)
  const getPreparedUrl = async (): Promise<string> => {
    let transferToken: string | undefined;

    if (currentKey && hasActiveSession) {
      try {
        const tokenRes = await createTransferToken(currentKey);
        if (tokenRes?.transferToken) {
          transferToken = tokenRes.transferToken;
        }
      } catch (err) {
        console.warn('Could not generate transfer token, fallback to key URL:', err);
      }
    }

    const url = buildExternalUrl({
      key: currentKey,
      transferToken,
    });
    setPreparedUrl(url);
    return url;
  };

  const handleOpenExternal = async () => {
    setIsPreparing(true);
    try {
      const url = await getPreparedUrl();

      if (androidDevice) {
        // Try Android Intent
        const intentUrl = createAndroidIntentUrl(url);
        // Show guidance modal as well in case the user's FB client catches/blocks intent
        setShowModal(true);
        window.location.href = intentUrl;
      } else {
        // On iOS Safari cannot be forced by custom protocol from FB app without native 3-dots action
        setShowModal(true);
      }
    } catch (err) {
      setShowModal(true);
    } finally {
      setIsPreparing(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fb_notice_dismissed', 'true');
    }
  };

  const handleCopyLink = async () => {
    let url = preparedUrl;
    if (!url) {
      url = await getPreparedUrl();
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older WebViews
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <>
      {/* 1. Top Sleek Notification Banner */}
      {!isDismissed ? (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white border-b border-blue-500/30 shadow-md">
          <div className="max-w-5xl mx-auto px-3 py-2.5 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            {/* Left: Message */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-blue-400">
                <Compass className="w-4 h-4 animate-spin-slow" />
              </div>
              <div className="text-xs sm:text-sm text-slate-200 leading-snug">
                <span className="font-semibold text-white">Bạn đang sử dụng trình duyệt Facebook.</span>{' '}
                <span className="text-slate-300">
                  Để Quiz hoạt động ổn định hơn, hãy mở bằng {recommendedBrowser}.
                </span>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={handleOpenExternal}
                disabled={isPreparing}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {isPreparing ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                <span>Mở bằng trình duyệt ngoài</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-colors cursor-pointer"
                title="Tiếp tục làm trên Facebook"
              >
                Tiếp tục tại đây
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Floating mini pill button if user dismissed banner but needs it later */
        <button
          type="button"
          onClick={handleOpenExternal}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-900/90 text-slate-200 border border-blue-500/40 shadow-xl backdrop-blur-md text-xs font-medium hover:bg-blue-900/80 hover:text-white transition-all cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span>Mở bằng {recommendedBrowser}</span>
        </button>
      )}

      {/* 2. Step-by-Step Guidance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Mở bằng trình duyệt ngoài</h3>
                  <p className="text-xs text-slate-400">
                    {iosDevice ? 'Dành cho iPhone (Safari)' : androidDevice ? 'Dành cho Android (Chrome)' : 'Mở bằng Safari hoặc Chrome'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Visual Guide */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-3.5 text-xs sm:text-sm">
              {iosDevice ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs border border-blue-500/40">
                      1
                    </span>
                    <p className="text-slate-300">
                      Nhấn vào biểu tượng <strong className="text-white">ba chấm (•••)</strong> hoặc nút <strong className="text-white">Chia sẻ</strong> ở góc trên/dưới màn hình Facebook.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs border border-blue-500/40">
                      2
                    </span>
                    <p className="text-slate-300">
                      Chọn mục <strong className="text-blue-400">"Mở trong trình duyệt bên ngoài"</strong> hoặc <strong className="text-blue-400">"Mở trong Safari"</strong> (Open in external browser / Safari).
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs border border-blue-500/40">
                      1
                    </span>
                    <p className="text-slate-300">
                      Nhấn vào biểu tượng <strong className="text-white">dấu ba chấm (⋮)</strong> ở góc trên cùng của Facebook.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-xs border border-blue-500/40">
                      2
                    </span>
                    <p className="text-slate-300">
                      Chọn <strong className="text-blue-400">"Mở bằng Chrome"</strong> hoặc <strong className="text-blue-400">"Mở bằng trình duyệt"</strong> (Open in Chrome).
                    </p>
                  </div>
                </>
              )}

              {/* Data & Key Continuity Note */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Mã Key và tiến trình làm bài sẽ được tự động bảo lưu khi chuyển đổi.</span>
              </div>
            </div>

            {/* Quick Copy Link Action */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Hoặc sao chép link và dán vào {recommendedBrowser}:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={preparedUrl || (typeof window !== 'undefined' ? window.location.href : '')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
              {copied && (
                <p className="text-[11px] text-emerald-400 animate-in fade-in">
                  ✓ Đã sao chép! Hãy mở {recommendedBrowser} và dán link vào thanh địa chỉ.
                </p>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Đã hiểu, đóng hướng dẫn
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
