'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Option = { id: string; plainText: string };
export function DuplicateMerge({ questions }: { questions: Option[] }) {
  const router = useRouter();
  const [targetId, setTargetId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [message, setMessage] = useState('');
  async function merge() {
    if (!window.confirm('Merge these questions? The source question will be removed.')) return;
    const response = await fetch('/api/admin/merge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId, sourceId }) });
    const result = await response.json();
    setMessage(response.ok ? 'Questions merged. Future pushes of either wording will match the target.' : result.error || 'Merge failed.');
    if (response.ok) { setSourceId(''); router.refresh(); }
  }
  return <section className="panel"><h2>Merge duplicate questions</h2><p>Keep the target question and fold the source question into it.</p><div className="grid"><label>Keep<select className="field" value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">Select question</option>{questions.map(question => <option key={question.id} value={question.id}>{question.plainText.slice(0, 120)}</option>)}</select></label><label>Merge into target<select className="field" value={sourceId} onChange={event => setSourceId(event.target.value)}><option value="">Select duplicate</option>{questions.filter(question => question.id !== targetId).map(question => <option key={question.id} value={question.id}>{question.plainText.slice(0, 120)}</option>)}</select></label></div><button className="button" disabled={!targetId || !sourceId || targetId === sourceId} onClick={() => void merge()}>Merge questions</button>{message && <p role="status">{message}</p>}</section>;
}
