import { Icon as Feather } from "@/components/Icon";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const FAQS = [
  {
    q: "How do I book a service?",
    a: "Go to the Home tab, choose a category, select a service, pick your date and time, then confirm your booking. We'll find the best available professional for you.",
  },
  {
    q: "Can I reschedule or cancel a booking?",
    a: "You can cancel a pending booking from the Bookings tab. Rescheduling is available up to 2 hours before the scheduled time.",
  },
  {
    q: "How are payments handled?",
    a: "Payments are processed securely through Razorpay. You can pay by UPI, card, or net banking. Your payment details are never stored on our servers.",
  },
  {
    q: "What if the professional doesn't show up?",
    a: "Please contact our support team immediately. We'll rebook you with another professional or issue a full refund within 24 hours.",
  },
  {
    q: "How do I become a service provider?",
    a: "Tap your profile, then 'Switch to Provider Mode'. Complete the onboarding form with your skills and service area. Our team will verify your profile within 48 hours.",
  },
  {
    q: "Is my personal information safe?",
    a: "Yes. We use industry-standard encryption and never share your personal data with third parties without your consent. See our Privacy Policy for details.",
  },
];

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Help & Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contactCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <View style={[styles.contactIcon, { backgroundColor: colors.primary }]}>
            <Feather name="headphones" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactTitle, { color: colors.foreground }]}>Talk to us</Text>
            <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>
              Available Mon–Sat, 9 AM – 7 PM
            </Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL("tel:+918008001234")}
            style={[styles.callBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.callBtnText}>Call</Text>
          </Pressable>
        </View>

        <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.contactIcon, { backgroundColor: "#6366f1" }]}>
            <Feather name="mail" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactTitle, { color: colors.foreground }]}>Email support</Text>
            <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>
              Response within 24 hours
            </Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL("mailto:support@ultrofix.com")}
            style={[styles.callBtn, { backgroundColor: "#6366f1" }]}
          >
            <Text style={styles.callBtnText}>Email</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Frequently Asked Questions
        </Text>

        <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {FAQS.map((faq, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <Pressable
                onPress={() => setExpanded(expanded === i ? null : i)}
                style={styles.faqRow}
              >
                <Text style={[styles.faqQ, { color: colors.foreground, flex: 1 }]}>{faq.q}</Text>
                <Feather
                  name={expanded === i ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
              {expanded === i && (
                <Text style={[styles.faqA, { color: colors.mutedForeground }]}>{faq.a}</Text>
              )}
            </View>
          ))}
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
  content: { padding: 20, gap: 16 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  contactTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  contactSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  callBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  callBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 4 },
  faqCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  faqQ: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  faqA: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});
