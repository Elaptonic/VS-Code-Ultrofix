import { Icon as Feather } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useProviderProfile } from "@/hooks/useProviderProfile";

const SKILL_GROUPS = [
  {
    group: "Cleaning",
    icon: "wind" as const,
    color: "#0ea5e9",
    skills: ["Home Deep Clean", "Bathroom Sanitization", "Kitchen Cleaning", "Sofa Cleaning", "Carpet Cleaning"],
  },
  {
    group: "Plumbing",
    icon: "tool" as const,
    color: "#f97316",
    skills: ["Pipe Fitting", "Drain Unclogging", "Water Heater", "Tap Repair", "Toilet Repair"],
  },
  {
    group: "Electrical",
    icon: "zap" as const,
    color: "#eab308",
    skills: ["Wiring & Rewiring", "Switchboard Repair", "Fan Installation", "AC Servicing", "Inverter Setup"],
  },
  {
    group: "Carpentry",
    icon: "scissors" as const,
    color: "#a16207",
    skills: ["Furniture Assembly", "Door Repair", "Cupboard Fixing", "Shelf Installation", "Wood Polishing"],
  },
  {
    group: "Painting",
    icon: "edit-3" as const,
    color: "#8b5cf6",
    skills: ["Wall Painting", "Texture Finish", "Waterproofing", "Interior Painting", "Exterior Painting"],
  },
];

export default function SkillsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useProviderProfile();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.category) {
      const group = SKILL_GROUPS.find((g) => g.group.toLowerCase() === profile.category.toLowerCase());
      if (group) setSelectedSkills([group.skills[0]!]);
    }
  }, [profile]);

  const toggleSkill = (skill: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleSave = () => {
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Skills & Services</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Select the specific services you offer. This helps customers find the right professional.
        </Text>

        {SKILL_GROUPS.map((group) => (
          <View key={group.group}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupIcon, { backgroundColor: group.color + "20" }]}>
                <Feather name={group.icon} size={15} color={group.color} />
              </View>
              <Text style={[styles.groupTitle, { color: colors.foreground }]}>{group.group}</Text>
            </View>
            <View style={styles.chipsWrap}>
              {group.skills.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <Pressable
                    key={skill}
                    onPress={() => toggleSkill(skill)}
                    style={[
                      styles.chip,
                      isSelected
                        ? { backgroundColor: group.color + "20", borderColor: group.color }
                        : { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? group.color : colors.foreground },
                      ]}
                    >
                      {skill}
                    </Text>
                    {isSelected && <Feather name="check" size={12} color={group.color} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: saved ? "#10b981" : colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name={saved ? "check" : "save"} size={18} color="#fff" />
          <Text style={styles.saveBtnText}>
            {saved ? "Saved!" : `Save ${selectedSkills.length} Skill${selectedSkills.length !== 1 ? "s" : ""}`}
          </Text>
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
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  groupIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  groupTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
