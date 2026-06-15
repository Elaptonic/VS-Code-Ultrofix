import { bookingsTable, db, leadDispatchAttemptsTable, notificationsTable, providersTable, servicesTable, usersTable } from "@workspace/db";
import { and, asc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { bookingQueue } from "../lib/queue";
import { RAZORPAY_KEY_ID, createRazorpayOrder } from "../lib/razorpay";
import { emitToUser } from "../lib/socket";
import { sendPushNotification } from "../lib/push";
import { emitProviderStats } from "./stats";
import { dispatchNextVendor, seedDispatchQueue } from "../lib/dispatch";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

async function getUserPushToken(userId: string): Promise<string | null> {
  const [user] = await db.select({ pushToken: usersTable.pushToken }).from(usersTable).where(eq(usersTable.id, userId));
  return user?.pushToken ?? null;
}

async function getProviderPushToken(providerId: number): Promise<string | null> {
  const [provider] = await db.select({ userId: providersTable.userId }).from(providersTable).where(eq(providersTable.id, providerId));
  if (!provider?.userId) return null;
  return getUserPushToken(provider.userId);
}

bookingQueue.process("start-service", async ({ bookingId, userId, serviceName }) => {
  await new Promise((r) => setTimeout(r, 3000));
  await db
    .update(bookingsTable)
    .set({ status: "in_progress" })
    .where(eq(bookingsTable.id, bookingId));
  emitToUser(userId, "booking:status", { bookingId, status: "in_progress" });

  const token = await getUserPushToken(userId);
  sendPushNotification(token, {
    title: "Service Started 🔧",
    body: `Your ${serviceName} is now in progress.`,
    data: { type: "service_started", bookingId },
  });
});

router.get("/bookings", async (req, res): Promise<void> => {
  const { userId, providerId } = req.query;
  let rows;
  if (userId) {
    rows = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.userId, String(userId)))
      .orderBy(bookingsTable.createdAt);
  } else if (providerId) {
    rows = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.providerId, Number(providerId)))
      .orderBy(bookingsTable.createdAt);
  } else {
    rows = await db.select().from(bookingsTable).orderBy(bookingsTable.createdAt);
  }
  res.json(rows);
});

router.post("/bookings", async (req, res): Promise<void> => {
  const { userId, serviceId, providerId, date, time, address, price, paymentIntentId } = req.body;
  if (!userId || !serviceId || !providerId || !date || !time || !address || price == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [service] = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.id, Number(serviceId)));
  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.id, Number(providerId)));

  if (!service || !provider) {
    res.status(400).json({ error: "Service or provider not found" });
    return;
  }

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      userId: String(userId),
      serviceId: Number(serviceId),
      serviceName: service.name,
      providerId: Number(providerId),
      providerName: provider.name,
      providerInitials: provider.initials,
      date: String(date),
      time: String(time),
      address: String(address),
      price: Number(price),
      platformFee: 29,
      status: "pending",
      paymentIntentId: paymentIntentId ? String(paymentIntentId) : null,
    })
    .returning();

  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  await db.insert(notificationsTable).values({
    userId: String(userId),
    type: "booking_confirmed",
    icon: "check-circle",
    iconColor: "#22c55e",
    title: "Booking Confirmed!",
    body: `Your ${service.name} with ${provider.name} is confirmed for ${formattedDate} at ${time}.`,
    read: false,
    bookingId: booking.id,
  });

  emitToUser(String(userId), "booking:status", { bookingId: booking.id, status: "pending" });

  const customerToken = await getUserPushToken(String(userId));
  sendPushNotification(customerToken, {
    title: "Booking Confirmed! ✅",
    body: `${service.name} with ${provider.name} on ${formattedDate} at ${time}.`,
    data: { type: "booking_confirmed", bookingId: booking.id },
  });

  const rzpOrder = await createRazorpayOrder(
    booking.price + booking.platformFee,
    `booking_${booking.id}`,
  );
  if (rzpOrder) {
    await db
      .update(bookingsTable)
      .set({ razorpayOrderId: rzpOrder.id })
      .where(eq(bookingsTable.id, booking.id));
  }

  const queueCount = await seedDispatchQueue(
    booking.id,
    service.category,
    String(date),
    String(time),
  );

  if (queueCount > 0) {
    const dispatchedProviderId = await dispatchNextVendor(booking.id);

    if (dispatchedProviderId != null) {
      const providerToken = await getProviderPushToken(dispatchedProviderId);
      sendPushNotification(providerToken, {
        title: "New Job Request 🔔",
        body: `${service.name} job on ${formattedDate} at ${time}. Tap to view details.`,
        data: { type: "new_lead", bookingId: booking.id },
      });
    }
  } else {
    emitToUser(String(userId), "booking:no_provider", {
      bookingId: booking.id,
      message: "No provider is available right now. We'll notify you when one becomes available.",
    });

    await db.insert(notificationsTable).values({
      userId: String(userId),
      type: "booking_no_provider",
      icon: "alert-circle",
      iconColor: "#f59e0b",
      title: "No Provider Available",
      body: `We couldn't find an available provider for your ${service.name} right now. Please try again later.`,
      read: false,
      bookingId: booking.id,
    });
  }

  res.status(201).json({
    ...booking,
    razorpayOrderId: rzpOrder?.id ?? null,
    razorpayAmount: rzpOrder?.amount ?? null,
    razorpayKeyId: RAZORPAY_KEY_ID,
  });
});

