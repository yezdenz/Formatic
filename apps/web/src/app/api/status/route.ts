import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL || !process.env.JWT_SECRET) {
    return NextResponse.json({ signInAvailable: false });
  }

  try {
    await prisma.user.count();
    return NextResponse.json({ signInAvailable: true });
  } catch {
    return NextResponse.json({ signInAvailable: false });
  }
}
