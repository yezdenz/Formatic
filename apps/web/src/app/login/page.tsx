'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, passcode }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Login failed.');
      router.push('/'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Login failed.'); }
    finally { setBusy(false); }
  }
  return <main className="shell"><div className="panel" style={{ maxWidth: 440, margin: '50px auto' }}>
    <h1>Enter Formatic Hub</h1><p className="muted">New usernames are registered automatically.</p>
    <form onSubmit={submit}><label>Username<input className="field" value={username} onChange={e => setUsername(e.target.value)} required minLength={2} /></label>
      <label>Passcode<input className="field" type="password" value={passcode} onChange={e => setPasscode(e.target.value)} required minLength={8} /></label>
      <button className="button" disabled={busy}>{busy ? 'Signing in…' : 'Continue'}</button></form>
    {error && <p className="error" role="alert">{error}</p>}
  </div></main>;
}
