-- Add notification system
DO $$ BEGIN
  CREATE TYPE "notification_category" AS ENUM (
    'rental', 'payment', 'asset', 'inspection',
    'legal', 'dispute', 'shipment', 'system'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" bigserial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "category" "notification_category" NOT NULL,
  "title" text NOT NULL,
  "title_ar" text,
  "body" text NOT NULL,
  "body_ar" text,
  "action_url" text,
  "entity_type" text,
  "entity_id" integer,
  "is_read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" ("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" ("created_at");
