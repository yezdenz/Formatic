import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { listAttempts, removeAttempts, saveAttempt } from '../utils/storage';
import type { StagedAttempt } from '../types/canvas';
import './style.css';

type Folder = { id: string; name: string; children?: Folder[] };
type Session = { id: string; username: string; role: string };

function flatten(folders: Folder[], depth = 0): { id: string; label: string }[] {
  return folders.flatMap(folder => [
    { id: folder.id, label: `${'  '.repeat(depth)}${folder.name}` },
    ...flatten(folder.children || [], depth + 1)
  ]);
}

function App() {
  const [attempts, setAttempts] = useState<StagedAttempt[]>([]);
  const [hubUrl, setHubUrl] = useState('http://localhost:3000');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    void listAttempts().then(setAttempts);
    void chrome.storage.local.get({ hubUrl: 'http://localhost:3000' }).then(({ hubUrl }) => void connect(hubUrl));
  }, []);

  async function connect(url = hubUrl) {
    try {
      const base = new URL(url).origin;
      await chrome.storage.local.set({ hubUrl: base });
      setHubUrl(base);
      const [userResponse, folderResponse] = await Promise.all([
        fetch(`${base}/api/auth/me`, { credentials: 'include' }),
        fetch(`${base}/api/folders`, { credentials: 'include' })
      ]);
      if (!userResponse.ok || !folderResponse.ok) throw new Error('Log in to Formatic Hub, then reconnect.');
      setSession(await userResponse.json());
      const tree = await folderResponse.json() as Folder[];
      setFolders(tree);
      setFolderId(flatten(tree)[0]?.id || '');
      setMessage('Connected to Formatic Hub.');
    } catch (error) {
      setSession(null);
      setFolders([]);
      setMessage(error instanceof Error ? error.message : 'Connection failed.');
    }
  }

  async function push() {
    if (!folderId || !attempts.length) return;
    setBusy(true);
    setProgress(0);
    setMessage('Pushing staged questions…');
    const total = attempts.reduce((sum, attempt) => sum + attempt.questions.length, 0);
    let completed = 0;
    try {
      for (const attempt of attempts) {
        let remaining = [...attempt.questions];
        while (remaining.length) {
          const batch = remaining.slice(0, 50);
          const response = await fetch(`${hubUrl}/api/sync/push`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderId, questions: batch })
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Push failed.');
          completed += batch.length;
          setProgress(Math.round(completed / total * 100));
          remaining = remaining.slice(batch.length);
          if (remaining.length) await saveAttempt({ ...attempt, questions: remaining, updatedAt: Date.now() });
          else await removeAttempts([attempt.quizId]);
          setAttempts(await listAttempts());
        }
      }
      setMessage('Saved to Formatic.');
    } catch (error) {
      setMessage(`${completed} pushed. ${error instanceof Error ? error.message : 'Push failed.'}`);
    } finally {
      setBusy(false);
    }
  }

  const questions = attempts.flatMap(attempt => attempt.questions);
  return <main>
    <header><h1>FORMATIC</h1><span>STAGING TRAY</span></header>
    <label>Hub URL<input value={hubUrl} onChange={event => setHubUrl(event.target.value)} /></label>
    <button onClick={() => void connect()} disabled={busy}>Connect</button>
    <p className="status">{session ? `Signed in as ${session.username}` : 'Not connected'}</p>
    <div className="counts"><strong>{questions.length ? `${questions.length} ready to save` : 'Nothing staged yet'}</strong></div>
    <section className="attempts">{attempts.map(attempt => <article key={attempt.quizId}>
      <strong>{attempt.questions[0]?.quizTitle || `Quiz ${attempt.quizId}`}</strong><small>{attempt.questions.length} staged</small>
    </article>)}</section>
    <label>Target folder<select value={folderId} onChange={event => setFolderId(event.target.value)}>
      {flatten(folders).map(folder => <option key={folder.id} value={folder.id}>{folder.label}</option>)}
    </select></label>
    <button className="primary" onClick={() => void push()} disabled={!session || !folderId || !questions.length || busy}>Push to Formatic Hub</button>
    {busy && <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div>}
    {message && <p role="status" className="message">{message}</p>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
