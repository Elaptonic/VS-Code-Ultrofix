import { Icon as Feather } from "@/components/Icon";
import React from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { LocationTracker } from "@/components/LocationTracker";
import { useAuth } from "@/context/auth";
import { useColors } from "@/hooks/useColors";
import { useProviderProfile } from "@/hooks/useProviderProfile";
import { useProviderStats } from "@/hooks/useProviderStats";

interface MenuRow {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sub?: string;
  color?: string;
  onPress?: () => void;
}

export default function VendorProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, setRole, refreshUser } = useAuth();

  const { data: profile } = useProviderProfile();
  const { data: stats } = useProviderStats(profile?.id);

  const displayName = user?.firstName ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}` : "Service Provider";

  const switchToConsumer = async () => {
    await setRole("consumer");
    await refreshUser();
    router.replace("/");
  };

  const menuSections: MenuRow[][] = [
    [
      { icon: "user", label: "Personal Info", sub: "Name, phone, email", onPress: () => router.push("/vendor/personal-info") },
      { icon: "map-pin", label: "Service Areas", sub: "Manage your service zones", onPress: () => router.push("/vendor/service-areas") },
      { icon: "tool", label: "Skills & Services", sub: "Cleaning, plumbing, electrical…", onPress: () => router.push("/vendor/skills") },
    ],
    [
      { icon: "star", label: "Reviews & Ratings", sub: stats?.reviewCount ? `${stats.avgRating} · ${stats.reviewCount} reviews` : "No reviews yet", onPress: () => router.push("/vendor/vendor-reviews") },
      { icon: "file-text", label: "Documents", sub: "ID, certificates, background check", onPress: () => router.push("/vendor/documents") },
      { icon: "bell", label: "Notifications", sub: "Job alerts, payment updates", onPress: () => router.push("/vendor/notifications-settings") },
    ],
    [
      { icon: "zap", label: "Pro Subscription", sub: "₹999/month · Priority leads", color: "#f97316", onPress: () => router.push("/vendor/subscribe") },
      { icon: "help-circle", label: "Help & Support", onPress: () => router.push("/help") },
      { icon: "refresh-cw", label: "Switch to Consumer", sub: "Book services instead", color: colors.primary, onPress: switchToConsumer },
    ],
    [
      { icon: "log-out", label: "Sign Out", color: "#ef4444", onPress: logout },
    ],
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + (Platform.OS === "web" ? 20 : 8), paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profile</Text>
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        {user?.profileImageUrl ? <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} /> : <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}><Text style={styles.avatarInitial}>{(user?.firstName?.[0] ?? "P").toUpperCase()}</Text></View>}
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{displayName}</Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{user?.email ?? "provider@ultrofix.com"}</Text>
          <View style={styles.badgeRow}><View style={[styles.roleBadge, { backgroundColor: colors.primary + "18" }]}><Feather name="tool" size={11} color={colors.primary} /><Text style={[styles.roleText, { color: colors.primary }]}>Service Provider</Text></View><View style={[styles.verifiedBadge, { backgroundColor: "#dcfce7" }]}><Feather name="check-circle" size={11} color="#16a34a" /><Text style={[styles.verifiedText, { color: "#16a34a" }]}>Verified</Text></View></View>
        </View>
      </View>

      <LocationTracker compact />

      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        {[
          { label: "Jobs Done", value: stats ? String(stats.totalJobs) : "—" },
          { label: "Rating", value: stats?.reviewCount ? `${stats.avgRating} ★` : "New" },
          { label: "Since", value: stats?.memberSince ? String(stats.memberSince) : "—" },
        ].map((s, i) => (
          <View key={i} style={[styles.statItem, i < 2 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {menuSections.map((section, si) => (
        <View key={si} style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {section.map((row, ri) => (
            <View key={ri}>
              {ri > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <Pressable onPress={row.onPress} style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.65 }]}>
                <View style={[styles.menuIcon, { backgroundColor: row.color ? row.color + "15" : colors.muted }]}>
                  <Feather name={row.icon} size={16} color={row.color ?? colors.foreground} />
                </View>
                <View style={styles.menuText}>
                  <Text style={[styles.menuLabel, { color: row.color ?? colors.foreground }]}>{row.label}</Text>
                  {row.sub && <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{row.sub}</Text>}
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginBottom: 16 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarFallback: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontSize: 26, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular" },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", marginHorizontal: 20, borderRadius: 16, borderWidth: 1, marginBottom: 20, overflow: "hidden" },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 2 },
  statValue: { fontSize: 17, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  menuCard: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  menuRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  menuSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
});