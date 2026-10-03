import { observeQuiz, quizContainer } from './stealthGuard';
import type { ScrapedChoice, ScrapedQuestion, StagedAttempt } from '../types/canvas';

const questionSelector = '.quiz_question, .display_question, div[id^="question_"]';
const choiceSelector = '.answers .answer, .answer_row, .answer_label';

function cleanText(element: Element | null): string {
  if (!element) return '';
  const clone = element.cloneNode(true) as Element;
  const codeBlocks: string[] = [];
  clone.querySelectorAll('pre').forEach(node => {
    const marker = `FORMATIC_CODE_BLOCK_${codeBlocks.length}_END`;
    codeBlocks.push(node.textContent || '');
    node.replaceWith(marker);
  });
  clone.querySelectorAll('img, svg').forEach(node => {
    const description = node.getAttribute('alt') || node.getAttribute('aria-label') || node.querySelector('title')?.textContent || '';
    node.replaceWith(description);
  });
  clone.querySelectorAll('script, style, noscript, .screenreader-only').forEach(node => node.remove());
  clone.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
  clone.querySelectorAll('p, div, li').forEach(node => node.append('\n'));
  let text = (clone.textContent || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  codeBlocks.forEach((code, index) => { text = text.replace(`FORMATIC_CODE_BLOCK_${index}_END`, `\n${code}\n`); });
  return text.trim();
}

function uniqueQuestionElements(root: Element): Element[] {
  return [...root.querySelectorAll(questionSelector)].filter(element =>
    !element.parentElement?.closest(questionSelector)
  );
}

function parseChoice(element: Element, review: boolean): ScrapedChoice | null {
  const text = cleanText(element.querySelector('.answer_text, label, .answer_label') || element);
  if (!text) return null;
  const markedCorrect = element.matches('.correct_answer') || !!element.querySelector('.correct_answer');
  const markedIncorrect = element.matches('.incorrect_answer') || !!element.querySelector('.incorrect_answer');
  return {
    text,
    isCorrect: review && (markedCorrect || markedIncorrect) ? markedCorrect : null,
    isSelected: element.matches('.user_answer') || !!element.querySelector('input:checked, .user_answer')
  };
}

function parseQuestion(element: Element, review: boolean, fallbackIndex: number): ScrapedQuestion | null {
  const questionText = cleanText(element.querySelector('.question_text, .question_holder .text, .text'));
  if (!questionText) return null;
  const choiceElements = [...element.querySelectorAll(choiceSelector)].filter(choice =>
    !choice.parentElement?.closest(choiceSelector)
  );
  const choices = choiceElements.map(choice => parseChoice(choice, review)).filter((choice): choice is ScrapedChoice => choice !== null);
  const id = element.getAttribute('data-question-id') || element.id.match(/question_(\d+)/)?.[1] || `unknown_${fallbackIndex}`;
  return {
    canvasQuestionId: id,
    questionType: element.querySelector('input[type="checkbox"]') ? 'MULTIPLE_ANSWERS' :
      element.querySelector('textarea') ? 'ESSAY' :
      element.querySelector('input[type="text"]') ? 'SHORT_ANSWER' : 'MULTIPLE_CHOICE',
    courseTitle: cleanText(document.querySelector('.course-title, #breadcrumbs .course')) || undefined,
    quizTitle: cleanText(document.querySelector('.quiz_title, h1.page-title, h1')) || undefined,
    questionText,
    choices,
    explanation: cleanText(element.querySelector('.quiz_comment, .answer_comments, .feedback')) || undefined,
    isPostSubmission: review,
    timestamp: Date.now()
  };
}

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
  const questions = uniqueQuestionElements(root)
    .map((element, index) => parseQuestion(element, review, index))
    .filter((question): question is ScrapedQuestion => question !== null);
  if (!questions.length) return;
  const key = `staged_attempts_${quizId}`;
  const previous = (await chrome.storage.local.get(key))[key] as StagedAttempt | undefined;
  const merged = new Map(previous?.questions.map(question => [question.canvasQuestionId, question]) || []);
  for (const question of questions) {
    const old = merged.get(question.canvasQuestionId);
    if (!old) { merged.set(question.canvasQuestionId, question); continue; }
    const choices = new Map(old.choices.map(choice => [choice.text, choice]));
    for (const choice of question.choices) {
      const prior = choices.get(choice.text);
      choices.set(choice.text, { ...prior, ...choice, isCorrect: choice.isCorrect ?? prior?.isCorrect ?? null });
    }
    merged.set(question.canvasQuestionId, {
      ...old, ...question,
      explanation: question.explanation || old.explanation,
      choices: [...choices.values()]
    });
  }
  await chrome.storage.local.set({
    [key]: { quizId, sourceUrl: location.href, questions: [...merged.values()], updatedAt: Date.now() }
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
