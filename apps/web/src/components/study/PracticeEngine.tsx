'use client';
import { useState } from 'react';
import type { StudyQuestion } from './types';

function shuffle<T>(items: T[]): T[] { return [...items].sort(() => Math.random() - 0.5); }
function isCorrect(question: StudyQuestion, selected: string[]): boolean {
  const expected = question.choices.filter(choice => choice.isCorrect).map(choice => choice.id);
  return expected.length === selected.length && expected.every(id => selected.includes(id));
}

export function PracticeEngine({ questions }: { questions: StudyQuestion[] }) {
  const [count, setCount] = useState('10');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleChoices, setShuffleChoices] = useState(true);
  const [immediate, setImmediate] = useState(true);
  const [deck, setDeck] = useState<StudyQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const eligible = questions.filter(q => q.isVerified && q.choices.some(c => c.isCorrect));
  function start() {
    const selected = shuffleQuestions ? shuffle(eligible) : [...eligible];
    setDeck(selected.slice(0, count === 'all' ? selected.length : Number(count)).map(q => ({ ...q, choices: shuffleChoices ? shuffle(q.choices) : q.choices })));
    setIndex(0); setAnswers({}); setChecked({}); setDone(false);
  }
  const current = deck[index];
  const score = deck.filter(q => isCorrect(q, answers[q.id] || [])).length;
  if (!questions.length) return <section className="panel"><h2>Practice test</h2><p className="muted">No questions in this folder yet.</p></section>;
  if (!deck.length) return <section className="panel"><h2>Practice test</h2><p>{eligible.length} verified questions available.</p><div className="tabs"><label>Questions <select value={count} onChange={e => setCount(e.target.value)}>{['5','10','20','all'].map(value => <option key={value} value={value}>{value === 'all' ? 'All' : value}</option>)}</select></label><label><input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} /> Shuffle questions</label><label><input type="checkbox" checked={shuffleChoices} onChange={e => setShuffleChoices(e.target.checked)} /> Shuffle choices</label><label><input type="checkbox" checked={immediate} onChange={e => setImmediate(e.target.checked)} /> Immediate feedback</label></div><button className="button" disabled={!eligible.length} onClick={start}>Start test</button></section>;
  if (done) return <section className="panel"><h2>Results: {score}/{deck.length} ({Math.round(score / deck.length * 100)}%)</h2>{deck.map(q => <article className="question" key={q.id}><strong>{q.plainText}</strong><p>Your answer: {q.choices.filter(c => (answers[q.id] || []).includes(c.id)).map(c => c.text).join(', ') || 'Skipped'}</p><p>Correct: {q.choices.filter(c => c.isCorrect).map(c => c.text).join(', ')}</p><p>{q.explanation}</p></article>)}<button className="button" onClick={() => setDeck([])}>New test</button></section>;

  const multiple = current.questionType === 'MULTIPLE_ANSWERS' || current.choices.filter(choice => choice.isCorrect).length > 1;
  const selected = answers[current.id] || [];
  function choose(id: string) {
    const next = multiple ? (selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]) : [id];
    setAnswers({ ...answers, [current.id]: next });
    if (immediate && !multiple) setChecked({ ...checked, [current.id]: true });
  }
  return <section className="panel"><p>Question {index + 1} of {deck.length}</p><div className="progress-track"><div style={{ width: `${(index + 1) / deck.length * 100}%` }} /></div><h2>{current.plainText}</h2>{multiple && <p>Select all correct answers.</p>}{current.choices.map(choice => <button key={choice.id} type="button" disabled={immediate && !!checked[current.id]} onClick={() => choose(choice.id)} className={`folder-card choice-card ${selected.includes(choice.id) ? 'selected' : ''}`}>{multiple ? (selected.includes(choice.id) ? '☑ ' : '☐ ') : (selected.includes(choice.id) ? '◉ ' : '○ ')}{choice.text}</button>)}
    {immediate && multiple && !checked[current.id] && <button className="button button-secondary" disabled={!selected.length} onClick={() => setChecked({ ...checked, [current.id]: true })}>Check answer</button>}
    {immediate && checked[current.id] && <p className={isCorrect(current, selected) ? 'success' : 'error'}>{isCorrect(current, selected) ? 'Correct' : 'Incorrect'} · {current.explanation || current.choices.filter(c => c.isCorrect).map(c => c.text).join(', ')}</p>}
    <div style={{ marginTop: 18 }}><button className="button" disabled={immediate && !checked[current.id]} onClick={() => index === deck.length - 1 ? setDone(true) : setIndex(index + 1)}>{index === deck.length - 1 ? 'Submit test' : 'Next question'}</button></div>
  </section>;
}
