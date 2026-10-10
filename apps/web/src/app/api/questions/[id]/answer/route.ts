import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';
import { canSetTeamAnswer } from '@/lib/answerResolution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;

const input = z.object({ choiceIds: z.array(z.string().uuid()).min(1).max(100) });
const blankInput = z.object({ blankKey: z.string().min(1).max(100), answer: z.string().trim().min(1).max(5000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const user = await currentUser();
  if (!user?.teamId) return apiJson(request, { error: 'Sign in and join a team to set an answer.' }, 401);
  const body = await request.json().catch(() => null);
  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id }, include: { folder: true, choices: true, blanks: true } });
  if (!question || question.folder.teamId !== user.teamId) return apiJson(request, { error: 'Question not found.' }, 404);
  if (question.questionType === 'SHORT_ANSWER' || question.questionType === 'FILL_IN_MULTIPLE_BLANKS') {
    const parsed = blankInput.safeParse(body);
    if (!parsed.success) return apiJson(request, { error: 'Enter an answer for one blank.' }, 400);
    const blank = question.blanks.find(item => item.key === parsed.data.blankKey);
    if (!blank) return apiJson(request, { error: 'Blank not found.' }, 404);
    const saved = await prisma.$transaction(async tx => {
      const changed = await tx.questionBlank.updateMany({
        where: { id: blank.id, OR: [{ answerSource: null }, { answerSource: 'USER' }] },
        data: { correctAnswers: [parsed.data.answer], answerSource: 'USER' }
      });
      if (!changed.count) return false;
      const blanks = await tx.questionBlank.findMany({ where: { questionId: id } });
      await tx.question.update({ where: { id }, data: {
        isVerified: blanks.every(item => item.correctAnswers.length > 0),
        answerSource: blanks.some(item => item.answerSource === 'CANVAS') ? 'CANVAS' : 'USER'
      } });
      await tx.adminLog.create({ data: { adminId: user.id, action: blank.answerSource === 'USER' ? 'USER_UPDATE_ANSWER' : 'USER_SET_ANSWER',
        targetId: id, details: JSON.stringify({ blankKey: blank.key }) } });
      return true;
    });
    if (!saved) return apiJson(request, { error: 'Canvas confirmed this answer. Refresh the question.' }, 409);
    return apiJson(request, { resolved: true });
  }
  const parsed = input.safeParse(body);
  if (!parsed.success) return apiJson(request, { error: 'Choose at least one answer.' }, 400);
  const choiceIds = [...new Set(parsed.data.choiceIds)];
  const userAnswer = question.answerSource === 'USER';
  if (!canSetTeamAnswer(question)) {
    return apiJson(request, { error: 'This answer is protected or needs moderator review.' }, 409);
  }
  if ((question.questionType !== 'MULTIPLE_ANSWERS' && choiceIds.length !== 1) ||
      choiceIds.some(choiceId => !question.choices.some(choice => choice.id === choiceId && (userAnswer || choice.isCorrect !== false)))) {
    return apiJson(request, { error: 'Choose a valid answer for this question.' }, 400);
  }

  const resolved = await prisma.$transaction(async tx => {
    const claimed = await tx.question.updateMany({
      where: { id, hasConflict: false, OR: [
        { answerSource: 'USER' },
        { choices: { none: { isCorrect: true } } }
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
