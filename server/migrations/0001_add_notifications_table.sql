CREATE TABLE IF NOT EXISTS "notifications" (
  "id" bigserial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id"),
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "entity_type" text,
  "entity_id" integer,
  "read" boolean NOT NULL DEFAULT false,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "notifications" ("user_id", "read");
