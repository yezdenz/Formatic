import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';
import { canModerate } from '@/lib/permissions';
import { scopedQuestionHash, stripHtml } from '@/lib/deduplicate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;
const input = z.object({
  questionText: z.string().trim().min(1).max(30000).optional(),
  folderId: z.string().uuid().optional(),
  explanation: z.string().max(30000).nullable().optional(),
  choices: z.array(z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(5000).optional(), isCorrect: z.boolean().nullable() })).optional(),
  hasConflict: z.boolean().optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const user = await currentUser();
  if (!user || !canModerate(user)) return apiJson(request, { error: 'Moderator access required.' }, 403);
  const { id } = await params;
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson(request, { error: 'Invalid question update.' }, 400);
  const existing = await prisma.question.findUnique({ where: { id }, include: { choices: true, folder: true } });
  if (!existing || existing.folder.teamId !== user.teamId) return apiJson(request, { error: 'Question not found.' }, 404);
  if (parsed.data.choices?.some(choice => !existing.choices.some(item => item.id === choice.id))) return apiJson(request, { error: 'Choice does not belong to question.' }, 400);
  if (parsed.data.folderId && !await prisma.folder.findFirst({ where: { id: parsed.data.folderId, teamId: user.teamId } })) return apiJson(request, { error: 'Destination folder not found.' }, 404);
  const answerChanged = !!parsed.data.choices?.some(choice => choice.isCorrect !== existing.choices.find(item => item.id === choice.id)?.isCorrect) ||
    (existing.hasConflict && parsed.data.hasConflict === false);
  const nextHash = parsed.data.questionText && user.teamId ? scopedQuestionHash(user.teamId, parsed.data.questionText) : existing.hash;
  if (nextHash !== existing.hash) {
    const [duplicate, alias] = await Promise.all([
      prisma.question.findUnique({ where: { hash: nextHash }, select: { id: true } }),
      prisma.questionAlias.findUnique({ where: { hash: nextHash }, select: { questionId: true } })
    ]);
    if ((duplicate && duplicate.id !== id) || (alias && alias.questionId !== id)) return apiJson(request, { error: 'This question text already exists in the repository.' }, 409);
  }
  try {
    const updated = await prisma.$transaction(async tx => {
      for (const choice of parsed.data.choices || []) await tx.choice.update({ where: { id: choice.id }, data: { text: choice.text, isCorrect: choice.isCorrect } });
      const choices = await tx.choice.findMany({ where: { questionId: id } });
      const question = await tx.question.update({ where: { id }, data: {
        ...(parsed.data.questionText ? { text: parsed.data.questionText, plainText: stripHtml(parsed.data.questionText), hash: nextHash } : {}),
        ...(parsed.data.folderId ? { folderId: parsed.data.folderId } : {}),
        explanation: parsed.data.explanation === undefined ? existing.explanation : parsed.data.explanation,
        hasConflict: parsed.data.hasConflict ?? existing.hasConflict,
        isVerified: choices.some(choice => choice.isCorrect === true),
        answerSource: answerChanged ? (choices.some(choice => choice.isCorrect === true) ? 'MODERATOR' : null) : existing.answerSource
      } });
      if (nextHash !== existing.hash) await tx.questionAlias.upsert({ where: { hash: existing.hash }, update: { questionId: id }, create: { hash: existing.hash, questionId: id } });
      await tx.adminLog.create({ data: { adminId: user.id, action: 'UPDATE_QUESTION', targetId: id, details: JSON.stringify({ before: existing, changes: parsed.data }) } });
      return { ...question, choices };
    });
    return apiJson(request, updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return apiJson(request, { error: 'This question text already exists in the repository.' }, 409);
    throw error;
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin && origin !== `chrome-extension://${process.env.EXTENSION_ID}`) return apiJson(request, { error: 'Origin denied.' }, 403);
  const user = await currentUser();
  if (!user || !canModerate(user)) return apiJson(request, { error: 'Moderator access required.' }, 403);
  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id }, include: { folder: true, choices: true, aliases: true, pushItems: true } });
  if (!existing || existing.folder.teamId !== user.teamId) return apiJson(request, { error: 'Question not found.' }, 404);
  await prisma.$transaction(async tx => {
    await tx.adminLog.create({ data: { adminId: user.id, action: 'DELETE_QUESTION', targetId: id, details: JSON.stringify({ snapshot: existing }) } });
    await tx.question.delete({ where: { id } });
  });
  return apiJson(request, { deleted: true });
}
