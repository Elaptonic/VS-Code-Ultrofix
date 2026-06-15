import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "./db";
import { bookingsTable, providersTable, vendorSubscriptionsTable } from "./schema";

export interface NearestProviderResult {
  success: true;
  provider: typeof providersTable.$inferSelect;
  distanceDeg: number;
}

export interface NoProviderResult {
  success: false;
  message: string;
}

export type AssignResult = NearestProviderResult | NoProviderResult;

export async function getRankedProviders(
  serviceCategory: string,
  date: string,
  time: string,
): Promise<(typeof providersTable.$inferSelect)[]> {
  const busyProviders = await db
    .select({ providerId: bookingsTable.providerId })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.date, date),
        eq(bookingsTable.time, time),
        inArray(bookingsTable.status, ["accepted", "in_progress"]),
      ),
    );

  const busyIds = busyProviders.map((r) => r.providerId);

  const candidates = await db
    .select()
    .from(providersTable)
    .where(
      and(
        eq(providersTable.category, serviceCategory),
        eq(providersTable.isOnline, true),
      ),
    );

  const now = new Date();
  const activeSubs = await db
    .select({ providerId: vendorSubscriptionsTable.providerId })
    .from(vendorSubscriptionsTable)
    .where(
      and(
        eq(vendorSubscriptionsTable.status, "active"),
        gt(vendorSubscriptionsTable.expiresAt, now),
      ),
    );
  const subscribedIds = new Set(activeSubs.map((s) => s.providerId));

  const notBusy =
    busyIds.length > 0 ? candidates.filter((p) => !busyIds.includes(p.id)) : candidates;

  // Subscribed vendors get priority; unsubscribed vendors are fallback so
  // consumers always receive service when at least one vendor is online.
  notBusy.sort((a, b) => {
    const aSubscribed = subscribedIds.has(a.id) ? 1 : 0;
    const bSubscribed = subscribedIds.has(b.id) ? 1 : 0;
    if (bSubscribed !== aSubscribed) return bSubscribed - aSubscribed;
    if (b.jobsCompleted !== a.jobsCompleted) return b.jobsCompleted - a.jobsCompleted;
    return b.rating - a.rating;
  });

  return notBusy;
}

export async function assignNearestProvider(
  serviceCategory: string,
  userLat: number,
  userLng: number,
): Promise<AssignResult> {
  const available = await db
    .select()
    .from(providersTable)
    .where(
      and(
        eq(providersTable.category, serviceCategory),
        eq(providersTable.isOnline, true),
      ),
    );

  if (available.length === 0) {
    return { success: false, message: "No providers available" };
  }

  let closest = available[0]!;
  let minDist =
    Math.pow(closest.latitude - userLat, 2) + Math.pow(closest.longitude - userLng, 2);

  for (const p of available) {
    const d = Math.pow(p.latitude - userLat, 2) + Math.pow(p.longitude - userLng, 2);
    if (d < minDist) {
      minDist = d;
      closest = p;
    }
  }

  return { success: true, provider: closest, distanceDeg: Math.sqrt(minDist) };
}
