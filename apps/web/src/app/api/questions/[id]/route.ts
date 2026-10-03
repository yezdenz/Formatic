import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;
const input = z.object({ explanation: z.string().max(30000).nullable().optional(), choices: z.array(z.object({ id: z.string().uuid(), isCorrect: z.boolean().nullable() })).optional(), hasConflict: z.boolean().optional() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const user = await currentUser();
  if (user?.role !== 'ADMIN') return apiJson(request, { error: 'Admin access required.' }, 403);
  const { id } = await params;
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson(request, { error: 'Invalid question update.' }, 400);
  const existing = await prisma.question.findUnique({ where: { id }, include: { choices: true, folder: true } });
  if (!existing || existing.folder.teamId !== user.teamId) return apiJson(request, { error: 'Question not found.' }, 404);
  if (parsed.data.choices?.some(choice => !existing.choices.some(item => item.id === choice.id))) return apiJson(request, { error: 'Choice does not belong to question.' }, 400);
  const updated = await prisma.$transaction(async tx => {
    for (const choice of parsed.data.choices || []) await tx.choice.update({ where: { id: choice.id }, data: { isCorrect: choice.isCorrect } });
    const choices = await tx.choice.findMany({ where: { questionId: id } });
    const question = await tx.question.update({ where: { id }, data: {
      explanation: parsed.data.explanation === undefined ? existing.explanation : parsed.data.explanation,
      hasConflict: parsed.data.hasConflict ?? existing.hasConflict,
      isVerified: choices.some(choice => choice.isCorrect === true)
    } });
    await tx.adminLog.create({ data: { adminId: user.id, action: 'UPDATE_QUESTION', targetId: id, details: JSON.stringify(parsed.data) } });
    return { ...question, choices };
  });
  return apiJson(request, updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin && origin !== `chrome-extension://${process.env.EXTENSION_ID}`) return apiJson(request, { error: 'Origin denied.' }, 403);
  const user = await currentUser();
  if (user?.role !== 'ADMIN') return apiJson(request, { error: 'Admin access required.' }, 403);
  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id }, include: { folder: true } });
  if (!existing || existing.folder.teamId !== user.teamId) return apiJson(request, { error: 'Question not found.' }, 404);
  await prisma.$transaction(async tx => {
    await tx.pushBatchItem.deleteMany({ where: { questionId: id } });
    await tx.question.delete({ where: { id } });
    await tx.adminLog.create({ data: { adminId: user.id, action: 'DELETE_QUESTION', targetId: id } });
  });
  return apiJson(request, { deleted: true });
}
