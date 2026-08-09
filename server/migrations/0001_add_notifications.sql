-- Add notification_channel enum and notifications table

DO $$ BEGIN
  CREATE TYPE "notification_channel" AS ENUM ('in_app', 'email', 'sms');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "channel" "notification_channel" NOT NULL DEFAULT 'in_app',
  "title" text NOT NULL,
  "body" text NOT NULL,
  "category" text NOT NULL,
  "reference_type" text,
  "reference_id" integer,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_unread_idx" ON "notifications" ("user_id", "read");
