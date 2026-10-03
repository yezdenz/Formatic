'use client';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    void fetch('/api/status').then(response => response.json()).then(result => setAvailable(Boolean(result.signInAvailable))).catch(() => setAvailable(false));
  }, []);
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
  return <main className="shell"><div className="login-panel">
    <Link className="eyebrow pixel" href="/">FORMATIC</Link><h1>Welcome back.</h1><p className="muted">Enter your username and passcode to reach your class folders.</p>
    {available === false && <div className="panel"><p>Sign in is unavailable until website storage is connected.</p><Link className="button" href="/demo">Try the interactive preview</Link></div>}
    {available && <form onSubmit={submit}><label>Username<input className="field" value={username} onChange={e => setUsername(e.target.value)} required minLength={2} /></label>
      <label>Passcode<input className="field" type="password" value={passcode} onChange={e => setPasscode(e.target.value)} required minLength={8} /></label>
      <button className="button" disabled={busy}>{busy ? 'Signing in...' : 'Continue'}</button></form>}
    {available === null && <p className="muted">Checking sign-in...</p>}
    {error && <p className="error" role="alert">{error}</p>}
  </div></main>;
}
