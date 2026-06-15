import { Icon as Feather } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const SAVED_METHODS = [
  { id: "1", type: "upi", label: "UPI", sub: "arjun@okaxis", icon: "smartphone" as const },
  { id: "2", type: "card", label: "Visa •••• 4242", sub: "Expires 08/27", icon: "credit-card" as const },
];

const ADD_OPTIONS = [
  { type: "upi", label: "Add UPI ID", icon: "smartphone" as const, color: "#f97316" },
  { type: "card", label: "Add Debit / Credit Card", icon: "credit-card" as const, color: "#6366f1" },
  { type: "netbanking", label: "Net Banking", icon: "globe" as const, color: "#0ea5e9" },
  { type: "wallet", label: "Mobile Wallet", icon: "dollar-sign" as const, color: "#10b981" },
];

export default function PaymentMethodsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [methods, setMethods] = useState(SAVED_METHODS);

  const handleRemove = (id: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove Method", "Remove this payment method?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setMethods((m) => m.filter((p) => p.id !== id)),
      },
    ]);
  };

  const handleAdd = (type: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    Alert.alert("Coming Soon", `Adding ${type} payment methods will be available in the next update.`);
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Payment Methods</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {methods.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saved Methods</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {methods.map((m, i) => (
                <View key={m.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  <View style={styles.methodRow}>
                    <View style={[styles.methodIcon, { backgroundColor: colors.primary + "15" }]}>
                      <Feather name={m.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.methodLabel, { color: colors.foreground }]}>{m.label}</Text>
                      <Text style={[styles.methodSub, { color: colors.mutedForeground }]}>{m.sub}</Text>
                    </View>
                    <View style={[styles.defaultBadge, { backgroundColor: colors.primary + "18" }]}>
                      <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
                    </View>
                    <Pressable onPress={() => handleRemove(m.id)} hitSlop={10}>
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Add Payment Method</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {ADD_OPTIONS.map((opt, i) => (
            <View key={opt.type}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <Pressable
                onPress={() => handleAdd(opt.type)}
                style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.65 }]}
              >
                <View style={[styles.methodIcon, { backgroundColor: opt.color + "15" }]}>
                  <Feather name={opt.icon} size={18} color={opt.color} />
                </View>
                <Text style={[styles.methodLabel, { color: colors.foreground, flex: 1 }]}>
                  {opt.label}
                </Text>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))}
        </View>

        <View style={[styles.secureNote, { backgroundColor: colors.muted }]}>
          <Feather name="lock" size={14} color={colors.mutedForeground} />
          <Text style={[styles.secureText, { color: colors.mutedForeground }]}>
            All payment information is encrypted and secured by Razorpay PCI-DSS compliance.
          </Text>
        </View>
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
  content: { padding: 20, gap: 14 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  methodLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  methodSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  defaultText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  secureNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  secureText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
