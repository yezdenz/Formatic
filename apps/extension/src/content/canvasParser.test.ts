import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Window } from 'happy-dom';
import { mergeQuestions, parseQuestions } from './canvasParser';

function parse(html: string, review: boolean) {
  const window = new Window();
  window.document.body.innerHTML = html;
  const root = window.document.querySelector('#questions')!;
  return parseQuestions(root as unknown as Element, review, window.document as unknown as Document);
}

test('stages every visible classic choice without inferring an answer before review', () => {
  const questions = parse(`
    <h1 class="quiz_title">Unit 2</h1><div class="course-title">Biology</div>
    <div id="questions"><div class="quiz_question" id="question_42">
      <div class="question_text"><p>Which cell is <strong>alive</strong>?</p></div>
      <div class="answers">
        <div class="answer" id="answer_1"><input type="radio" checked><div class="answer_text">A</div></div>
        <div class="answer" id="answer_2"><input type="radio"><div class="answer_text" style="display:none">Old B</div><div class="answer_html"><p>New B</p></div></div>
        <div class="answer" id="answer_3"><div class="answer_text">C</div></div>
        <div class="answer" id="answer_4"><div class="answer_html"><img alt="Cell D" src="/d.png"></div></div>
      </div>
    </div></div>`, false);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].canvasQuestionId, '42');
  assert.equal(questions[0].courseTitle, 'Biology');
  assert.equal(questions[0].quizTitle, 'Unit 2');
  assert.deepEqual(questions[0].choices.map(choice => choice.text), ['A', 'New B', 'C', 'Cell D']);
  assert.deepEqual(questions[0].choices.map(choice => choice.isCorrect), [null, null, null, null]);
  assert.deepEqual(questions[0].choices.map(choice => choice.isSelected), [true, false, false, false]);
});

test('uses visible review classes to mark a wrong selection and revealed correct answer', () => {
  const questions = parse(`
    <div id="questions"><div class="display_question" id="question_51">
      <div class="question_text">What is 2 + 2?</div>
      <div class="answers">
        <div class="answer wrong_answer selected_answer" id="answer_10"><div class="answer_text">3</div></div>
        <div class="answer correct_answer" id="answer_11"><div class="answer_text">4</div></div>
        <div class="answer" id="answer_12"><div class="answer_text">5</div><span class="answer_weight" style="display:none">0</span></div>
      </div><div class="quiz_comment"><p>Count two pairs.</p></div>
    </div></div>`, true);
  assert.deepEqual(questions[0].choices.map(choice => choice.isCorrect), [false, true, null]);
  assert.deepEqual(questions[0].choices.map(choice => choice.isSelected), [true, false, false]);
  assert.equal(questions[0].explanation, 'Count two pairs.');
});

test('keeps multiple-answer status and nested label choices without duplicating them', () => {
  const questions = parse(`
    <div id="questions"><div class="quiz_question multiple_answers_question" id="question_60">
      <div class="question_text">Select primes.</div><div class="answers">
        <div class="answer correct_answer" id="answer_1"><label class="answer_label"><input type="checkbox" checked>2</label></div>
        <div class="answer wrong_answer selected_answer" id="answer_2"><label class="answer_label">4</label></div>
        <div class="answer correct_answer" id="answer_3"><label class="answer_label">5</label></div>
      </div>
    </div></div>`, true);
  assert.equal(questions[0].questionType, 'MULTIPLE_ANSWERS');
  assert.deepEqual(questions[0].choices.map(choice => choice.text), ['2', '4', '5']);
  assert.deepEqual(questions[0].choices.map(choice => choice.isCorrect), [true, false, true]);
});

test('does not treat a hidden answer weight as revealed correctness', () => {
  const questions = parse(`
    <div id="questions"><div class="quiz_question" id="question_70">
      <div class="question_text">Pick one.</div><div class="answers">
        <div class="answer" id="answer_1"><div class="answer_text">One</div><span class="answer_weight" style="display:none">100</span></div>
        <div class="answer" id="answer_2"><div class="answer_text">Two</div></div>
      </div>
    </div></div>`, true);
  assert.deepEqual(questions[0].choices.map(choice => choice.isCorrect), [null, null]);
});

test('review capture keeps every earlier option and adds only revealed feedback', () => {
  const draft = parse(`
    <div id="questions"><div class="quiz_question" id="question_90"><div class="question_text">Pick a color.</div>
      <div class="answers"><div class="answer" id="answer_1"><div class="answer_text">Red</div><input type="radio" checked></div>
      <div class="answer" id="answer_2"><div class="answer_text">Blue</div></div></div>
    </div></div>`, false);
  const review = parse(`
    <div id="questions"><div class="display_question" id="question_90"><div class="question_text">Pick a color.</div>
      <div class="answers"><div class="answer correct_answer" id="answer_2"><div class="answer_text">Blue</div></div>
      <div class="answer" id="answer_3"><div class="answer_text">Green</div></div></div>
    </div></div>`, true);
  const merged = mergeQuestions(draft, review, true);
  assert.deepEqual(merged[0].choices.map(choice => choice.text), ['Red', 'Blue', 'Green']);
  assert.deepEqual(merged[0].choices.map(choice => choice.isCorrect), [null, true, null]);
  assert.deepEqual(merged[0].choices.map(choice => choice.isSelected), [true, false, false]);
});

test('captures alternative answer rows and explicit incorrect markers', () => {
  const questions = parse(`
    <div id="questions"><div class="display_question true_false_question" id="question_101">
      <div class="question_text">The Earth is flat.</div>
      <div class="answer_row incorrect_answer selected_answer"><span class="answer_label">True</span></div>
      <div class="answer_row correct_answer"><span class="answer_label">False</span></div>
    </div></div>`, true);
  assert.equal(questions[0].questionType, 'TRUE_FALSE');
  assert.deepEqual(questions[0].choices.map(choice => choice.text), ['True', 'False']);
  assert.deepEqual(questions[0].choices.map(choice => choice.isCorrect), [false, true]);
});

test('prefers the visible prompt over a generic Question 5 heading', () => {
  const questions = parse(`
    <div id="questions"><div class="display_question" id="question_105">
      <div class="header"><span class="question_name">Question 5</span></div>
      <div class="text"><div class="original_question_text" style="display:none"><textarea>Hidden source</textarea></div>
      <div class="question_text user_content">Which command uploads commits to a remote repository?</div></div>
      <div class="answers"><div class="answer" id="answer_1"><div class="answer_text">git pull</div></div>
      <div class="answer" id="answer_2"><div class="answer_text">git init</div></div>
      <div class="answer" id="answer_3"><div class="answer_text">git push</div></div></div>
    </div></div>`, true);
  assert.equal(questions[0].questionText, 'Which command uploads commits to a remote repository?');
  assert.deepEqual(questions[0].choices.map(choice => choice.text), ['git pull', 'git init', 'git push']);
});
