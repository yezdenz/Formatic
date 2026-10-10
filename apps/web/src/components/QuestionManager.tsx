'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Choice = { id: string; text: string; isCorrect: boolean | null };
type Blank = { id: string; key: string; correctAnswers: string[] };
type Question = { id: string; text: string; plainText: string; folderId: string; explanation: string | null; choices: Choice[]; blanks: Blank[] };
type Folder = { id: string; name: string };

export function QuestionManager({ questions, folders }: { questions: Question[]; folders: Folder[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [editing, setEditing] = useState<Question | null>(null);
  const [blankDrafts, setBlankDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const visible = questions.filter(question => (!folderFilter || question.folderId === folderFilter) && question.plainText.toLowerCase().includes(query.toLowerCase().trim()));
  function begin(question: Question) { setEditing({ ...question, choices: question.choices.map(choice => ({ ...choice })), blanks: question.blanks.map(blank => ({ ...blank, correctAnswers: [...blank.correctAnswers] })) }); setBlankDrafts(Object.fromEntries(question.blanks.map(blank => [blank.id, blank.correctAnswers.join('; ')]))); setError(''); setNotice(''); }
  async function save() {
    if (!editing) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/questions/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionText: editing.text, folderId: editing.folderId, explanation: editing.explanation, choices: editing.choices, blanks: editing.blanks.map(blank => ({ id: blank.id, correctAnswers: [...new Set((blankDrafts[blank.id] || '').split(';').map(value => value.trim()).filter(Boolean))] })) }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not save question.');
      setEditing(null); setNotice('Question saved.'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save question.'); }
    finally { setBusy(false); }
  }
  async function remove(question: Question) {
    if (!window.confirm('Delete this question from the repository? The action is recorded for recovery.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/questions/${question.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not delete question.');
      if (editing?.id === question.id) setEditing(null);
      setNotice('Question deleted.'); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete question.'); }
    finally { setBusy(false); }
  }
  return <section className="panel"><h2>Manage questions</h2><p className="muted">Edit question text, choices, answers, or destination. Delete individual questions that were pushed into the wrong place.</p>
    <div className="grid"><label>Find a question<input className="field" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search question text" /></label><label>Course or folder<select className="field" value={folderFilter} onChange={event => setFolderFilter(event.target.value)}><option value="">All folders</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label></div>
    <div className="moderation-list">{visible.map(question => <div className="moderation-row" key={question.id}><div><strong>{question.plainText}</strong><small>{folders.find(folder => folder.id === question.folderId)?.name || 'Folder'} · {question.blanks.length ? `${question.blanks.length} blanks` : `${question.choices.length} choices`}</small></div><button className="button button-secondary" disabled={busy} onClick={() => begin(question)}>Edit</button><button className="button button-danger" disabled={busy} onClick={() => void remove(question)}>Delete</button></div>)}</div>
    {!visible.length && <p className="muted">No questions match this search.</p>}
    {editing && <div className="moderation-editor"><h3>Edit question</h3><label>Question text<textarea className="field" rows={4} value={editing.text} onChange={event => setEditing({ ...editing, text: event.target.value })} /></label><label>Folder<select className="field" value={editing.folderId} onChange={event => setEditing({ ...editing, folderId: event.target.value })}>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><label>Explanation<textarea className="field" rows={3} value={editing.explanation || ''} onChange={event => setEditing({ ...editing, explanation: event.target.value || null })} /></label>{editing.choices.length > 0 && <><h4>Choices</h4>{editing.choices.map((choice, index) => <div className="grid" key={choice.id}><label>Choice {index + 1}<input className="field" value={choice.text} onChange={event => setEditing({ ...editing, choices: editing.choices.map(item => item.id === choice.id ? { ...item, text: event.target.value } : item) })} /></label><label>Answer status<select className="field" value={choice.isCorrect === null ? 'unknown' : choice.isCorrect ? 'correct' : 'wrong'} onChange={event => setEditing({ ...editing, choices: editing.choices.map(item => item.id === choice.id ? { ...item, isCorrect: event.target.value === 'unknown' ? null : event.target.value === 'correct' } : item) })}><option value="unknown">Unknown</option><option value="correct">Correct</option><option value="wrong">Wrong</option></select></label></div>)}</>}{editing.blanks.length > 0 && <><h4>Fill-in answers</h4>{editing.blanks.map(blank => <label key={blank.id}>{blank.key}<input className="field" value={blankDrafts[blank.id] || ''} onChange={event => setBlankDrafts({ ...blankDrafts, [blank.id]: event.target.value })} placeholder="Accepted answers, separated by semicolons" /></label>)}</>}<div className="tabs"><button className="button" disabled={busy || !editing.text.trim()} onClick={() => void save()}>{busy ? 'Saving…' : 'Save question'}</button><button className="button button-secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div></div>}
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}
  </section>;
}
