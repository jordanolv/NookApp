ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
UPDATE "user" u SET "username" = sub.handle
FROM (
  SELECT id, base || CASE WHEN rn = 1 THEN '' ELSE rn::text END AS handle
  FROM (
    SELECT id,
      COALESCE(NULLIF(regexp_replace(lower(name), '[^a-z0-9_]+', '_', 'g'), ''), 'user') AS base,
      row_number() OVER (
        PARTITION BY COALESCE(NULLIF(regexp_replace(lower(name), '[^a-z0-9_]+', '_', 'g'), ''), 'user')
        ORDER BY created_at
      ) AS rn
    FROM "user"
  ) s
) sub
WHERE u.id = sub.id;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_username_uniq" ON "user" USING btree ("username");
