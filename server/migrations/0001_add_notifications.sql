-- Notifications system
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'rental_created',
    'rental_confirmed',
    'rental_delivered',
    'rental_returned',
    'rental_closed',
    'rental_cancelled',
    'asset_approved',
    'asset_rejected',
    'asset_listed',
    'inspection_complete',
    'payment_captured',
    'payment_failed',
    'payout_released',
    'dispute_opened',
    'dispute_resolved',
    'sanad_issued',
    'sanad_executed',
    'alert',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "type" "notification_type" NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "entity_type" text,
  "entity_id" integer,
  "metadata_json" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "read");
CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" ("created_at");
