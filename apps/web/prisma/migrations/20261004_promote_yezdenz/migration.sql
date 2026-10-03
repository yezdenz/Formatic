DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "User" WHERE "username" = 'yezdenz') THEN
    RAISE EXCEPTION 'Cannot grant admin: registered user yezdenz was not found';
  END IF;
END $$;

UPDATE "User" SET "role" = 'ADMIN'::"Role", "updatedAt" = CURRENT_TIMESTAMP
WHERE "username" = 'yezdenz' AND "role" <> 'ADMIN'::"Role";
