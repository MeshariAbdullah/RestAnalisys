CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "related_entity_type" text,
  "related_entity_id" integer,
  "is_read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" ("user_id", "is_read");
