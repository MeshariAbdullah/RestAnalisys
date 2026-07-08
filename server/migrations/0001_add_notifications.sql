-- Add notifications system
DO $$ BEGIN
  CREATE TYPE "notification_type" AS ENUM (
    'rental_created',
    'rental_signed',
    'rental_paid',
    'rental_delivered',
    'rental_returned',
    'rental_closed',
    'rental_cancelled',
    'asset_approved',
    'asset_rejected',
    'asset_inspection_complete',
    'asset_valuation_response',
    'asset_listed',
    'dispute_opened',
    'dispute_resolved',
    'payout_released',
    'sanad_issued',
    'sanad_executed',
    'alert_late_return',
    'alert_high_risk',
    'system'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "type" "notification_type" NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "entity_type" text,
  "entity_id" integer,
  "read" boolean DEFAULT false NOT NULL,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "read");
