import { NextRequest } from 'next/server';
import { currentUser } from '@/lib/auth';
import { apiJson, preflight } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const OPTIONS = preflight;

export async function GET(request: NextRequest) {
  const user = await currentUser();
  return user ? apiJson(request, user) : apiJson(request, { error: 'Unauthorized' }, 401);
}
