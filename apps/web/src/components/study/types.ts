export interface StudyQuestion {
  id: string;
  text: string;
  plainText: string;
  explanation: string | null;
  isVerified: boolean;
  timesEncountered: number;
  questionType: string;
  choices: { id: string; text: string; isCorrect: boolean | null }[];
  blanks?: { id: string; key: string; label: string; correctAnswers: string[] }[];
}

export function answerText(question: StudyQuestion): string {
  if (question.blanks?.length) return question.blanks.map((blank, index) =>
    `${question.blanks!.length === 1 ? 'Answer' : blank.key || `Blank ${index + 1}`}: ${blank.correctAnswers.join(' / ') || 'Unresolved'}`
  ).join('; ');
  return question.choices.filter(choice => choice.isCorrect).map(choice => choice.text).join(', ') || 'Unresolved';
}
