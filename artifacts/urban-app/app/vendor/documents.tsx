import { Icon as Feather } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type DocStatus = "verified" | "pending" | "missing";

interface Doc {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  status: DocStatus;
}

const DOCS: Doc[] = [
  { id: "aadhar", title: "Aadhaar Card", desc: "Government issued photo ID", icon: "user", status: "verified" },
  { id: "pan", title: "PAN Card", desc: "Permanent Account Number", icon: "credit-card", status: "pending" },
  { id: "cert", title: "Skill Certificate", desc: "Proof of professional training", icon: "award", status: "missing" },
  { id: "bg", title: "Background Check", desc: "Police verification document", icon: "shield", status: "missing" },
  { id: "bank", title: "Bank Passbook", desc: "Account details for payments", icon: "dollar-sign", status: "verified" },
];

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; bg: string }> = {
  verified: { label: "Verified", color: "#16a34a", bg: "#dcfce7" },
  pending: { label: "Under Review", color: "#d97706", bg: "#fef3c7" },
  missing: { label: "Required", color: "#dc2626", bg: "#fee2e2" },
};

export default function DocumentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [docs, setDocs] = useState(DOCS);

  const handleUpload = (doc: Doc) => {
    if (doc.status === "verified") return;
    if (Platform.OS !== "web") Haptics.selectionAsync();
    Alert.alert(
      `Upload ${doc.title}`,
      "In the full version, this will open your camera or file picker to upload the document.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Simulate Upload",
          onPress: () => {
            setDocs((prev) =>
              prev.map((d) => (d.id === doc.id ? { ...d, status: "pending" } : d)),
            );
          },
        },
      ],
    );
  };

  const verifiedCount = docs.filter((d) => d.status === "verified").length;

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Documents</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.progressCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <View style={styles.progressTop}>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>
              {verifiedCount}/{docs.length} Documents Verified
            </Text>
            <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
              Complete all to get verified badge
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${(verifiedCount / docs.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {docs.map((doc, i) => {
            const cfg = STATUS_CONFIG[doc.status];
            return (
              <View key={doc.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <Pressable
                  onPress={() => handleUpload(doc)}
                  style={({ pressed }) => [
                    styles.docRow,
                    pressed && doc.status !== "verified" && { opacity: 0.7 },
                  ]}
                >
                  <View style={[styles.docIcon, { backgroundColor: cfg.bg }]}>
                    <Feather name={doc.icon} size={18} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.docTitle, { color: colors.foreground }]}>{doc.title}</Text>
                    <Text style={[styles.docDesc, { color: colors.mutedForeground }]}>{doc.desc}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {doc.status !== "verified" && (
                    <Feather name="upload" size={16} color={colors.primary} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={[styles.note, { backgroundColor: colors.muted, borderRadius: 12 }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Documents are reviewed by our team within 48 hours. All uploaded files are encrypted and stored securely.
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
  content: { padding: 20, gap: 16 },
  progressCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  progressTop: { gap: 2 },
  progressTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  progressSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressBar: { height: 6, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  docIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  docTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  docDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
  },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
