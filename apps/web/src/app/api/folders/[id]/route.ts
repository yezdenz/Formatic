import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;
const input = z.object({ name: z.string().trim().min(1).max(100).optional(), parentId: z.string().uuid().nullable().optional(), description: z.string().max(500).optional(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() });

async function allowed(id: string) {
  const user = await currentUser();
  const folder = await prisma.folder.findUnique({ where: { id } });
  return user && folder && folder.teamId === user.teamId && (user.role === 'ADMIN' || folder.creatorId === user.id) ? folder : null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const { id } = await params;
  if (!await allowed(id)) return apiJson(request, { error: 'Folder not found or access denied.' }, 404);
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson(request, { error: 'Invalid folder data.' }, 400);
  const nextParent = parsed.data.parentId;
  if (nextParent) {
    let ancestor: string | null = nextParent;
    while (ancestor) {
      if (ancestor === id) return apiJson(request, { error: 'A folder cannot be moved into itself or a descendant.' }, 400);
      const found: { parentId: string | null; teamId: string | null } | null = await prisma.folder.findUnique({ where: { id: ancestor }, select: { parentId: true, teamId: true } });
      const user = await currentUser();
      if (!found || found.teamId !== user?.teamId) return apiJson(request, { error: 'Parent folder not found.' }, 404);
      ancestor = found.parentId;
    }
  }
  const folder = await prisma.folder.update({ where: { id }, data: parsed.data });
  return apiJson(request, folder);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin && origin !== `chrome-extension://${process.env.EXTENSION_ID}`) return apiJson(request, { error: 'Origin denied.' }, 403);
  const { id } = await params;
  if (!await allowed(id)) return apiJson(request, { error: 'Folder not found or access denied.' }, 404);
  await prisma.folder.delete({ where: { id } });
  return apiJson(request, { deleted: true });
}
