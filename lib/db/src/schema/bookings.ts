import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  serviceId: integer("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  providerId: integer("provider_id").notNull(),
  providerName: text("provider_name").notNull(),
  providerInitials: text("provider_initials").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  status: text("status", {
    enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
  })
    .notNull()
    .default("pending"),
  price: integer("price").notNull(),
  platformFee: integer("platform_fee").notNull().default(29),
  address: text("address").notNull(),
  rating: integer("rating"),
  paymentIntentId: text("payment_intent_id"),
  razorpayOrderId: text("razorpay_order_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
