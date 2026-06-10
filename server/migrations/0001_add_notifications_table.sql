CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "type" text NOT NULL,
  "title_en" text NOT NULL,
  "title_ar" text NOT NULL,
  "body_en" text,
  "body_ar" text,
  "entity_type" text,
  "entity_id" integer,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications" USING btree ("user_id", "read");
