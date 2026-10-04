import assert from 'node:assert/strict';
import test from 'node:test';
import { canSetTeamAnswer } from './answerResolution';

test('shows answer controls when choices have no confirmed answer, even for legacy verified questions', () => {
  assert.equal(canSetTeamAnswer({
    answerSource: null, hasConflict: false,
    choices: [{ isCorrect: null }, { isCorrect: null }]
  }), true);
});

test('allows team members to correct a saved team answer', () => {
  assert.equal(canSetTeamAnswer({
    answerSource: 'USER', hasConflict: false,
    choices: [{ isCorrect: true }, { isCorrect: false }]
  }), true);
});

test('protects confirmed Canvas answers and conflicted questions', () => {
  const choices = [{ isCorrect: true }, { isCorrect: false }];
  assert.equal(canSetTeamAnswer({ answerSource: 'CANVAS', hasConflict: false, choices }), false);
  assert.equal(canSetTeamAnswer({ answerSource: null, hasConflict: true, choices: [{ isCorrect: null }] }), false);
});

test('does not offer choices Canvas has already ruled out', () => {
  assert.equal(canSetTeamAnswer({
    answerSource: null, hasConflict: false,
    choices: [{ isCorrect: false }, { isCorrect: false }]
  }), false);
});
