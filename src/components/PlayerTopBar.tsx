import React, { useState, useEffect } from 'react';
import { User, KeyRound, Clock, LogOut, ShieldCheck, AlertTriangle } from 'lucide-react';
import { removePlayerToken } from '../services/api';

interface PlayerTopBarProps {
  session?: {
    userName?: string;
    key?: string;
    expiresAt?: string;
    studentName?: string;
    remainingSeconds?: number;
  };
  userName?: string;
  keyCode?: string;
  expiresAt?: string;
  onSessionExpired?: () => void;
  onKeyExpired?: () => void;
  onExit?: () => void;
  onExitSession?: () => void;
  onOpenAdmin?: () => void;
}

export const PlayerTopBar: React.FC<PlayerTopBarProps> = ({
  session,
  userName,
  keyCode,
  expiresAt,
  onSessionExpired,
  onKeyExpired,
  onExit,
  onExitSession,
  onOpenAdmin,
}) => {
  const actualUserName = userName || session?.userName || session?.studentName || 'Học sinh';
  const actualKey = keyCode || session?.key || 'QUIZ-KEY';
  const actualExpiresAt = expiresAt || session?.expiresAt || new Date(Date.now() + 5 * 3600 * 1000).toISOString();
  const triggerExpired = onSessionExpired || onKeyExpired || (() => {});
  const triggerExit = onExit || onExitSession || (() => {});

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    const calculateRemaining = () => {
      const now = Date.now();
      const exp = new Date(actualExpiresAt).getTime();
      const diff = Math.max(0, Math.floor((exp - now) / 1000));
      return diff;
    };

    setSecondsRemaining(calculateRemaining());

    const timer = setInterval(() => {
      const rem = calculateRemaining();
      setSecondsRemaining(rem);
      if (rem <= 0) {
        clearInterval(timer);
        triggerExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [actualExpiresAt, triggerExpired]);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isWarning = secondsRemaining < 1800; // < 30m
  const isUrgent = secondsRemaining < 300; // < 5m

  const handleLogout = () => {
    removePlayerToken();
    triggerExit();
  };

  const isFreeMode = !!(session as any)?.freeAccessMode || actualKey === 'MIỄN PHÍ';

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-100 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-40">
      {/* Student & Key Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-medium text-slate-200">
          <User className="w-3.5 h-3.5 text-blue-400" />
          <span>Thí sinh: <strong className="text-white">{actualUserName}</strong></span>
        </div>
        {isFreeMode ? (
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>TRUY CẬP MIỄN PHÍ</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
            <KeyRound className="w-3 h-3 text-slate-400" />
            <span>{actualKey}</span>
          </div>
        )}
      </div>

      {/* Realtime Server Countdown Timer or Free Badge & Actions */}
      <div className="flex items-center gap-2.5">
        {isFreeMode ? (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold border bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            title="Đang trong chế độ mở tự do được kích hoạt bởi Quản trị viên"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Mở tự do • Không giới hạn</span>
          </div>
        ) : (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold tracking-wider border transition-colors ${
              isUrgent
                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                : isWarning
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-slate-800 text-slate-200 border-slate-700'
            }`}
            title="Thời gian hiệu lực 5 giờ của Key được đồng bộ và tính trên máy chủ"
          >
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Còn lại: {formattedTime}</span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={isFreeMode ? "Đăng xuất" : "Đổi mã Key / Đăng xuất thiết bị"}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
