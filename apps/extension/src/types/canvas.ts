export interface ScrapedChoice {
  text: string;
  isCorrect: boolean | null;
  isSelected: boolean;
  canvasAnswerId?: string;
}

export interface ScrapedQuestion {
  canvasQuestionId: string;
  questionType?: 'MULTIPLE_CHOICE' | 'MULTIPLE_ANSWERS' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  courseTitle?: string;
  quizTitle?: string;
  questionText: string;
  choices: ScrapedChoice[];
  explanation?: string;
  isPostSubmission: boolean;
  timestamp: number;
}

export interface StagedAttempt {
  quizId: string;
  sourceUrl: string;
  questions: ScrapedQuestion[];
  updatedAt: number;
}
