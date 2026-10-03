import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DashboardFrame } from '@/components/DashboardFrame';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function FolderLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { id } = await params;
  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder || folder.teamId !== user.teamId) notFound();
  const base = `/folder/${folder.id}`;
  return <DashboardFrame name={user.nickname || user.username}><Link className="button button-secondary" href={folder.parentId ? `/folder/${folder.parentId}` : '/'}>← {folder.parentId ? 'Parent folder' : 'All courses'}</Link><div className="page-heading" style={{ marginTop: 28 }}><div><p className="eyebrow">CLASS REPOSITORY / {folder.parentId ? 'FOLDER' : 'COURSE'}</p><h1>{folder.name}</h1><p>Browse this {folder.parentId ? 'folder' : 'course'} or choose a way to study.</p></div></div><nav className="tabs">
    <Link className="button button-secondary" href={base}>Overview</Link>
    <Link className="button button-secondary" href={`${base}/studystack`}>StudyStack</Link>
    <Link className="button button-secondary" href={`${base}/practice`}>Practice</Link>
    <Link className="button button-secondary" href={`${base}/flashcards`}>Flashcards</Link>
  </nav>{children}</DashboardFrame>;
}
