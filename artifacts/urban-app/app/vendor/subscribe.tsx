import { Icon as Feather } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { AUTH_TOKEN_KEY, getApiBaseUrl } from "@/context/auth";

const FEATURES = [
  { icon: "zap" as const, label: "Priority lead dispatch", desc: "Get matched first when customers book nearby" },
  { icon: "shield" as const, label: "Verified provider badge", desc: "Stand out with a blue verification badge" },
  { icon: "trending-up" as const, label: "Analytics dashboard", desc: "Track earnings, ratings, and job performance" },
  { icon: "bell" as const, label: "Instant job alerts", desc: "Push notifications the moment a lead arrives" },
  { icon: "star" as const, label: "Review showcase", desc: "Get your top reviews highlighted on your profile" },
  { icon: "headphones" as const, label: "Priority support", desc: "Dedicated support channel for subscribers" },
];

interface SubscribeScreenProps {
  onSuccess?: () => void;
}

export default function SubscribeScreen({ onSuccess }: SubscribeScreenProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubscribe = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    try {
      const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
      const res = await fetch(`${getApiBaseUrl()}/api/subscriptions/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Subscription failed. Please try again.");
        return;
      }
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.replace("/vendor/(tabs)/dashboard" as any);
        }
      }, 1500);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.successIcon, { backgroundColor: "#dcfce7" }]}>
          <Feather name="check-circle" size={48} color="#16a34a" />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>You're subscribed!</Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          Your plan is active for 30 days. Start receiving job leads now.
        </Text>
      </View>
    );
  }

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
        <Pressable onPress={() => router.replace("/vendor/(tabs)/dashboard" as any)} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pro Subscription</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.pricingCard, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
          <View style={styles.pricingTop}>
            <View style={[styles.proBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <Feather name="star" size={12} color="#fff" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.pricingAmount}>₹999</Text>
          <Text style={styles.pricingPer}>per month</Text>
          <Text style={styles.pricingDesc}>
            Unlock priority dispatch and grow your service business
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>What's included</Text>

        <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {FEATURES.map((f, i) => (
            <View key={f.label}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name={f.icon} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.featureLabel, { color: colors.foreground }]}>{f.label}</Text>
                  <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
                </View>
                <Feather name="check" size={16} color="#10b981" />
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.noteCard, { backgroundColor: colors.muted }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            This is a simulated payment for demo purposes. No actual charge is made. In production, this integrates with Razorpay.
          </Text>
        </View>

        {error && (
          <View style={[styles.errorCard, { backgroundColor: "#fee2e2", borderColor: "#fca5a5" }]}>
            <Feather name="alert-circle" size={16} color="#dc2626" />
            <Text style={[styles.errorText, { color: "#dc2626" }]}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={handleSubscribe}
          disabled={loading}
          style={({ pressed }) => [
            styles.subscribeBtn,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
            loading && { opacity: 0.6 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="zap" size={18} color="#fff" />
              <Text style={styles.subscribeBtnText}>Subscribe for ₹999 / month</Text>
            </>
          )}
        </Pressable>

        <Text style={[styles.cancelNote, { color: colors.mutedForeground }]}>
          Cancel anytime. Renews automatically each month.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 40 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  content: { padding: 20, gap: 16 },
  pricingCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 6,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  pricingTop: { alignSelf: "flex-start" },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  pricingAmount: { color: "#fff", fontSize: 48, fontFamily: "Inter_700Bold" },
  pricingPer: { color: "rgba(255,255,255,0.75)", fontSize: 15, fontFamily: "Inter_400Regular" },
  pricingDesc: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  featuresCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  featureIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  featureLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  featureDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  subscribeBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  cancelNote: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular" },
});
