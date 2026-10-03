import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { acceptsMutation, apiJson, preflight } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;
const input = z.object({
  name: z.string().trim().min(1).max(100),
  parentId: z.string().uuid().nullable().optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()
});

export async function GET(request: NextRequest) {
  if (!await currentUser()) return apiJson(request, { error: 'Unauthorized' }, 401);
  const folders = await prisma.folder.findMany({ orderBy: { name: 'asc' } });
  type Node = (typeof folders)[number] & { children: Node[] };
  const byId = new Map(folders.map(folder => [folder.id, { ...folder, children: [] as Node[] }]));
  const roots: Node[] = [];
  for (const folder of byId.values()) {
    const parent = folder.parentId && byId.get(folder.parentId);
    if (parent) parent.children.push(folder); else roots.push(folder);
  }
  return apiJson(request, roots);
}

export async function POST(request: NextRequest) {
  if (!acceptsMutation(request)) return apiJson(request, { error: 'Origin or content type denied.' }, 403);
  const user = await currentUser();
  if (!user) return apiJson(request, { error: 'Unauthorized' }, 401);
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiJson(request, { error: 'Invalid folder data.' }, 400);
  if (parsed.data.parentId && !await prisma.folder.findUnique({ where: { id: parsed.data.parentId } })) return apiJson(request, { error: 'Parent folder not found.' }, 404);
  const folder = await prisma.folder.create({ data: { ...parsed.data, creatorId: user.id } });
  return apiJson(request, folder, 201);
}
