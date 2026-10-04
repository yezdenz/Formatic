# Formatic Canvas capture

The extension reads rendered Classic Canvas quiz questions and choices. On a completed quiz's review/history page, it also makes read-only requests to the signed-in student's Canvas origin:

1. `GET /api/v1/courses/:course_id/quizzes/:quiz_id` for the assignment ID.
2. `GET /api/v1/courses/:course_id/quizzes/:quiz_id/submission` for the current user's completed quiz submission.
3. `GET /api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id?include[]=submission_history` for that user's completed attempts.

Only an explicitly correct completed attempt can identify a correct choice from its Canvas answer ID. An explicitly incorrect single-choice attempt identifies that selected choice as wrong; it does **not** reveal which remaining choice is right. Partial credit, unavailable history, missing answer IDs, and unrevealed feedback remain unknown. The extension never requests the quiz question bank or changes Canvas quiz inputs.

The [Canvas Quiz Loader Firefox port](https://github.com/gnhen/canvasQuizLoader) provided a comparison for using prior submissions. Its source map at `quiz-loader/index.js.map` shows the `submissions.ts` and `answers.ts` modules that read `submission_history` and classify `correct: true` attempts. Formatic independently uses the same documented Canvas response fields for passive capture. See Canvas's [Quiz Submissions API](https://canvas.instructure.com/doc/api/quiz_submissions.html) and [Submissions API](https://canvas.instructure.com/doc/api/submissions.html).

The popup stages questions locally until the user chooses a course or folder and pushes them to Formatic. If a Canvas page exposes only a generic heading such as “Question 5” without its prompt, the popup blocks that quiz from being pushed; reopen the Canvas page to capture the full prompt.
