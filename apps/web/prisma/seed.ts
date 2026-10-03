import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();
async function main() {
  const passcode = process.env.ADMIN_SECRET_KEY;
  if (!passcode || passcode.length < 16) throw new Error('Set ADMIN_SECRET_KEY to at least 16 characters before seeding.');
  const admin = await prisma.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', passwordHash: await hash(passcode, 12), role: 'ADMIN' } });
  const exists = await prisma.folder.findFirst({ where: { creatorId: admin.id, name: 'Sample Course' } });
  if (!exists) await prisma.folder.create({ data: { name: 'Sample Course', description: 'Create a subfolder for each formative quiz.', creatorId: admin.id } });
}
main().finally(() => prisma.$disconnect());
