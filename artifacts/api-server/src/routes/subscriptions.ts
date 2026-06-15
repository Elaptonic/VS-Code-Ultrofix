import { db, vendorSubscriptionsTable, providersTable } from "@workspace/db";
import { and, desc, eq, gt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/subscriptions/activate", requireAuth, async (req, res): Promise<void> => {
  try {
    const [provider] = await db
      .select({ id: providersTable.id })
      .from(providersTable)
      .where(eq(providersTable.userId, req.user!.id));

    if (!provider) {
      res.status(404).json({ error: "Provider profile not found. Complete onboarding first." });
      return;
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db
      .update(vendorSubscriptionsTable)
      .set({ status: "expired" })
      .where(
        and(
          eq(vendorSubscriptionsTable.providerId, provider.id),
          eq(vendorSubscriptionsTable.status, "active"),
        ),
      );

    const [sub] = await db
      .insert(vendorSubscriptionsTable)
      .values({
        providerId: provider.id,
        status: "active",
        startedAt,
        expiresAt,
      })
      .returning();

    res.json({
      subscriptionId: sub!.id,
      status: sub!.status,
      startedAt: sub!.startedAt,
      expiresAt: sub!.expiresAt,
      message: "Subscription activated for 30 days.",
    });
  } catch (err) {
    logger.error({ err }, "Failed to activate subscription");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subscriptions/status", requireAuth, async (req, res): Promise<void> => {
  try {
    const [provider] = await db
      .select({ id: providersTable.id })
      .from(providersTable)
      .where(eq(providersTable.userId, req.user!.id));

    if (!provider) {
      res.json({ active: false, message: "No provider profile found." });
      return;
    }

    const [sub] = await db
      .select()
      .from(vendorSubscriptionsTable)
      .where(
        and(
          eq(vendorSubscriptionsTable.providerId, provider.id),
          eq(vendorSubscriptionsTable.status, "active"),
          gt(vendorSubscriptionsTable.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(vendorSubscriptionsTable.expiresAt))
      .limit(1);

    if (!sub) {
      res.json({ active: false, providerId: provider.id });
      return;
    }

    const daysLeft = Math.ceil((sub.expiresAt.getTime() - Date.now()) / 86400000);

    res.json({
      active: true,
      providerId: provider.id,
      subscriptionId: sub.id,
      expiresAt: sub.expiresAt,
      daysLeft,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get subscription status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
