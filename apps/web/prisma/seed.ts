import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
async function main() {
  const passcode = process.env.ADMIN_SECRET_KEY;
  if (!passcode || passcode.length < 16) throw new Error('Set ADMIN_SECRET_KEY to at least 16 characters before seeding.');
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', passwordHash: await hash(passcode, 12), role: 'ADMIN' }
  });
}
main().finally(() => prisma.$disconnect());
