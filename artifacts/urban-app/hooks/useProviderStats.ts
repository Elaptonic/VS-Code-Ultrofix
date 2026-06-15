import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { getApiBaseUrl } from "@/context/auth";

const SOCKET_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export interface RecentJob {
  id: number;
  serviceName: string;
  date: string;
  time: string;
  price: number;
}

export interface BreakdownEntry {
  date: string;
  amount: number;
  jobs: number;
}

export interface ProviderStats {
  totalJobs: number;
  todayJobs: number;
  todayEarnings: number;
  monthJobs: number;
  monthEarnings: number;
  reviewCount: number;
  avgRating: number;
  acceptanceRate: number;
  memberSince: number | null;
  recentJobs: RecentJob[];
  weekBreakdown: BreakdownEntry[];
  monthBreakdown: BreakdownEntry[];
  yearBreakdown: BreakdownEntry[];
}

export function useProviderStats(providerId: number | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery<ProviderStats>({
    queryKey: ["provider-stats", providerId],
    queryFn: async () => {
      const res = await fetch(
        `${getApiBaseUrl()}/api/provider/stats?providerId=${providerId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch provider stats");
      return res.json();
    },
    enabled: !!providerId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!providerId) return;

    const socket = io(SOCKET_URL, {
      path: "/api/socket.io",
      transports: ["polling", "websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on("connect", () => {
      socket.emit("register-vendor", providerId);
    });

    socket.on("provider:stats", () => {
      qc.invalidateQueries({ queryKey: ["provider-stats", providerId] });
    });

    return () => {
      socket.disconnect();
    };
  }, [providerId, qc]);

  return query;
}
