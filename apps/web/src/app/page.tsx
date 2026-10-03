import Link from 'next/link';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CreateFolder } from '@/components/CreateFolder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await currentUser();
  if (!user) return <main className="shell"><section className="panel"><h1>Your study library</h1><p>Save formative questions, organize them in folders, and study with practice tests or flashcards.</p><Link className="button" href="/login">Get started</Link></section></main>;
  const folders = await prisma.folder.findMany({ where: { parentId: null }, include: { _count: { select: { questions: true, children: true } } }, orderBy: { name: 'asc' } });
  return <main className="shell"><h1>Study folders</h1><p className="muted">Welcome, {user.nickname || user.username}.</p><CreateFolder />
    <div className="grid">{folders.map(folder => <Link className="folder-card" key={folder.id} href={`/folder/${folder.id}`}><h2>{folder.name}</h2><p>{folder.description}</p><small>{folder._count.questions} questions · {folder._count.children} subfolders</small></Link>)}</div>
    {!folders.length && <p className="panel">Create your first folder to start organizing questions.</p>}
  </main>;
}
