import { useAuth } from "@/context/auth";

export function useUserId(): string {
  const { user } = useAuth();
  return user?.id ?? "default-user";
}
