import { Icon as Feather } from "@/components/Icon";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";

import { useColors } from "@/hooks/useColors";
import { useProviderProfile } from "@/hooks/useProviderProfile";
import { AUTH_TOKEN_KEY, getApiBaseUrl } from "@/context/auth";

interface Review {
  id: number;
  bookingId: number;
  consumerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather
          key={s}
          name="star"
          size={size}
          color={s <= rating ? "#f59e0b" : colors.border}
        />
      ))}
    </View>
  );
}

function RatingBar({ rating, count, total, colors }: { rating: number; count: number; total: number; colors: any }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground, width: 8 }}>
        {rating}
      </Text>
      <Feather name="star" size={12} color="#f59e0b" />
      <View style={{ flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
        <View style={{ width: `${pct}%`, height: 6, backgroundColor: "#f59e0b", borderRadius: 3 }} />
      </View>
      <Text style={{ fontSize: 11, color: colors.mutedForeground, width: 20, textAlign: "right", fontFamily: "Inter_400Regular" }}>
        {count}
      </Text>
    </View>
  );
}

export default function VendorReviewsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useProviderProfile();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    const load = async () => {
      try {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        const res = await fetch(`${getApiBaseUrl()}/api/reviews/${profile.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setReviews(data);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [profile?.id]);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: reviews.filter((rev) => rev.rating === r).length,
  }));

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Reviews & Ratings</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.ratingLeft}>
              <Text style={[styles.bigRating, { color: colors.foreground }]}>
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </Text>
              <StarRow rating={Math.round(avgRating)} size={16} />
              <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.barsWrap}>
              {ratingCounts.map((r) => (
                <RatingBar
                  key={r.rating}
                  rating={r.rating}
                  count={r.count}
                  total={reviews.length}
                  colors={colors}
                />
              ))}
            </View>
          </View>

          {reviews.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="star" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No reviews yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Reviews from completed bookings will appear here.
              </Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View
                key={review.id}
                style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.reviewTop}>
                  <View style={[styles.reviewAvatar, { backgroundColor: colors.primary + "20" }]}>
                    <Feather name="user" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reviewConsumer, { color: colors.foreground }]}>
                      Customer
                    </Text>
                    <Text style={[styles.reviewDate, { color: colors.mutedForeground }]}>
                      {timeAgo(review.createdAt)}
                    </Text>
                  </View>
                  <StarRow rating={review.rating} />
                </View>
                {review.comment ? (
                  <Text style={[styles.reviewComment, { color: colors.foreground }]}>
                    "{review.comment}"
                  </Text>
                ) : (
                  <Text style={[styles.reviewComment, { color: colors.mutedForeground, fontStyle: "italic" }]}>
                    No comment left.
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  content: { padding: 20, gap: 14 },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  ratingLeft: { alignItems: "center", gap: 6 },
  bigRating: { fontSize: 40, fontFamily: "Inter_700Bold" },
  reviewCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  barsWrap: { flex: 1, gap: 5 },
  emptyCard: {
    alignItems: "center",
    gap: 10,
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  reviewCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  reviewConsumer: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reviewDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  reviewComment: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
