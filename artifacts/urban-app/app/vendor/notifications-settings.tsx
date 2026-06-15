import { Icon as Feather } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface ToggleSetting {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  enabled: boolean;
}

const DEFAULT_SETTINGS: ToggleSetting[] = [
  { id: "new_job", label: "New Job Alerts", desc: "Get notified when a booking is dispatched to you", icon: "bell", enabled: true },
  { id: "job_reminder", label: "Job Reminders", desc: "Reminder 30 minutes before a scheduled job", icon: "clock", enabled: true },
  { id: "payment", label: "Payment Updates", desc: "Confirmations and payout notifications", icon: "dollar-sign", enabled: true },
  { id: "rating", label: "New Reviews", desc: "Know when a customer leaves you a review", icon: "star", enabled: true },
  { id: "promo", label: "Promotions", desc: "Special offers and subscription deals", icon: "gift", enabled: false },
  { id: "system", label: "App Updates", desc: "Feature releases and maintenance notices", icon: "info", enabled: false },
];

export default function NotificationsSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const handleSave = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const activeCount = settings.filter((s) => s.enabled).length;

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Feather name="bell" size={20} color={colors.primary} />
          <Text style={[styles.summaryText, { color: colors.foreground }]}>
            {activeCount} of {settings.length} notification types enabled
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {settings.map((s, i) => (
            <View key={s.id}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: s.enabled ? colors.primary + "15" : colors.muted }]}>
                  <Feather name={s.icon} size={16} color={s.enabled ? colors.primary : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>{s.label}</Text>
                  <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
                </View>
                <Switch
                  value={s.enabled}
                  onValueChange={() => toggle(s.id)}
                  trackColor={{ false: colors.border, true: colors.primary + "66" }}
                  thumbColor={s.enabled ? colors.primary : "#f4f3f4"}
                />
              </View>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: saved ? "#10b981" : colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name={saved ? "check" : "save"} size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{saved ? "Saved!" : "Save Preferences"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 16 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
