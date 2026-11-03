import React, { useState } from 'react';
import { Question, UserAnswers } from '../types';
import { X } from 'lucide-react';

interface CardDeckDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  currentIndex: number;
  onSelectCard: (index: number) => void;
  userAnswers: UserAnswers;
  bookmarks: Record<string, boolean>;
  onStudyMistakes?: () => void;
  wrongCount?: number;
}

export const CardDeckDrawer: React.FC<CardDeckDrawerProps> = ({
  isOpen,
  onClose,
  questions,
  currentIndex,
  onSelectCard,
  userAnswers,
  bookmarks,
  onStudyMistakes,
  wrongCount = 0,
}) => {
  const [filter, setFilter] = useState<'all' | 'wrong' | 'unanswered' | 'bookmarked'>('all');

  if (!isOpen) return null;

  const getCardStatus = (q: Question) => {
    if (q.type === 'single_choice') {
      const choice = userAnswers.singleChoice[q.id];
      if (choice === undefined) return 'unanswered';
      return choice === q.correctAnswer ? 'correct' : 'wrong';
    }
    if (q.type === 'true_false') {
      const qAns = userAnswers.trueFalse[q.id] || {};
      const subs = q.tfSubQuestions || [];
      if (Object.keys(qAns).length === 0) return 'unanswered';
      const allRight = subs.every((s) => qAns[s.id] !== undefined && qAns[s.id] === s.isTrue);
      return allRight ? 'correct' : 'wrong';
    }
    if (q.type === 'short_answer') {
      const txt = userAnswers.shortAnswer[q.id]?.trim().toLowerCase();
      if (!txt) return 'unanswered';
      const isOk = q.correctShortAnswer?.some((a) => {
        const c = a.trim().toLowerCase();
        return txt === c || txt.replace(/\s+/g, '') === c.replace(/\s+/g, '');
      });
      return isOk ? 'correct' : 'wrong';
    }
    return 'unanswered';
  };

  const filteredCards = questions
    .map((q, idx) => ({ q, idx, status: getCardStatus(q), isBookmarked: !!bookmarks[q.id] }))
    .filter((item) => {
      if (filter === 'wrong') return item.status === 'wrong';
      if (filter === 'unanswered') return item.status === 'unanswered';
      if (filter === 'bookmarked') return item.isBookmarked;
      return true;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Danh sách thẻ flashcard</h3>
            <p className="text-xs text-slate-500">Chạm vào số thẻ để chuyển đến câu hỏi đó</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-slate-100 flex gap-1.5 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({questions.length})
          </button>
          <button
            onClick={() => setFilter('wrong')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filter === 'wrong'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Câu sai
          </button>
          <button
            onClick={() => setFilter('unanswered')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filter === 'unanswered'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Chưa làm
          </button>
          <button
            onClick={() => setFilter('bookmarked')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filter === 'bookmarked'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Đã đánh dấu
          </button>
        </div>

        {/* Quick action to study mistakes if available */}
        {onStudyMistakes && wrongCount > 0 && (
          <div className="px-6 py-2 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between">
            <span className="text-xs text-rose-800 font-medium">
              Bạn đang có <strong>{wrongCount}</strong> câu trả lời chưa đúng.
            </span>
            <button
              onClick={onStudyMistakes}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              Học riêng câu sai
            </button>
          </div>
        )}

        {/* Card Grid */}
        <div className="p-6 overflow-y-auto flex-1 scrollbar-thin">
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2.5">
            {filteredCards.map(({ q, idx, status, isBookmarked }) => {
              const isCurrent = idx === currentIndex;
              let style = 'bg-white border-slate-200 text-slate-700 hover:border-blue-400';

              if (status === 'correct') {
                style = 'bg-emerald-500 text-white border-emerald-500 font-bold';
              } else if (status === 'wrong') {
                style = 'bg-rose-500 text-white border-rose-500 font-bold';
              }

              if (isCurrent) {
                style += ' ring-2 ring-indigo-500 ring-offset-2';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    onSelectCard(idx);
                    onClose();
                  }}
                  className={`relative aspect-square rounded-2xl border text-sm font-semibold flex items-center justify-center transition-all active:scale-95 cursor-pointer ${style}`}
                >
                  {isBookmarked && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full ring-2 ring-white" />
                  )}
                  <span>{idx + 1}</span>
                </button>
              );
            })}
          </div>

          {filteredCards.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400">
              Không có thẻ nào phù hợp với bộ lọc này.
            </div>
          )}
        </div>

        {/* Footer legend */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500" />
            <span>Đúng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500" />
            <span>Sai</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-white border border-slate-300" />
            <span>Chưa làm</span>
          </div>
        </div>
      </div>
    </div>
  );
};
