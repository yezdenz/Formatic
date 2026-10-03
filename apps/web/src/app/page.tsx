import Link from 'next/link';
import { Plus } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CreateFolder } from '@/components/CreateFolder';
import { TeamCodeControl } from '@/components/TeamCodeControl';
import { DashboardFrame } from '@/components/DashboardFrame';
import { RepositoryList } from '@/components/RepositoryList';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await currentUser();
  if (!user) return <main className="shell"><section className="landing"><span className="eyebrow">FORMATIC REPOSITORY</span><h1>Everything your class saves, in one place.</h1><p>Collect formative questions, organize folders, and study together.</p><div className="tabs"><Link className="button" href="/demo">Explore the preview</Link><Link className="button button-secondary" href="/login">Sign in</Link></div></section></main>;

  const folders = await prisma.folder.findMany({ where: user.teamId ? { parentId: null, teamId: user.teamId } : { parentId: null, creatorId: user.id, teamId: null }, orderBy: { name: 'asc' } });
  const name = user.nickname || user.username;
  return <DashboardFrame name={name}>
    <div className="page-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Hello, {name}.</h1><p>Your class courses are ready when you are.</p></div></div>
    <section className="team-panel"><div className="team-panel-copy"><h2>Team workspace</h2><p>Enter your unique section code to open your shared repository.</p></div><TeamCodeControl code={user.team?.code || null} /></section>
    <RepositoryList title="Courses" itemLabel="Course" folders={folders.map(folder => ({ ...folder, canRename: user.role === 'ADMIN' || folder.creatorId === user.id }))} action={user.teamId ? <details className="new-folder"><summary className="button"><Plus size={14} /> New course</summary><CreateFolder kind="course" /></details> : undefined} />
  </DashboardFrame>;
}
