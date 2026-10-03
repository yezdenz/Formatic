export interface PushChoice { text: string; isCorrect?: boolean | null; isSelected?: boolean }
export interface PushQuestion {
  canvasQuestionId?: string;
  questionType?: 'MULTIPLE_CHOICE' | 'MULTIPLE_ANSWERS' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  questionText: string;
  choices: PushChoice[];
  explanation?: string;
  quizTitle?: string;
  courseTitle?: string;
}
export interface PushPayload { folderId: string; questions: PushQuestion[] }
export interface PushResult { newItems: number; mergedItems: number; batchId: string }
