'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Batch = { id: string; createdAt: string; username: string; quizTitle: string | null; totalItems: number; newItems: number; mergedItems: number; canRollback: boolean };

export function PushRollback({ batches }: { batches: Batch[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function rollback(batch: Batch) {
    if (!window.confirm(`Rollback ${batch.totalItems} questions from this push? This removes questions created by the push.`)) return;
    setBusyId(batch.id); setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/admin/batches/${batch.id}/rollback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not roll back this push.');
      setSuccess(`${result.deleted} questions removed from the repository.`);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not roll back this push.'); }
    finally { setBusyId(''); }
  }
  return <section className="panel"><h2>Recent pushes</h2><p className="muted">A push can be rolled back together when it created every question and none were later changed or reused. For mixed pushes, remove the unwanted questions below.</p>
    <div className="moderation-list">{batches.map(batch => <div className="moderation-row" key={batch.id}><div><strong>{batch.quizTitle || 'Canvas push'}</strong><small>{batch.username} · {new Date(batch.createdAt).toLocaleString()} · {batch.newItems} new, {batch.mergedItems} merged</small></div>{batch.canRollback ? <button className="button button-secondary" disabled={!!busyId} onClick={() => void rollback(batch)}>{busyId === batch.id ? 'Rolling back…' : 'Rollback push'}</button> : <span className="muted">Individual review needed</span>}</div>)}</div>
    {!batches.length && <p className="muted">No recent pushes in this team.</p>}
    {error && <p className="error" role="alert">{error}</p>}{success && <p className="success" role="status">{success}</p>}
  </section>;
}
