import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';
import { questionHash, scopedQuestionHash } from '@/lib/deduplicate';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;

const payload = z.object({ questions: z.array(z.string().trim().min(1).max(30000)).min(1).max(100) });

export async function POST(request: NextRequest) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const user = await currentUser();
  if (!user) return apiJson(request, { error: 'Unauthorized' }, 401);
  if (!user.teamId) return apiJson(request, { error: 'Set your team code before checking questions.' }, 400);
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson(request, { error: 'Invalid question list.' }, 400);

  const teamId = user.teamId;
  const scopedHashes = parsed.data.questions.map(text => scopedQuestionHash(teamId, text));
  const legacyHashes = parsed.data.questions.map(questionHash);
  const [direct, aliases, legacy] = await Promise.all([
    prisma.question.findMany({ where: { hash: { in: scopedHashes }, folder: { teamId } }, select: { hash: true } }),
    prisma.questionAlias.findMany({ where: { hash: { in: scopedHashes }, question: { folder: { teamId } } }, select: { hash: true } }),
    prisma.question.findMany({ where: { hash: { in: legacyHashes }, folder: { teamId } }, select: { hash: true } })
  ]);
  const known = new Set([...direct, ...aliases, ...legacy].map(item => item.hash));
  return apiJson(request, {
    existing: scopedHashes.map((hash, index) => known.has(hash) || known.has(legacyHashes[index]))
  });
}
