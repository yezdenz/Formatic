import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;
const input = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,12}$/) });

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return apiJson(request, { error: 'Unauthorized' }, 401);
  return apiJson(request, { code: user.team?.code || null });
}

export async function POST(request: NextRequest) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const user = await currentUser();
  if (!user) return apiJson(request, { error: 'Unauthorized' }, 401);
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson(request, { error: 'Use 2-12 letters or numbers for the team code.' }, 400);
  const team = await prisma.$transaction(async tx => {
    const team = await tx.team.upsert({ where: { code: parsed.data.code }, update: {}, create: { code: parsed.data.code } });
    await tx.user.update({ where: { id: user.id }, data: {
      teamId: team.id,
      ...(user.role === 'MOD' && user.teamId !== team.id ? { role: 'USER' as const } : {})
    } });
    if (!user.teamId) await tx.folder.updateMany({ where: { creatorId: user.id, teamId: null }, data: { teamId: team.id } });
    return team;
  });
  return apiJson(request, { code: team.code });
}
