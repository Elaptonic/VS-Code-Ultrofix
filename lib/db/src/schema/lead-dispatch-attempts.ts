import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadDispatchAttemptsTable = pgTable("lead_dispatch_attempts", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  providerId: integer("provider_id").notNull(),
  rank: integer("rank").notNull(),
  status: text("status", {
    enum: ["pending", "dispatched", "accepted", "rejected", "timed_out", "skipped"],
  })
    .notNull()
    .default("pending"),
  skipReason: text("skip_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("lead_dispatch_attempts_one_accepted_per_booking_idx")
    .on(table.bookingId)
    .where(sql`${table.status} = 'accepted'`),
]);

export const insertLeadDispatchAttemptSchema = createInsertSchema(leadDispatchAttemptsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLeadDispatchAttempt = z.infer<typeof insertLeadDispatchAttemptSchema>;
export type LeadDispatchAttempt = typeof leadDispatchAttemptsTable.$inferSelect;
