import React, { useState, useEffect } from 'react';
import { Question, UserAnswers } from '../types';
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Bookmark,
  Lightbulb,
  Send,
  AlertCircle,
  Keyboard,
} from 'lucide-react';

interface FlashcardProps {
  question: Question;
  cardIndex: number;
  totalCards: number;
  userAnswers: UserAnswers;
  onAnswerSingleChoice: (questionId: string, optionIndex: number) => void;
  onAnswerTrueFalse: (questionId: string, subId: string, value: boolean) => void;
  onAnswerShortAnswer: (questionId: string, text: string) => void;
  isBookmarked: boolean;
  onToggleBookmark: (questionId: string) => void;
  onNext: () => void;
  onPrev: () => void;
  canNext: boolean;
  canPrev: boolean;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  question,
  cardIndex,
  totalCards,
  userAnswers,
  onAnswerSingleChoice,
  onAnswerTrueFalse,
  onAnswerShortAnswer,
  isBookmarked,
  onToggleBookmark,
  onNext,
  onPrev,
  canNext,
  canPrev,
}) => {
  const letters = ['A', 'B', 'C', 'D'];

  // Single choice state
  const singleChoice = userAnswers.singleChoice[question.id];
  const isSingleAnswered = singleChoice !== undefined;
  const isSingleCorrect = isSingleAnswered && singleChoice === question.correctAnswer;

  // True/False state
  const tfAnswers = userAnswers.trueFalse[question.id] || {};
  const tfSubs = question.tfSubQuestions || [];
  const allTfAnswered = tfSubs.length > 0 && tfSubs.every((sub) => tfAnswers[sub.id] !== undefined);
  const tfCorrectCount = tfSubs.filter(
    (sub) => tfAnswers[sub.id] !== undefined && tfAnswers[sub.id] === sub.isTrue
  ).length;

  // Short answer state
  const [shortInput, setShortInput] = useState<string>(
    userAnswers.shortAnswer[question.id] || ''
  );
  useEffect(() => {
    setShortInput(userAnswers.shortAnswer[question.id] || '');
  }, [question.id, userAnswers.shortAnswer]);

  const currentShortAnswer = userAnswers.shortAnswer[question.id];
  const isShortAnswered = currentShortAnswer !== undefined && currentShortAnswer.trim().length > 0;
  const isShortCorrect =
    isShortAnswered &&
    question.correctShortAnswer?.some((ans) => {
      const u = currentShortAnswer.trim().toLowerCase();
      const c = ans.trim().toLowerCase();
      return u === c || u.replace(/\s+/g, '') === c.replace(/\s+/g, '');
    });

  // Check if current card is answered & revealed
  const isCardAnswered =
    question.type === 'single_choice'
      ? isSingleAnswered
      : question.type === 'true_false'
      ? allTfAnswered
      : isShortAnswered;

  const handleSelectOption = (idx: number) => {
    if (isSingleAnswered) return; // Locked once chosen
    onAnswerSingleChoice(question.id, idx);
  };

  const handleSelectTF = (subId: string, val: boolean) => {
    if (tfAnswers[subId] !== undefined) return; // Locked once chosen
    onAnswerTrueFalse(question.id, subId, val);
  };

  const handleConfirmShort = () => {
    if (!shortInput.trim() || isShortAnswered) return;
    onAnswerShortAnswer(question.id, shortInput.trim());
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-3 px-2 sm:px-4">
      {/* Main Flashcard Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200">
        {/* Card Header */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
              Câu {cardIndex + 1} / {totalCards}
            </span>
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">
              {question.section}
            </span>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={() => onToggleBookmark(question.id)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isBookmarked
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
            title="Đánh dấu câu hỏi này"
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
          </button>
        </div>

        {/* Card Content Body */}
        <div className="p-5 sm:p-7 space-y-5">
          {/* Question Topic Category */}
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {question.topic}
          </div>

          {/* Question Text */}
          <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
            {question.question}
          </div>

          {/* OCR / Note alert if present */}
          {question.ocrNote && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Lưu ý đề cương:</strong> {question.ocrNote}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 1. TRẮC NGHIỆM 4 ĐÁP ÁN (FLASHCARD CHOICES)              */}
          {/* ========================================================= */}
          {question.type === 'single_choice' && question.options && (
            <div className="space-y-2.5">
              {question.options.map((optionText, idx) => {
                const isSelected = singleChoice === idx;
                const isCorrectOption = idx === question.correctAnswer;

                let btnStyles =
                  'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/20 text-slate-800 cursor-pointer';
                let circleStyles = 'border-slate-300 text-slate-600 bg-slate-50';

                if (isSingleAnswered) {
                  btnStyles = 'cursor-default ';
                  if (isCorrectOption) {
                    btnStyles += 'border-emerald-600 bg-emerald-50 text-emerald-950 font-medium';
                    circleStyles = 'border-emerald-600 bg-emerald-600 text-white';
                  } else if (isSelected && !isCorrectOption) {
                    btnStyles += 'border-rose-500 bg-rose-50 text-rose-950';
                    circleStyles = 'border-rose-500 bg-rose-500 text-white';
                  } else {
                    btnStyles += 'border-slate-100 bg-slate-50/50 opacity-60 text-slate-500';
                    circleStyles = 'border-slate-200 text-slate-400 bg-slate-100';
                  }
                }

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors select-none ${btnStyles}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${circleStyles}`}
                    >
                      {letters[idx]}
                    </div>
                    <div className="flex-1 text-sm leading-relaxed pt-0.5">
                      {optionText}
                    </div>
                    {isSingleAnswered && (
                      <div className="shrink-0 self-center">
                        {isCorrectOption ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : isSelected ? (
                          <XCircle className="w-5 h-5 text-rose-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. TRẮC NGHIỆM ĐÚNG / SAI                                */}
          {/* ========================================================= */}
          {question.type === 'true_false' && question.tfSubQuestions && (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-500">
                (Chọn Đúng hoặc Sai cho mỗi ý bên dưới để xem đáp án)
              </div>
              {question.tfSubQuestions.map((sub) => {
                const currentVal = tfAnswers[sub.id];
                const isAnswered = currentVal !== undefined;
                const isCorrectVal = isAnswered && currentVal === sub.isTrue;

                return (
                  <div
                    key={sub.id}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      isAnswered
                        ? isCorrectVal
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : 'border-rose-300 bg-rose-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-sm text-slate-800 flex-1">
                        <span className="font-bold text-blue-700 mr-2">{sub.label}</span>
                        {sub.text}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          disabled={isAnswered}
                          onClick={() => handleSelectTF(sub.id, true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            currentVal === true
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          } ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          Đúng
                        </button>
                        <button
                          type="button"
                          disabled={isAnswered}
                          onClick={() => handleSelectTF(sub.id, false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                            currentVal === false
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          } ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          Sai
                        </button>
                      </div>
                    </div>

                    {isAnswered && (
                      <div className="mt-2 pt-2 border-t border-slate-200 text-xs flex items-center justify-between">
                        <span className="text-slate-600">
                          Đáp án đúng:{' '}
                          <strong className={sub.isTrue ? 'text-blue-700' : 'text-rose-600'}>
                            {sub.isTrue ? 'ĐÚNG' : 'SAI'}
                          </strong>
                        </span>
                        <span
                          className={
                            isCorrectVal ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'
                          }
                        >
                          {isCorrectVal ? '✓ Chính xác' : '✗ Chưa đúng'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. TRẢ LỜI NGẮN                                          */}
          {/* ========================================================= */}
          {question.type === 'short_answer' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={isShortAnswered}
                  value={shortInput}
                  onChange={(e) => setShortInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmShort();
                  }}
                  placeholder="Nhập câu trả lời ngắn..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:outline-none text-slate-800 text-sm outline-none transition-colors disabled:bg-slate-100 disabled:text-slate-600"
                />
                {!isShortAnswered && (
                  <button
                    onClick={handleConfirmShort}
                    disabled={!shortInput.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kiểm tra</span>
                  </button>
                )}
              </div>

              {isShortAnswered && question.correctShortAnswer && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                  <strong>Đáp án chuẩn chấp nhận: </strong>
                  {question.correctShortAnswer.join(' / ')}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* INSTANT REVEAL & EXPLANATION CARD                         */}
          {/* ========================================================= */}
          {isCardAnswered && (
            <div className="mt-6 pt-5 border-t border-slate-200 space-y-3.5 animate-in fade-in duration-200">
              {/* Status Header */}
              {question.type === 'single_choice' && (
                isSingleCorrect ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-900 text-sm">
                        Chính xác!
                      </div>
                      <div className="text-xs text-emerald-800 mt-0.5">
                        Bạn đã chọn đúng đáp án <strong>{letters[question.correctAnswer!]}</strong>.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-rose-900 text-sm">
                        Chưa chính xác!
                      </div>
                      <div className="text-xs text-rose-800 mt-0.5">
                        Đáp án đúng là: <strong>{letters[question.correctAnswer!]}</strong> ({question.options?.[question.correctAnswer!]})
                      </div>
                    </div>
                  </div>
                )
              )}

              {question.type === 'true_false' && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      Đã hoàn thành thẻ Đúng / Sai
                    </div>
                    <div className="text-xs text-slate-700 mt-0.5">
                      Bạn đã trả lời đúng {tfCorrectCount} / {tfSubs.length} ý.
                    </div>
                  </div>
                </div>
              )}

              {question.type === 'short_answer' && (
                isShortCorrect ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="font-bold text-emerald-900 text-sm">
                      Chính xác!
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-rose-900 text-sm">
                        Chưa chính xác!
                      </div>
                      <div className="text-xs text-rose-800 mt-0.5">
                        Đáp án đúng: <strong>{question.correctShortAnswer?.join(' hoặc ')}</strong>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Explanation Card */}
              {question.explanation && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 mb-1">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span>Lời giải chi tiết:</span>
                  </div>
                  <p className="text-slate-700">{question.explanation}</p>
                </div>
              )}

              {/* NEXT CARD CALL TO ACTION BUTTON */}
              <div className="pt-2 flex justify-end">
                {canNext ? (
                  <button
                    onClick={onNext}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Câu tiếp theo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-full text-center p-3 rounded-xl bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-200">
                    Bạn đã xem hết toàn bộ các câu trong phần ôn tập này!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card Navigation Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
          <button
            onClick={onPrev}
            disabled={!canPrev}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              canPrev
                ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Câu trước</span>
          </button>

          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="font-semibold text-slate-800">{cardIndex + 1}</span>
            <span>/</span>
            <span>{totalCards}</span>
          </div>

          <button
            onClick={onNext}
            disabled={!canNext}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
              canNext
                ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs cursor-pointer'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <span>Câu sau</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtle Keyboard Shortcuts Guide */}
      <div className="mt-2.5 hidden sm:flex items-center justify-center gap-3 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Keyboard className="w-3.5 h-3.5 text-slate-400" />
          <span>Phím tắt:</span>
        </span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">A</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">B</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">C</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">D</kbd> chọn đáp án</span>
        <span>•</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[10px]">→</kbd> chuyển câu</span>
      </div>
    </div>
  );
};
