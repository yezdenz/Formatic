import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ModerationPanel } from '@/components/ModerationPanel';
import { DuplicateMerge } from '@/components/DuplicateMerge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const user = await currentUser();
  if (user?.role !== 'ADMIN') redirect('/');
  const [conflicts, questions] = await Promise.all([
    prisma.question.findMany({ where: { hasConflict: true }, include: { choices: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.question.findMany({ select: { id: true, plainText: true }, orderBy: { updatedAt: 'desc' }, take: 500 })
  ]);
  return <main className="shell"><h1>Moderation</h1><p>Resolve answer conflicts and merge differently worded duplicates.</p><DuplicateMerge questions={questions} /><ModerationPanel questions={conflicts} /></main>;
}
