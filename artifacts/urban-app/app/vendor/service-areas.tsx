import { Icon as Feather } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const PRESET_AREAS = [
  "Koramangala", "HSR Layout", "Indiranagar", "Whitefield", "Marathahalli",
  "Jayanagar", "BTM Layout", "Electronic City", "Bellandur", "Sarjapur Road",
];

export default function ServiceAreasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedAreas, setSelectedAreas] = useState<string[]>(["Koramangala", "HSR Layout"]);
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);

  const filteredPresets = PRESET_AREAS.filter((a) =>
    a.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleArea = (area: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };

  const handleSave = () => {
    if (selectedAreas.length === 0) {
      Alert.alert("No areas selected", "Please select at least one service area.");
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Service Areas</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Select areas where you can provide services. Customers in these zones will be matched with you.
        </Text>

        {selectedAreas.length > 0 && (
          <View style={styles.selectedWrap}>
            {selectedAreas.map((area) => (
              <Pressable
                key={area}
                onPress={() => toggleArea(area)}
                style={[styles.selectedChip, { backgroundColor: colors.primary + "18", borderColor: colors.primary }]}
              >
                <Text style={[styles.selectedChipText, { color: colors.primary }]}>{area}</Text>
                <Feather name="x" size={13} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search areas…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {filteredPresets.map((area, i) => {
            const isSelected = selectedAreas.includes(area);
            return (
              <View key={area}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <Pressable
                  onPress={() => toggleArea(area)}
                  style={({ pressed }) => [styles.areaRow, pressed && { opacity: 0.65 }]}
                >
                  <Feather name="map-pin" size={16} color={isSelected ? colors.primary : colors.mutedForeground} />
                  <Text
                    style={[
                      styles.areaLabel,
                      { color: isSelected ? colors.primary : colors.foreground, flex: 1 },
                    ]}
                  >
                    {area}
                  </Text>
                  {isSelected && <Feather name="check-circle" size={18} color={colors.primary} />}
                </Pressable>
              </View>
            );
          })}
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
          <Text style={styles.saveBtnText}>{saved ? "Saved!" : `Save ${selectedAreas.length} Area${selectedAreas.length !== 1 ? "s" : ""}`}</Text>
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
  content: { padding: 20, gap: 14 },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  selectedWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  areaLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
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
