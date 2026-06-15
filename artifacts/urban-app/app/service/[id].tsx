import { Icon as Feather } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetService, useListProviders } from "@workspace/api-client-react";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const IMAGE_MAP: Record<string, any> = {
  cleaning: require("@/assets/images/cleaning.png"),
  plumbing: require("@/assets/images/plumbing.png"),
  salon: require("@/assets/images/salon.png"),
};

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { savedServices, toggleSavedService } = useApp();

  const serviceId = parseInt(id ?? "0", 10);
  const { data: service, isLoading } = useGetService(serviceId, {
    query: { enabled: !!serviceId },
  });
  const { data: providers } = useListProviders(
    { category: service?.category },
    { query: { enabled: !!service } }
  );

  const isSaved = savedServices.includes(id ?? "");
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);

  const displayProviders = providers?.slice(0, 3) ?? [];
  const effectiveProviderId =
    selectedProviderId ?? displayProviders[0]?.id ?? null;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Service not found</Text>
      </View>
    );
  }

  const imgSource = IMAGE_MAP[service.imageKey] ?? IMAGE_MAP["cleaning"];

  const handleBook = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!effectiveProviderId) return;
    router.push(`/booking/${service.id}?providerId=${effectiveProviderId}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.backBtn,
          { top: insets.top + (Platform.OS === "web" ? 67 : 0) + 8 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: "rgba(255,255,255,0.9)" }]}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Pressable
          onPress={() => toggleSavedService(String(service.id))}
          style={[styles.iconBtn, { backgroundColor: "rgba(255,255,255,0.9)" }]}
        >
          <Feather
            name="heart"
            size={22}
            color={isSaved ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Image source={imgSource} style={styles.heroImage} contentFit="cover" />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {service.name}
              </Text>
              <View style={styles.ratingRow}>
                <Feather name="star" size={14} color="#f59e0b" />
                <Text style={[styles.rating, { color: colors.foreground }]}>
                  {service.rating}
                </Text>
                <Text style={[styles.reviews, { color: colors.mutedForeground }]}>
                  ({service.reviewCount.toLocaleString()} reviews)
                </Text>
              </View>
            </View>
            <View>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>
                Starting at
              </Text>
              <Text style={[styles.price, { color: colors.primary }]}>
                ₹{service.startingPrice}
              </Text>
            </View>
          </View>

          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: colors.accent }]}>
              <Feather name="clock" size={12} color={colors.primary} />
              <Text style={[styles.tagText, { color: colors.primary }]}>{service.duration}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: "#E0F2FE" }]}>
              <Feather name="check-circle" size={12} color="#10b981" />
              <Text style={[styles.tagText, { color: "#10b981" }]}>Verified Pros</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: "#dbeafe" }]}>
              <Feather name="shield" size={12} color="#3b82f6" />
              <Text style={[styles.tagText, { color: "#3b82f6" }]}>Insured</Text>
            </View>
          </View>

          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              About this service
            </Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {service.description}
            </Text>
          </View>

          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              What's included
            </Text>
            {[
              "All materials provided",
              "Trained & background-verified professionals",
              "On-time guarantee",
              "Post-service quality check",
            ].map((item) => (
              <View key={item} style={styles.includeItem}>
                <Feather name="check-circle" size={16} color="#22c55e" />
                <Text style={[styles.includeText, { color: colors.foreground }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          {displayProviders.length > 0 && (
            <View style={[styles.section, { borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Choose a Professional
              </Text>
              <View style={styles.providerList}>
                {displayProviders.map((provider) => {
                  const isSelected = effectiveProviderId === provider.id;
                  const avatarColors = [
                    "#38BDF8", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899",
                  ];
                  const avatarColor = avatarColors[provider.id % avatarColors.length];
                  return (
                    <Pressable
                      key={provider.id}
                      onPress={() => {
                        setSelectedProviderId(provider.id);
                        if (Platform.OS !== "web") Haptics.selectionAsync();
                      }}
                      style={[
                        styles.providerOption,
                        {
                          backgroundColor: isSelected ? colors.accent : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.providerAvatar,
                          { backgroundColor: avatarColor + "22" },
                        ]}
                      >
                        <Text style={[styles.providerAvatarText, { color: avatarColor }]}>
                          {provider.initials}
                        </Text>
                      </View>
                      <View style={styles.providerInfo}>
                        <Text style={[styles.providerName, { color: colors.foreground }]}>
                          {provider.name}
                        </Text>
                        <View style={styles.providerMeta}>
                          <Feather name="star" size={11} color="#f59e0b" />
                          <Text style={[styles.providerRating, { color: colors.foreground }]}>
                            {provider.rating}
                          </Text>
                          <Text style={[styles.providerExp, { color: colors.mutedForeground }]}>
                            · {provider.experience} exp
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Feather name="check-circle" size={20} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 12,
          },
        ]}
      >
        <View>
          <Text style={[styles.footerPriceLabel, { color: colors.mutedForeground }]}>
            Total
          </Text>
          <Text style={[styles.footerPrice, { color: colors.foreground }]}>
            ₹{service.startingPrice}
          </Text>
        </View>
        <Pressable
          onPress={handleBook}
          style={({ pressed }) => [
            styles.bookBtn,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.bookBtnText}>Book Now</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  heroImage: { width: "100%", height: 260 },
  backBtn: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 100,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  content: { padding: 20, gap: 20 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleLeft: { flex: 1, marginRight: 12 },
  name: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 6 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rating: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reviews: { fontSize: 13 },
  priceLabel: { fontSize: 11, textAlign: "right" },
  price: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "right" },
  tags: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  section: { paddingTop: 20, borderTopWidth: 1, gap: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  description: { fontSize: 14, lineHeight: 22 },
  includeItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  includeText: { fontSize: 14 },
  providerList: { gap: 10 },
  providerOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  providerAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  providerMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  providerRating: { fontSize: 12, fontFamily: "Inter_500Medium" },
  providerExp: { fontSize: 12 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  footerPriceLabel: { fontSize: 12 },
  footerPrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  bookBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
