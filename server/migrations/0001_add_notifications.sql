DO $$ BEGIN
  CREATE TYPE "notification_category" AS ENUM ('rental', 'asset', 'payment', 'legal', 'dispute', 'system', 'alert');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" bigserial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "category" "notification_category" NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "link_url" text,
  "entity_type" text,
  "entity_id" integer,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "read");
