import type { ScrapedQuestion } from '../types/canvas';

export type SubmissionAnswer = {
  question_id?: number | string;
  correct?: boolean | 'partial' | 'undefined';
  text?: string | number;
  answer_id?: number | string | null;
  [field: string]: unknown;
};
export type CompletedSubmission = {
  submitted_at?: string | null;
  submission_data?: SubmissionAnswer[];
};

async function readJson(url: string, request: typeof fetch): Promise<unknown> {
  const response = await request(url, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw new Error(`Canvas request failed: ${response.status}`);
  return response.json();
}

// Canvas Quiz Loader reads the user's own submission_history on retake pages.
// Read only completed attempts from that history, never the quiz question bank.
export async function readCompletedHistory(origin: string, courseId: string, quizId: string, request: typeof fetch = fetch): Promise<CompletedSubmission[]> {
  const prefix = `${origin}/api/v1/courses/${courseId}/quizzes/${quizId}`;
  const [quizData, ownData] = await Promise.all([
    readJson(prefix, request),
    readJson(`${prefix}/submission`, request)
  ]);
  const quiz = quizData as { assignment_id?: number | string | null };
  const own = ownData as { quiz_submissions?: { user_id?: number | string; finished_at?: string | null }[] };
  // Canvas may return only the active attempt during a retake. Its user ID
  // still identifies the student's earlier completed assignment history.
  const ownAttempt = own.quiz_submissions?.find(submission => submission.user_id);
  if (!quiz.assignment_id || !ownAttempt?.user_id) return [];
  const url = `${origin}/api/v1/courses/${courseId}/assignments/${quiz.assignment_id}/submissions/${ownAttempt.user_id}?include%5B%5D=submission_history`;
  const submission = await readJson(url, request) as { submission_history?: CompletedSubmission[] };
  return (submission.submission_history || []).filter(item =>
    !!item.submitted_at && Array.isArray(item.submission_data)
  );
}

function answerId(value: unknown): string | null {
  return typeof value === 'number' && Number.isInteger(value) ? String(value) :
    typeof value === 'string' && /^\d+$/.test(value) ? value : null;
}

// A correct completed attempt confirms its selected option(s). An explicitly
// wrong single-choice attempt only rules out the selected option.
export function mergeCompletedHistory(questions: ScrapedQuestion[], submissions: CompletedSubmission[]): ScrapedQuestion[] {
  const feedback = new Map<string, Map<string, Set<boolean>>>();
  for (const submission of submissions) {
    for (const answer of submission.submission_data || []) {
      const questionId = answerId(answer.question_id);
      if (!questionId || (answer.correct !== true && answer.correct !== false)) continue;
      const question = questions.find(item => item.canvasQuestionId === questionId);
      if (!question) continue;
      const statuses = feedback.get(questionId) || new Map<string, Set<boolean>>();
      feedback.set(questionId, statuses);
      const mark = (id: string, correct: boolean) => {
        const values = statuses.get(id) || new Set<boolean>();
        values.add(correct);
        statuses.set(id, values);
      };
      if (question.questionType === 'MULTIPLE_CHOICE' || question.questionType === 'TRUE_FALSE') {
        const id = answerId(answer.answer_id) || answerId(answer.text);
        if (id) mark(id, answer.correct);
      } else if (question.questionType === 'MULTIPLE_ANSWERS' && answer.correct === true) {
        for (const [field, value] of Object.entries(answer)) {
          const id = field.match(/^answer_(\d+)$/)?.[1];
          if (id && (value === 1 || value === '1')) mark(id, true);
        }
      }
    }
  }
  return questions.map(question => ({
    ...question,
    choices: question.choices.map(choice => {
      if (choice.isCorrect !== null || !choice.canvasAnswerId) return choice;
      const statuses = feedback.get(question.canvasQuestionId)?.get(choice.canvasAnswerId);
      return statuses?.size === 1 ? { ...choice, isCorrect: [...statuses][0] } : choice;
    })
  }));
}
