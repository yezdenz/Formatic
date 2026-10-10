import { prisma } from '@/lib/prisma';
import { PracticeEngine } from '@/components/study/PracticeEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const questions = await prisma.question.findMany({ where: { folderId: id }, include: { choices: true, blanks: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'asc' } });
  return <PracticeEngine questions={questions} />;
}
