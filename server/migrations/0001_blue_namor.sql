DO $$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('asset_approved', 'asset_rejected', 'asset_inspection_complete', 'asset_valuation_approved', 'asset_valuation_rejected', 'asset_listed', 'rental_created', 'rental_confirmed', 'rental_delivered', 'rental_returned', 'rental_closed', 'rental_cancelled', 'legal_signed', 'payment_captured', 'payment_refunded', 'payout_released', 'dispute_opened', 'dispute_resolved', 'sanad_issued', 'sanad_executed', 'user_blocked', 'user_unblocked', 'system');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"meta_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id","read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" ("created_at");