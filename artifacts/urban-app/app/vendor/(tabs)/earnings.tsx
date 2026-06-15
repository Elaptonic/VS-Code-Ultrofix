import { Icon as Feather } from "@/components/Icon";
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

import { useColors } from "@/hooks/useColors";
import { useProviderProfile } from "@/hooks/useProviderProfile";
import { useProviderStats } from "@/hooks/useProviderStats";
import type { BreakdownEntry } from "@/hooks/useProviderStats";

const PERIODS = ["Week", "Month", "Year"] as const;
type Period = (typeof PERIODS)[number];

const BAR_COLORS = ["#38BDF8", "#7DD3FC", "#BAE6FD", "#E0F2FE", "#F0F9FF", "#F0F9FF", "#BAE6FD"];

function fmtINR(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n}`;
}

export default function VendorEarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>("Month");

  const { data: profile } = useProviderProfile();
  const { data: stats, isLoading } = useProviderStats(profile?.id);

  const breakdown: BreakdownEntry[] =
    period === "Week"
      ? (stats?.weekBreakdown ?? [])
      : period === "Month"
        ? (stats?.monthBreakdown ?? [])
        : (stats?.yearBreakdown ?? []);

  const totalEarnings =
    period === "Week"
      ? (stats?.weekBreakdown ?? []).reduce((s, e) => s + e.amount, 0)
      : period === "Month"
        ? (stats?.monthEarnings ?? 0)
        : (stats?.yearBreakdown ?? []).reduce((s, e) => s + e.amount, 0);

  const totalJobs =
    period === "Week"
      ? (stats?.weekBreakdown ?? []).reduce((s, e) => s + e.jobs, 0)
      : period === "Month"
        ? (stats?.monthJobs ?? 0)
        : (stats?.yearBreakdown ?? []).reduce((s, e) => s + e.jobs, 0);

  const avgPerJob =
    totalJobs > 0 ? Math.round(totalEarnings / totalJobs) : 0;

  const maxAmount = breakdown.length > 0
    ? Math.max(...breakdown.map((e) => e.amount), 1)
    : 1;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + (Platform.OS === "web" ? 20 : 8),
        paddingBottom: insets.bottom + 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>
        Earnings
      </Text>

      <View style={[styles.periodRow, { backgroundColor: colors.muted }]}>
        {PERIODS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[
              styles.periodBtn,
              period === p && {
                backgroundColor: colors.card,
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              },
            ]}
          >
            <Text
              style={[
                styles.periodLabel,
                {
                  color:
                    period === p ? colors.foreground : colors.mutedForeground,
                  fontFamily:
                    period === p ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {p}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        style={[
          styles.summaryCard,
          { backgroundColor: colors.primary, shadowColor: colors.primary },
        ]}
      >
        <Text style={styles.summaryLabel}>Total Earned</Text>
        {isLoading ? (
          <ActivityIndicator color="#fff" style={{ marginVertical: 8 }} />
        ) : (
          <>
            <Text style={styles.summaryTotal}>{fmtINR(totalEarnings)}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Feather
                  name="briefcase"
                  size={14}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.summaryItemText}>{totalJobs} jobs</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Feather
                  name="trending-up"
                  size={14}
                  color="rgba(255,255,255,0.8)"
                />
                <Text style={styles.summaryItemText}>
                  {avgPerJob > 0 ? `${fmtINR(avgPerJob)} avg` : "No data"}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Breakdown
        </Text>
        <View
          style={[
            styles.chartCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ paddingVertical: 40 }}
            />
          ) : breakdown.every((e) => e.amount === 0) ? (
            <View style={styles.emptyChart}>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                No earnings data for this period
              </Text>
            </View>
          ) : (
            <View style={styles.barsRow}>
              {breakdown.map((entry, i) => {
                const barHeight = Math.max(
                  8,
                  (entry.amount / maxAmount) * 120,
                );
                return (
                  <View key={i} style={styles.barCol}>
                    <Text
                      style={[
                        styles.barAmount,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {entry.amount > 0
                        ? fmtINR(entry.amount)
                        : ""}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: entry.amount > 0 ? barHeight : 4,
                            backgroundColor:
                              entry.amount > 0
                                ? BAR_COLORS[i % BAR_COLORS.length]
                                : colors.border,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.barLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {entry.date}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          History
        </Text>
        <View
          style={[
            styles.payoutList,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ paddingVertical: 24 }}
            />
          ) : breakdown.filter((e) => e.amount > 0).length === 0 ? (
            <View style={styles.emptyRow}>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                No completed jobs in this period
              </Text>
            </View>
          ) : (
            breakdown
              .filter((e) => e.amount > 0)
              .map((entry, idx) => (
                <View key={idx}>
                  {idx > 0 && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  )}
                  <View style={styles.payoutRow}>
                    <View
                      style={[
                        styles.payoutIcon,
                        { backgroundColor: colors.primary + "15" },
                      ]}
                    >
                      <Feather
                        name="arrow-up-right"
                        size={16}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.payoutInfo}>
                      <Text
                        style={[
                          styles.payoutDate,
                          { color: colors.foreground },
                        ]}
                      >
                        {entry.date}
                      </Text>
                      <Text
                        style={[
                          styles.payoutJobs,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {entry.jobs}{" "}
                        {entry.jobs === 1 ? "job" : "jobs"} completed
                      </Text>
                    </View>
                    <Text style={[styles.payoutAmount, { color: "#22c55e" }]}>
                      +₹{entry.amount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>
              ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  periodRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  periodLabel: { fontSize: 14 },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    minHeight: 120,
    justifyContent: "center",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  summaryTotal: {
    color: "#fff",
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryItemText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  summaryDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 16,
  },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    minHeight: 100,
  },
  emptyChart: { paddingVertical: 32, alignItems: "center" },
  emptyRow: { paddingVertical: 24, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 4,
    height: 160,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  barTrack: {
    width: "100%",
    height: 120,
    justifyContent: "flex-end",
  },
  bar: { width: "100%", borderRadius: 6, minHeight: 4 },
  barAmount: { fontSize: 9, fontFamily: "Inter_400Regular" },
  barLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  payoutList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  payoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  payoutInfo: { flex: 1 },
  payoutDate: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  payoutJobs: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  payoutAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
