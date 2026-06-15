import { db, providersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get("/providers/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.user!.id;
    const [provider] = await db
      .select()
      .from(providersTable)
      .where(eq(providersTable.userId, userId));
    if (!provider) {
      res.status(404).json({ error: "Provider not found for this user" });
      return;
    }
    res.json(provider);
  } catch (err) {
    logger.error({ err }, "Failed to get current provider");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/providers", async (req, res): Promise<void> => {
  try {
    const { category } = req.query;
    const rows = await (category
      ? db.select().from(providersTable).where(eq(providersTable.category, String(category)))
      : db.select().from(providersTable));
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "Failed to list providers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/providers/match", async (req, res): Promise<void> => {
  try {
    const { lat, lng, category, radiusKm = "5" } = req.query;
    if (!lat || !lng) {
      res.status(400).json({ error: "lat and lng query params required" });
      return;
    }

    const userLat = parseFloat(String(lat));
    const userLng = parseFloat(String(lng));
    const radius = parseFloat(String(radiusKm));

    if (isNaN(userLat) || isNaN(userLng) || isNaN(radius)) {
      res.status(400).json({ error: "lat, lng, radiusKm must be valid numbers" });
      return;
    }

    const candidates = await (category
      ? db
          .select()
          .from(providersTable)
          .where(and(eq(providersTable.category, String(category)), eq(providersTable.isOnline, true)))
      : db.select().from(providersTable).where(eq(providersTable.isOnline, true)));

    const matched = candidates
      .map((p) => ({
        ...p,
        distanceKm: haversineKm(userLat, userLng, p.latitude, p.longitude),
      }))
      .filter((p) => p.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(matched);
  } catch (err) {
    logger.error({ err }, "Failed to match providers");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
