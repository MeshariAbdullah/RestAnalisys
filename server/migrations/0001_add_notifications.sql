-- Add notifications table for in-app notification system

DO $$ BEGIN
  CREATE TYPE "notification_type" AS ENUM (
    'rental_status',
    'asset_status',
    'payment',
    'legal',
    'dispute',
    'inspection',
    'shipment',
    'system',
    'alert'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "type" "notification_type" NOT NULL,
  "title" text NOT NULL,
  "title_ar" text,
  "body" text NOT NULL,
  "body_ar" text,
  "entity_type" text,
  "entity_id" integer,
  "action_url" text,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "read");
CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" ("created_at");
