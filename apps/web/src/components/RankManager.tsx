'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Member = { id: string; username: string; nickname: string | null; role: 'USER' | 'MOD' | 'ADMIN' };

export function RankManager({ users, currentId }: { users: Member[]; currentId: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  async function changeRank(member: Member) {
    setBusyId(member.id); setError('');
    try {
      const role = member.role === 'MOD' ? 'USER' : 'MOD';
      const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: member.id, role }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not update rank.');
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update rank.'); }
    finally { setBusyId(''); }
  }
  return <section className="panel"><h2>Member ranks</h2><p className="muted">Only admins can grant or remove the Mod rank. Mods can edit and remove questions and manage push rollbacks for this team.</p>
    <div className="moderation-list">{users.map(member => <div className="moderation-row" key={member.id}><div><strong>{member.nickname || member.username}</strong><small>@{member.username}</small></div><span className={`rank-badge rank-${member.role.toLowerCase()}`}>{member.role === 'MOD' ? 'Mod' : member.role === 'ADMIN' ? 'Admin' : 'Member'}</span>{member.role !== 'ADMIN' && member.id !== currentId && <button className="button button-secondary" disabled={!!busyId} onClick={() => void changeRank(member)}>{busyId === member.id ? 'Saving…' : member.role === 'MOD' ? 'Remove mod' : 'Make mod'}</button>}</div>)}</div>
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
