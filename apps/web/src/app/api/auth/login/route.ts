import { NextRequest } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const credentials = z.object({ username: z.string().trim().min(2).max(50), passcode: z.string().min(8).max(200) });
export const OPTIONS = preflight;

export async function POST(request: NextRequest) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  if (!process.env.DATABASE_URL || !process.env.POSTGRES_URL || !process.env.JWT_SECRET) return apiJson(request, { error: 'Sign in is unavailable until website storage is configured.' }, 503);
  const parsed = credentials.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson(request, { error: 'Enter a username and a passcode of at least 8 characters.' }, 400);
  const { username, passcode } = parsed.data;
  try {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && !await compare(passcode, existing.passwordHash)) return apiJson(request, { error: 'Invalid credentials.' }, 401);
    if (!existing && process.env.ADMIN_SECRET_KEY === passcode && passcode.length < 16) return apiJson(request, { error: 'ADMIN_SECRET_KEY must be at least 16 characters.' }, 500);
    const user = existing ?? await prisma.user.create({ data: {
      username, passwordHash: await hash(passcode, 12),
      role: process.env.ADMIN_SECRET_KEY && passcode === process.env.ADMIN_SECRET_KEY ? 'ADMIN' : 'USER'
    } });
    await createSession(user);
    return apiJson(request, { id: user.id, username: user.username, nickname: user.nickname, role: user.role });
  } catch {
    return apiJson(request, { error: 'Website storage is unavailable. Please try again later.' }, 503);
  }
}
