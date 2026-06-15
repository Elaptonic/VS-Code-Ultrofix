import { bookingsTable, db, notificationsTable, providersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { logger } from "./logger";
import { setIO, getIO, emitToUser, emitToVendor } from "./io-instance";
import { clearPendingLead, markPendingLead } from "./timers";
import { dispatchNextVendor, handleVendorOffline, markVendorAccepted, markVendorRejected } from "./dispatch";

export { emitToUser, emitToVendor, getIO, clearPendingLead, markPendingLead };

export const vendorSockets = new Map<number, string>();

export function initSocket(server: HttpServer) {
  const io = new SocketIOServer(server, {
    path: "/api/socket.io",
    cors: { origin: "*" },
    transports: ["polling", "websocket"],
  });

  setIO(io);

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    socket.on("join", (userId: string) => {
      socket.join(`user:${userId}`);
      logger.debug({ userId, socketId: socket.id }, "Socket joined user room");
    });

    socket.on("register-vendor", (providerId: number) => {
      vendorSockets.set(providerId, socket.id);
      socket.join(`vendor:${providerId}`);
      logger.info({ providerId, socketId: socket.id }, "Vendor registered");
      socket.emit("vendor:registered", { providerId, status: "online" });
    });

    socket.on(
      "vendor:accept",
      async (payload: {
        bookingId: number;
        providerId?: number;
        userId: string;
        serviceName: string;
        providerName: string;
      }) => {
        const resolvedProviderId =
          payload.providerId ??
          [...vendorSockets.entries()].find(([, sid]) => sid === socket.id)?.[0];

        if (!resolvedProviderId) {
          logger.warn({ bookingId: payload.bookingId }, "vendor:accept — could not resolve providerId");
          return;
        }

        const { bookingId, userId, serviceName, providerName } = payload;
        const providerId = resolvedProviderId;
        try {
          const accepted = await markVendorAccepted(bookingId, providerId);
          if (!accepted) {
            logger.warn(
              { bookingId, providerId },
              "vendor:accept rejected — not the currently dispatched attempt",
            );
            socket.emit("vendor:accept:rejected", {
              bookingId,
              reason: "not_dispatched",
            });
            return;
          }

          clearPendingLead(bookingId);

          const [providerRow] = await db
            .select({
              name: providersTable.name,
              initials: providersTable.initials,
            })
            .from(providersTable)
            .where(eq(providersTable.id, providerId));

          const [updated] = await db
            .update(bookingsTable)
            .set({
              status: "accepted",
              providerId,
              providerName: providerRow?.name ?? providerName,
              providerInitials: providerRow?.initials ?? "",
            })
            .where(and(eq(bookingsTable.id, bookingId), eq(bookingsTable.userId, userId)))
            .returning();

          if (!updated) {
            logger.warn({ bookingId }, "vendor:accept: booking update failed");
            return;
          }

          emitToUser(userId, "booking:status", { bookingId, status: "accepted" });

          await db.insert(notificationsTable).values({
            userId,
            type: "booking_accepted",
            icon: "user-check",
            iconColor: "#3b82f6",
            title: "Provider On The Way!",
            body: `${providerRow?.name ?? providerName} has accepted your ${serviceName} booking and will arrive as scheduled.`,
            read: false,
            bookingId,
          });

          logger.info({ bookingId, providerId, userId }, "Vendor accepted booking");
        } catch (err) {
          logger.error({ err, bookingId }, "vendor:accept handler failed");
        }
      },
    );

    socket.on(
      "vendor:deny",
      async (payload: {
        bookingId: number;
        providerId?: number;
        userId: string;
        serviceName: string;
        providerName: string;
      }) => {
        const resolvedProviderId =
          payload.providerId ??
          [...vendorSockets.entries()].find(([, sid]) => sid === socket.id)?.[0];

        if (!resolvedProviderId) {
          logger.warn({ bookingId: payload.bookingId }, "vendor:deny — could not resolve providerId");
          return;
        }

        const { bookingId } = payload;
        const providerId = resolvedProviderId;
        try {
          const rejected = await markVendorRejected(bookingId, providerId);
          if (!rejected) {
            logger.warn(
              { bookingId, providerId },
              "vendor:deny rejected — not the currently dispatched attempt",
            );
            socket.emit("vendor:deny:rejected", {
              bookingId,
              reason: "not_dispatched",
            });
            return;
          }

          clearPendingLead(bookingId);
          await dispatchNextVendor(bookingId);
          logger.info({ bookingId, providerId }, "Vendor denied booking — cascading to next");
        } catch (err) {
          logger.error({ err, bookingId }, "vendor:deny handler failed");
        }
      },
    );

    socket.on(
      "location:update",
      (payload: { bookingId: number; lat: number; lng: number; userId: string }) => {
        const { bookingId, lat, lng, userId } = payload;
        emitToUser(userId, "location:update", { bookingId, lat, lng });
        logger.debug({ bookingId, lat, lng }, "Location relayed to customer");
      },
    );

    socket.on(
      "location:stop",
      (payload: { bookingId: number; userId: string }) => {
        emitToUser(payload.userId, "location:stop", { bookingId: payload.bookingId });
        logger.debug({ bookingId: payload.bookingId }, "Location tracking stopped");
      },
    );

    socket.on("disconnect", () => {
      for (const [providerId, socketId] of vendorSockets.entries()) {
        if (socketId === socket.id) {
          vendorSockets.delete(providerId);
          logger.info({ providerId, socketId: socket.id }, "Vendor disconnected");
          handleVendorOffline(providerId).catch((err) => {
            logger.error({ err, providerId }, "handleVendorOffline failed on disconnect");
          });
          break;
        }
      }
      logger.debug({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}
