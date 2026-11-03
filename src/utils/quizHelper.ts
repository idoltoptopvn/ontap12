import { Question, UserAnswers } from '../types';

// LocalStorage helpers
const STORAGE_KEY_PROGRESS = 'eduquiz_flashcard_progress_v2';

export interface FlashcardProgress {
  answers: UserAnswers;
  bookmarks: Record<string, boolean>;
  currentIndex: number;
  selectedTopic: string;
}

export function saveFlashcardProgress(data: FlashcardProgress) {
  try {
    localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save progress', e);
  }
}

export function loadFlashcardProgress(): FlashcardProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearFlashcardProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY_PROGRESS);
  } catch {}
}

export function calculateSummary(questions: Question[], answers?: UserAnswers | null) {
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const safeAnswers: UserAnswers = {
    singleChoice: answers?.singleChoice || {},
    trueFalse: answers?.trueFalse || {},
    shortAnswer: answers?.shortAnswer || {},
  };

  (questions || []).forEach((q) => {
    if (q.type === 'single_choice') {
      const choice = safeAnswers.singleChoice[q.id];
      if (choice === undefined) {
        unansweredCount++;
      } else if (choice === q.correctAnswer) {
        correctCount++;
      } else {
        wrongCount++;
      }
    } else if (q.type === 'true_false') {
      const qAns = safeAnswers.trueFalse[q.id] || {};
      const subQuestions = q.tfSubQuestions || [];
      const answeredKeys = Object.keys(qAns);
      if (answeredKeys.length === 0) {
        unansweredCount++;
      } else {
        const isAllCorrect = subQuestions.every(
          (sub) => qAns[sub.id] !== undefined && qAns[sub.id] === sub.isTrue
        );
        if (isAllCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    } else if (q.type === 'short_answer') {
      const text = safeAnswers.shortAnswer[q.id]?.trim().toLowerCase();
      if (!text) {
        unansweredCount++;
      } else {
        const match = q.correctShortAnswer?.some((ans) => {
          const c = ans.trim().toLowerCase();
          return text === c || text.replace(/\s+/g, '') === c.replace(/\s+/g, '');
        });
        if (match) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    }
  });

  return {
    correctCount,
    wrongCount,
    unansweredCount,
    total: questions.length,
    percentage: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
  };
}

export function calculateScore(
  questions: Question[],
  answers: UserAnswers,
  timeSpentSeconds: number = 0,
  mode: string = 'exam'
) {
  const summary = calculateSummary(questions, answers || { singleChoice: {}, trueFalse: {}, shortAnswer: {} });
  const rawScore = questions.length > 0 ? (summary.correctCount / questions.length) * 10 : 0;
  const score = Math.round(rawScore * 10) / 10;

  return {
    score,
    correctCount: summary.correctCount,
    wrongCount: summary.wrongCount,
    unansweredCount: summary.unansweredCount,
    totalQuestions: questions.length,
    percentage: summary.percentage,
    passed: score >= 5.0,
    timeSpentSeconds,
    mode,
  };
}
