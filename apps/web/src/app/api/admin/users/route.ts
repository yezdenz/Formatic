import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;

const input = z.object({ userId: z.string().uuid(), role: z.enum(['USER', 'MOD']) });

export async function GET(request: NextRequest) {
  const admin = await currentUser();
  if (admin?.role !== 'ADMIN' || !admin.teamId) return apiJson(request, { error: 'Admin access required.' }, 403);
  const users = await prisma.user.findMany({ where: { teamId: admin.teamId }, select: {
    id: true, username: true, nickname: true, role: true, createdAt: true
  }, orderBy: { username: 'asc' } });
  return apiJson(request, users);
}

export async function PATCH(request: NextRequest) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const admin = await currentUser();
  if (admin?.role !== 'ADMIN' || !admin.teamId) return apiJson(request, { error: 'Admin access required.' }, 403);
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson(request, { error: 'Choose a registered user and rank.' }, 400);
  if (parsed.data.userId === admin.id) return apiJson(request, { error: 'You cannot change your own admin rank.' }, 400);
  const updated = await prisma.$transaction(async tx => {
    const target = await tx.user.findFirst({ where: { id: parsed.data.userId, teamId: admin.teamId } });
    if (!target || target.role === 'ADMIN') return null;
    const user = await tx.user.update({ where: { id: target.id }, data: { role: parsed.data.role }, select: { id: true, username: true, role: true } });
    await tx.adminLog.create({ data: { adminId: admin.id, action: 'SET_RANK', targetId: user.id, details: JSON.stringify({ from: target.role, to: user.role }) } });
    return user;
  });
  return updated ? apiJson(request, updated) : apiJson(request, { error: 'Team member not found or rank cannot be changed.' }, 404);
}
