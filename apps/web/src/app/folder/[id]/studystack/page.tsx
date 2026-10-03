import { prisma } from '@/lib/prisma';
import { StudyStackTable } from '@/components/study/StudyStackTable';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const questions = await prisma.question.findMany({ where: { folderId: id }, include: { choices: true }, orderBy: { createdAt: 'asc' } });
  return <StudyStackTable questions={questions} />;
}
