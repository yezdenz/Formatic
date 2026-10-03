import { NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';
import { normalizeText, questionHash, scopedQuestionHash, stripHtml } from '@/lib/deduplicate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;

const choice = z.object({ text: z.string().trim().min(1).max(5000), isCorrect: z.boolean().nullable().optional(), isSelected: z.boolean().optional() });
const question = z.object({
  questionText: z.string().trim().min(1).max(30000),
  questionType: z.enum(['MULTIPLE_CHOICE', 'MULTIPLE_ANSWERS', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY']).optional(),
  choices: z.array(choice).max(100),
  explanation: z.string().max(30000).optional(),
  courseTitle: z.string().max(300).optional(),
  quizTitle: z.string().max(300).optional()
});
const payload = z.object({ folderId: z.string().uuid(), questions: z.array(question).min(1).max(100) });

export async function POST(request: NextRequest) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const user = await currentUser();
  if (!user) return apiJson(request, { error: 'Unauthorized' }, 401);
  if (!user.teamId) return apiJson(request, { error: 'Set your team code before saving questions.' }, 400);
  const teamId = user.teamId;
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson(request, { error: 'Invalid push payload.' }, 400);
  const { folderId, questions } = parsed.data;
  if (!await prisma.folder.findFirst({ where: { id: folderId, teamId } })) return apiJson(request, { error: 'Folder not found.' }, 404);

  let result: { batchId: string; newItems: number; mergedItems: number } | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await prisma.$transaction(async tx => {
    let newItems = 0;
    let mergedItems = 0;
    const items: { questionId: string; wasNew: boolean }[] = [];
    for (const incoming of questions) {
      const hash = scopedQuestionHash(teamId, incoming.questionText);
      const legacyHash = questionHash(incoming.questionText);
      const direct = await tx.question.findUnique({ where: { hash }, include: { choices: true, folder: true } });
      const alias = await tx.questionAlias.findUnique({ where: { hash }, include: { question: { include: { choices: true, folder: true } } } });
      const legacy = !direct && !alias ? await tx.question.findUnique({ where: { hash: legacyHash }, include: { choices: true, folder: true } }) : null;
      const existing = direct ?? alias?.question ?? (legacy?.folder.teamId === teamId ? legacy : null);
      if (!existing) {
        const created = await tx.question.create({ data: {
          hash, text: incoming.questionText, plainText: stripHtml(incoming.questionText), folderId,
          questionType: incoming.questionType || 'MULTIPLE_CHOICE',
          explanation: incoming.explanation,
          isVerified: incoming.choices.some(item => item.isCorrect === true),
          choices: { create: incoming.choices.map(item => ({ text: item.text, isCorrect: item.isCorrect ?? null })) }
        } });
        items.push({ questionId: created.id, wasNew: true });
        newItems++;
        continue;
      }
      let hasConflict = existing.hasConflict;
      let isVerified = existing.isVerified;
      const incomingCorrect = incoming.choices.filter(item => item.isCorrect === true).map(item => normalizeText(item.text));
      const knownCorrect = existing.choices.filter(item => item.isCorrect === true).map(item => normalizeText(item.text));
      if (existing.questionType !== 'MULTIPLE_ANSWERS' && incomingCorrect.length && knownCorrect.length && incomingCorrect.some(text => !knownCorrect.includes(text))) hasConflict = true;
      for (const item of incoming.choices) {
        const found = existing.choices.find(candidate => normalizeText(candidate.text) === normalizeText(item.text));
        if (!found) {
          await tx.choice.create({ data: { questionId: existing.id, text: item.text, isCorrect: item.isCorrect ?? null } });
          if (item.isCorrect === true) isVerified = true;
        } else if (item.isCorrect != null && found.isCorrect == null) {
          await tx.choice.update({ where: { id: found.id }, data: { isCorrect: item.isCorrect } });
          if (item.isCorrect) isVerified = true;
        } else if (item.isCorrect != null && found.isCorrect != null && item.isCorrect !== found.isCorrect) {
          hasConflict = true;
        }
      }
      await tx.question.update({ where: { id: existing.id }, data: {
        timesEncountered: { increment: 1 }, isVerified, hasConflict,
        explanation: existing.explanation || incoming.explanation
      } });
      items.push({ questionId: existing.id, wasNew: false });
      mergedItems++;
    }
    const batch = await tx.pushBatch.create({ data: {
      userId: user.id, totalItems: questions.length, newItems, mergedItems,
      canvasCourse: questions[0].courseTitle, quizTitle: questions[0].quizTitle,
      items: { create: items }
    } });
    return { batchId: batch.id, newItems, mergedItems };
      }, { timeout: 20000 });
      break;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || !['P2002', 'P2034'].includes(error.code) || attempt === 2) throw error;
    }
  }
  return apiJson(request, result, 201);
}
