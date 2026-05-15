-- Notification channel enum
DO $$ BEGIN
  CREATE TYPE "notification_channel" AS ENUM ('in_app', 'email', 'sms', 'push');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" bigserial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "channel" notification_channel NOT NULL DEFAULT 'in_app',
  "type" text NOT NULL,
  "title" text NOT NULL,
  "title_ar" text,
  "body" text NOT NULL,
  "body_ar" text,
  "entity_type" text,
  "entity_id" integer,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "read");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications" ("type");

-- Uploads table
CREATE TABLE IF NOT EXISTS "uploads" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "original_name" text NOT NULL,
  "storage_path" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "purpose" text NOT NULL,
  "entity_type" text,
  "entity_id" integer,
  "url" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "uploads_user_idx" ON "uploads" ("user_id");
CREATE INDEX IF NOT EXISTS "uploads_entity_idx" ON "uploads" ("entity_type", "entity_id");
