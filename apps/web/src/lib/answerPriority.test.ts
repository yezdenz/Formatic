import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldPreferIncomingAnswer, userAnswerDisproved } from './answerPriority';

const unknown = { choices: [{ isCorrect: null }], answerSource: null, hasConflict: false };
const canvas = { choices: [{ isCorrect: true }], answerSource: 'CANVAS', hasConflict: false };
const user = { choices: [{ isCorrect: true }], answerSource: 'USER', hasConflict: false };

test('an answer-rich duplicate replaces an unanswered record', () => {
  assert.equal(shouldPreferIncomingAnswer(unknown, canvas), true);
  assert.equal(shouldPreferIncomingAnswer(unknown, user), true);
});

test('Canvas evidence replaces a manually selected answer but manual answers cannot replace Canvas evidence', () => {
  assert.equal(shouldPreferIncomingAnswer(user, canvas), true);
  assert.equal(shouldPreferIncomingAnswer(canvas, user), false);
});

test('unanswered and conflicting incoming copies never replace a known answer', () => {
  assert.equal(shouldPreferIncomingAnswer(canvas, unknown), false);
  assert.equal(shouldPreferIncomingAnswer(unknown, { ...canvas, hasConflict: true }), false);
  assert.equal(shouldPreferIncomingAnswer({ ...unknown, hasConflict: true }, canvas), false);
});

test('explicit wrong feedback clears a team-selected single answer only', () => {
  const selected = { answerSource: 'USER', questionType: 'MULTIPLE_CHOICE', choices: [{ text: 'pip freeze', isCorrect: true }] };
  assert.equal(userAnswerDisproved(selected, [{ text: 'PIP FREEZE', isCorrect: false }]), true);
  assert.equal(userAnswerDisproved(selected, [{ text: 'another choice', isCorrect: false }]), false);
  assert.equal(userAnswerDisproved({ ...selected, answerSource: 'CANVAS' }, [{ text: 'pip freeze', isCorrect: false }]), false);
  assert.equal(userAnswerDisproved({ ...selected, questionType: 'MULTIPLE_ANSWERS' }, [{ text: 'pip freeze', isCorrect: false }]), false);
});
