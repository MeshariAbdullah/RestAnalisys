DO $$ BEGIN
  CREATE TYPE "notification_type" AS ENUM (
    'rental_created',
    'rental_signed',
    'rental_paid',
    'rental_delivered',
    'rental_returned',
    'rental_closed',
    'asset_approved',
    'asset_rejected',
    'asset_published',
    'inspection_complete',
    'payout_released',
    'dispute_opened',
    'dispute_resolved',
    'sanad_issued',
    'system_alert'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "type" "notification_type" NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "entity_type" text,
  "entity_id" integer,
  "is_read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" ("user_id") WHERE "is_read" = false;
CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" ("created_at");
