import { Icon as Feather } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface CategoryCardProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  serviceCount: number;
}

export function CategoryCard({
  id,
  name,
  icon,
  color,
  bgColor,
  serviceCount,
}: CategoryCardProps) {
  const colors = useColors();
  const router = useRouter();

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/category/${id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.82, transform: [{ scale: 0.95 }] },
      ]}
    >
      <View style={[styles.iconBg, { backgroundColor: bgColor }]}>
        <Feather name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.count, { color: colors.mutedForeground }]}>
        {serviceCount} services
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 90,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    minHeight: 110,
    shadowColor: "#6080c0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: Platform.OS === "android" ? 0 : 2,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    marginBottom: 2,
  },
  count: {
    fontSize: 10,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
});
