'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { StudyQuestion } from './study/types';

export function ModerationPanel({ questions }: { questions: StudyQuestion[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string[]>>(() => Object.fromEntries(questions.map(question => {
    const known = question.choices.filter(choice => choice.isCorrect).map(choice => choice.id);
    return [question.id, question.questionType === 'MULTIPLE_ANSWERS' ? known : known.slice(0, 1)];
  })));
  const [error, setError] = useState('');
  async function save(question: StudyQuestion) {
    setError('');
    const correct = selected[question.id] || [];
    const response = await fetch(`/api/questions/${question.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hasConflict: false, choices: question.choices.map(choice => ({ id: choice.id, isCorrect: correct.includes(choice.id) })) }) });
    if (!response.ok) { setError((await response.json()).error || 'Could not update question.'); return; }
    router.refresh();
  }
  function choose(question: StudyQuestion, choiceId: string) {
    const current = selected[question.id] || [];
    const next = question.questionType === 'MULTIPLE_ANSWERS' ? (current.includes(choiceId) ? current.filter(id => id !== choiceId) : [...current, choiceId]) : [choiceId];
    setSelected({ ...selected, [question.id]: next });
  }
  return <section className="panel"><h2>Answer conflicts</h2>{questions.map(question => <article className="question" key={question.id}><h3>{question.plainText}</h3><p>Confirm {question.questionType === 'MULTIPLE_ANSWERS' ? 'all correct answers' : 'the correct answer'}:</p>{question.choices.map(choice => <label key={choice.id} style={{ display: 'block', padding: 6 }}><input type={question.questionType === 'MULTIPLE_ANSWERS' ? 'checkbox' : 'radio'} name={`answer-${question.id}`} checked={(selected[question.id] || []).includes(choice.id)} onChange={() => choose(question, choice.id)} /> {choice.text}</label>)}<button className="button" disabled={!(selected[question.id] || []).length} onClick={() => void save(question)}>Save resolution</button></article>)}{!questions.length && <p>No unresolved conflicts.</p>}{error && <p className="error" role="alert">{error}</p>}</section>;
}
