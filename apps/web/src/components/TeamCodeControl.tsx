'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function TeamCodeControl({ code }: { code: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!code);
  const [value, setValue] = useState(code || 'TS31');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not set team code.');
      setValue(result.code); setEditing(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not set team code.'); }
    finally { setBusy(false); }
  }
  return <div className="team-control"><button className="team-code" type="button" onClick={() => setEditing(!editing)} aria-expanded={editing}>{code ? <>TEAM CODE <strong>{code}</strong></> : 'SET TEAM CODE'}</button>
    {editing && <form className="team-form" onSubmit={save}><label className="sr-only" htmlFor="team-code">Section or class code</label><input id="team-code" className="field" value={value} onChange={event => setValue(event.target.value.toUpperCase())} maxLength={12} pattern="[A-Z0-9]{2,12}" required /><button className="button" disabled={busy}>Save</button></form>}
    {editing && <p className="team-help">Classmates using the same code share folders.</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
