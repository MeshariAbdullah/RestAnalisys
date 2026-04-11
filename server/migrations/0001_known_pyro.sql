DO $$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('asset_submitted', 'asset_approved', 'asset_rejected', 'asset_inspection_ready', 'rental_created', 'rental_legal_ready', 'rental_signed', 'rental_paid', 'rental_delivered', 'rental_returned', 'rental_closed', 'rental_cancelled', 'dispute_opened', 'dispute_resolved', 'payout_released', 'sanad_issued', 'sanad_matured', 'generic');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" DEFAULT 'generic' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link_path" text,
	"read_at" timestamp,
	"payload_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_unread_idx" ON "notifications" ("user_id","read_at");