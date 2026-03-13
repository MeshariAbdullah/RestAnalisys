-- Initial schema migration for Franchise Quality Monitor

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "provider" AS ENUM('gemini', 'gpt_frames');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "alert_severity" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "alert_status" AS ENUM('open', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "video_status" AS ENUM(
    'uploaded', 'extracting_frames', 'analyzing_gpt',
    'analyzing_gemini', 'saving_results', 'done', 'error'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "camera_status" AS ENUM('active', 'inactive', 'error');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "stores" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "type" text NOT NULL DEFAULT 'restaurant',
  "city" text NOT NULL,
  "cameras" integer NOT NULL DEFAULT 1,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "store_cameras" (
  "id" serial PRIMARY KEY,
  "store_id" integer NOT NULL REFERENCES "stores"("id"),
  "name" text NOT NULL,
  "location" text NOT NULL,
  "status" "camera_status" NOT NULL DEFAULT 'active',
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "name" text NOT NULL,
  "role" text NOT NULL DEFAULT 'operator',
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipes" (
  "id" serial PRIMARY KEY,
  "store_id" integer REFERENCES "stores"("id"),
  "name" text NOT NULL,
  "version" text NOT NULL DEFAULT '1.0',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipe_specs" (
  "id" serial PRIMARY KEY,
  "recipe_id" integer NOT NULL REFERENCES "recipes"("id"),
  "spec_json" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "video_uploads" (
  "id" serial PRIMARY KEY,
  "store_id" integer NOT NULL REFERENCES "stores"("id"),
  "recipe_id" integer REFERENCES "recipes"("id"),
  "filename" text NOT NULL,
  "original_name" text NOT NULL,
  "duration_sec" real,
  "status" "video_status" NOT NULL DEFAULT 'uploaded',
  "error_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "video_frames" (
  "id" serial PRIMARY KEY,
  "video_id" integer NOT NULL REFERENCES "video_uploads"("id"),
  "frame_index" integer NOT NULL,
  "timestamp_sec" real NOT NULL,
  "local_path_or_ref" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_video_analysis_gemini" (
  "id" serial PRIMARY KEY,
  "video_id" integer NOT NULL REFERENCES "video_uploads"("id"),
  "model" text NOT NULL,
  "raw_json" jsonb,
  "normalized_json" jsonb,
  "summary_text" text,
  "status" text NOT NULL DEFAULT 'pending',
  "error" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ai_frame_analysis_gpt" (
  "id" serial PRIMARY KEY,
  "video_id" integer NOT NULL REFERENCES "video_uploads"("id"),
  "frame_id" integer REFERENCES "video_frames"("id"),
  "model" text NOT NULL,
  "raw_json" jsonb,
  "normalized_json" jsonb,
  "status" text NOT NULL DEFAULT 'pending',
  "error" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipe_compliance_results" (
  "id" serial PRIMARY KEY,
  "video_id" integer NOT NULL REFERENCES "video_uploads"("id"),
  "recipe_id" integer NOT NULL REFERENCES "recipes"("id"),
  "provider" "provider" NOT NULL,
  "score_total" real NOT NULL DEFAULT 0,
  "ingredient_presence_score" real,
  "assembly_order_score" real,
  "portion_score" real,
  "presentation_score" real,
  "safety_score" real,
  "reasons_json" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "store_alerts" (
  "id" serial PRIMARY KEY,
  "store_id" integer NOT NULL REFERENCES "stores"("id"),
  "video_id" integer REFERENCES "video_uploads"("id"),
  "provider" text,
  "severity" "alert_severity" NOT NULL,
  "type" text NOT NULL,
  "message" text NOT NULL,
  "status" "alert_status" NOT NULL DEFAULT 'open',
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_video_uploads_store_id" ON "video_uploads"("store_id");
CREATE INDEX IF NOT EXISTS "idx_video_uploads_status" ON "video_uploads"("status");
CREATE INDEX IF NOT EXISTS "idx_video_frames_video_id" ON "video_frames"("video_id");
CREATE INDEX IF NOT EXISTS "idx_ai_gemini_video_id" ON "ai_video_analysis_gemini"("video_id");
CREATE INDEX IF NOT EXISTS "idx_ai_gpt_video_id" ON "ai_frame_analysis_gpt"("video_id");
CREATE INDEX IF NOT EXISTS "idx_compliance_video_id" ON "recipe_compliance_results"("video_id");
CREATE INDEX IF NOT EXISTS "idx_alerts_store_id" ON "store_alerts"("store_id");
CREATE INDEX IF NOT EXISTS "idx_alerts_status" ON "store_alerts"("status");
CREATE INDEX IF NOT EXISTS "idx_alerts_severity" ON "store_alerts"("severity");
