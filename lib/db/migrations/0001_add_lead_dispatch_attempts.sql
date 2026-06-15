-- Migration: add lead_dispatch_attempts table for ranked sequential dispatch
-- This table tracks the ordered dispatch queue for each booking.

CREATE TABLE IF NOT EXISTS "lead_dispatch_attempts" (
  "id" serial PRIMARY KEY NOT NULL,
  "booking_id" integer NOT NULL,
  "provider_id" integer NOT NULL,
  "rank" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "lead_dispatch_attempts_status_check"
    CHECK (status IN ('pending','dispatched','accepted','rejected','timed_out','skipped'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "lead_dispatch_attempts_booking_rank_idx"
  ON "lead_dispatch_attempts" ("booking_id", "rank");

CREATE INDEX IF NOT EXISTS "lead_dispatch_attempts_booking_status_idx"
  ON "lead_dispatch_attempts" ("booking_id", "status");
