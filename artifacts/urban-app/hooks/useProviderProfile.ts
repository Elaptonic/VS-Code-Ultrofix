import { useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY, getApiBaseUrl } from "@/context/auth";

export interface ProviderProfile {
  id: number;
  userId: string | null;
  name: string;
  initials: string;
  category: string;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  onboardingComplete: boolean;
}

export function useProviderProfile() {
  return useQuery<ProviderProfile | null>({
    queryKey: ["provider-profile-me"],
    queryFn: async () => {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const res = await fetch(`${getApiBaseUrl()}/api/providers/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch provider profile");
      return res.json();
    },
    staleTime: 60_000,
    retry: 2,
  });
}
