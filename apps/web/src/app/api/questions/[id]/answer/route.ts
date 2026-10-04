import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;

const input = z.object({ choiceIds: z.array(z.string().uuid()).min(1).max(100) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const user = await currentUser();
  if (!user?.teamId) return apiJson(request, { error: 'Sign in and join a team to set an answer.' }, 401);
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson(request, { error: 'Choose at least one answer.' }, 400);
  const choiceIds = [...new Set(parsed.data.choiceIds)];
  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id }, include: { folder: true, choices: true } });
  if (!question || question.folder.teamId !== user.teamId) return apiJson(request, { error: 'Question not found.' }, 404);
  const userAnswer = question.answerSource === 'USER';
  const unresolved = !question.isVerified && !question.choices.some(choice => choice.isCorrect === true);
  if (question.hasConflict || (!userAnswer && !unresolved)) {
    return apiJson(request, { error: 'This answer is protected or needs moderator review.' }, 409);
  }
  if (!['MULTIPLE_CHOICE', 'MULTIPLE_ANSWERS', 'TRUE_FALSE'].includes(question.questionType) ||
      (question.questionType !== 'MULTIPLE_ANSWERS' && choiceIds.length !== 1) ||
      choiceIds.some(choiceId => !question.choices.some(choice => choice.id === choiceId && (userAnswer || choice.isCorrect !== false)))) {
    return apiJson(request, { error: 'Choose a valid answer for this question.' }, 400);
  }

  const resolved = await prisma.$transaction(async tx => {
    const claimed = await tx.question.updateMany({
      where: { id, hasConflict: false, OR: [
        { answerSource: 'USER' },
        { isVerified: false, choices: { none: { isCorrect: true } } }
      ] },
      data: { isVerified: true, answerSource: 'USER' }
    });
    if (!claimed.count) return false;
    await tx.choice.updateMany({ where: { questionId: id }, data: { isCorrect: false } });
    await tx.choice.updateMany({ where: { questionId: id, id: { in: choiceIds } }, data: { isCorrect: true } });
    await tx.adminLog.create({ data: {
      adminId: user.id, action: userAnswer ? 'USER_UPDATE_ANSWER' : 'USER_SET_ANSWER', targetId: id,
      details: JSON.stringify({ choiceIds })
    } });
    return true;
  });
  if (!resolved) return apiJson(request, { error: 'Another answer was saved first. Refresh the question.' }, 409);
  return apiJson(request, { resolved: true });
}
