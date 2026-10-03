import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { listAttempts, removeAttempts, saveAttempt } from '../utils/storage';
import type { ScrapedQuestion, StagedAttempt } from '../types/canvas';
import './style.css';

const defaultHubUrl = 'https://formatic-iota.vercel.app';
type Folder = { id: string; name: string; children?: Folder[] };
type Session = { id: string; username: string; nickname?: string | null; teamId?: string | null; team?: { code: string } | null };
type MatchStatus = 'loading' | 'existing' | 'absent' | 'unknown';

function destinationOptions(folders: Folder[], depth = 0): { id: string; label: string; depth: number }[] {
  return folders.flatMap(folder => [
    { id: folder.id, label: folder.name, depth },
    ...destinationOptions(folder.children || [], depth + 1)
  ]);
}

function normalizeHubUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && parsed.hostname === 'localhost')) {
    throw new Error('Use an HTTPS site, or localhost for development.');
  }
  return parsed.origin;
}

async function readResult(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}));
}

function errorMessage(result: unknown, fallback: string): string {
  return result && typeof result === 'object' && 'error' in result && typeof result.error === 'string'
    ? result.error : fallback;
}

function QuestionPreview({ question, match }: { question: ScrapedQuestion; match: MatchStatus }) {
  return <li className="question-preview">
    <span className="question-text">{question.questionText}</span>
    {question.choices.length > 0 && <ul className="choice-list">{question.choices.map((choice, index) => <li className={choice.isCorrect === true ? 'correct-choice' : choice.isSelected && choice.isCorrect === false ? 'wrong-choice' : ''} key={index}>{choice.isCorrect === true ? '✓ ' : choice.isSelected && choice.isCorrect === false ? '× ' : ''}{choice.text}{choice.isSelected ? ' · selected' : ''}</li>)}</ul>}
    <span className="question-meta">{question.choices.some(choice => choice.isCorrect === true) ? 'Answer found' : 'No answer key yet'}</span>
    <span className={`match-badge match-${match}`}>{match === 'existing' ? 'Already in repository' : match === 'absent' ? 'Not in repository yet' : match === 'loading' ? 'Checking repository…' : 'Repository status unknown'}</span>
  </li>;
}

