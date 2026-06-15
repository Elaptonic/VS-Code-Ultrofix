import { Icon as Feather } from "@/components/Icon";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListServices } from "@workspace/api-client-react";

import { ServiceCard } from "@/components/ServiceCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { savedServices } = useApp();
  const { data: services, isLoading } = useListServices();

  const saved = (services ?? []).filter((s) => savedServices.includes(String(s.id)));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Saved</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {saved.length} service{saved.length !== 1 ? "s" : ""} saved
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : saved.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="heart" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No saved services
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Tap the heart on any service to save it for later
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {saved.map((service) => (
              <ServiceCard
                key={service.id}
                {...service}
                image={service.imageKey}
                compact
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 2 },
  subtitle: { fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  list: { gap: 12 },
  center: { alignItems: "center", paddingTop: 80 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
});
