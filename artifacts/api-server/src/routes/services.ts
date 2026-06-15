import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/services", async (req, res): Promise<void> => {
  try {
    const { category } = req.query;
    const rows = await (category
      ? db.select().from(servicesTable).where(eq(servicesTable.category, String(category)))
      : db.select().from(servicesTable));
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "Failed to list services");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/services/:id", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid service ID" });
      return;
    }
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
    if (!service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.json(service);
  } catch (err) {
    logger.error({ err }, "Failed to get service");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
