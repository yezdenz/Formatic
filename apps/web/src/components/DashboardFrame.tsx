import Link from 'next/link';
import { BookOpen, FolderClosed, ShieldCheck } from 'lucide-react';

export function DashboardFrame({ name, role = 'USER', section = 'repository', preview = false, onRepository, children }: { name: string; role?: string; section?: 'repository' | 'moderation'; preview?: boolean; onRepository?: () => void; children: React.ReactNode }) {
  return <div className="app-frame">
    <aside className="app-sidebar">
      <Link className="brand" href={preview ? '/demo' : '/'}><span className="brand-mark"><BookOpen size={20} /></span><span><strong className="brand-name">FORMATIC</strong><small className="brand-subtitle">Class repository</small></span></Link>
      <nav className="sidebar-group" aria-label="Workspace"><p className="sidebar-label">Workspace</p>{onRepository ? <button className="sidebar-link active" type="button" onClick={onRepository}><FolderClosed size={17} /> Repository</button> : <Link className={`sidebar-link ${section === 'repository' ? 'active' : ''}`} href={preview ? '/demo' : '/'}><FolderClosed size={17} /> Repository</Link>}{!preview && (role === 'ADMIN' || role === 'MOD') && <Link className={`sidebar-link ${section === 'moderation' ? 'active' : ''}`} href="/admin"><ShieldCheck size={17} /> Moderation</Link>}</nav>
      <div className="sidebar-foot"><span className="avatar">{name.slice(0, 2).toUpperCase()}</span><span><strong>{name}</strong><small>{preview ? 'Layout preview' : role === 'ADMIN' ? 'Admin' : role === 'MOD' ? 'Mod' : 'Class member'}</small></span></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="topbar-path">FORMATIC / <strong>{section === 'moderation' ? 'MODERATION' : 'REPOSITORY'}</strong></div><div className="topbar-note">Your class workspace</div></header><div className="content">{children}</div></div>
  </div>;
}
