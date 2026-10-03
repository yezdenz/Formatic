CREATE TABLE "QuestionAlias" (
    "hash" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuestionAlias_pkey" PRIMARY KEY ("hash")
);

CREATE INDEX "QuestionAlias_questionId_idx" ON "QuestionAlias"("questionId");

ALTER TABLE "QuestionAlias" ADD CONSTRAINT "QuestionAlias_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
