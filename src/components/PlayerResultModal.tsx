import React from 'react';
import { CheckCircle2, XCircle, HelpCircle, Trophy, RotateCcw, X } from 'lucide-react';

interface PlayerResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    score: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    totalQuestions: number;
    passed: boolean;
    percentage: number;
  } | null;
  studentName?: string;
  onRetry: () => void;
}

export const PlayerResultModal: React.FC<PlayerResultModalProps> = ({
  isOpen,
  onClose,
  result,
  studentName,
  onRetry,
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-xl border border-slate-200 text-center relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          {/* Trophy badge */}
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-xs ${
              result.passed
                ? 'bg-amber-500 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            <Trophy className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {result.passed ? 'Hoàn thành bài thi xuất sắc!' : 'Đã nộp bài thi thành công!'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Học sinh: <strong className="text-slate-800">{studentName || 'Thí sinh'}</strong> • Kết quả đã lưu vào hệ thống
            </p>
          </div>

          {/* Primary Score Board */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Điểm số theo thang 10
            </div>
            <div className="text-4xl font-extrabold text-blue-600 my-1 tracking-tight">
              {result.score.toFixed(1)}
              <span className="text-base font-semibold text-slate-400"> / 10</span>
            </div>
            <div className="text-xs text-slate-600 font-medium">
              Tỷ lệ chính xác: <strong className="text-slate-900 font-semibold">{result.percentage}%</strong>
            </div>
          </div>

          {/* Detailed stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Số câu đúng</span>
              </div>
              <div className="text-lg font-bold text-emerald-700">{result.correctCount}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold mb-0.5">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Số câu sai</span>
              </div>
              <div className="text-lg font-bold text-rose-700">{result.wrongCount}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold mb-0.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Chưa làm</span>
              </div>
              <div className="text-lg font-bold text-slate-600">{result.unansweredCount}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
            >
              Xem lại câu hỏi
            </button>
            <button
              onClick={onRetry}
              className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại bài</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
