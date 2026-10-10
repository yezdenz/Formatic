import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ModerationPanel } from '@/components/ModerationPanel';
import { DuplicateMerge } from '@/components/DuplicateMerge';
import { DashboardFrame } from '@/components/DashboardFrame';
import { RankManager } from '@/components/RankManager';
import { QuestionManager } from '@/components/QuestionManager';
import { PushRollback } from '@/components/PushRollback';
import { canModerate } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const user = await currentUser();
  if (!canModerate(user) || !user?.teamId) redirect('/');
  const [conflicts, questions, folders, members, batches, actions] = await Promise.all([
    prisma.question.findMany({ where: { hasConflict: true, folder: { teamId: user.teamId } }, include: { choices: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.question.findMany({ where: { folder: { teamId: user.teamId } }, include: { choices: true, blanks: true }, orderBy: { updatedAt: 'desc' }, take: 500 }),
    prisma.folder.findMany({ where: { teamId: user.teamId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    user.role === 'ADMIN' ? prisma.user.findMany({ where: { teamId: user.teamId }, select: { id: true, username: true, nickname: true, role: true }, orderBy: { username: 'asc' } }) : Promise.resolve([]),
    prisma.pushBatch.findMany({ where: { items: { some: { question: { folder: { teamId: user.teamId } } } } }, include: { user: { select: { username: true } }, items: { select: { wasNew: true } } }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.adminLog.findMany({ where: { admin: { teamId: user.teamId } }, include: { admin: { select: { username: true } } }, orderBy: { createdAt: 'desc' }, take: 30 })
  ]);
  return <DashboardFrame name={user.nickname || user.username} role={user.role} section="moderation"><div className="page-heading"><div><p className="eyebrow">CLASS REPOSITORY / {user.role === 'ADMIN' ? 'ADMIN' : 'MOD'}</p><h1>Moderation.</h1><p>Review pushes, edit questions, and keep this team’s repository accurate.</p></div></div>
    {user.role === 'ADMIN' && <RankManager users={members} currentId={user.id} />}
    <PushRollback batches={batches.map(batch => ({ id: batch.id, createdAt: batch.createdAt.toISOString(), username: batch.user.username, quizTitle: batch.quizTitle, totalItems: batch.totalItems, newItems: batch.newItems, mergedItems: batch.mergedItems, canRollback: batch.items.length === batch.totalItems && batch.items.every(item => item.wasNew) }))} />
    <QuestionManager questions={questions.map(question => ({ id: question.id, text: question.text, plainText: question.plainText, folderId: question.folderId, explanation: question.explanation, choices: question.choices.map(choice => ({ id: choice.id, text: choice.text, isCorrect: choice.isCorrect })), blanks: question.blanks.map(blank => ({ id: blank.id, key: blank.key, correctAnswers: blank.correctAnswers })) }))} folders={folders} />
    <DuplicateMerge questions={questions.map(question => ({ id: question.id, plainText: question.plainText }))} />
    <ModerationPanel questions={conflicts} />
    <section className="panel"><h2>Recent moderation</h2><div className="moderation-list">{actions.map(action => <div className="moderation-row" key={action.id}><div><strong>{action.action.replaceAll('_', ' ').toLowerCase()}</strong><small>{action.admin.username} · {action.createdAt.toLocaleString()}</small></div></div>)}</div>{!actions.length && <p className="muted">No moderation actions yet.</p>}</section>
  </DashboardFrame>;
}
