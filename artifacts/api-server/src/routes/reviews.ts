import { bookingsTable, db, providersTable, reviewsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/reviews", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { bookingId, rating, comment } = req.body ?? {};

  if (
    !Number.isInteger(bookingId) || bookingId <= 0 ||
    !Number.isInteger(rating) || rating < 1 || rating > 5
  ) {
    res.status(400).json({ error: "Invalid request: bookingId (integer) and rating (1–5) are required" });
    return;
  }

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, bookingId));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  if (booking.userId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (booking.status !== "completed") {
    res.status(400).json({ error: "Can only review completed bookings" });
    return;
  }

  const providerId = booking.providerId;

  const [existing] = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(eq(reviewsTable.bookingId, bookingId));

  if (existing) {
    res.status(409).json({ error: "Booking already reviewed" });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({ bookingId, providerId, consumerId: req.user.id, rating, comment })
    .returning();

  const allReviews = await db
    .select({ rating: reviewsTable.rating })
    .from(reviewsTable)
    .where(eq(reviewsTable.providerId, providerId));

  const avgRating =
    allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  await db
    .update(providersTable)
    .set({
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: allReviews.length,
    })
    .where(eq(providersTable.id, providerId));

  res.status(201).json(review);
});

router.get("/reviews", async (req, res): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.consumerId, req.user.id))
    .orderBy(reviewsTable.createdAt);
  res.json(reviews);
});

router.get("/reviews/:providerId", async (req, res): Promise<void> => {
  const providerId = parseInt(req.params.providerId ?? "", 10);
  if (isNaN(providerId)) {
    res.status(400).json({ error: "Invalid providerId" });
    return;
  }

  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.providerId, providerId))
    .orderBy(reviewsTable.createdAt);

  res.json(reviews);
});

export default router;
