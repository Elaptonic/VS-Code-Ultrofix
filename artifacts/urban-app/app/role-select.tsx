import { Icon as Feather } from "@/components/Icon";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/auth";

type Role = "consumer" | "provider";

export default function RoleSelectScreen() {
  const { user, setRole, logout } = useAuth();
  const [selected, setSelected] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const name = user?.firstName ? `, ${user.firstName}` : "";

  const handleContinue = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    await setRole(selected);
    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome{name}!</Text>
          <Text style={styles.subtitle}>How will you use Ultrofix?</Text>
          <Text style={styles.hint}>You can switch roles later from your profile</Text>
        </View>

        <View style={styles.cards}>
          <Pressable
            style={[styles.card, selected === "consumer" && styles.cardSelected]}
            onPress={() => setSelected("consumer")}
          >
            <View style={[styles.cardIcon, selected === "consumer" && styles.cardIconSelected]}>
              <Feather
                name="search"
                size={28}
                color={selected === "consumer" ? "#fff" : "#38BDF8"}
              />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, selected === "consumer" && styles.cardTitleSelected]}>
                I need services
              </Text>
              <Text style={styles.cardDescription}>
                Book professionals for cleaning, plumbing, electrical work, and more
              </Text>
            </View>
            <View style={styles.radioOuter}>
              {selected === "consumer" && <View style={styles.radioInner} />}
            </View>
          </Pressable>

          <Pressable
            style={[styles.card, selected === "provider" && styles.cardSelected]}
            onPress={() => setSelected("provider")}
          >
            <View style={[styles.cardIcon, selected === "provider" && styles.cardIconSelected]}>
              <Feather
                name="briefcase"
                size={28}
                color={selected === "provider" ? "#fff" : "#38BDF8"}
              />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, selected === "provider" && styles.cardTitleSelected]}>
                I provide services
              </Text>
              <Text style={styles.cardDescription}>
                Accept job requests, manage your schedule, and grow your business
              </Text>
            </View>
            <View style={styles.radioOuter}>
              {selected === "provider" && <View style={styles.radioInner} />}
            </View>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.continueButton,
              !selected && styles.continueButtonDisabled,
              pressed && selected && styles.continueButtonPressed,
            ]}
            onPress={handleContinue}
            disabled={!selected || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </Pressable>

          <Pressable onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  header: {
    paddingTop: 48,
    gap: 8,
  },
  greeting: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    color: "#374151",
  },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#9ca3af",
    marginTop: 4,
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    borderColor: "#38BDF8",
    backgroundColor: "#E0F2FE",
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconSelected: {
    backgroundColor: "#38BDF8",
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
  },
  cardTitleSelected: {
    color: "#38BDF8",
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6b7280",
    lineHeight: 18,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#38BDF8",
  },
  footer: {
    gap: 12,
  },
  continueButton: {
    backgroundColor: "#38BDF8",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: "#d1d5db",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonPressed: {
    opacity: 0.85,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  logoutButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#9ca3af",
  },
});
