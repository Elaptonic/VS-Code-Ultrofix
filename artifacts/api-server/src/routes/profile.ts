import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/profile/:userId", async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId)
    ? req.params.userId[0]
    : req.params.userId;
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profile);
});

router.put("/profile/:userId", async (req, res): Promise<void> => {
  const userId = Array.isArray(req.params.userId)
    ? req.params.userId[0]
    : req.params.userId;
  const { name, email, phone, address } = req.body;
  if (!name || !email || !phone || !address) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [profile] = await db
    .insert(profilesTable)
    .values({ userId, name, email, phone, address })
    .onConflictDoUpdate({
      target: profilesTable.userId,
      set: { name, email, phone, address },
    })
    .returning();
  res.json(profile);
});

export default router;
