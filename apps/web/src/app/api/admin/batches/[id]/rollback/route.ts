import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';
import { canModerate } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const user = await currentUser();
  if (!canModerate(user) || !user?.teamId) return apiJson(request, { error: 'Moderator access required.' }, 403);
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async tx => {
      const batch = await tx.pushBatch.findUnique({ where: { id }, include: { items: { include: { question: { include: { folder: true, choices: true, aliases: true } } } } } });
      if (!batch || !batch.items.length || batch.items.length !== batch.totalItems || batch.items.some(item => item.question.folder.teamId !== user.teamId)) return { error: 'Push batch was not found in your team.', status: 404 };
      if (batch.items.some(item => !item.wasNew)) return { error: 'This push merged existing questions. Delete the unwanted questions individually to avoid erasing earlier work.', status: 409 };
      const questionIds = [...new Set(batch.items.map(item => item.questionId))];
      if (questionIds.length !== batch.items.length) return { error: 'This push reused a question within the same batch and cannot be safely rolled back.', status: 409 };
      const [laterItems, laterEdits] = await Promise.all([
        tx.pushBatchItem.count({ where: { questionId: { in: questionIds }, batchId: { not: id } } }),
        tx.adminLog.count({ where: { targetId: { in: questionIds }, createdAt: { gt: batch.createdAt } } })
      ]);
      if (laterItems || laterEdits || batch.items.some(item => item.question.updatedAt > batch.createdAt)) return { error: 'One or more questions changed after this push. Remove unwanted questions individually.', status: 409 };
      await tx.adminLog.create({ data: { adminId: user.id, action: 'ROLLBACK_PUSH', targetId: id, details: JSON.stringify({ batch, questionIds }) } });
      for (const questionId of questionIds) await tx.question.delete({ where: { id: questionId } });
      await tx.pushBatch.delete({ where: { id } });
      return { deleted: questionIds.length, status: 200 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return 'error' in result ? apiJson(request, { error: result.error }, result.status) : apiJson(request, { deleted: result.deleted });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return apiJson(request, { error: 'The repository changed during rollback. Please try again.' }, 409);
    throw error;
  }
}
