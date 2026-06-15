import { Icon as Feather } from "@/components/Icon";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListBookings } from "@workspace/api-client-react";

import { BookingCard } from "@/components/BookingCard";
import { AUTH_TOKEN_KEY, getApiBaseUrl } from "@/context/auth";
import { useColors } from "@/hooks/useColors";
import { useUserId } from "@/constants/user";

const TABS = ["Upcoming", "Completed", "Cancelled"] as const;
type Tab = typeof TABS[number];

interface ReviewSheet {
  bookingId: number;
  serviceName?: string;
}

function StarPicker({
  value,
  onChange,
  colors,
}: {
  value: number;
  onChange: (v: number) => void;
  colors: any;
}) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Pressable key={s} onPress={() => onChange(s)} hitSlop={8}>
          <Feather
            name="star"
            size={36}
            color={s <= value ? "#f59e0b" : colors.border}
          />
        </Pressable>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, justifyContent: "center" },
});

export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const [activeTab, setActiveTab] = useState<Tab>("Upcoming");
  const userId = useUserId();

  const { data: bookings, isLoading } = useListBookings({ userId });

  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());
  const [reviewSheet, setReviewSheet] = useState<ReviewSheet | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const autoPrompted = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        if (!token) return;
        const res = await fetch(`${getApiBaseUrl()}/api/reviews`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: { bookingId: number }[] = await res.json();
          setReviewedIds(new Set(data.map((r) => r.bookingId)));
        }
      } catch {
        // leave reviewedIds empty — optimistic, server will reject duplicates anyway
      }
    })();
  }, []);

  const completedBookings = (bookings ?? []).filter(
    (b) => (b as any).status === "completed",
  );

  useEffect(() => {
    if (activeTab !== "Completed" || autoPrompted.current) return;
    if (completedBookings.length === 0) return;
    const first = completedBookings.find((b) => !reviewedIds.has((b as any).id));
    if (!first) return;
    autoPrompted.current = true;
    const b = first as any;
    setTimeout(() => {
      if (Platform.OS !== "web") Haptics.selectionAsync();
      setStarRating(0);
      setReviewComment("");
      setSubmitError(null);
      setReviewSheet({ bookingId: b.id, serviceName: b.serviceName });
    }, 400);
  }, [activeTab, completedBookings, reviewedIds]);

  const filteredBookings = (bookings ?? []).filter((b) => {
    const s = (b as any).status as string;
    if (activeTab === "Upcoming") return ["pending", "accepted", "in_progress", "upcoming"].includes(s);
    if (activeTab === "Completed") return s === "completed";
    return s === "cancelled";
  });

  const openReview = (booking: any) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setStarRating(0);
    setReviewComment("");
    setSubmitError(null);
    setReviewSheet({ bookingId: booking.id, serviceName: booking.serviceName });
  };

  const submitReview = async () => {
    if (!reviewSheet || starRating === 0) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);
    setSubmitError(null);
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const res = await fetch(`${getApiBaseUrl()}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bookingId: reviewSheet.bookingId,
          rating: starRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
      if (res.ok || res.status === 409) {
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setReviewedIds((prev) => new Set([...prev, reviewSheet.bookingId]));
        setReviewSheet(null);
      } else {
        const data = await res.json();
        setSubmitError(data.error ?? "Failed to submit review.");
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  const HeaderEl = (
    <View style={styles.headerInner}>
      <Text style={[styles.title, { color: colors.foreground }]}>My Bookings</Text>
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              activeTab === tab
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: StyleSheet.hairlineWidth },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? "#fff" : colors.mutedForeground },
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isIOS ? (
        <BlurView intensity={70} tint="light" style={[styles.header, { paddingTop: insets.top + 16 }]}>
          {HeaderEl}
        </BlurView>
      ) : (
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
              borderBottomColor: colors.border,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          {HeaderEl}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.glass }]}>
              <Feather name="calendar" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No {activeTab.toLowerCase()} bookings
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {activeTab === "Upcoming"
                ? "Book a service to get started"
                : `Your ${activeTab.toLowerCase()} bookings will appear here`}
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => {
            const b = booking as any;
            const canReview = activeTab === "Completed" && !reviewedIds.has(b.id);
            return (
              <View key={b.id} style={styles.bookingWrap}>
                <BookingCard booking={booking} />
                {canReview && (
                  <Pressable
                    onPress={() => openReview(b)}
                    style={({ pressed }) => [
                      styles.rateBtn,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Feather name="star" size={15} color="#f59e0b" />
                    <Text style={[styles.rateBtnText, { color: colors.foreground }]}>
                      Rate your experience
                    </Text>
                    <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
                  </Pressable>
                )}
                {activeTab === "Completed" && reviewedIds.has(b.id) && (
                  <View style={[styles.reviewedBadge, { backgroundColor: "#dcfce7" }]}>
                    <Feather name="check-circle" size={14} color="#16a34a" />
                    <Text style={[styles.reviewedText, { color: "#16a34a" }]}>Review submitted</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!reviewSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewSheet(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBg} onPress={() => setReviewSheet(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Rate your experience</Text>
            {reviewSheet?.serviceName && (
              <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
                {reviewSheet.serviceName}
              </Text>
            )}

            <StarPicker value={starRating} onChange={setStarRating} colors={colors} />
            {starRating > 0 && (
              <Text style={[styles.ratingLabel, { color: colors.primary }]}>
                {ratingLabels[starRating]}
              </Text>
            )}

            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Share your experience (optional)…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              maxLength={500}
              style={[
                styles.commentInput,
                {
                  backgroundColor: colors.muted,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
            />

            {submitError && (
              <Text style={styles.errorText}>{submitError}</Text>
            )}

            <Pressable
              onPress={submitReview}
              disabled={starRating === 0 || submitting}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: starRating > 0 ? colors.primary : colors.border },
                pressed && { opacity: 0.8 },
                submitting && { opacity: 0.6 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {starRating === 0 ? "Select a rating" : "Submit Review"}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => setReviewSheet(null)} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip for now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerInner: {},
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 16 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 4 },
  center: { alignItems: "center", paddingTop: 80 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  bookingWrap: { marginBottom: 12 },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  rateBtnText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  reviewedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  reviewedText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  sheetSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: -8 },
  ratingLabel: { textAlign: "center", fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: -8 },
  commentInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: 90,
    textAlignVertical: "top",
  },
  errorText: { color: "#dc2626", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  submitBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  skipBtn: { alignItems: "center", paddingVertical: 4 },
  skipText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
