import { bookingsTable, db, providersTable, usersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { emitToVendor } from "../lib/socket";

const router: IRouter = Router();

export async function emitProviderStats(providerId: number) {
  emitToVendor(providerId, "provider:stats", { providerId });
}

router.get("/provider/stats", async (req, res): Promise<void> => {
  const raw = req.query.providerId;
  const providerId = parseInt(String(raw), 10);
  if (!raw || isNaN(providerId)) {
    res.status(400).json({ error: "providerId is required" });
    return;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const allBookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.providerId, providerId));

  const allCompleted = allBookings.filter((b) => b.status === "completed");

  const todayCompleted = allCompleted.filter(
    (b) => new Date(b.createdAt) >= todayStart,
  );
  const monthCompleted = allCompleted.filter(
    (b) => new Date(b.createdAt) >= monthStart,
  );

  const todayJobs = todayCompleted.length;
  const todayEarnings = todayCompleted.reduce((s, b) => s + b.price, 0);
  const monthJobs = monthCompleted.length;
  const monthEarnings = monthCompleted.reduce((s, b) => s + b.price, 0);

  const ratedBookings = allCompleted.filter((b) => b.rating != null);
  const reviewCount = ratedBookings.length;
  const avgRating =
    reviewCount > 0
      ? ratedBookings.reduce((s, b) => s + (b.rating ?? 0), 0) / reviewCount
      : 0;

  const nonCancelled = allBookings.filter((b) => b.status !== "cancelled").length;
  const accepted = allBookings.filter((b) =>
    ["accepted", "in_progress", "completed"].includes(b.status),
  ).length;
  const acceptanceRate =
    nonCancelled > 0 ? Math.round((accepted / nonCancelled) * 100) : 100;

  const recentJobs = allCompleted
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      serviceName: b.serviceName,
      date: b.date,
      time: b.time,
      price: b.price,
    }));

  // Week breakdown: last 7 days
  const weekBreakdown: Array<{ date: string; amount: number; jobs: number }> =
    [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const dayJobs = allCompleted.filter((b) => {
      const t = new Date(b.createdAt);
      return t >= d && t < nextD;
    });
    const label =
      i === 0
        ? "Today"
        : i === 1
          ? "Yest."
          : d.toLocaleDateString("en-IN", { weekday: "short" });
    weekBreakdown.push({
      date: label,
      amount: dayJobs.reduce((s, b) => s + b.price, 0),
      jobs: dayJobs.length,
    });
  }

  // Month breakdown: last 4 weeks
  const monthBreakdown: Array<{ date: string; amount: number; jobs: number }> =
    [];
  for (let i = 3; i >= 0; i--) {
    const wStart = new Date(todayStart);
    wStart.setDate(wStart.getDate() - (i + 1) * 7);
    const wEnd = new Date(todayStart);
    wEnd.setDate(wEnd.getDate() - i * 7);
    const wJobs = allCompleted.filter((b) => {
      const t = new Date(b.createdAt);
      return t >= wStart && t < wEnd;
    });
    monthBreakdown.push({
      date: `Wk ${4 - i}`,
      amount: wJobs.reduce((s, b) => s + b.price, 0),
      jobs: wJobs.length,
    });
  }

  // Year breakdown: 4 quarters
  const yearBreakdown: Array<{ date: string; amount: number; jobs: number }> =
    [];
  const qLabels = ["Q1", "Q2", "Q3", "Q4"];
  for (let q = 0; q < 4; q++) {
    const qStart = new Date(now.getFullYear(), q * 3, 1);
    const qEnd = new Date(now.getFullYear(), q * 3 + 3, 1);
    const qJobs = allCompleted.filter((b) => {
      const t = new Date(b.createdAt);
      return t >= qStart && t < qEnd;
    });
    yearBreakdown.push({
      date: `${qLabels[q]} ${now.getFullYear()}`,
      amount: qJobs.reduce((s, b) => s + b.price, 0),
      jobs: qJobs.length,
    });
  }

  // Member since year — look up provider's userId then user's createdAt
  let memberSince: number | null = null;
  const [provider] = await db
    .select({ userId: providersTable.userId })
    .from(providersTable)
    .where(eq(providersTable.id, providerId));
  if (provider?.userId) {
    const [userRow] = await db
      .select({ createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, provider.userId));
    if (userRow?.createdAt) {
      memberSince = new Date(userRow.createdAt).getFullYear();
    }
  }

  res.json({
    totalJobs: allCompleted.length,
    todayJobs,
    todayEarnings,
    monthJobs,
    monthEarnings,
    reviewCount,
    avgRating: Math.round(avgRating * 10) / 10,
    acceptanceRate,
    memberSince,
    recentJobs,
    weekBreakdown,
    monthBreakdown,
    yearBreakdown,
  });
});

export default router;