router.get("/bookings/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid booking ID" });
    return;
  }
  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json(booking);
});

router.patch("/bookings/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid booking ID" });
    return;
  }

  const { status, rating } = req.body;
  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (rating !== undefined) updates.rating = rating;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [booking] = await db
    .update(bookingsTable)
    .set(updates)
    .where(eq(bookingsTable.id, id))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  emitToUser(booking.userId, "booking:status", { bookingId: id, status: booking.status });

  emitProviderStats(booking.providerId);

  if (status === "cancelled") {
    await db.insert(notificationsTable).values({
      userId: booking.userId,
      type: "booking_cancelled",
      icon: "x-circle",
      iconColor: "#ef4444",
      title: "Booking Cancelled",
      body: `Your ${booking.serviceName} booking has been cancelled.`,
      read: false,
      bookingId: booking.id,
    });
    const token = await getUserPushToken(booking.userId);
    sendPushNotification(token, {
      title: "Booking Cancelled",
      body: `Your ${booking.serviceName} booking has been cancelled.`,
      data: { type: "booking_cancelled", bookingId: id },
    });
  } else if (status === "completed" && !booking.rating) {
    await db.insert(notificationsTable).values({
      userId: booking.userId,
      type: "rating_request",
      icon: "star",
      iconColor: "#f59e0b",
      title: "Rate Your Experience",
      body: `How was your ${booking.serviceName} with ${booking.providerName}? Tap to rate.`,
      read: false,
      bookingId: booking.id,
    });
    const token = await getUserPushToken(booking.userId);
    sendPushNotification(token, {
      title: "How was the service? ⭐",
      body: `Rate your ${booking.serviceName} with ${booking.providerName}.`,
      data: { type: "rating_request", bookingId: id },
    });
  } else if (status === "in_progress") {
    bookingQueue.add("start-service", {
      bookingId: id,
      userId: booking.userId,
      serviceName: booking.serviceName,
      providerName: booking.providerName,
    }, { delay: 0 });
  }

  res.json(booking);
});

// Dispatch log: admin/support only. Requires authentication + admin role.
// Owners and providers do not have access — this is an internal support tool.
router.get("/bookings/:id/dispatch-log", requireAuth, async (req, res): Promise<void> => {
  const callerRole = (req.user as { role?: string } | undefined)?.role;
  if (callerRole !== "admin") {
    res.status(403).json({ error: "Forbidden: admin role required" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid booking ID" });
    return;
  }

  const [booking] = await db
    .select({ id: bookingsTable.id, serviceName: bookingsTable.serviceName, status: bookingsTable.status })
    .from(bookingsTable)
    .where(eq(bookingsTable.id, id));

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const attempts = await db
    .select({
      rank: leadDispatchAttemptsTable.rank,
      status: leadDispatchAttemptsTable.status,
      skipReason: leadDispatchAttemptsTable.skipReason,
      providerId: leadDispatchAttemptsTable.providerId,
      providerName: providersTable.name,
      providerRating: providersTable.rating,
      providerJobsCompleted: providersTable.jobsCompleted,
      dispatchedAt: leadDispatchAttemptsTable.updatedAt,
    })
    .from(leadDispatchAttemptsTable)
    .leftJoin(providersTable, eq(leadDispatchAttemptsTable.providerId, providersTable.id))
    .where(eq(leadDispatchAttemptsTable.bookingId, id))
    .orderBy(asc(leadDispatchAttemptsTable.rank));

  res.json({
    bookingId: id,
    serviceName: booking.serviceName,
    bookingStatus: booking.status,
    totalAttempts: attempts.length,
    attempts,
  });
});

export default router;
