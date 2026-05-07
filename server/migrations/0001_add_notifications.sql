-- Add notifications table for in-app notification system
DO $$ BEGIN
  CREATE TYPE "notification_type" AS ENUM (
    'rental_status_change',
    'payment_received',
    'payment_failed',
    'sanad_issued',
    'sanad_executed',
    'dispute_opened',
    'dispute_resolved',
    'asset_approved',
    'asset_rejected',
    'inspection_complete',
    'payout_released',
    'alert',
    'system'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" bigserial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "type" "notification_type" NOT NULL,
  "title" text NOT NULL,
  "title_ar" text,
  "body" text NOT NULL,
  "body_ar" text,
  "entity_type" text,
  "entity_id" integer,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "action_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "read");
CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" ("created_at");
