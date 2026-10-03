import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Smoke tests are limited to a local hub.');
const runId = randomUUID();
const teamCode = `T${runId.replaceAll('-', '').slice(0, 11).toUpperCase()}`;
let cookie = '';
let rootId;
let movedId;
let smokeUserId;

async function api(path, method = 'GET', body) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (path === '/api/auth/login' && response.ok) cookie = response.headers.get('set-cookie')?.split(';')[0] || '';
  const result = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(result)}`);
  return result;
}

try {
  const smokeUser = await api('/api/auth/login', 'POST', { username: `smoke_${runId.slice(0, 12)}`, passcode: `test-${runId}` });
  smokeUserId = smokeUser.id;
  await api('/api/team', 'POST', { code: teamCode });
  const root = await api('/api/folders', 'POST', { name: `Smoke ${runId}` }); rootId = root.id;
  const child = await api('/api/folders', 'POST', { name: 'Unit 1', parentId: rootId });
  const grandchild = await api('/api/folders', 'POST', { name: 'Quiz', parentId: child.id }); movedId = grandchild.id;
  const moved = await api(`/api/folders/${movedId}`, 'PATCH', { name: 'Moved quiz', parentId: null });
  assert.equal(moved.name, 'Moved quiz'); assert.equal(moved.parentId, null);

  const questions = Array.from({ length: 10 }, (_, index) => ({
    questionText: `Smoke ${runId}: question ${index + 1}?`,
    questionType: 'MULTIPLE_CHOICE',
    choices: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }]
  }));
  const first = await api('/api/sync/push', 'POST', { folderId: movedId, questions });
  assert.equal(first.newItems, 10); assert.equal(first.mergedItems, 0);
  const second = await api('/api/sync/push', 'POST', { folderId: movedId, questions: [...questions, ...[11, 12].map(index => ({ ...questions[0], questionText: `Smoke ${runId}: question ${index}?` }))] });
  assert.equal(second.newItems, 2); assert.equal(second.mergedItems, 10);
  const stored = await api(`/api/questions?folderId=${movedId}`);
  assert.equal(stored.length, 12);
  assert(stored.slice(0, 10).every(question => question.isVerified));
  if (process.env.ADMIN_SECRET_KEY) {
    await api('/api/auth/login', 'POST', { username: 'admin', passcode: process.env.ADMIN_SECRET_KEY });
    await api('/api/team', 'POST', { code: teamCode });
    const source = stored.find(question => question.plainText.endsWith('question 11?'));
    const target = stored.find(question => question.plainText.endsWith('question 12?'));
    assert(source && target);
    await api('/api/admin/merge', 'POST', { sourceId: source.id, targetId: target.id });
    const aliasPush = await api('/api/sync/push', 'POST', { folderId: movedId, questions: [{ ...questions[0], questionText: `Smoke ${runId}: question 11?` }] });
    assert.equal(aliasPush.newItems, 0); assert.equal(aliasPush.mergedItems, 1);
    assert.equal((await api(`/api/questions?folderId=${movedId}`)).length, 11);
  }
  console.log('Smoke test passed: nested folders, move, 10 merged, 2 new, and alias matching when admin is configured.');
} finally {
  try {
    if (movedId) await api(`/api/folders/${movedId}`, 'DELETE');
    if (rootId) await api(`/api/folders/${rootId}`, 'DELETE');
  } finally {
    if (smokeUserId) {
      const db = new PrismaClient();
      try {
        await db.pushBatch.deleteMany({ where: { userId: smokeUserId } });
        await db.user.delete({ where: { id: smokeUserId } });
      } finally { await db.$disconnect(); }
    }
    if (process.env.ADMIN_SECRET_KEY) {
      try { await api('/api/auth/login', 'POST', { username: 'admin', passcode: process.env.ADMIN_SECRET_KEY }); await api('/api/team', 'POST', { code: 'TS31' }); } catch (error) { console.error('Could not restore admin team:', error); }
    }
    const cleanup = new PrismaClient();
    try { await cleanup.team.deleteMany({ where: { code: teamCode, users: { none: {} }, folders: { none: {} } } }); }
    finally { await cleanup.$disconnect(); }
  }
}
