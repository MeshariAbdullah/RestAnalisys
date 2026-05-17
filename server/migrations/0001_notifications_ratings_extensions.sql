-- Notifications
DO $$ BEGIN
  CREATE TYPE "notification_type" AS ENUM (
    'rental_created', 'rental_confirmed', 'rental_delivered',
    'rental_returned', 'rental_closed', 'rental_cancelled',
    'asset_approved', 'asset_rejected', 'asset_listed',
    'inspection_complete', 'payment_captured', 'payout_released',
    'dispute_opened', 'dispute_resolved', 'sanad_issued',
    'extension_requested', 'extension_approved', 'extension_rejected',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" bigserial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "type" "notification_type" NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "related_entity_type" text,
  "related_entity_id" integer,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "read");

-- Ratings
CREATE TABLE IF NOT EXISTS "ratings" (
  "id" serial PRIMARY KEY,
  "rental_id" integer NOT NULL REFERENCES "rentals"("id"),
  "asset_id" integer NOT NULL REFERENCES "assets"("id"),
  "reviewer_user_id" integer NOT NULL REFERENCES "users"("id"),
  "reviewer_role" text NOT NULL,
  "overall_score" integer NOT NULL,
  "condition_score" integer,
  "service_score" integer,
  "comment" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ratings_rental_idx" ON "ratings" ("rental_id");
CREATE INDEX IF NOT EXISTS "ratings_asset_idx" ON "ratings" ("asset_id");
CREATE INDEX IF NOT EXISTS "ratings_reviewer_idx" ON "ratings" ("reviewer_user_id");

-- Rental Extensions
DO $$ BEGIN
  CREATE TYPE "rental_extension_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "rental_extensions" (
  "id" serial PRIMARY KEY,
  "rental_id" integer NOT NULL REFERENCES "rentals"("id"),
  "renter_id" integer NOT NULL REFERENCES "users"("id"),
  "requested_days" integer NOT NULL,
  "new_end_date" date NOT NULL,
  "additional_cost_halalas" bigint NOT NULL,
  "status" "rental_extension_status" NOT NULL DEFAULT 'pending',
  "reason" text,
  "rejection_reason" text,
  "reviewed_by_user_id" integer REFERENCES "users"("id"),
  "reviewed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "rental_extensions_rental_idx" ON "rental_extensions" ("rental_id");
CREATE INDEX IF NOT EXISTS "rental_extensions_status_idx" ON "rental_extensions" ("status");
