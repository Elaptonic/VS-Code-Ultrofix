import { Icon as Feather } from "@/components/Icon";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { type NewLead, useVendorSocket } from "@/hooks/useSocket";

const PROVIDER_ID = 1;

const STATUS_LABEL: Record<string, string> = {
  connecting: "Connecting…",
  connected: "Online — Waiting for jobs",
  disconnected: "Offline",
  error: "Connection error",
};

const STATUS_COLOR: Record<string, string> = {
  connecting: "#f59e0b",
  connected: "#22c55e",
  disconnected: "#8896aa",
  error: "#ef4444",
};

export default function RadarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [currentLead, setCurrentLead] = useState<NewLead | null>(null);

  const handleNewLead = useCallback((lead: NewLead) => {
    setCurrentLead(lead);
  }, []);

  const { status, acceptLead, denyLead } = useVendorSocket(PROVIDER_ID, handleNewLead);

  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status !== "connected") {
      pulse1.setValue(0);
      pulse2.setValue(0);
      pulse3.setValue(0);
      return;
    }

    const makePulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = makePulse(pulse1, 0);
    const a2 = makePulse(pulse2, 600);
    const a3 = makePulse(pulse3, 1200);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [status]);

  const makePulseStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.35, 0] }),
  });

  const dotColor = STATUS_COLOR[status] ?? "#8896aa";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === "web" ? 20 : 0),
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/vendor/(tabs)/dashboard")} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Provider Radar</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.radarWrap}>
        <Animated.View style={[styles.ring, { borderColor: dotColor }, makePulseStyle(pulse1)]} />
        <Animated.View style={[styles.ring, { borderColor: dotColor }, makePulseStyle(pulse2)]} />
        <Animated.View style={[styles.ring, { borderColor: dotColor }, makePulseStyle(pulse3)]} />

        <View style={[styles.centerDot, { backgroundColor: dotColor }]}>
          <Feather
            name={status === "connected" ? "radio" : "wifi-off"}
            size={28}
            color="#fff"
          />
        </View>
      </View>

      <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
        <Text style={[styles.statusText, { color: colors.foreground }]}> {STATUS_LABEL[status]} </Text>
      </View>

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>You will receive job requests here when consumers book your service.</Text>

      <Modal visible={currentLead !== null} transparent animationType="slide" onRequestClose={() => setCurrentLead(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}> 
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.leadBadge, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="zap" size={16} color={colors.primary} />
              <Text style={[styles.leadBadgeText, { color: colors.primary }]}>New Job Request</Text>
            </View>
            <Text style={[styles.leadService, { color: colors.foreground }]}>{currentLead?.serviceName}</Text>
            <View style={styles.leadRows}>
              <View style={styles.leadRow}>
                <Feather name="calendar" size={14} color={colors.mutedForeground} />
                <Text style={[styles.leadRowText, { color: colors.mutedForeground }]}>{currentLead?.date} · {currentLead?.time}</Text>
              </View>
              <View style={styles.leadRow}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.leadRowText, { color: colors.mutedForeground }]} numberOfLines={2}>{currentLead?.address}</Text>
              </View>
              <View style={styles.leadRow}>
                <Feather name="credit-card" size={14} color={colors.mutedForeground} />
                <Text style={[styles.leadRowText, { color: colors.foreground }]}>₹{currentLead?.price}</Text>
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => {
                if (currentLead) denyLead(currentLead);
                setCurrentLead(null);
              }} style={({ pressed }) => [styles.denyBtn, { borderColor: colors.border, backgroundColor: colors.muted }, pressed && { opacity: 0.7 }] }>
                <Feather name="x" size={18} color={colors.mutedForeground} />
                <Text style={[styles.denyBtnText, { color: colors.mutedForeground }]}>Deny</Text>
              </Pressable>
              <Pressable onPress={() => {
                if (currentLead) acceptLead(currentLead);
                setCurrentLead(null);
              }} style={({ pressed }) => [styles.acceptBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }] }>
                <Feather name="check" size={18} color="#fff" />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  radarWrap: { alignItems: "center", justifyContent: "center", marginTop: 48, marginBottom: 48, height: 260 },
  ring: { position: "absolute", width: 120, height: 120, borderRadius: 60, borderWidth: 2 },
  centerDot: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 24, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  hint: { textAlign: "center", paddingHorizontal: 36, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 24, paddingBottom: 40, gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  leadBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  leadBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  leadService: { fontSize: 22, fontFamily: "Inter_700Bold" },
  leadRows: { gap: 10 },
  leadRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  leadRowText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  denyBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14, borderWidth: 1 },
  denyBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  acceptBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14 },
  acceptBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
