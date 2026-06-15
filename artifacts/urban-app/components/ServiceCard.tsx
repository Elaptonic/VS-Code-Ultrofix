import { Icon as Feather } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const IMAGE_MAP: Record<string, ImageSourcePropType> = {
  cleaning: require("@/assets/images/cleaning.png"),
  plumbing: require("@/assets/images/plumbing.png"),
  salon: require("@/assets/images/salon.png"),
};

interface ServiceCardProps {
  id: number | string;
  name: string;
  category: string;
  startingPrice: number;
  rating: number;
  reviewCount: number;
  duration: string;
  image: string;
  popular?: boolean;
  compact?: boolean;
}

export function ServiceCard({
  id,
  name,
  category,
  startingPrice,
  rating,
  reviewCount,
  duration,
  image,
  popular,
  compact,
}: ServiceCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { savedServices, toggleSavedService } = useApp();
  const sid = String(id);
  const isSaved = savedServices.includes(sid);

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push(`/service/${sid}`);
  };

  const handleSave = (e: any) => {
    e.stopPropagation?.();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleSavedService(sid);
  };

  const imgSource = IMAGE_MAP[image] || IMAGE_MAP["cleaning"];

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        compact && styles.cardCompact,
        pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={imgSource}
          style={[styles.image, compact && styles.imageCompact]}
          resizeMode="cover"
        />
        {popular && (
          <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.popularText}>Popular</Text>
          </View>
        )}
        <Pressable
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: colors.card }]}
          hitSlop={8}
        >
          <Feather
            name={isSaved ? "heart" : "heart"}
            size={16}
            color={isSaved ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.row}>
          <Feather name="star" size={12} color="#f59e0b" />
          <Text style={[styles.rating, { color: colors.foreground }]}>
            {rating}
          </Text>
          <Text style={[styles.reviews, { color: colors.mutedForeground }]}>
            ({reviewCount.toLocaleString()})
          </Text>
          <Text style={[styles.dot, { color: colors.mutedForeground }]}>·</Text>
          <Feather name="clock" size={12} color={colors.mutedForeground} />
          <Text style={[styles.duration, { color: colors.mutedForeground }]}>
            {duration}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={[styles.from, { color: colors.mutedForeground }]}>
            Starting at
          </Text>
          <Text style={[styles.price, { color: colors.primary }]}>
            ₹{startingPrice}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: Platform.OS === "android" ? 0 : 2,
  },
  cardCompact: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 140,
  },
  imageCompact: {
    width: 90,
    height: 90,
    borderRadius: 12,
    margin: 10,
  },
  popularBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  popularText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  saveBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: Platform.OS === "android" ? 0 : 2,
  },
  info: {
    padding: 12,
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 8,
  },
  rating: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  reviews: {
    fontSize: 12,
  },
  dot: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  duration: {
    fontSize: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  from: {
    fontSize: 11,
  },
  price: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
