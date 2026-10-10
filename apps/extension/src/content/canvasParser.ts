import type { ScrapedBlank, ScrapedChoice, ScrapedQuestion } from '../types/canvas';

const questionSelector = '.quiz_question, .display_question, [id^="question_"]';
const choiceSelector = '.answers .answer, .answers .answer_row, .answers .answer_label, .answer_row, .answer[id^="answer_"]';
const feedbackSelector = '.quiz_comment, .answer_comments, .feedback, .correct_comments, .incorrect_comments, .neutral_comments';

function hidden(element: Element): boolean {
  return element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true' ||
    /display\s*:\s*none|visibility\s*:\s*hidden/i.test(element.getAttribute('style') || '');
}

function exposedWithin(element: Element, boundary: Element): boolean {
  for (let node: Element | null = element; node && node !== boundary; node = node.parentElement) {
    if (hidden(node)) return false;
  }
  return true;
}

export function cleanText(element: Element | null): string {
  if (!element) return '';
  const clone = element.cloneNode(true) as Element;
  const codeBlocks: string[] = [];
  clone.querySelectorAll('script, style, noscript, .screenreader-only, .answer_weight, input, button, .quiz_comment, .answer_comments').forEach(node => node.remove());
  clone.querySelectorAll('*').forEach(node => { if (hidden(node)) node.remove(); });
  clone.querySelectorAll('pre').forEach(node => {
    const marker = `FORMATIC_CODE_BLOCK_${codeBlocks.length}_END`;
    codeBlocks.push(node.textContent || '');
    node.replaceWith(marker);
  });
  clone.querySelectorAll('img, svg').forEach(node => {
    const description = node.getAttribute('alt') || node.getAttribute('aria-label') ||
      node.querySelector('title')?.textContent || (node.tagName.toLowerCase() === 'img' ? node.getAttribute('src') : '') || '';
    node.replaceWith(description);
  });
  clone.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
  clone.querySelectorAll('p, div, li').forEach(node => node.append('\n'));
  let text = (clone.textContent || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  codeBlocks.forEach((code, index) => { text = text.replace(`FORMATIC_CODE_BLOCK_${index}_END`, `\n${code}\n`); });
  return text.trim();
}

function promptText(element: Element | null): string {
  if (!element) return '';
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll('input[type="text"]').forEach(input => input.replaceWith(' [blank] '));
  return cleanText(clone);
}

function parseBlanks(element: Element, questionId: string, multiple: boolean, review: boolean): ScrapedBlank[] {
  const inputs = [...element.querySelectorAll('input[type="text"], input:not([type]).question_input')]
    .filter(input => exposedWithin(input, element) && !input.closest('.original_question_text, .hidden, .answer[id^="answer_"]')) as HTMLInputElement[];
  const blanks: ScrapedBlank[] = (multiple ? inputs : inputs.slice(0, 1)).map((input, index) => {
    const name = input.name || '';
    const key = multiple ? name.startsWith(`question_${questionId}_`)
      ? name.slice(`question_${questionId}_`.length) : `blank_${index + 1}` : 'answer';
    const label = input.getAttribute('data-blank-id') || input.getAttribute('aria-label') ||
      (multiple ? key : 'Answer');
    return { key, label, submittedText: input.value.trim() || undefined, correctAnswers: [] };
  });
  if (review) {
    const revealed = [...element.querySelectorAll('.answer.correct_answer')].filter(answer => exposedWithin(answer, element));
    for (const blank of blanks) {
      const matches = revealed.filter(answer => !multiple || answer.classList.contains(`answer_for_${blank.key}`));
      blank.correctAnswers = [...new Set(matches.map(answer => cleanText(answer.querySelector('.answer_text')) ||
        (answer.querySelector('input[type="text"]') as HTMLInputElement | null)?.value.trim() || '').filter(Boolean))];
    }
  }
  return blanks;
}

function choiceText(element: Element): string {
  const candidates = element.querySelectorAll('.answer_html, .answer_text, .answer_label, label');
  for (const candidate of candidates) {
    if (candidate.closest('.quiz_comment, .answer_comments')) continue;
    if (!exposedWithin(candidate, element)) continue;
    const text = cleanText(candidate);
    if (text) return text;
  }
  return cleanText(element);
}

function marked(element: Element, classes: string): boolean {
  if (element.matches(classes)) return true;
  return classes.split(',').some(name => ['.answer_text', '.answer_html', '.answer_label', 'label']
    .some(selector => !!element.querySelector(`${selector}${name.trim()}`)));
}

function parseChoice(element: Element, review: boolean): ScrapedChoice | null {
  const text = choiceText(element);
  if (!text) return null;
  const correct = review && marked(element, '.correct_answer');
  const incorrect = review && marked(element, '.wrong_answer, .incorrect_answer');
  const title = review ? element.getAttribute('title') || '' : '';
  const isCorrect = correct ? true : incorrect ? false : /this was the correct answer/i.test(title) ? true : null;
  const answerId = element.id.match(/^answer_(\d+)$/)?.[1] ||
    element.querySelector('input[id*="_answer_"]')?.id.match(/_answer_(\d+)$/)?.[1] ||
    element.querySelector('input[value]')?.getAttribute('value')?.match(/^\d+$/)?.[0];
  return {
    text,
    isCorrect,
    canvasAnswerId: answerId || undefined,
    isSelected: element.matches('.selected_answer, .user_answer') ||
      !!element.querySelector('input:checked, [aria-checked="true"], .selected_answer, .user_answer')
  };
}

export function parseQuestions(root: Element, review: boolean, page: Document): ScrapedQuestion[] {
  const questionElements = [
    ...(root.matches(questionSelector) ? [root] : []),
    ...root.querySelectorAll(questionSelector)
  ].filter(element => !element.parentElement?.closest(questionSelector));
  const courseTitle = cleanText(page.querySelector('.course-title, #breadcrumbs .course')) || undefined;
  const quizTitle = cleanText(page.querySelector('.quiz_title, h1.page-title, h1')) || undefined;
  return questionElements.flatMap((element, index) => {
    const questionText = promptText(element.querySelector('.question_text')) ||
      cleanText(element.querySelector('.question_holder .text')) ||
      cleanText(element.querySelector('.question_name'));
    if (!questionText || /^Question\s*#?\d+[:.]?\s*$/i.test(questionText)) return [];
    const choiceElements = [...element.querySelectorAll(choiceSelector)].filter(choice =>
      !choice.parentElement?.closest(choiceSelector)
    );
    const choices = choiceElements.map(choice => parseChoice(choice, review))
      .filter((choice): choice is ScrapedChoice => choice !== null);
    const id = element.getAttribute('data-question-id') || element.id.match(/question_(\d+)/)?.[1] || `unknown_${index}`;
    const type = element.getAttribute('data-question-type') || element.className;
    const multipleBlanks = /fill_in_multiple_blanks/.test(type);
    const questionType = multipleBlanks ? 'FILL_IN_MULTIPLE_BLANKS' :
      /short_answer/.test(type) ? 'SHORT_ANSWER' :
      /multiple_answers/.test(type) || !!element.querySelector('input[type="checkbox"]') ? 'MULTIPLE_ANSWERS' :
      /true_false/.test(type) ? 'TRUE_FALSE' :
      !!element.querySelector('textarea') ? 'ESSAY' :
      !!element.querySelector('input[type="text"]') ? 'SHORT_ANSWER' : 'MULTIPLE_CHOICE';
    const blanks = questionType === 'SHORT_ANSWER' || questionType === 'FILL_IN_MULTIPLE_BLANKS'
      ? parseBlanks(element, id, questionType === 'FILL_IN_MULTIPLE_BLANKS', review) : [];
    if (questionType === 'SHORT_ANSWER' && blanks.length === 0) blanks.push({ key: 'answer', label: 'Answer', correctAnswers: [] });
    if (questionType === 'SHORT_ANSWER' && review && blanks[0].correctAnswers.length === 0) {
      blanks[0].correctAnswers = [...new Set([...element.querySelectorAll('.answer.correct_answer')]
        .filter(answer => exposedWithin(answer, element))
        .map(answer => cleanText(answer.querySelector('.answer_text')) ||
          (answer.querySelector('input[type="text"]') as HTMLInputElement | null)?.value.trim() || '').filter(Boolean))];
    }
    return [{
      canvasQuestionId: id,
      questionType,
      courseTitle,
      quizTitle,
      questionText,
      choices: questionType === 'SHORT_ANSWER' || questionType === 'FILL_IN_MULTIPLE_BLANKS' ? [] : choices,
      blanks,
      explanation: review ? cleanText(element.querySelector(feedbackSelector)) || undefined : undefined,
      isPostSubmission: review,
      timestamp: Date.now()
    }];
  });
}

export function mergeQuestions(previous: ScrapedQuestion[], incoming: ScrapedQuestion[], review: boolean): ScrapedQuestion[] {
  const merged = new Map(previous.map(question => [question.canvasQuestionId, question]));
  for (const question of incoming) {
    const old = merged.get(question.canvasQuestionId);
    if (!old) { merged.set(question.canvasQuestionId, question); continue; }
    const key = (text: string) => text.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
    const choices = new Map(old.choices.map(choice => [key(choice.text), choice]));
    const blanks = new Map((old.blanks || []).map(blank => [blank.key, blank]));
    for (const blank of question.blanks || []) {
      const prior = blanks.get(blank.key);
      blanks.set(blank.key, { ...prior, ...blank,
        submittedText: blank.submittedText || prior?.submittedText,
        correctAnswers: [...new Set([...(prior?.correctAnswers || []), ...blank.correctAnswers])]
      });
    }
    const reviewWithoutSelection = review && !question.choices.some(choice => choice.isSelected);
    for (const choice of question.choices) {
      const prior = choices.get(key(choice.text));
      choices.set(key(choice.text), {
        ...prior, ...choice,
        canvasAnswerId: choice.canvasAnswerId || prior?.canvasAnswerId,
        isCorrect: choice.isCorrect ?? prior?.isCorrect ?? null,
        isSelected: reviewWithoutSelection ? prior?.isSelected || false : choice.isSelected
      });
    }
    merged.set(question.canvasQuestionId, {
      ...old, ...question,
      explanation: question.explanation || old.explanation,
      choices: [...choices.values()],
      blanks: [...blanks.values()]
    });
  }
  return [...merged.values()];
}
