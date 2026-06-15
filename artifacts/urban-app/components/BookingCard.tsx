import { Icon as Feather } from "@/components/Icon";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useUpdateBooking,
  getListBookingsQueryKey,
  Booking,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useUserId } from "@/constants/user";

interface BookingCardProps {
  booking: Booking;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#dbeafe22", text: "#3b82f6", label: "Pending" },
  accepted: { bg: "#e0f2fe22", text: "#0ea5e9", label: "Accepted" },
  in_progress: { bg: "#fef9c322", text: "#eab308", label: "In Progress" },
  upcoming: { bg: "#dbeafe22", text: "#3b82f6", label: "Upcoming" },
  completed: { bg: "#E0F2FE22", text: "#10b981", label: "Completed" },
  cancelled: { bg: "#fee2e222", text: "#ef4444", label: "Cancelled" },
};

const ACTIVE_STATUSES = new Set(["pending", "accepted", "in_progress", "upcoming"]);

export function BookingCard({ booking }: BookingCardProps) {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useUserId();
  const updateBooking = useUpdateBooking({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListBookingsQueryKey({ userId }),
        });
      },
    },
  });
  const [localRating, setLocalRating] = useState<number>(booking.rating ?? 0);

  const rawStatus = (booking as any).status as string;
  const statusConf = STATUS_CONFIG[rawStatus] ?? STATUS_CONFIG.pending;

  const handleCancel = () => {
    if (Platform.OS !== "web") {
      Alert.alert("Cancel Booking", "Are you sure you want to cancel?", [
        { text: "Keep it" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            updateBooking.mutate({ id: booking.id, data: { status: "cancelled" as any } });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]);
    } else {
      updateBooking.mutate({ id: booking.id, data: { status: "cancelled" as any } });
    }
  };

  const handleRate = (stars: number) => {
    setLocalRating(stars);
    updateBooking.mutate({ id: booking.id, data: { rating: stars } });
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTrack = () => {
    router.push(`/tracking/${booking.id}`);
  };

  const formattedDate = new Date(booking.date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const CardContent = (
    <View style={styles.inner}>
      <View style={styles.topRow}>
        <View style={styles.providerRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {booking.providerInitials}
            </Text>
          </View>
          <View style={styles.providerInfo}>
            <Text style={[styles.serviceName, { color: colors.foreground }]}>
              {booking.serviceName}
            </Text>
            <Text style={[styles.providerName, { color: colors.mutedForeground }]}>
              by {booking.providerName}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConf.bg }]}>
          <Text style={[styles.statusText, { color: statusConf.text }]}>{statusConf.label}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Feather name="calendar" size={13} color={colors.mutedForeground} />
          <Text style={[styles.detailText, { color: colors.foreground }]}>
            {formattedDate} · {booking.time}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="map-pin" size={13} color={colors.mutedForeground} />
          <Text
            style={[styles.detailText, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {booking.address}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Feather name="tag" size={13} color={colors.mutedForeground} />
          <Text style={[styles.priceText, { color: colors.primary }]}>
            ₹{booking.price}
          </Text>
        </View>
      </View>

      {rawStatus === "completed" && (
        <View style={styles.ratingSection}>
          <Text style={[styles.rateLabel, { color: colors.mutedForeground }]}>
            Rate your experience
          </Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => handleRate(star)} hitSlop={4}>
                <Feather
                  name="star"
                  size={24}
                  color={star <= localRating ? "#f59e0b" : colors.border}
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {rawStatus === "in_progress" && (
        <Pressable
          onPress={handleTrack}
          style={({ pressed }) => [
            styles.trackBtn,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="navigation" size={15} color="#fff" />
          <Text style={styles.trackBtnText}>Track Provider</Text>
        </Pressable>
      )}

      {ACTIVE_STATUSES.has(rawStatus) && rawStatus !== "in_progress" && (
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.cancelBtn,
            { borderColor: colors.destructive + "60" },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.cancelText, { color: colors.destructive }]}>
            Cancel Booking
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={[styles.card, { shadowColor: colors.glassShadow }]}>
      {isIOS ? (
        <BlurView intensity={50} tint="light" style={styles.blur}>
          {CardContent}
        </BlurView>
      ) : (
        <View
          style={[
            styles.blur,
            { backgroundColor: colors.glass, borderColor: colors.glassBorder },
          ]}
        >
          {CardContent}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#6080c0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  blur: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 20,
  },
  inner: { padding: 16 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  providerRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  providerInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  providerName: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  details: { gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 13, flex: 1 },
  priceText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ratingSection: { marginTop: 14, alignItems: "center", gap: 8 },
  rateLabel: { fontSize: 13 },
  stars: { flexDirection: "row", gap: 8 },
  trackBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  trackBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cancelBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
