'use client';
import { useState } from 'react';
import type { StudyQuestion } from './types';

export function StudyStackTable({ questions }: { questions: StudyQuestion[] }) {
  const [hidden, setHidden] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const visible = questions.filter(question => (filter === 'all' || (filter === 'verified' ? question.isVerified : !question.isVerified)) && question.plainText.toLowerCase().includes(search.toLowerCase()));
  function download(format: 'json' | 'csv') {
    const rows = visible.map(q => ({ question: q.plainText, answer: q.choices.filter(c => c.isCorrect).map(c => c.text).join('; '), explanation: q.explanation || '' }));
    const csv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const data = format === 'json' ? JSON.stringify(rows, null, 2) : ['question,answer,explanation', ...rows.map(row => [row.question, row.answer, row.explanation].map(csv).join(','))].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' })); link.download = `formatic-study.${format}`; link.click(); URL.revokeObjectURL(link.href);
  }
  if (!questions.length) return <section className="panel"><h2>StudyStack</h2><p className="muted">No questions in this folder yet.</p></section>;
  return <section className="panel"><h2>StudyStack</h2><div className="tabs"><label><input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} /> Hide answers</label><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All</option><option value="verified">Verified only</option><option value="unresolved">Unresolved only</option></select><input aria-label="Search questions" placeholder="Search questions" value={search} onChange={e => setSearch(e.target.value)} /><button className="button button-secondary" onClick={() => download('csv')}>CSV</button><button className="button button-secondary" onClick={() => download('json')}>JSON</button></div>
    {visible.map(q => <div className="question" key={q.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18 }}><div><strong>{q.plainText}</strong></div><div>{hidden && !revealed.includes(q.id) ? <button className="button" onClick={() => setRevealed([...revealed, q.id])}>Reveal</button> : <><strong>{q.choices.filter(c => c.isCorrect).map(c => c.text).join(', ') || 'Unresolved'}</strong><p>{q.explanation}</p></>}</div></div>)}
    {!visible.length && <p>No questions match this filter.</p>}
  </section>;
}
