-- Migration: employees, employee_performance, store geolocation

-- ── Enum ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "employee_status" AS ENUM('active', 'on_leave', 'terminated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Store geolocation columns ─────────────────────────────────────────────────
ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "latitude" real,
  ADD COLUMN IF NOT EXISTS "longitude" real,
  ADD COLUMN IF NOT EXISTS "address" text;

-- ── Employees ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "employees" (
  "id" serial PRIMARY KEY,
  "store_id" integer NOT NULL REFERENCES "stores"("id"),
  "name" text NOT NULL,
  "role" text NOT NULL DEFAULT 'staff',
  "shift" text NOT NULL DEFAULT 'morning',
  "phone" text,
  "email" text,
  "hire_date" timestamp DEFAULT now() NOT NULL,
  "status" "employee_status" NOT NULL DEFAULT 'active',
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "employee_performance" (
  "id" serial PRIMARY KEY,
  "employee_id" integer NOT NULL REFERENCES "employees"("id"),
  "video_id" integer REFERENCES "video_uploads"("id"),
  "compliance_score" real,
  "safety_score" real,
  "hygiene_score" real,
  "violations" integer NOT NULL DEFAULT 0,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_employees_store_id" ON "employees"("store_id");
CREATE INDEX IF NOT EXISTS "idx_employees_status" ON "employees"("status");
CREATE INDEX IF NOT EXISTS "idx_emp_perf_employee_id" ON "employee_performance"("employee_id");
