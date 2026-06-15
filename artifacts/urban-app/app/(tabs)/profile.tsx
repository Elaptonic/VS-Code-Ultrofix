import { Icon as Feather } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetProfile, useUpsertProfile, useListBookings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { LocationTracker } from "@/components/LocationTracker";
import { useColors } from "@/hooks/useColors";
import { useUserId } from "@/constants/user";
import { useAuth } from "@/context/auth";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type PlaceResult = {
  place_id: string;
  description: string;
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useUserId();
  const { logout, user, setRole, refreshUser } = useAuth();

  const { data: profile, isLoading: profileLoading } = useGetProfile(userId);
  const { data: bookings } = useListBookings({ userId });
  const upsertProfile = useUpsertProfile();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
      setPhone(profile.phone);
      setAddress(profile.address ?? "");
      setSelectedPlace(profile.address ?? null);
    }
  }, [profile]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const query = address.trim();
      if (query.length < 2) {
        setPlaceResults([]);
        return;
      }
      setSearchingPlaces(true);
      try {
        const res = await fetch(`${API_BASE}/api/places/autocomplete?input=${encodeURIComponent(query)}`, { credentials: "include" });
        const data = await res.json();
        setPlaceResults((data.predictions ?? []).map((item: any) => ({ place_id: item.place_id, description: item.description })));
      } catch {
        setPlaceResults([]);
      } finally {
        setSearchingPlaces(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [address]);

  const completedBookings = (bookings ?? []).filter((b) => b.status === "completed").length;
  const displayName = profile?.name ?? "Arjun Mehta";
  const displayEmail = profile?.email ?? "arjun.mehta@gmail.com";
  const displayPhone = profile?.phone ?? "+91 98765 43210";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const switchToProvider = async () => {
    await setRole("provider");
    await refreshUser();
    router.replace("/vendor/radar");
  };

  const switchToConsumer = async () => {
    await setRole("consumer");
    await refreshUser();
    router.replace("/");
  };

  const handleSave = () => {
    upsertProfile.mutate(
      { userId, data: { name, email, phone, address } },
      {
        onSuccess: () => {
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setEditing(false);
        },
      },
    );
  };

  const selectPlace = async (place: PlaceResult) => {
    setAddress(place.description);
    setSelectedPlace(place.description);
    setPlaceResults([]);
    if (Platform.OS !== "web") Haptics.selectionAsync();
    await upsertProfile.mutateAsync({ userId, data: { name, email, phone, address: place.description } });
    await queryClient.invalidateQueries({ queryKey: ["profile", userId] as any });
  };

  const addressPreview = useMemo(() => selectedPlace || address || profile?.address || "Add your address", [selectedPlace, address, profile?.address]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 }]} showsVerticalScrollIndicator={false}>
        {profileLoading ? <ActivityIndicator color={colors.primary} style={{ paddingTop: 40 }} /> : <><View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text></View><View style={styles.profileInfo}><Text style={[styles.profileName, { color: colors.foreground }]}>{displayName}</Text><Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{displayEmail}</Text><Text style={[styles.profilePhone, { color: colors.mutedForeground }]}>{displayPhone}</Text></View><Pressable onPress={() => setEditing(true)} style={[styles.editBtn, { backgroundColor: colors.muted }]}><Feather name="edit-2" size={16} color={colors.primary} /></Pressable></View><LocationTracker compact /><View style={styles.statsRow}>{[{ label: "Bookings", value: (bookings ?? []).length }, { label: "Completed", value: completedBookings }, { label: "Saved", value: 0 }].map(({ label, value }) => <View key={label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.statValue, { color: colors.primary }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text></View>)}</View></>}

        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{[{ icon: "map-pin", label: "Saved Addresses", route: "/address" }, { icon: "credit-card", label: "Payment Methods", route: "/payment-methods" }, { icon: "gift", label: "Offers & Coupons", route: "/offers" }, { icon: "help-circle", label: "Help & Support", route: "/help" }, { icon: "file-text", label: "Terms & Privacy", route: "/terms" }].map((item, idx) => <Pressable key={item.label} style={({ pressed }) => [styles.menuItem, idx < 4 && { borderBottomWidth: 1, borderBottomColor: colors.border }, pressed && { backgroundColor: colors.muted }]} onPress={() => { if (item.route) router.push(item.route as any); }}><View style={[styles.menuIcon, { backgroundColor: colors.primary + "15" }]}><Feather name={item.icon as any} size={18} color={colors.primary} /></View><Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text><Feather name="chevron-right" size={18} color={colors.mutedForeground} /></Pressable>)}</View>

        {user?.role === "consumer" ? <Pressable onPress={switchToProvider} style={({ pressed }) => [styles.providerBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary }, pressed && { opacity: 0.75 }]}><Feather name="briefcase" size={18} color={colors.primary} /><Text style={[styles.providerBtnText, { color: colors.primary }]}>Switch to Provider Mode</Text><Feather name="chevron-right" size={16} color={colors.primary} /></Pressable> : <Pressable onPress={switchToConsumer} style={({ pressed }) => [styles.providerBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary }, pressed && { opacity: 0.75 }]}><Feather name="search" size={18} color={colors.primary} /><Text style={[styles.providerBtnText, { color: colors.primary }]}>Switch to Consumer Mode</Text><Feather name="chevron-right" size={16} color={colors.primary} /></Pressable>}

        <Pressable onPress={logout} style={({ pressed }) => [styles.logoutBtn, { borderColor: colors.destructive }, pressed && { opacity: 0.7 }]}><Feather name="log-out" size={18} color={colors.destructive} /><Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text></Pressable>
      </ScrollView>

      {editing && <View style={[styles.editSheet, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 20 }]}><View style={styles.editHeader}><Text style={[styles.editTitle, { color: colors.foreground }]}>Edit Profile</Text><Pressable onPress={() => setEditing(false)}><Feather name="x" size={22} color={colors.mutedForeground} /></Pressable></View><View style={styles.inputGroup}><Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Name</Text><TextInput value={name} onChangeText={setName} style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]} placeholderTextColor={colors.mutedForeground} /></View><View style={styles.inputGroup}><Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Email</Text><TextInput value={email} onChangeText={setEmail} style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]} placeholderTextColor={colors.mutedForeground} /></View><View style={styles.inputGroup}><Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Phone</Text><TextInput value={phone} onChangeText={setPhone} style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]} placeholderTextColor={colors.mutedForeground} /></View><View style={styles.inputGroup}><Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Address</Text><View style={[styles.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}><Feather name="search" size={16} color={colors.mutedForeground} /><TextInput value={address} onChangeText={setAddress} placeholder="Search shop, building, society, or area..." placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} /></View></View>{searchingPlaces && <Text style={[styles.searchHint, { color: colors.mutedForeground }]}>Searching locations…</Text>}{placeResults.length > 0 && <View style={[styles.resultsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{placeResults.map((place) => <Pressable key={place.place_id} onPress={() => selectPlace(place)} style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.75 }]}><Feather name="map-pin" size={16} color={colors.primary} /><Text style={[styles.resultText, { color: colors.foreground }]} numberOfLines={2}>{place.description}</Text></Pressable>)}</View>}<View style={[styles.previewCard, { backgroundColor: colors.accent, borderColor: colors.border }]}><Feather name="map-pin" size={16} color={colors.primary} /><Text style={[styles.previewText, { color: colors.foreground }]} numberOfLines={2}>{addressPreview}</Text></View><Pressable onPress={handleSave} disabled={upsertProfile.isPending} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary }, (pressed || upsertProfile.isPending) && { opacity: 0.75 }]}>{upsertProfile.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}</Pressable></View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  profileInfo: { flex: 1, gap: 2 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileEmail: { fontSize: 13 },
  profilePhone: { fontSize: 13 },
  editBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 16, borderRadius: 14, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12 },
  menuCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  menuIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  logoutText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  providerBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  providerBtnText: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  editSheet: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10 },
  editHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Inter_400Regular" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  searchHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  resultsCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#00000012" },
  resultText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  previewCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  previewText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
