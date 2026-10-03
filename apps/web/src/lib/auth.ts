import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';

const cookieName = 'formatic_session';
const lifetime = 60 * 60 * 24 * 14;

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
  return new TextEncoder().encode(value);
}

export async function createSession(user: { id: string; role: string }): Promise<void> {
  const token = await new SignJWT({ role: user.role }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id).setIssuedAt().setExpirationTime(`${lifetime}s`).sign(secret());
  (await cookies()).set(cookieName, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/', maxAge: lifetime
  });
}

export async function currentUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, username: true, nickname: true, role: true } });
  } catch { return null; }
}