function App() {
  const [attempts, setAttempts] = useState<StagedAttempt[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [hubUrl, setHubUrl] = useState(defaultHubUrl);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [matches, setMatches] = useState<Record<string, MatchStatus>>({});
  const [matchError, setMatchError] = useState('');

  const destinations = useMemo(() => destinationOptions(folders), [folders]);
  const selectedAttempts = attempts.filter(attempt => selected.includes(attempt.quizId));
  const selectedCount = selectedAttempts.reduce((sum, attempt) => sum + attempt.questions.length, 0);
  const totalCount = attempts.reduce((sum, attempt) => sum + attempt.questions.length, 0);

  useEffect(() => {
    const entries = attempts.flatMap(attempt => attempt.questions.map((question, index) => ({
      key: `${attempt.quizId}:${index}`, text: question.questionText
    })));
    if (!session?.teamId || !entries.length) {
      setMatches({});
      setMatchError('');
      return;
    }
    let cancelled = false;
    setMatches(Object.fromEntries(entries.map(entry => [entry.key, 'loading'])));
    setMatchError('');
    void (async () => {
      try {
        const result: Record<string, MatchStatus> = {};
        for (let index = 0; index < entries.length; index += 100) {
          const batch = entries.slice(index, index + 100);
          const response = await fetch(`${normalizeHubUrl(hubUrl)}/api/sync/match`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: batch.map(entry => entry.text) })
          });
          const payload = await readResult(response) as { existing?: boolean[] };
          if (!response.ok || !Array.isArray(payload.existing) || payload.existing.length !== batch.length ||
              !payload.existing.every(value => typeof value === 'boolean')) throw new Error('Repository lookup failed.');
          batch.forEach((entry, offset) => { result[entry.key] = payload.existing![offset] ? 'existing' : 'absent'; });
        }
        if (!cancelled) setMatches(result);
      } catch {
        if (!cancelled) {
          setMatches(Object.fromEntries(entries.map(entry => [entry.key, 'unknown'])));
          setMatchError('Repository matches could not be checked. You can still push selected questions.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [session?.teamId, attempts, hubUrl]);

  useEffect(() => {
    void listAttempts().then(items => { setAttempts(items); setSelected(items.map(item => item.quizId)); });
    void chrome.storage.local.get({ hubUrl: defaultHubUrl }).then(({ hubUrl: savedUrl }) => {
      setHubUrl(savedUrl);
      void connect(savedUrl, false);
    });
  }, []);

  async function connect(url: string, announce = true) {
    try {
      const base = normalizeHubUrl(url);
      await chrome.storage.local.set({ hubUrl: base });
      setHubUrl(base);
      const userResponse = await fetch(`${base}/api/auth/me`, { credentials: 'include' });
      if (userResponse.status === 401) {
        setSession(null);
        setFolders([]);
        setFolderId('');
        if (announce) setMessage('Sign in below to link your repository.');
        return;
      }
      if (!userResponse.ok) throw new Error('Could not reach Formatic. Try again.');
      const user = await readResult(userResponse) as Session;
      const folderResponse = await fetch(`${base}/api/folders`, { credentials: 'include' });
      if (!folderResponse.ok) throw new Error('Signed in, but courses could not be loaded.');
      const tree = await readResult(folderResponse) as Folder[];
      setSession(user);
      setFolders(tree);
      setFolderId(previous => destinationOptions(tree).some(folder => folder.id === previous) ? previous : '');
      if (announce) setMessage('Repository linked.');
    } catch (error) {
      setSession(null);
      setFolders([]);
      setFolderId('');
      setMessage(error instanceof Error ? error.message : 'Connection failed.');
    }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const base = normalizeHubUrl(hubUrl);
      const response = await fetch(`${base}/api/auth/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, passcode })
      });
      const result = await readResult(response);
      if (!response.ok) throw new Error(errorMessage(result, 'Sign in failed.'));
      setPasscode('');
      await connect(base);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign in. Check the Hub URL and extension connection.');
    } finally {
      setBusy(false);
    }
  }

  function openWebsite(path = '/') {
    try { void chrome.tabs.create({ url: `${normalizeHubUrl(hubUrl)}${path}` }); }
    catch { setMessage('Enter a valid Hub URL first.'); }
  }

  function toggleAttempt(id: string) {
    setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]);
  }

  async function discardAttempt(id: string) {
    await removeAttempts([id]);
    setAttempts(await listAttempts());
    setSelected(previous => previous.filter(item => item !== id));
    setMessage('Staged quiz removed from this device.');
  }

  async function push() {
    if (!session || !folderId || !selectedCount) return;
    setBusy(true);
    setProgress(0);
    setMessage('Saving selected questions…');
    let completed = 0;
    let newItems = 0;
    let mergedItems = 0;
    try {
      for (const attempt of selectedAttempts) {
        let remaining = [...attempt.questions];
        while (remaining.length) {
          const batch = remaining.slice(0, 50);
          const response = await fetch(`${normalizeHubUrl(hubUrl)}/api/sync/push`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderId, questions: batch })
          });
          const result = await readResult(response) as { error?: string; newItems?: number; mergedItems?: number };
          if (!response.ok) throw new Error(errorMessage(result, 'Push failed.'));
          completed += batch.length;
          newItems += result.newItems || 0;
          mergedItems += result.mergedItems || 0;
          setProgress(Math.round(completed / selectedCount * 100));
          remaining = remaining.slice(batch.length);
          if (remaining.length) await saveAttempt({ ...attempt, questions: remaining, updatedAt: Date.now() });
          else await removeAttempts([attempt.quizId]);
          setAttempts(await listAttempts());
        }
        setSelected(previous => previous.filter(id => id !== attempt.quizId));
      }
      setMessage(`Saved ${completed} questions: ${newItems} new, ${mergedItems} merged.`);
    } catch (error) {
      setMessage(`${completed} saved. ${error instanceof Error ? error.message : 'Push failed.'}`);
    } finally {
      setBusy(false);
    }
  }

  return <main>
    <header className="app-header">
      <div className="brand-mark" aria-hidden="true">F</div>
      <div className="brand-copy"><strong>FORMATIC</strong><span>Canvas → repository</span></div>
      <span className={`header-dot ${session ? 'connected' : ''}`} aria-label={session ? 'Connected' : 'Not connected'} />
    </header>

    <div className="popup-content">
      {!session ? <section className="sign-in-panel">
        <p className="eyebrow">Connect your library</p>
        <h1>Save what you studied.</h1>
        <p className="intro">Sign in to send captured questions to your team repository.</p>
        <form onSubmit={event => void signIn(event)}>
          <label>Username<input autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} minLength={2} required /></label>
          <label>Passcode<input autoComplete="current-password" type="password" value={passcode} onChange={event => setPasscode(event.target.value)} minLength={8} required /></label>
          <button className="button button-primary" disabled={busy} type="submit">{busy ? 'Connecting…' : 'Sign in & link'}</button>
        </form>
        <button className="text-button" type="button" onClick={() => openWebsite('/login')}>Open sign in on website ↗</button>
        <button className="text-button" type="button" onClick={() => void connect(hubUrl)}>Already signed in? Reconnect</button>
      </section> : <>
        <section className="account-strip"><div><span className="eyebrow">Linked repository</span><strong>{session.nickname || session.username}</strong></div><span className="team-badge">{session.team?.code || 'No team code'}</span></section>
        {!session.teamId && <div className="notice">Set your team code on the website before saving questions. <button className="text-button" onClick={() => openWebsite()}>Open repository ↗</button></div>}
        <section className="section-head"><div><p className="eyebrow">01 · Review</p><h2>Staged questions <span>{totalCount}</span></h2></div></section>
        {attempts.length ? <div className="attempt-list">{attempts.map(attempt => <article className="attempt-card" key={attempt.quizId}>
          <div className="attempt-top"><label className="attempt-select"><input type="checkbox" checked={selected.includes(attempt.quizId)} onChange={() => toggleAttempt(attempt.quizId)} disabled={busy} /><span>{attempt.questions[0]?.quizTitle || `Quiz ${attempt.quizId}`}</span></label><button className="remove-button" onClick={() => void discardAttempt(attempt.quizId)} disabled={busy} aria-label="Remove staged quiz">×</button></div>
          <p className="attempt-meta">{attempt.questions[0]?.courseTitle || 'Canvas quiz'} · {attempt.questions.length} questions</p>
          <details><summary>Review questions</summary><ol>{attempt.questions.map((question, index) => <QuestionPreview key={`${question.canvasQuestionId}-${index}`} question={question} match={matches[`${attempt.quizId}:${index}`] || 'unknown'} />)}</ol></details>
        </article>)}</div> : <div className="empty-state"><span aria-hidden="true">□</span><strong>No questions staged yet</strong><p>Finish a Canvas formative quiz, then open this popup to review what was captured.</p></div>}
        {matchError && <p className="hint">{matchError}</p>}
        <section className="destination-section"><p className="eyebrow">02 · Choose destination</p><h2>Save to course or folder</h2>
          <label className="destination-label">Course / folder<select value={folderId} onChange={event => setFolderId(event.target.value)} disabled={!destinations.length || busy}><option value="">Select a destination…</option>{destinations.map(folder => <option key={folder.id} value={folder.id}>{`${'　'.repeat(folder.depth)}${folder.depth ? '↳ ' : ''}${folder.label}`}</option>)}</select></label>
          {!destinations.length && <p className="hint">Create a course in your repository first. <button className="text-button" onClick={() => openWebsite()}>Open website ↗</button></p>}
        </section>
        <button className="button button-primary push-button" onClick={() => void push()} disabled={!session.teamId || !folderId || !selectedCount || busy}>{busy ? `Saving ${progress}%…` : `Push ${selectedCount} question${selectedCount === 1 ? '' : 's'} →`}</button>
        {busy && <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div>}
      </>}
      {message && <p className="message" role="status">{message}</p>}
      <details className="settings"><summary>Connection settings</summary><label>Hub URL<input value={hubUrl} onChange={event => setHubUrl(event.target.value)} /></label><button className="button button-secondary" onClick={() => void connect(hubUrl)} disabled={busy}>Connect to hub</button></details>
    </div>
    <footer>YOUR QUIZ NOTES, IN ONE PLACE</footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
