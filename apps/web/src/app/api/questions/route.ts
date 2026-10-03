import { NextRequest } from 'next/server';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiJson, preflight } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return apiJson(request, { error: 'Unauthorized' }, 401);
  if (!user.teamId) return apiJson(request, []);
  const folderId = request.nextUrl.searchParams.get('folderId');
  if (folderId && !await prisma.folder.findFirst({ where: { id: folderId, teamId: user.teamId } })) return apiJson(request, { error: 'Folder not found.' }, 404);
  const questions = await prisma.question.findMany({
    where: folderId ? { folderId } : { folder: { teamId: user.teamId } },
    include: { choices: true }, orderBy: { createdAt: 'desc' }, take: 500
  });
  return apiJson(request, questions);
}
