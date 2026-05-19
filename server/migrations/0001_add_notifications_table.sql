-- Add notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "metadata" jsonb,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications" ("user_id", "read");
