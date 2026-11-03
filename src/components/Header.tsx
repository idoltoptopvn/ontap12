import React from 'react';
import { GraduationCap, Shuffle, RotateCcw, ListFilter, CheckCircle2, XCircle, Send } from 'lucide-react';

interface HeaderProps {
  currentIndex: number;
  totalCards: number;
  correctCount: number;
  wrongCount: number;
  selectedTopic: string;
  onSelectTopic: (topic: string) => void;
  onShuffle: () => void;
  onReset: () => void;
  onToggleDrawer: () => void;
  onSubmit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentIndex,
  totalCards,
  correctCount,
  wrongCount,
  selectedTopic,
  onSelectTopic,
  onShuffle,
  onReset,
  onToggleDrawer,
  onSubmit,
}) => {
  const topics = [
    { id: 'all', label: 'Tất cả chủ đề' },
    { id: 'A', label: 'Chủ đề A: Trí tuệ nhân tạo (AI)' },
    { id: 'B', label: 'Chủ đề B: Mạng máy tính' },
    { id: 'D', label: 'Chủ đề D: Đạo đức & Pháp luật số' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Ôn Luyện Tin Học 12</span>
              <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 hidden sm:inline-block">
                GK1 2026-27
              </span>
            </h1>
          </div>
        </div>

        {/* Center: Topic dropdown */}
        <div className="flex-1 max-w-xs hidden md:block">
          <select
            value={selectedTopic}
            onChange={(e) => onSelectTopic(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Live Score Counter & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Score Counter */}
          <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-700" title="Số câu đúng">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{correctCount}</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-rose-700" title="Số câu sai">
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>{wrongCount}</span>
            </span>
          </div>

          {/* Shuffle button */}
          <button
            onClick={onShuffle}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            title="Đảo ngẫu nhiên câu hỏi"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Reset button */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            title="Làm lại từ đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Drawer / Question index button */}
          <button
            onClick={onToggleDrawer}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Xem danh sách tất cả các câu"
          >
            <ListFilter className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">
              {currentIndex + 1}/{totalCards}
            </span>
          </button>

          {/* Submit Exam Button */}
          {onSubmit && (
            <button
              onClick={onSubmit}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Nộp bài và lưu điểm vào hệ thống"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nộp bài</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Topic bar */}
      <div className="md:hidden px-4 pb-2 pt-1 border-t border-slate-100 bg-slate-50">
        <select
          value={selectedTopic}
          onChange={(e) => onSelectTopic(e.target.value)}
          className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700"
        >
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Thin clean progress bar */}
      <div className="w-full bg-slate-200 h-1">
        <div
          className="bg-blue-600 h-1 transition-all duration-300"
          style={{
            width: `${totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0}%`,
          }}
        />
      </div>
    </header>
  );
};
