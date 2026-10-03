export interface StudyQuestion {
  id: string;
  text: string;
  plainText: string;
  explanation: string | null;
  isVerified: boolean;
  timesEncountered: number;
  questionType: string;
  choices: { id: string; text: string; isCorrect: boolean | null }[];
}
