'use client';
import { useEffect, useState } from 'react';
import type { StudyQuestion } from './types';

export function FlashcardDeck({ questions }: { questions: StudyQuestion[] }) {
  const [queue, setQueue] = useState(questions.filter(q => q.isVerified));
  const [flipped, setFlipped] = useState(false);
  const [mastered, setMastered] = useState(0);
  const [review, setReview] = useState(0);
  const current = queue[0];
  function grade(known: boolean) {
    if (!queue.length) return;
    if (known) { setMastered(value => value + 1); setQueue(items => items.slice(1)); }
    else { setReview(value => value + 1); setQueue(items => [...items.slice(1), items[0]]); }
    setFlipped(false);
  }
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (event.code === 'Space') { event.preventDefault(); setFlipped(value => !value); }
      if (event.key === '1' || event.key === 'ArrowLeft') grade(false);
      if (event.key === '2' || event.key === 'ArrowRight') grade(true);
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });
  if (!questions.length) return <section className="panel"><h2>Flashcards</h2><p className="muted">No questions in this folder yet.</p></section>;
  return <section className="panel"><h2>Flashcards</h2><p>{current ? `Card 1 of ${queue.length}` : 'Deck complete'} · {mastered} mastered · {review} review actions</p>
    {current ? <><button className="folder-card" style={{ width: '100%', minHeight: 220, textAlign: 'center', fontSize: 22 }} onClick={() => setFlipped(!flipped)}>{flipped ? <><strong>{current.choices.filter(c => c.isCorrect).map(c => c.text).join(', ')}</strong><p>{current.explanation}</p></> : current.plainText}<small style={{ display: 'block', marginTop: 20 }}>Click or press Space to flip</small></button><div className="tabs"><button className="button button-secondary" onClick={() => grade(false)}>1 · Need review</button><button className="button" onClick={() => grade(true)}>2 · Mastered</button></div></> : <p>All verified cards mastered.</p>}
  </section>;
}
