'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Choice = { id: string; text: string; isCorrect: boolean | null };

export function AnswerResolver({ questionId, multiple, editable, choices }: { questionId: string; multiple: boolean; editable: boolean; choices: Choice[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(() => editable ? choices.filter(choice => choice.isCorrect === true).map(choice => choice.id) : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function choose(id: string) {
    setSelected(current => multiple
      ? current.includes(id) ? current.filter(item => item !== id) : [...current, id]
      : [id]);
    setError('');
    setNotice('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length || busy) return;
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
      setNotice('Answer saved for your team.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this answer.');
    } finally {
      setBusy(false);
    }
  }

  return <form className="repository-answer-form" onSubmit={event => void submit(event)}>
    <p className="repository-answer-help">{editable ? 'Team answer. Any team member can correct it.' : multiple ? 'Select every correct choice to resolve this question.' : 'Know the answer? Select it for your team.'}</p>
    <ol className="repository-choice-list">{choices.map((choice, index) => <li className={`${!editable && choice.isCorrect === false ? 'choice-incorrect' : ''} ${selected.includes(choice.id) ? 'choice-selected' : ''}`} key={choice.id}>
      <label><input type={multiple ? 'checkbox' : 'radio'} name={`answer-${questionId}`} checked={selected.includes(choice.id)} onChange={() => choose(choice.id)} disabled={busy || (!editable && choice.isCorrect === false)} />
        <span className="choice-letter">{String.fromCharCode(65 + index)}</span><span className="choice-text">{choice.text}</span>{!editable && choice.isCorrect === false && <small>Previously wrong</small>}
      </label>
    </li>)}</ol>
    <button className="button repository-answer-submit" type="submit" disabled={!selected.length || busy}>{busy ? 'Saving…' : editable ? 'Update answer' : 'Save answer'}</button>
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p className="success" role="status">{notice}</p>}
  </form>;
}
