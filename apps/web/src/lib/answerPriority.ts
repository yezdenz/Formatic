import { normalizeText } from './deduplicate';

type Candidate = {
  choices: ReadonlyArray<{ isCorrect?: boolean | null }>;
  answerSource: string | null;
  hasConflict: boolean;
};

export function shouldPreferIncomingAnswer(existing: Candidate, incoming: Candidate): boolean {
  if (existing.hasConflict || incoming.hasConflict || !incoming.choices.some(choice => choice.isCorrect === true)) return false;
  if (!existing.choices.some(choice => choice.isCorrect === true)) return true;
  return existing.answerSource === 'USER' && incoming.answerSource === 'CANVAS';
}

export function userAnswerDisproved(existing: {
  answerSource: string | null;
  questionType: string;
  choices: ReadonlyArray<{ text: string; isCorrect?: boolean | null }>;
}, incomingChoices: ReadonlyArray<{ text: string; isCorrect?: boolean | null }>): boolean {
  if (existing.answerSource !== 'USER' || existing.questionType === 'MULTIPLE_ANSWERS') return false;
  const selected = new Set(existing.choices.filter(choice => choice.isCorrect === true).map(choice => normalizeText(choice.text)));
  return incomingChoices.some(choice => choice.isCorrect === false && selected.has(normalizeText(choice.text)));
}
