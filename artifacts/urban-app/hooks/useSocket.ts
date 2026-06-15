import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export type SocketStatus = "connecting" | "connected" | "disconnected" | "error";

export interface NewLead {
  bookingId: number;
  serviceName: string;
  category: string;
  providerName: string;
  date: string;
  time: string;
  address: string;
  price: number;
  userId: string;
  providerId?: number;
  distanceKm?: number;
}

export interface BookingStatusEvent {
  bookingId: number;
  status: string;
}

export interface NoProviderEvent {
  bookingId: number;
  message: string;
}

export interface LocationUpdate {
  bookingId: number;
  lat: number;
  lng: number;
}

export function useConsumerSocket(
  userId: string | null,
  onBookingStatus?: (event: BookingStatusEvent) => void,
  onLocationUpdate?: (update: LocationUpdate) => void,
  onNoProvider?: (event: NoProviderEvent) => void,
) {
  const onStatusRef = useRef(onBookingStatus);
  onStatusRef.current = onBookingStatus;
  const onLocationRef = useRef(onLocationUpdate);
  onLocationRef.current = onLocationUpdate;
  const onNoProviderRef = useRef(onNoProvider);
  onNoProviderRef.current = onNoProvider;

  useEffect(() => {
    if (!userId) return;

    const socket = io(SOCKET_URL, {
      path: "/api/socket.io",
      transports: ["polling", "websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      socket.emit("join", userId);
    });

    socket.on("booking:status", (event: BookingStatusEvent) => {
      onStatusRef.current?.(event);
    });

    socket.on("booking:no_provider", (event: NoProviderEvent) => {
      onNoProviderRef.current?.(event);
    });

    socket.on("location:update", (update: LocationUpdate) => {
      onLocationRef.current?.(update);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);
}

export function useVendorSocket(
  providerId: number | null,
  onNewLead?: (lead: NewLead) => void,
) {
  const socketRef = useRef<Socket | null>(null);
  const onNewLeadRef = useRef(onNewLead);
  onNewLeadRef.current = onNewLead;

  const [status, setStatus] = useState<SocketStatus>("disconnected");

  useEffect(() => {
    if (providerId === null) return;

    const socket = io(SOCKET_URL, {
      path: "/api/socket.io",
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;
    setStatus("connecting");

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit("register-vendor", providerId);
    });

    socket.on("vendor:registered", () => {
      setStatus("connected");
    });

    socket.on("NEW_LEAD", (lead: NewLead) => {
      onNewLeadRef.current?.(lead);
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setStatus("error");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setStatus("disconnected");
    };
  }, [providerId]);

  const acceptLead = useCallback((lead: NewLead) => {
    socketRef.current?.emit("vendor:accept", {
      bookingId: lead.bookingId,
      providerId,
      userId: lead.userId,
      serviceName: lead.serviceName,
      providerName: lead.providerName,
    });
  }, [providerId]);

  const denyLead = useCallback((lead: NewLead) => {
    socketRef.current?.emit("vendor:deny", {
      bookingId: lead.bookingId,
      providerId,
      userId: lead.userId,
      serviceName: lead.serviceName,
      providerName: lead.providerName,
    });
  }, [providerId]);

  const emitLocation = useCallback(
    (bookingId: number, lat: number, lng: number, userId: string) => {
      socketRef.current?.emit("location:update", { bookingId, lat, lng, userId });
    },
    [],
  );

  const emitLocationStop = useCallback((bookingId: number, userId: string) => {
    socketRef.current?.emit("location:stop", { bookingId, userId });
  }, []);

  return { socket: socketRef.current, status, acceptLead, denyLead, emitLocation, emitLocationStop };
}
