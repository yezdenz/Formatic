'use client';
import { useState } from 'react';
import Link from 'next/link';
import { StudyStackTable } from '@/components/study/StudyStackTable';
import { PracticeEngine } from '@/components/study/PracticeEngine';
import { FlashcardDeck } from '@/components/study/FlashcardDeck';
import type { StudyQuestion } from '@/components/study/types';

const sample: StudyQuestion[] = [
  { id: 'demo-1', text: 'Which organelle produces most ATP in a eukaryotic cell?', plainText: 'Which organelle produces most ATP in a eukaryotic cell?', explanation: 'Cellular respiration in the mitochondrion generates most of the cell’s ATP.', isVerified: true, timesEncountered: 4, questionType: 'MULTIPLE_CHOICE', choices: [
    { id: 'd1a', text: 'Mitochondrion', isCorrect: true }, { id: 'd1b', text: 'Golgi apparatus', isCorrect: false }, { id: 'd1c', text: 'Nucleus', isCorrect: false }
  ] },
  { id: 'demo-2', text: 'Which structures are present in plant cells?', plainText: 'Which structures are present in plant cells?', explanation: 'Plant cells have chloroplasts and a cell wall.', isVerified: true, timesEncountered: 2, questionType: 'MULTIPLE_ANSWERS', choices: [
    { id: 'd2a', text: 'Chloroplast', isCorrect: true }, { id: 'd2b', text: 'Cell wall', isCorrect: true }, { id: 'd2c', text: 'Centriole', isCorrect: false }
  ] },
  { id: 'demo-3', text: 'What molecule stores genetic information?', plainText: 'What molecule stores genetic information?', explanation: 'DNA carries the inherited instructions used by cells.', isVerified: true, timesEncountered: 3, questionType: 'MULTIPLE_CHOICE', choices: [
    { id: 'd3a', text: 'DNA', isCorrect: true }, { id: 'd3b', text: 'ATP', isCorrect: false }, { id: 'd3c', text: 'Glucose', isCorrect: false }
  ] }
];

export default function DemoPage() {
  const [mode, setMode] = useState<'stack' | 'practice' | 'cards'>('stack');
  return <main className="shell"><p className="muted">Sample preview · No account or database required</p><h1>Biology 101</h1><div className="grid"><div className="folder-card"><h2>Unit 1: Cell Structure</h2><p>3 sample questions</p><small>Verified answers · Practice ready</small></div></div>
    <nav className="tabs" aria-label="Study modes"><button className={`button ${mode === 'stack' ? '' : 'button-secondary'}`} onClick={() => setMode('stack')}>StudyStack</button><button className={`button ${mode === 'practice' ? '' : 'button-secondary'}`} onClick={() => setMode('practice')}>Practice test</button><button className={`button ${mode === 'cards' ? '' : 'button-secondary'}`} onClick={() => setMode('cards')}>Flashcards</button></nav>
    {mode === 'stack' && <StudyStackTable questions={sample} />}
    {mode === 'practice' && <PracticeEngine questions={sample} />}
    {mode === 'cards' && <FlashcardDeck questions={sample} />}
    <p><Link href="/">← Back to Formatic Hub</Link></p>
  </main>;
}
