DO $$ BEGIN
 CREATE TYPE "public"."asset_category" AS ENUM('handbag', 'watch', 'dress', 'jewelry', 'accessory', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."asset_status" AS ENUM('pending_approval', 'rejected', 'awaiting_shipment', 'in_inspection', 'inspection_reported', 'owner_rejected_valuation', 'ready_for_listing', 'listed', 'reserved', 'rented_out', 'returned_under_inspection', 'completed', 'withdrawn', 'lost_or_destroyed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."dispute_status" AS ENUM('open', 'investigating', 'awaiting_evidence', 'resolved_for_renter', 'resolved_for_platform', 'resolved_for_owner', 'escalated_to_legal', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."kyc_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."legal_commitment_status" AS ENUM('draft', 'pending_signature', 'signed', 'active', 'discharged', 'breached', 'void');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'captured', 'failed', 'refunded', 'chargeback');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_type" AS ENUM('rental_fee', 'platform_fee', 'vat', 'penalty', 'compensation', 'owner_payout', 'refund');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."rental_status" AS ENUM('pending_risk_review', 'pending_legal_signing', 'pending_payment', 'confirmed', 'out_for_delivery', 'active', 'return_in_transit', 'under_inspection', 'closed', 'closed_with_penalty', 'in_dispute', 'enforcement', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."risk_category" AS ENUM('low', 'medium', 'high', 'ultra_high');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."sanad_status" AS ENUM('not_required', 'pending_issuance', 'issued', 'signed', 'active', 'matured', 'discharged', 'under_execution', 'executed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."shipment_direction" AS ENUM('owner_to_platform', 'platform_to_renter', 'renter_to_platform', 'platform_to_owner');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."shipment_status" AS ENUM('scheduled', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('renter', 'owner', 'inspector', 'operations', 'admin', 'super_admin');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"category" "asset_category" NOT NULL,
	"brand" text NOT NULL,
	"model" text,
	"title" text NOT NULL,
	"description" text,
	"owner_declared_value_halalas" bigint,
	"evaluated_value_halalas" bigint,
	"daily_rental_price_halalas" bigint,
	"risk_category" "risk_category" DEFAULT 'medium' NOT NULL,
	"status" "asset_status" DEFAULT 'pending_approval' NOT NULL,
	"submission_images_json" jsonb DEFAULT '[]' NOT NULL,
	"studio_images_json" jsonb DEFAULT '[]' NOT NULL,
	"attributes_json" jsonb DEFAULT '{}' NOT NULL,
	"warehouse_location_code" text,
	"rejection_reason" text,
	"withdrawn_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"before_json" jsonb,
	"after_json" jsonb,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"rental_id" integer NOT NULL,
	"opened_by_user_id" integer NOT NULL,
	"assigned_to_user_id" integer,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"category" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"summary" text NOT NULL,
	"evidence_json" jsonb DEFAULT '[]' NOT NULL,
	"resolution_notes" text,
	"resolution_amount_halalas" bigint,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"inspector_id" integer NOT NULL,
	"type" text DEFAULT 'intake' NOT NULL,
	"rental_id" integer,
	"authenticity_verified" boolean DEFAULT false NOT NULL,
	"authenticity_notes" text,
	"condition_score" integer,
	"condition_grade" text,
	"condition_notes" text,
	"market_value_halalas" bigint,
	"recommended_daily_price_halalas" bigint,
	"risk_category" "risk_category" DEFAULT 'medium' NOT NULL,
	"before_images_json" jsonb DEFAULT '[]' NOT NULL,
	"after_images_json" jsonb DEFAULT '[]' NOT NULL,
	"checklist_json" jsonb DEFAULT '{}' NOT NULL,
	"report_pdf_url" text,
	"owner_approved" boolean DEFAULT false NOT NULL,
	"owner_approved_at" timestamp,
	"owner_rejected_at" timestamp,
	"owner_rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"event_type" text NOT NULL,
	"reference_id" text,
	"payload_json" jsonb,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_movements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"from_location" text,
	"to_location" text NOT NULL,
	"moved_by_user_id" integer,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "legal_commitments" (
	"id" serial PRIMARY KEY NOT NULL,
	"rental_id" integer NOT NULL,
	"renter_id" integer NOT NULL,
	"status" "legal_commitment_status" DEFAULT 'draft' NOT NULL,
	"contract_version" text DEFAULT 'v1.0' NOT NULL,
	"contract_pdf_url" text,
	"contract_text_hash" text,
	"clauses_json" jsonb DEFAULT '[]' NOT NULL,
	"commitment_halalas" bigint NOT NULL,
	"commitment_pct" real NOT NULL,
	"signed_at" timestamp,
	"signed_ip" text,
	"signed_user_agent" text,
	"nafath_sign_transaction_id" text,
	"discharged_at" timestamp,
	"breached_at" timestamp,
	"breach_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operational_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" integer NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"payload_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "owner_agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"agreement_pdf_url" text,
	"commission_pct" real DEFAULT 20 NOT NULL,
	"guarantee_accepted" boolean DEFAULT false NOT NULL,
	"signed_at" timestamp,
	"signed_ip" text,
	"effective_from" timestamp,
	"effective_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"rental_id" integer,
	"user_id" integer NOT NULL,
	"type" "payment_type" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"amount_halalas" bigint NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"gateway" text DEFAULT 'hyperpay' NOT NULL,
	"gateway_transaction_id" text,
	"gateway_raw_json" jsonb,
	"invoice_number" text,
	"invoice_xml_url" text,
	"invoice_qr_base64" text,
	"invoiced_at" timestamp,
	"captured_at" timestamp,
	"refunded_at" timestamp,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"rental_id" integer,
	"gross_halalas" bigint NOT NULL,
	"commission_halalas" bigint NOT NULL,
	"net_halalas" bigint NOT NULL,
	"iban" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rentals" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"asset_id" integer NOT NULL,
	"renter_id" integer NOT NULL,
	"owner_id" integer NOT NULL,
	"status" "rental_status" DEFAULT 'pending_risk_review' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"duration_days" integer NOT NULL,
	"daily_price_halalas" bigint NOT NULL,
	"rental_subtotal_halalas" bigint NOT NULL,
	"platform_fee_halalas" bigint NOT NULL,
	"vat_halalas" bigint NOT NULL,
	"total_payable_halalas" bigint NOT NULL,
	"risk_snapshot_json" jsonb,
	"trust_score_at_booking" integer,
	"legal_commitment_pct" real NOT NULL,
	"legal_commitment_halalas" bigint NOT NULL,
	"delivery_address_json" jsonb,
	"confirmed_at" timestamp,
	"delivered_at" timestamp,
	"returned_at" timestamp,
	"closed_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rentals_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"rental_id" integer,
	"account_age_days" integer NOT NULL,
	"completed_rentals" integer DEFAULT 0 NOT NULL,
	"disputed_rentals" integer DEFAULT 0 NOT NULL,
	"cancelled_rentals" integer DEFAULT 0 NOT NULL,
	"late_returns" integer DEFAULT 0 NOT NULL,
	"nafath_verified" boolean DEFAULT false NOT NULL,
	"base_score" integer NOT NULL,
	"modifiers_json" jsonb DEFAULT '[]' NOT NULL,
	"final_score" integer NOT NULL,
	"risk_category" "risk_category" NOT NULL,
	"approved" boolean NOT NULL,
	"rejection_reason" text,
	"legal_commitment_pct" real NOT NULL,
	"legal_commitment_halalas" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"description" text,
	"permissions_json" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sanad_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"rental_id" integer NOT NULL,
	"legal_commitment_id" integer NOT NULL,
	"renter_id" integer NOT NULL,
	"status" "sanad_status" DEFAULT 'pending_issuance' NOT NULL,
	"nafith_reference" text,
	"nafith_request_id" text,
	"issued_at" timestamp,
	"signed_at" timestamp,
	"maturity_date" date,
	"principal_halalas" bigint NOT NULL,
	"due_halalas" bigint NOT NULL,
	"execution_requested_at" timestamp,
	"execution_case_number" text,
	"executed_at" timestamp,
	"raw_response_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"rental_id" integer,
	"direction" "shipment_direction" NOT NULL,
	"status" "shipment_status" DEFAULT 'scheduled' NOT NULL,
	"courier" text,
	"tracking_number" text,
	"from_address_json" jsonb,
	"to_address_json" jsonb,
	"scheduled_at" timestamp,
	"picked_up_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"phone_e164" text,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" DEFAULT 'renter' NOT NULL,
	"national_id" text,
	"nafath_verified" boolean DEFAULT false NOT NULL,
	"nafath_verified_at" timestamp,
	"nafath_transaction_id" text,
	"kyc_status" "kyc_status" DEFAULT 'unverified' NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"phone_verified_at" timestamp,
	"email_verified" boolean DEFAULT false NOT NULL,
	"trust_score" integer DEFAULT 50 NOT NULL,
	"risk_category" "risk_category" DEFAULT 'medium' NOT NULL,
	"national_address_json" jsonb,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"blocked_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assets" ADD CONSTRAINT "assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "disputes" ADD CONSTRAINT "disputes_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspections" ADD CONSTRAINT "inspections_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspector_id_users_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_moved_by_user_id_users_id_fk" FOREIGN KEY ("moved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "legal_commitments" ADD CONSTRAINT "legal_commitments_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "legal_commitments" ADD CONSTRAINT "legal_commitments_renter_id_users_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "owner_agreements" ADD CONSTRAINT "owner_agreements_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payouts" ADD CONSTRAINT "payouts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payouts" ADD CONSTRAINT "payouts_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rentals" ADD CONSTRAINT "rentals_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rentals" ADD CONSTRAINT "rentals_renter_id_users_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rentals" ADD CONSTRAINT "rentals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sanad_records" ADD CONSTRAINT "sanad_records_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sanad_records" ADD CONSTRAINT "sanad_records_legal_commitment_id_legal_commitments_id_fk" FOREIGN KEY ("legal_commitment_id") REFERENCES "public"."legal_commitments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sanad_records" ADD CONSTRAINT "sanad_records_renter_id_users_id_fk" FOREIGN KEY ("renter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipments" ADD CONSTRAINT "shipments_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipments" ADD CONSTRAINT "shipments_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_owner_idx" ON "assets" ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_status_idx" ON "assets" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assets_category_idx" ON "assets" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs" ("actor_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "disputes_rental_idx" ON "disputes" ("rental_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "disputes_status_idx" ON "disputes" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspections_asset_idx" ON "inspections" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspections_inspector_idx" ON "inspections" ("inspector_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "legal_commitments_rental_idx" ON "legal_commitments" ("rental_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_rental_idx" ON "payments" ("rental_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_idx" ON "payments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_type_idx" ON "payments" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rentals_renter_idx" ON "rentals" ("renter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rentals_owner_idx" ON "rentals" ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rentals_asset_idx" ON "rentals" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rentals_status_idx" ON "rentals" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risk_scores_user_idx" ON "risk_scores" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risk_scores_rental_idx" ON "risk_scores" ("rental_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sanad_records_rental_idx" ON "sanad_records" ("rental_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sanad_records_status_idx" ON "sanad_records" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shipments_asset_idx" ON "shipments" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shipments_rental_idx" ON "shipments" ("rental_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_national_id_idx" ON "users" ("national_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role");