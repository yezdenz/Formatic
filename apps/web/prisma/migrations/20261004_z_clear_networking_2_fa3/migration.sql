DO $$
DECLARE
  owner_id TEXT;
  owner_team_id TEXT;
  target_id TEXT;
  target_count INTEGER;
  removed_count INTEGER;
BEGIN
  SELECT "id", "teamId" INTO owner_id, owner_team_id FROM "User" WHERE "username" = 'yezdenz';
  IF owner_id IS NULL OR owner_team_id IS NULL THEN
    RAISE EXCEPTION 'Cannot locate yezdenz and their team for FA3 rollback';
  END IF;

  SELECT COUNT(*), MIN(child."id") INTO target_count, target_id
  FROM "Folder" child
  JOIN "Folder" course ON course."id" = child."parentId"
  WHERE child."name" = 'FA3' AND course."name" = 'Networking 2'
    AND course."parentId" IS NULL
    AND child."teamId" = owner_team_id AND course."teamId" = owner_team_id;
  IF target_count <> 1 THEN
    RAISE EXCEPTION 'Expected one Networking 2 / FA3 folder in yezdenz team, found %', target_count;
  END IF;

  INSERT INTO "AdminLog" ("id", "adminId", "action", "targetId", "details", "createdAt")
  SELECT gen_random_uuid()::TEXT, owner_id, 'ROLLBACK_FA3_QUESTION', q."id",
    jsonb_build_object(
      'question', to_jsonb(q),
      'choices', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM "Choice" c WHERE c."questionId" = q."id"), '[]'::jsonb),
      'aliases', COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM "QuestionAlias" a WHERE a."questionId" = q."id"), '[]'::jsonb),
      'pushItems', COALESCE((SELECT jsonb_agg(to_jsonb(i)) FROM "PushBatchItem" i WHERE i."questionId" = q."id"), '[]'::jsonb)
    )::TEXT, CURRENT_TIMESTAMP
  FROM "Question" q WHERE q."folderId" = target_id;

  DELETE FROM "Question" WHERE "folderId" = target_id;
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  INSERT INTO "AdminLog" ("id", "adminId", "action", "targetId", "details", "createdAt")
  VALUES (gen_random_uuid()::TEXT, owner_id, 'ROLLBACK_FA3_FOLDER', target_id,
    jsonb_build_object('path', 'Networking 2 / FA3', 'removedQuestions', removed_count)::TEXT, CURRENT_TIMESTAMP);
  RAISE NOTICE 'Rolled back % questions from Networking 2 / FA3', removed_count;
END $$;
