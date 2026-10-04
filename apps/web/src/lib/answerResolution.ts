type AnswerableQuestion = {
  answerSource: 'CANVAS' | 'USER' | 'MODERATOR' | null;
  hasConflict: boolean;
  choices: { isCorrect: boolean | null }[];
};

export function canSetTeamAnswer(question: AnswerableQuestion): boolean {
  if (question.hasConflict) return false;
  const userAnswer = question.answerSource === 'USER';
  if (!userAnswer && question.choices.some(choice => choice.isCorrect === true)) return false;
  return question.choices.some(choice => userAnswer || choice.isCorrect !== false);
}
