import { createHash } from 'node:crypto';

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim();
}

export function normalizeText(value: string): string {
  return stripHtml(value).normalize('NFKC').toLowerCase();
}

export function questionHash(value: string): string {
  return createHash('sha256').update(normalizeText(value)).digest('hex');
}

export function scopedQuestionHash(teamId: string, value: string): string {
  return createHash('sha256').update(teamId).update('\0').update(normalizeText(value)).digest('hex');
}
