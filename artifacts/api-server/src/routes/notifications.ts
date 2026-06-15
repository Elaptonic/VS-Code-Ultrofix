import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();

router.get("/notifications", async (req, res) => {
  try {
    const { userId } = req.query;
    const conditions = userId
      ? [eq(notificationsTable.userId, String(userId))]
      : [];
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(notificationsTable.createdAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/notifications/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [updated] = await db
      .update(notificationsTable)
      .set({ read: true })
      .where(eq(notificationsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/mark-all-read", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    await db
      .update(notificationsTable)
      .set({ read: true })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.read, false)));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications/push-token", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { pushToken } = req.body;
    if (!pushToken || typeof pushToken !== "string") {
      return res.status(400).json({ error: "pushToken required" });
    }
    await db
      .update(usersTable)
      .set({ pushToken })
      .where(eq(usersTable.id, userId));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
