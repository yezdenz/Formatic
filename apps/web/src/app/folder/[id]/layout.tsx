import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function FolderLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  if (!await currentUser()) redirect('/login');
  const { id } = await params;
  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder) notFound();
  const base = `/folder/${folder.id}`;
  return <main className="shell"><Link href="/">← All folders</Link><h1>{folder.name}</h1><nav className="tabs">
    <Link className="button button-secondary" href={base}>Overview</Link>
    <Link className="button button-secondary" href={`${base}/studystack`}>StudyStack</Link>
    <Link className="button button-secondary" href={`${base}/practice`}>Practice</Link>
    <Link className="button button-secondary" href={`${base}/flashcards`}>Flashcards</Link>
  </nav>{children}</main>;
}
