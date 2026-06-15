import { boolean, integer, pgTable, real, serial, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const providersTable = pgTable("providers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  bio: text("bio").notNull().default(""),
  rating: real("rating").notNull().default(4.5),
  reviewCount: integer("review_count").notNull().default(0),
  jobsCompleted: integer("jobs_completed").notNull().default(0),
  specializations: text("specializations").array().notNull().default([]),
  experience: text("experience").notNull().default(""),
  verified: boolean("verified").notNull().default(false),
  category: text("category").notNull().default(""),
  serviceAreas: text("service_areas").array().notNull().default([]),
  hourlyRate: integer("hourly_rate").notNull().default(0),
  idDocumentUrl: text("id_document_url"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  latitude: real("latitude").notNull().default(12.9716),
  longitude: real("longitude").notNull().default(77.5946),
  isOnline: boolean("is_online").notNull().default(false),
});

export const insertProviderSchema = createInsertSchema(providersTable).omit({ id: true });
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providersTable.$inferSelect;
