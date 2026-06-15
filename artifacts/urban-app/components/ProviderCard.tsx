import { Icon as Feather } from "@/components/Icon";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { Provider } from "@workspace/api-client-react";

interface ProviderCardProps {
  provider: Provider;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const colors = useColors();

  const avatarColors = [
    "#38BDF8", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899",
  ];
  const avatarColor = avatarColors[provider.id % avatarColors.length];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.inner}>
        <View style={[styles.avatar, { backgroundColor: avatarColor + "20" }]}>
          <Text style={[styles.avatarText, { color: avatarColor }]}>
            {provider.initials}
          </Text>
        </View>
        {provider.verified && (
          <View style={[styles.verifiedBadge, { backgroundColor: "#E0F2FE" }]}>
            <Feather name="check-circle" size={10} color="#10b981" />
            <Text style={[styles.verifiedText, { color: "#10b981" }]}>Verified</Text>
          </View>
        )}
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {provider.name}
        </Text>
        <View style={styles.ratingRow}>
          <Feather name="star" size={12} color="#f59e0b" />
          <Text style={[styles.rating, { color: colors.foreground }]}>
            {provider.rating}
          </Text>
          <Text style={[styles.reviews, { color: colors.mutedForeground }]}>
            ({provider.reviewCount})
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {provider.jobsCompleted.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Jobs</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {provider.experience}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Exp.</Text>
          </View>
        </View>
        <View style={styles.tags}>
          {provider.specializations.slice(0, 2).map((spec) => (
            <View key={spec} style={[styles.tag, { backgroundColor: colors.primary + "14" }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>{spec}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 168,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#6080c0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  inner: {
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  verifiedText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  name: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { fontSize: 12, fontFamily: "Inter_500Medium" },
  reviews: { fontSize: 11 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  stat: { alignItems: "center" },
  statValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10 },
  statDivider: { width: 1, height: 24 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tagText: { fontSize: 10, fontFamily: "Inter_500Medium" },
});
