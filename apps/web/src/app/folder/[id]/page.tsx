import { prisma } from '@/lib/prisma';
import { CreateFolder } from '@/components/CreateFolder';
import { FolderActions } from '@/components/FolderActions';
import { currentUser } from '@/lib/auth';
import { Plus } from 'lucide-react';
import { RepositoryList } from '@/components/RepositoryList';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [children, questions, folder, destinations, user] = await Promise.all([
    prisma.folder.findMany({ where: { parentId: id }, orderBy: { name: 'asc' } }),
    prisma.question.findMany({ where: { folderId: id }, include: { choices: true }, orderBy: { createdAt: 'desc' } }),
    prisma.folder.findUnique({ where: { id } }),
    prisma.folder.findMany({ select: { id: true, name: true, teamId: true }, orderBy: { name: 'asc' } }),
    currentUser()
  ]);
  return <>
    <RepositoryList folders={children.map(child => ({ ...child, canRename: user?.role === 'ADMIN' || child.creatorId === user?.id }))} action={<details className="new-folder"><summary className="button"><Plus size={14} /> New {folder?.parentId ? 'subfolder' : 'folder'}</summary><CreateFolder parentId={id} /></details>} />
    <section className="panel" style={{ marginTop: 28 }}><h2 style={{ fontSize: 16, marginTop: 0 }}>Questions</h2>{questions.map(question => <article className="question" key={question.id}><strong>{question.plainText}</strong></article>)}{!questions.length && <p className="muted">No questions in this folder yet.</p>}</section>
    {folder && user && (user.role === 'ADMIN' || user.id === folder.creatorId) && <FolderActions id={id} initialName={folder.name} parentId={folder.parentId} destinations={destinations.filter(destination => destination.teamId === user.teamId)} />}
  </>;
}
