import { bookingsTable, db, leadDispatchAttemptsTable, notificationsTable, providersTable } from "@workspace/db";
import { getRankedProviders } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { logger } from "./logger";
import { emitToUser, emitToVendor } from "./io-instance";
import { clearPendingLead, markPendingLead } from "./timers";

const LEAD_TIMEOUT_MS = 30_000;

export async function dispatchNextVendor(bookingId: number): Promise<number | null> {
  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, bookingId));

  if (!booking) {
    logger.warn({ bookingId }, "dispatchNextVendor: booking not found");
    return null;
  }

  if (
    booking.status === "accepted" ||
    booking.status === "completed" ||
    booking.status === "cancelled"
  ) {
    logger.debug({ bookingId, status: booking.status }, "dispatchNextVendor: booking already resolved");
    return null;
  }

  const currentlyDispatched = await db
    .select()
    .from(leadDispatchAttemptsTable)
    .where(
      and(
        eq(leadDispatchAttemptsTable.bookingId, bookingId),
        eq(leadDispatchAttemptsTable.status, "dispatched"),
      ),
    );

  for (const attempt of currentlyDispatched) {
    await db
      .update(leadDispatchAttemptsTable)
      .set({ status: "timed_out", skipReason: "timed_out", updatedAt: new Date() })
      .where(eq(leadDispatchAttemptsTable.id, attempt.id));
  }

  const nextAttempts = await db
    .select()
    .from(leadDispatchAttemptsTable)
    .where(
      and(
        eq(leadDispatchAttemptsTable.bookingId, bookingId),
        eq(leadDispatchAttemptsTable.status, "pending"),
      ),
    )
    .orderBy(leadDispatchAttemptsTable.rank);

  if (nextAttempts.length === 0) {
    await db
      .update(bookingsTable)
      .set({ status: "pending" })
      .where(eq(bookingsTable.id, bookingId));

    emitToUser(booking.userId, "booking:no_provider", {
      bookingId,
      message: "No provider is available right now. We'll notify you when one becomes available.",
    });

    await db.insert(notificationsTable).values({
      userId: booking.userId,
      type: "booking_no_provider",
      icon: "alert-circle",
      iconColor: "#f59e0b",
      title: "No Provider Available",
      body: `We couldn't find an available provider for your ${booking.serviceName} right now. Please try again later.`,
      read: false,
      bookingId,
    });

    logger.info({ bookingId }, "dispatchNextVendor: no providers remaining, notified user");
    return null;
  }

  const next = nextAttempts[0]!;

  const isAvailable = await checkVendorAvailability(next.providerId, booking.date, booking.time);
  if (!isAvailable) {
    await db
      .update(leadDispatchAttemptsTable)
      .set({ status: "skipped", skipReason: "slot_conflict", updatedAt: new Date() })
      .where(eq(leadDispatchAttemptsTable.id, next.id));

    logger.info(
      { bookingId, providerId: next.providerId },
      "dispatchNextVendor: vendor no longer available for slot, skipping",
    );
    return dispatchNextVendor(bookingId);
  }

  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.id, next.providerId));

  await db
    .update(leadDispatchAttemptsTable)
    .set({ status: "dispatched", updatedAt: new Date() })
    .where(eq(leadDispatchAttemptsTable.id, next.id));

  const leadPayload = {
    bookingId,
    serviceName: booking.serviceName,
    category: booking.serviceName,
    providerName: provider?.name ?? "",
    date: booking.date,
    time: booking.time,
    address: booking.address,
    price: booking.price,
    userId: booking.userId,
    providerId: next.providerId,
  };

  emitToUser(booking.userId, "booking:status", { bookingId, status: "searching" });
  emitToVendor(next.providerId, "NEW_LEAD", leadPayload);

  markPendingLead(bookingId, LEAD_TIMEOUT_MS, () => {
    dispatchNextVendor(bookingId).catch((err) => {
      logger.error({ err, bookingId }, "dispatchNextVendor timeout callback failed");
    });
  });

  logger.info(
    { bookingId, providerId: next.providerId, rank: next.rank },
    "dispatchNextVendor: lead sent to vendor",
  );

  return next.providerId;
}

export async function markVendorRejected(bookingId: number, providerId: number): Promise<boolean> {
  const result = await db
    .update(leadDispatchAttemptsTable)
    .set({ status: "rejected", skipReason: "rejected_by_vendor", updatedAt: new Date() })
    .where(
      and(
        eq(leadDispatchAttemptsTable.bookingId, bookingId),
        eq(leadDispatchAttemptsTable.providerId, providerId),
        eq(leadDispatchAttemptsTable.status, "dispatched"),
      ),
    )
    .returning();
  return result.length > 0;
}

export async function markVendorAccepted(bookingId: number, providerId: number): Promise<boolean> {
  try {
    return await db.transaction(async (tx) => {
      const result = await tx
        .update(leadDispatchAttemptsTable)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(
          and(
            eq(leadDispatchAttemptsTable.bookingId, bookingId),
            eq(leadDispatchAttemptsTable.providerId, providerId),
            eq(leadDispatchAttemptsTable.status, "dispatched"),
          ),
        )
        .returning();

      if (result.length === 0) {
        return false;
      }

      await tx
        .update(leadDispatchAttemptsTable)
        .set({ status: "skipped", skipReason: "booking_accepted_by_other", updatedAt: new Date() })
        .where(
          and(
            eq(leadDispatchAttemptsTable.bookingId, bookingId),
            eq(leadDispatchAttemptsTable.status, "pending"),
          ),
        );

      return true;
    });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      logger.info({ bookingId, providerId }, "markVendorAccepted: unique constraint prevented double-accept");
      return false;
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

async function checkVendorAvailability(
  providerId: number,
  date: string,
  time: string,
): Promise<boolean> {
  const conflicts = await db
    .select({ id: bookingsTable.id })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.providerId, providerId),
        eq(bookingsTable.date, date),
        eq(bookingsTable.time, time),
        inArray(bookingsTable.status, ["accepted", "in_progress"]),
      ),
    );
  return conflicts.length === 0;
}

export async function handleVendorOffline(providerId: number): Promise<void> {
  const timedOut = await db
    .update(leadDispatchAttemptsTable)
    .set({ status: "timed_out", skipReason: "vendor_offline", updatedAt: new Date() })
    .where(
      and(
        eq(leadDispatchAttemptsTable.providerId, providerId),
        eq(leadDispatchAttemptsTable.status, "dispatched"),
      ),
    )
    .returning();

  for (const attempt of timedOut) {
    clearPendingLead(attempt.bookingId);

    logger.info(
      { bookingId: attempt.bookingId, providerId },
      "handleVendorOffline: attempt timed_out due to disconnect, cascading dispatch",
    );

    dispatchNextVendor(attempt.bookingId).catch((err) => {
      logger.error({ err, bookingId: attempt.bookingId }, "handleVendorOffline: dispatchNextVendor failed");
    });
  }
}

export async function seedDispatchQueue(
  bookingId: number,
  serviceCategory: string,
  date: string,
  time: string,
): Promise<number> {
  const ranked = await getRankedProviders(serviceCategory, date, time);

  if (ranked.length === 0) {
    return 0;
  }

  await db.insert(leadDispatchAttemptsTable).values(
    ranked.map((provider, idx) => ({
      bookingId,
      providerId: provider.id,
      rank: idx + 1,
      status: "pending" as const,
    })),
  );

  return ranked.length;
}
