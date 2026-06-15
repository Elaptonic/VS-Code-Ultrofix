import { Icon as Feather } from "@/components/Icon";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const SECTIONS = [
  {
    title: "Terms of Service",
    content: `Last updated: June 1, 2026

Welcome to Ultrofix. By using our app, you agree to the following terms.

1. Service Use
You must be at least 18 years old to use Ultrofix. You agree to use the platform only for lawful purposes and in accordance with these Terms.

2. Bookings & Cancellations
Bookings are confirmed only after provider acceptance. Cancellations made less than 2 hours before the scheduled time may incur a ₹99 fee.

3. Payments
All payments are processed securely via Razorpay. Ultrofix does not store your payment credentials. Refunds are processed within 5–7 business days.

4. Provider Conduct
Service providers on Ultrofix are independent professionals. Ultrofix is not responsible for any damage, loss, or injury caused by provider negligence. Please report incidents to our support team immediately.

5. Account Termination
We reserve the right to suspend or terminate accounts that violate our policies, engage in fraudulent activity, or misuse the platform.`,
  },
  {
    title: "Privacy Policy",
    content: `Last updated: June 1, 2026

Your privacy matters to us. Here's what we collect and how we use it.

1. Information We Collect
• Name, phone number, and email address for account creation
• Location data to match you with nearby providers
• Booking history to improve recommendations
• Device information for app performance

2. How We Use Your Data
We use your data to provide and improve our services, match you with providers, process payments, send service notifications, and comply with legal obligations.

3. Data Sharing
We do not sell your personal information. We share data only with:
• Service providers fulfilling your bookings
• Payment processors (Razorpay)
• Analytics tools (anonymized data only)

4. Data Security
We use AES-256 encryption for stored data and TLS 1.3 for data in transit.

5. Your Rights
You may request access to, correction of, or deletion of your personal data at any time by contacting support@ultrofix.com.`,
  },
];

export default function TermsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Terms & Privacy</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {SECTIONS.map((s, i) => (
          <Pressable
            key={i}
            onPress={() => setActiveTab(i)}
            style={[
              styles.tabBtn,
              activeTab === i && { borderBottomWidth: 2, borderBottomColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === i ? colors.primary : colors.mutedForeground },
              ]}
            >
              {s.title}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.textCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.bodyText, { color: colors.foreground }]}>
            {SECTIONS[activeTab]!.content}
          </Text>
        </View>

        <Text style={[styles.contactNote, { color: colors.mutedForeground }]}>
          Questions? Email us at{" "}
          <Text style={{ color: colors.primary }}>legal@ultrofix.com</Text>
        </Text>
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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 20, gap: 16 },
  textCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 24 },
  contactNote: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
