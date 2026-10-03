import { observeQuiz, quizContainer } from './stealthGuard';
import { mergeQuestions, parseQuestions } from './canvasParser';
import type { StagedAttempt } from '../types/canvas';

function quizIdentity(): { quizId: string; review: boolean } | null {
  const path = location.pathname;
  const quiz = path.match(/\/courses\/(\d+)\/quizzes\/(\d+)(?:\/|$)/);
  const submission = path.match(/\/courses\/(\d+)\/quiz_submissions\/(\d+)(?:\/|$)/);
  if (!quiz && !submission) return null;
  return {
    quizId: `${location.origin}_course_${(quiz || submission)![1]}_${quiz ? `quiz_${quiz[2]}` : `submission_${submission![2]}`}`,
    review: !!submission || /\/history(?:\/|$)/.test(path)
  };
}

async function capture(root: Element, quizId: string, review: boolean): Promise<void> {
  const questions = parseQuestions(root, review, document);
  if (!questions.length) return;
  const key = `staged_attempts_${quizId}`;
  const previous = (await chrome.storage.local.get(key))[key] as StagedAttempt | undefined;
  await chrome.storage.local.set({
    [key]: { quizId, sourceUrl: location.href, questions: mergeQuestions(previous?.questions || [], questions, review), updatedAt: Date.now() }
  });
}

const identity = quizIdentity();
function attach(container: Element, quizId: string, review: boolean) {
  let pending = false;
  const queueCapture = () => {
    if (pending) return;
    pending = true;
    window.setTimeout(() => {
      pending = false;
      void capture(container, quizId, review);
    }, 250);
  };
  queueCapture();
  observeQuiz(container, queueCapture);
}

if (identity) {
  let attempts = 0;
  const locate = () => {
    const container = quizContainer();
    if (container) attach(container, identity.quizId, identity.review);
    else if (++attempts < 20) window.setTimeout(locate, 500);
  };
  locate();
}
