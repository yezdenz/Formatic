import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ signInAvailable: Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL && process.env.JWT_SECRET) });
}
