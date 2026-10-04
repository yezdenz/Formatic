CREATE TYPE "AnswerSource" AS ENUM ('CANVAS', 'USER', 'MODERATOR');

ALTER TABLE "Question" ADD COLUMN "answerSource" "AnswerSource";

-- Existing team selections have an audit entry. Leave all other older answers
-- protected because their source cannot be determined with certainty.
UPDATE "Question" AS q
SET "answerSource" = 'USER'
WHERE q."isVerified" = true
  AND q."hasConflict" = false
  AND EXISTS (
    SELECT 1 FROM "AdminLog" AS entry
    WHERE entry."targetId" = q."id"
      AND entry."action" = 'USER_SET_ANSWER'
      AND NOT EXISTS (
        SELECT 1 FROM "AdminLog" AS later
        WHERE later."targetId" = q."id"
          AND later."action" IN ('UPDATE_QUESTION', 'MERGE_QUESTIONS')
          AND later."createdAt" >= entry."createdAt"
      )
      AND NOT EXISTS (
        SELECT 1 FROM "PushBatchItem" AS item
        JOIN "PushBatch" AS batch ON batch."id" = item."batchId"
        WHERE item."questionId" = q."id"
          AND batch."createdAt" > entry."createdAt"
      )
  );
