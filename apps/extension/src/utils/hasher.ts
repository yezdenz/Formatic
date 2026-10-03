export function normalizeQuestionText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

export async function hashQuestion(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeQuestionText(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
