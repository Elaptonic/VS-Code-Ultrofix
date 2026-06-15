import { db, providersTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

router.get("/onboarding/provider/status", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;

  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.userId, userId));

  if (!provider) {
    res.json({ exists: false, onboardingComplete: false });
    return;
  }

  res.json({ exists: true, onboardingComplete: provider.onboardingComplete, provider });
});

router.post("/onboarding/provider", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;

  const { name, bio, category, specializations, serviceAreas, hourlyRate, experience, idDocumentUrl, latitude, longitude } = req.body;

  if (!name || !category) {
    res.status(400).json({ error: "name and category are required" });
    return;
  }

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${userId.slice(0, 6)}`;
  const initials = name
    .split(" ")
    .map((w: string) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const [existing] = await db
    .select({ id: providersTable.id })
    .from(providersTable)
    .where(eq(providersTable.userId, userId));

  const payload = {
    name,
    initials,
    bio: bio ?? "",
    category,
    specializations: specializations ?? [],
    serviceAreas: serviceAreas ?? [],
    hourlyRate: Number(hourlyRate) || 0,
    experience: experience ?? "",
    idDocumentUrl: idDocumentUrl ?? null,
    latitude: Number(latitude) || 12.9716,
    longitude: Number(longitude) || 77.5946,
    onboardingComplete: true,
  };

  let provider;
  if (existing) {
    [provider] = await db
      .update(providersTable)
      .set(payload)
      .where(eq(providersTable.userId, userId))
      .returning();
  } else {
    [provider] = await db
      .insert(providersTable)
      .values({ userId, slug, ...payload })
      .returning();
  }

  const firstName = name.split(" ")[0] ?? name;
  const lastName = name.split(" ").slice(1).join(" ") || null;
  await db
    .update(usersTable)
    .set({ firstName, lastName })
    .where(eq(usersTable.id, userId));

  res.json({ provider });
});

router.patch("/onboarding/provider", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = req.user!.id;

  const allowed = ["name", "bio", "category", "specializations", "serviceAreas", "hourlyRate", "experience", "idDocumentUrl", "latitude", "longitude"];
  const updateFields: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updateFields[key] = req.body[key];
  }

  if (Object.keys(updateFields).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [provider] = await db
    .update(providersTable)
    .set(updateFields as any)
    .where(eq(providersTable.userId, userId))
    .returning();

  if (!provider) {
    res.status(404).json({ error: "Provider profile not found" });
    return;
  }

  res.json({ provider });
});

export default router;
