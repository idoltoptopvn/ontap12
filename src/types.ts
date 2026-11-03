export type QuestionType = 'single_choice' | 'true_false' | 'short_answer';

export interface TFSubQuestion {
  id: string; // e.g. 'a', 'b', 'c', 'd'
  label: string; // 'a)', 'b)', 'c)', 'd)'
  text: string;
  isTrue: boolean;
  explanation?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  topic: string;
  section: string;
  questionNumber: number;
  question: string;
  options?: string[]; // 4 options for single_choice
  correctAnswer?: number; // 0 for A, 1 for B, 2 for C, 3 for D
  tfSubQuestions?: TFSubQuestion[]; // 4 sub-items for true_false
  correctShortAnswer?: string[]; // Acceptable normalized variations for short_answer
  explanation?: string;
  ocrNote?: string;
}

export type QuizMode = 'practice' | 'exam' | 'random';

export interface UserAnswers {
  singleChoice: Record<string, number>; // questionId -> optionIndex
  trueFalse: Record<string, Record<string, boolean>>; // questionId -> subId -> boolean
  shortAnswer: Record<string, string>; // questionId -> string
}

export interface QuizResult {
  score: number; // 0 to 10
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  completedAt: string;
  mode: QuizMode;
  userAnswers: UserAnswers;
}
