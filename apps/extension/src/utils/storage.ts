import type { StagedAttempt } from '../types/canvas';

const prefix = 'staged_attempts_';

export async function saveAttempt(attempt: StagedAttempt): Promise<void> {
  await chrome.storage.local.set({ [prefix + attempt.quizId]: attempt });
}

export async function listAttempts(): Promise<StagedAttempt[]> {
  const items = await chrome.storage.local.get(null);
  return Object.entries(items)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, value]) => value as StagedAttempt)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function removeAttempts(ids: string[]): Promise<void> {
  await chrome.storage.local.remove(ids.map(id => prefix + id));
}
