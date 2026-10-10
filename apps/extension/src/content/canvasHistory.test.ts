import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeCompletedHistory, readCompletedHistory } from './canvasHistory';
import type { ScrapedQuestion } from '../types/canvas';

function question(id: string, type: ScrapedQuestion['questionType'] = 'MULTIPLE_CHOICE'): ScrapedQuestion {
  return {
    canvasQuestionId: id, questionText: 'Which command uploads commits?', questionType: type,
    choices: [
      { text: 'git pull', canvasAnswerId: '10', isCorrect: null, isSelected: false },
      { text: 'git init', canvasAnswerId: '11', isCorrect: null, isSelected: false },
      { text: 'git push', canvasAnswerId: '12', isCorrect: null, isSelected: true }
    ],
    isPostSubmission: true, timestamp: 0
  };
}

test('maps a prior correct completed answer to its Canvas option ID', () => {
  const merged = mergeCompletedHistory([question('5')], [{
    submitted_at: '2026-10-01T01:00:00Z',
    submission_data: [{ question_id: 5, correct: true, text: '12' }]
  }]);
  assert.deepEqual(merged[0].choices.map(choice => choice.isCorrect), [null, null, true]);
});

test('rules out a wrong single choice without guessing which other option is right', () => {
  const merged = mergeCompletedHistory([question('5')], [{
    submitted_at: '2026-10-01T01:00:00Z',
    submission_data: [{ question_id: 5, correct: false, answer_id: 10 }]
  }]);
  assert.deepEqual(merged[0].choices.map(choice => choice.isCorrect), [false, null, null]);
});

test('ignores partial credit, nonnumeric answers, and contradictory history', () => {
  const merged = mergeCompletedHistory([question('5')], [{
    submission_data: [
      { question_id: 5, correct: 'partial', text: '12' },
      { question_id: 5, correct: true, text: '10' },
      { question_id: 5, correct: false, text: '10' },
      { question_id: 5, correct: true, text: 'git push' }
    ]
  }]);
  assert.deepEqual(merged[0].choices.map(choice => choice.isCorrect), [null, null, null]);
});

test('marks selected options from a fully correct multiple-answer attempt', () => {
  const merged = mergeCompletedHistory([question('6', 'MULTIPLE_ANSWERS')], [{
    submission_data: [{ question_id: 6, correct: true, answer_10: '1', answer_11: '0', answer_12: '1' }]
  }]);
  assert.deepEqual(merged[0].choices.map(choice => choice.isCorrect), [true, null, true]);
});

test('does not classify choices from an incorrect multiple-answer attempt', () => {
  const merged = mergeCompletedHistory([question('6', 'MULTIPLE_ANSWERS')], [{
    submission_data: [{ question_id: 6, correct: false, answer_10: '1', answer_11: '0', answer_12: '1' }]
  }]);
  assert.deepEqual(merged[0].choices.map(choice => choice.isCorrect), [null, null, null]);
});

test('requests current-user completed submission history', async () => {
  const requested: string[] = [];
  const mock = (async (url: string) => {
    requested.push(url);
    const body = url.endsWith('/submission')
      ? { quiz_submissions: [{ user_id: 7, finished_at: '2026-10-01T01:00:00Z' }] }
      : url.includes('/assignments/')
        ? { submission_history: [
          { submitted_at: '2026-10-01T01:00:00Z', submission_data: [{ question_id: 5, correct: true, text: '12' }] },
          { submitted_at: null, submission_data: [{ question_id: 5, correct: true, text: '10' }] }
        ] }
        : { assignment_id: 33 };
    return { ok: true, json: async () => body } as Response;
  }) as typeof fetch;
  const history = await readCompletedHistory('https://canvas.example.edu', '2', '3', mock);
  assert.equal(history.length, 1);
  assert.deepEqual(requested, [
    'https://canvas.example.edu/api/v1/courses/2/quizzes/3',
    'https://canvas.example.edu/api/v1/courses/2/quizzes/3/submission',
    'https://canvas.example.edu/api/v1/courses/2/assignments/33/submissions/7?include%5B%5D=submission_history'
  ]);
});

test('reads earlier completed history while the current quiz attempt is unfinished', async () => {
  const requested: string[] = [];
  const mock = (async (url: string) => {
    requested.push(url);
    const body = url.endsWith('/submission')
      ? { quiz_submissions: [{ user_id: 7, finished_at: null }] }
      : url.includes('/assignments/')
        ? { submission_history: [
          { submitted_at: '2026-10-01T01:00:00Z', submission_data: [{ question_id: 5, correct: true, text: '12' }] },
          { submitted_at: null, submission_data: [{ question_id: 5, correct: false, text: '12' }] }
        ] }
        : { assignment_id: 33 };
    return { ok: true, json: async () => body } as Response;
  }) as typeof fetch;
  const history = await readCompletedHistory('https://canvas.example.edu', '2', '3', mock);
  assert.equal(history.length, 1);
  assert.deepEqual(mergeCompletedHistory([question('5')], history)[0].choices.map(choice => choice.isCorrect), [null, null, true]);
  assert.equal(requested.length, 3);
});

test('does not infer an answer from an unfinished first attempt', async () => {
  const requested: string[] = [];
  const mock = (async (url: string) => {
    requested.push(url);
    const body = url.endsWith('/submission')
      ? { quiz_submissions: [{ user_id: 7, finished_at: null }] }
      : url.includes('/assignments/')
        ? { submission_history: [{ submitted_at: null, submission_data: [{ question_id: 5, correct: true, text: '12' }] }] }
        : { assignment_id: 33 };
    return { ok: true, json: async () => body } as Response;
  }) as typeof fetch;
  assert.deepEqual(await readCompletedHistory('https://canvas.example.edu', '2', '3', mock), []);
  assert.equal(requested.length, 3);
});

test('confirms a single fill-in answer only from a fully correct completed response', () => {
  const blank = { ...question('8', 'SHORT_ANSWER'), choices: [], blanks: [{ key: 'answer', label: 'Answer', submittedText: 'HHTP', correctAnswers: [] }] };
  const merged = mergeCompletedHistory([blank], [{ submission_data: [
    { question_id: 8, correct: false, text: 'HHTP' },
    { question_id: 8, correct: true, text: 'HTTP' }
  ] }]);
  assert.deepEqual(merged[0].blanks?.[0].correctAnswers, ['HTTP']);
});

test('requires every named blank in a fully correct response before confirming any', () => {
  const blank = { ...question('9', 'FILL_IN_MULTIPLE_BLANKS'), choices: [], blanks: [
    { key: 'color', label: 'color', correctAnswers: [] },
    { key: 'plant', label: 'plant', correctAnswers: [] }
  ] };
  const merged = mergeCompletedHistory([blank], [{ submission_data: [
    { question_id: 9, correct: true, answer_color: 'blue' },
    { question_id: 9, correct: 'partial', answer_color: 'blue', answer_plant: 'green' },
    { question_id: 9, correct: true, answer_color: 'blue', answer_plant: 'green' }
  ] }]);
  assert.deepEqual(merged[0].blanks?.map(item => item.correctAnswers), [['blue'], ['green']]);
});
