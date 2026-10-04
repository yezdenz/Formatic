import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';
import { normalizeText } from '@/lib/deduplicate';
import { canModerate } from '@/lib/permissions';
import { shouldPreferIncomingAnswer } from '@/lib/answerPriority';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;
const input = z.object({ targetId: z.string().uuid(), sourceId: z.string().uuid() }).refine(value => value.targetId !== value.sourceId);

export async function POST(request: NextRequest) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const user = await currentUser();
  if (!user || !canModerate(user)) return apiJson(request, { error: 'Moderator access required.' }, 403);
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson(request, { error: 'Select two different questions.' }, 400);
  const { targetId, sourceId } = parsed.data;
  const merged = await prisma.$transaction(async tx => {
    const [target, source] = await Promise.all([
      tx.question.findUnique({ where: { id: targetId }, include: { choices: true, folder: true } }),
      tx.question.findUnique({ where: { id: sourceId }, include: { choices: true, folder: true } })
    ]);
    if (!target || !source || target.folder.teamId !== user.teamId || source.folder.teamId !== user.teamId) return null;
    const targetChoices = [...target.choices];
    const sourceCorrect = source.choices.filter(choice => choice.isCorrect === true).map(choice => normalizeText(choice.text));
    const targetCorrect = target.choices.filter(choice => choice.isCorrect === true).map(choice => normalizeText(choice.text));
    const sourceWins = shouldPreferIncomingAnswer(target, source);
    let hasConflict = target.hasConflict || source.hasConflict;
    if (!sourceWins && sourceCorrect.length && targetCorrect.length &&
        (sourceCorrect.length !== targetCorrect.length || sourceCorrect.some(text => !targetCorrect.includes(text)))) hasConflict = true;
    for (const choice of source.choices) {
      const found = targetChoices.find(item => normalizeText(item.text) === normalizeText(choice.text));
      if (!found) {
        await tx.choice.update({ where: { id: choice.id }, data: { questionId: targetId } });
        targetChoices.push({ ...choice, questionId: targetId });
      } else if (sourceWins) {
        const nextStatus = choice.isCorrect ?? (target.answerSource === 'USER' ? null : found.isCorrect);
        if (found.isCorrect !== nextStatus) await tx.choice.update({ where: { id: found.id }, data: { isCorrect: nextStatus } });
        found.isCorrect = nextStatus;
      } else if (found.isCorrect == null && choice.isCorrect != null) {
        await tx.choice.update({ where: { id: found.id }, data: { isCorrect: choice.isCorrect } });
        found.isCorrect = choice.isCorrect;
      } else if (found.isCorrect != null && choice.isCorrect != null && found.isCorrect !== choice.isCorrect) {
        hasConflict = true;
      }
    }
    if (sourceWins && target.answerSource === 'USER') {
      const sourceTexts = new Set(source.choices.map(choice => normalizeText(choice.text)));
      for (const choice of targetChoices) {
        if (!sourceTexts.has(normalizeText(choice.text)) && choice.isCorrect != null) {
          await tx.choice.update({ where: { id: choice.id }, data: { isCorrect: null } });
          choice.isCorrect = null;
        }
      }
    }
    await tx.pushBatchItem.updateMany({ where: { questionId: sourceId }, data: { questionId: targetId } });
    await tx.questionAlias.updateMany({ where: { questionId: sourceId }, data: { questionId: targetId } });
    await tx.questionAlias.create({ data: { hash: source.hash, questionId: targetId } });
    await tx.question.update({ where: { id: targetId }, data: {
      timesEncountered: { increment: source.timesEncountered },
      timesCorrect: { increment: source.timesCorrect },
      timesIncorrect: { increment: source.timesIncorrect },
      explanation: target.explanation || source.explanation,
      hasConflict,
      isVerified: targetChoices.some(choice => choice.isCorrect === true),
      ...(sourceWins ? {
        text: source.text, plainText: source.plainText, questionType: source.questionType,
        explanation: source.explanation || target.explanation,
        answerSource: source.answerSource
      } : {})
    } });
    await tx.question.delete({ where: { id: sourceId } });
    await tx.adminLog.create({ data: { adminId: user.id, action: 'MERGE_QUESTIONS', targetId, details: JSON.stringify({ sourceId, sourceHash: source.hash }) } });
    return { targetId, sourceId };
  });
  return merged ? apiJson(request, merged) : apiJson(request, { error: 'Question not found.' }, 404);
}
