'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Choice = { id: string; text: string; isCorrect: boolean | null };

export function AnswerResolver({ questionId, multiple, choices }: { questionId: string; multiple: boolean; choices: Choice[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function choose(id: string) {
    setSelected(current => multiple
      ? current.includes(id) ? current.filter(item => item !== id) : [...current, id]
      : [id]);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length || busy || saved) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/questions/${questionId}/answer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choiceIds: selected })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Could not save this answer.');
      }
      setSaved(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this answer.');
    } finally {
      setBusy(false);
    }
  }

  return <form className="repository-answer-form" onSubmit={event => void submit(event)}>
    <p className="repository-answer-help">{multiple ? 'Select every correct choice to resolve this question.' : 'Know the answer? Select it for your team.'}</p>
    <ol className="repository-choice-list">{choices.map((choice, index) => <li className={`${choice.isCorrect === false ? 'choice-incorrect' : ''} ${selected.includes(choice.id) ? 'choice-selected' : ''}`} key={choice.id}>
      <label><input type={multiple ? 'checkbox' : 'radio'} name={`answer-${questionId}`} checked={selected.includes(choice.id)} onChange={() => choose(choice.id)} disabled={busy || saved || choice.isCorrect === false} />
        <span className="choice-letter">{String.fromCharCode(65 + index)}</span><span className="choice-text">{choice.text}</span>{choice.isCorrect === false && <small>Previously wrong</small>}
      </label>
    </li>)}</ol>
    <button className="button repository-answer-submit" type="submit" disabled={!selected.length || busy || saved}>{busy ? 'Saving…' : saved ? 'Answer saved' : 'Save answer'}</button>
    {error && <p className="error" role="alert">{error}</p>}
  </form>;
}
