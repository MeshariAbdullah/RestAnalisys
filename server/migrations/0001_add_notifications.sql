-- Add notifications table and channel enum
DO $$ BEGIN
  CREATE TYPE "notification_channel" AS ENUM('in_app', 'email', 'both');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" bigserial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "channel" "notification_channel" NOT NULL DEFAULT 'in_app',
  "category" text NOT NULL,
  "title" text NOT NULL,
  "title_ar" text,
  "body" text NOT NULL,
  "body_ar" text,
  "entity_type" text,
  "entity_id" integer,
  "action_url" text,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "email_sent" boolean NOT NULL DEFAULT false,
  "email_sent_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "read");
CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" ("created_at");
