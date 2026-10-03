import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { CreateFolder } from '@/components/CreateFolder';
import { FolderActions } from '@/components/FolderActions';
import { currentUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [children, questions, folder, destinations, user] = await Promise.all([
    prisma.folder.findMany({ where: { parentId: id }, orderBy: { name: 'asc' } }),
    prisma.question.findMany({ where: { folderId: id }, include: { choices: true }, orderBy: { createdAt: 'desc' } }),
    prisma.folder.findUnique({ where: { id } }),
    prisma.folder.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    currentUser()
  ]);
  return <><CreateFolder parentId={id} />
    {folder && user && (user.role === 'ADMIN' || user.id === folder.creatorId) && <FolderActions id={id} initialName={folder.name} parentId={folder.parentId} destinations={destinations} />}
    <div className="grid">{children.map(child => <Link className="folder-card" href={`/folder/${child.id}`} key={child.id}><h2>{child.name}</h2><p>{child.description}</p></Link>)}</div>
    <section className="panel"><h2>{questions.length} questions</h2>{questions.map(question => <article className="question" key={question.id}><strong>{question.plainText}</strong><p className="muted">{question.isVerified ? 'Verified answer' : 'Answer unresolved'} · Seen {question.timesEncountered} times{question.hasConflict ? ' · Answer conflict' : ''}</p></article>)}</section>
  </>;
}
