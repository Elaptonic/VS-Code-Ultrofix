import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  icon: text("icon").notNull().default("bell"),
  iconColor: text("icon_color").notNull().default("#f97316"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  bookingId: integer("booking_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
