import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vendorSubscriptionsTable = pgTable("vendor_subscriptions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  status: text("status", { enum: ["active", "expired", "cancelled"] })
    .notNull()
    .default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVendorSubscriptionSchema = createInsertSchema(vendorSubscriptionsTable).omit({
  id: true,
  createdAt: true,
  startedAt: true,
});

export const selectVendorSubscriptionSchema = createSelectSchema(vendorSubscriptionsTable);
export type InsertVendorSubscription = z.infer<typeof insertVendorSubscriptionSchema>;
export type VendorSubscription = typeof vendorSubscriptionsTable.$inferSelect;
