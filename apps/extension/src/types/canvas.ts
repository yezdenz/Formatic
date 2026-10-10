export interface ScrapedChoice {
  text: string;
  isCorrect: boolean | null;
  isSelected: boolean;
  canvasAnswerId?: string;
}

export interface ScrapedBlank {
  key: string;
  label: string;
  submittedText?: string;
  correctAnswers: string[];
}

export interface ScrapedQuestion {
  canvasQuestionId: string;
  questionType?: 'MULTIPLE_CHOICE' | 'MULTIPLE_ANSWERS' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'FILL_IN_MULTIPLE_BLANKS' | 'ESSAY';
  courseTitle?: string;
  quizTitle?: string;
  questionText: string;
  choices: ScrapedChoice[];
  blanks?: ScrapedBlank[];
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
