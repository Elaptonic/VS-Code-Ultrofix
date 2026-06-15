-- Guarantee only one accepted attempt per booking at the database level.
-- This prevents a double-accept race condition where two concurrent accepts
-- for the same booking both pass the application-level dispatched→accepted check.
CREATE UNIQUE INDEX IF NOT EXISTS "lead_dispatch_attempts_one_accepted_per_booking_idx"
  ON "lead_dispatch_attempts" ("booking_id")
  WHERE status = 'accepted';
