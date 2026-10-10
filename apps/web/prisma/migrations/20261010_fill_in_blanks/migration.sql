ALTER TYPE "QuestionType" ADD VALUE 'FILL_IN_MULTIPLE_BLANKS';

CREATE TABLE "QuestionBlank" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "submittedText" TEXT,
    "correctAnswers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answerSource" "AnswerSource",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBlank_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuestionBlank_questionId_key_key" ON "QuestionBlank"("questionId", "key");

ALTER TABLE "QuestionBlank" ADD CONSTRAINT "QuestionBlank_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
