import { NextRequest } from 'next/server';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiJson, preflight } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;
export async function GET(request: NextRequest) {
  if (!await currentUser()) return apiJson(request, { error: 'Unauthorized' }, 401);
  const folderId = request.nextUrl.searchParams.get('folderId');
  const questions = await prisma.question.findMany({
    where: folderId ? { folderId } : undefined,
    include: { choices: true }, orderBy: { createdAt: 'desc' }, take: 500
  });
  return apiJson(request, questions);
}
