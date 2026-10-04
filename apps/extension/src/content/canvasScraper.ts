import { observeQuiz, quizContainer } from './stealthGuard';
import { mergeQuestions, parseQuestions } from './canvasParser';
import { mergeCompletedHistory, readCompletedHistory } from './canvasHistory';
import type { StagedAttempt } from '../types/canvas';

function quizIdentity(): { quizId: string; review: boolean; courseId: string; quizNumber?: string } | null {
  const path = location.pathname;
  const quiz = path.match(/\/courses\/(\d+)\/quizzes\/(\d+)(?:\/|$)/);
  const submission = path.match(/\/courses\/(\d+)\/quiz_submissions\/(\d+)(?:\/|$)/);
  if (!quiz && !submission) return null;
  return {
    quizId: `${location.origin}_course_${(quiz || submission)![1]}_${quiz ? `quiz_${quiz[2]}` : `submission_${submission![2]}`}`,
    review: !!submission || /\/history(?:\/|$)/.test(path),
    courseId: (quiz || submission)![1],
    quizNumber: quiz?.[2]
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
function attach(container: Element, identity: NonNullable<ReturnType<typeof quizIdentity>>) {
  let pending = false;
  let chain: Promise<void> = Promise.resolve();
  const enqueue = (work: () => Promise<void>) => {
    chain = chain.then(work).catch(() => {});
  };
  enqueue(() => capture(container, identity.quizId, identity.review));
  const queueCapture = () => {
    if (pending) return;
    pending = true;
    window.setTimeout(() => {
      pending = false;
      enqueue(() => capture(container, identity.quizId, identity.review));
    }, 250);
  };
  observeQuiz(container, queueCapture);
  if (identity.quizNumber) {
    void readCompletedHistory(location.origin, identity.courseId, identity.quizNumber)
      .then(submissions => {
        if (!submissions.length) return;
        enqueue(async () => {
          const key = `staged_attempts_${identity.quizId}`;
          const prior = (await chrome.storage.local.get(key))[key] as StagedAttempt | undefined;
          if (!prior) return;
          await chrome.storage.local.set({
            [key]: { ...prior, questions: mergeCompletedHistory(prior.questions, submissions), updatedAt: Date.now() }
          });
        });
      })
      .catch(() => {});
  }
}

if (identity) {
  let attempts = 0;
  const locate = () => {
    const container = quizContainer();
    if (container) attach(container, identity);
    else if (++attempts < 20) window.setTimeout(locate, 500);
  };
  locate();
}
