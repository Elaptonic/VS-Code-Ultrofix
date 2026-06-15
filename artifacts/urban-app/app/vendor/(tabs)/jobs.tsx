import { Icon as Feather } from "@/components/Icon";
import { getApiBaseUrl } from "@/context/auth";
import { useColors } from "@/hooks/useColors";
import { useProviderProfile } from "@/hooks/useProviderProfile";
import { useProviderTracking } from "@/hooks/useProviderTracking";
import { type NewLead, useVendorSocket } from "@/hooks/useSocket";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STATUS_COLOR: Record<string, string> = {
  connecting: "#f59e0b",
  connected: "#22c55e",
  disconnected: "#94a3b8",
  error: "#ef4444",
};

const STATUS_LABEL: Record<string, string> = {
  connecting: "Connecting…",
  connected: "Online — Waiting for jobs",
  disconnected: "Offline",
  error: "Connection error",
};

interface ProviderBooking {
  id: number;
  userId: string;
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  address: string;
  price: number;
  status: string;
}

function useProviderBookings(providerId: number) {
  return useQuery<ProviderBooking[]>({
    queryKey: ["provider-bookings", providerId],
    queryFn: async () => {
      const res = await fetch(`${getApiBaseUrl()}/api/bookings?providerId=${providerId}`);
      if (!res.ok) throw new Error("Failed to fetch provider bookings");
      return res.json();
    },
    enabled: !!providerId,
    refetchInterval: 8000,
  });
}

async function patchBooking(bookingId: number, status: string) {
  const res = await fetch(`${getApiBaseUrl()}/api/bookings/${bookingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update booking");
  return res.json();
}

export default function VendorJobsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [currentLead, setCurrentLead] = useState<NewLead | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [trackingJob, setTrackingJob] = useState<{ bookingId: number; userId: string } | null>(null);

  const { data: profile } = useProviderProfile();
  const providerId = profile?.id ?? null;

  const handleNewLead = useCallback((lead: NewLead) => {
    setCurrentLead(lead);
  }, []);

  const { status, acceptLead, denyLead, emitLocation, emitLocationStop } = useVendorSocket(
    isOnline ? providerId : null,
    handleNewLead,
  );

  useProviderTracking({ emitLocation, emitLocationStop }, trackingJob);

  const { data: providerBookings = [] } = useProviderBookings(providerId ?? 0);

  const activeBookings = providerBookings.filter(
    (b) => b.status === "accepted" || b.status === "in_progress",
  );

  const pastBookings = providerBookings.filter((b) => b.status === "completed");

  const handleStart = async (booking: ProviderBooking) => {
    await patchBooking(booking.id, "in_progress");
    setTrackingJob({ bookingId: booking.id, userId: booking.userId });
    qc.invalidateQueries({ queryKey: ["provider-bookings", providerId] });
  };

  const handleComplete = async (booking: ProviderBooking) => {
    await patchBooking(booking.id, "completed");
    setTrackingJob(null);
    qc.invalidateQueries({ queryKey: ["provider-bookings", providerId] });
  };

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
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
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
  }, [status, pulse1, pulse2, pulse3]);

  const makePulseStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.3, 0] }),
  });

  const dotColor = isOnline ? STATUS_COLOR[status] ?? "#94a3b8" : "#94a3b8";

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === "web" ? 20 : 8),
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Jobs</Text>
          <Pressable
            onPress={() => setIsOnline((v) => !v)}
            style={[styles.toggleBtn, { backgroundColor: isOnline ? colors.primary : colors.muted }]}
          >
            <Text style={[styles.toggleLabel, { color: isOnline ? "#fff" : colors.mutedForeground }]}>
              {isOnline ? "Go Offline" : "Go Online"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.radarSection}>
          <View style={styles.radarWrap}>
            <Animated.View style={[styles.ring, { borderColor: dotColor }, makePulseStyle(pulse1)]} />
            <Animated.View style={[styles.ring, { borderColor: dotColor }, makePulseStyle(pulse2)]} />
            <Animated.View style={[styles.ring, { borderColor: dotColor }, makePulseStyle(pulse3)]} />
            <View style={[styles.centerDot, { backgroundColor: dotColor }]}>
              <Feather
                name={isOnline && status === "connected" ? "radio" : "wifi-off"}
                size={26}
                color="#fff"
              />
            </View>
          </View>

          <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>
              {isOnline ? STATUS_LABEL[status] : "You are offline"}
            </Text>
          </View>

          {!isOnline && (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Tap "Go Online" to start receiving job requests.
            </Text>
          )}
          {isOnline && status === "connected" && activeBookings.length === 0 && (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              You will receive job requests from nearby customers.
            </Text>
          )}
        </View>

        {activeBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Jobs</Text>
            {activeBookings.map((booking) => {
              const isTracking = trackingJob?.bookingId === booking.id;
              const isInProgress = booking.status === "in_progress";
              return (
                <View
                  key={booking.id}
                  style={[
                    styles.activeJobCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isTracking ? colors.primary : colors.border,
                      borderWidth: isTracking ? 1.5 : 1,
                    },
                  ]}
                >
                  <View style={styles.activeJobHeader}>
                    <View style={[styles.jobIcon, { backgroundColor: colors.primary + "18" }]}>
                      <Feather name="tool" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.activeJobInfo}>
                      <Text style={[styles.activeJobService, { color: colors.foreground }]}>
                        {booking.serviceName}
                      </Text>
                      <Text style={[styles.activeJobMeta, { color: colors.mutedForeground }]}>
                        {formatDate(booking.date)} · {booking.time}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isInProgress
                            ? "#fef9c322"
                            : "#dbeafe22",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isInProgress ? "#eab308" : "#3b82f6" },
                        ]}
                      >
                        {isInProgress ? "In Progress" : "Accepted"}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.activeJobRow, { borderColor: colors.border }]}>
                    <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                    <Text
                      style={[styles.activeJobAddress, { color: colors.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {booking.address}
                    </Text>
                  </View>

                  {isTracking && (
                    <View style={[styles.trackingBadge, { backgroundColor: colors.primary + "12" }]}>
                      <View style={styles.trackingDot} />
                      <Text style={[styles.trackingText, { color: colors.primary }]}>
                        GPS tracking active — customer can see your location
                      </Text>
                    </View>
                  )}

                  <View style={styles.activeJobActions}>
                    {!isInProgress && (
                      <Pressable
                        onPress={() => handleStart(booking)}
                        style={({ pressed }) => [
                          styles.startBtn,
                          { backgroundColor: colors.primary },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Feather name="play" size={14} color="#fff" />
                        <Text style={styles.startBtnText}>Start Job</Text>
                      </Pressable>
                    )}
                    {isInProgress && (
                      <Pressable
                        onPress={() => handleComplete(booking)}
                        style={({ pressed }) => [
                          styles.completeBtn,
                          { backgroundColor: "#10b981" },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Feather name="check-circle" size={14} color="#fff" />
                        <Text style={styles.completeBtnText}>Mark Complete</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {pastBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Completed Jobs</Text>
            <View style={[styles.jobList, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {pastBookings.map((job, idx) => (
                <View key={job.id}>
                  {idx > 0 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                  <View style={styles.jobRow}>
                    <View style={[styles.jobIcon, { backgroundColor: colors.primary + "12" }]}>
                      <Feather name="tool" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.jobInfo}>
                      <Text style={[styles.jobService, { color: colors.foreground }]}>
                        {job.serviceName}
                      </Text>
                      <Text style={[styles.jobMeta, { color: colors.mutedForeground }]}>
                        {formatDate(job.date)} · {job.time}
                      </Text>
                    </View>
                    <Text style={[styles.jobAmount, { color: colors.foreground }]}>
                      ₹{job.price}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={currentLead !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCurrentLead(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.leadBadge, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="zap" size={16} color={colors.primary} />
              <Text style={[styles.leadBadgeText, { color: colors.primary }]}>
                New Job Request
              </Text>
            </View>
            <Text style={[styles.leadService, { color: colors.foreground }]}>
              {currentLead?.serviceName}
            </Text>
            <View style={styles.leadRows}>
              <View style={styles.leadRow}>
                <Feather name="calendar" size={14} color={colors.mutedForeground} />
                <Text style={[styles.leadRowText, { color: colors.mutedForeground }]}>
                  {currentLead?.date} · {currentLead?.time}
                </Text>
              </View>
              <View style={styles.leadRow}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.leadRowText, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {currentLead?.address}
                </Text>
              </View>
              <View style={styles.leadRow}>
                <Feather name="credit-card" size={14} color={colors.mutedForeground} />
                <Text style={[styles.leadRowText, { color: colors.foreground }]}>
                  ₹{currentLead?.price}
                </Text>
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  if (currentLead) denyLead(currentLead);
                  setCurrentLead(null);
                }}
                style={({ pressed }) => [
                  styles.denyBtn,
                  { borderColor: colors.border, backgroundColor: colors.muted },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Feather name="x" size={18} color={colors.mutedForeground} />
                <Text style={[styles.denyBtnText, { color: colors.mutedForeground }]}>Deny</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (currentLead) acceptLead(currentLead);
                  setCurrentLead(null);
                }}
                style={({ pressed }) => [
                  styles.acceptBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Feather name="check" size={18} color="#fff" />
                <Text style={styles.acceptBtnText}>Accept Job</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  toggleLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  radarSection: { alignItems: "center", paddingVertical: 16, paddingBottom: 24 },
  radarWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
    width: 200,
    marginBottom: 24,
  },
  ring: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
  },
  centerDot: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    width: "85%",
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  hint: {
    textAlign: "center",
    paddingHorizontal: 36,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 4,
  },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  activeJobCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  activeJobHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  activeJobInfo: { flex: 1 },
  activeJobService: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  activeJobMeta: { fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  activeJobRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  activeJobAddress: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  trackingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  trackingText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  activeJobActions: { flexDirection: "row", gap: 10 },
  startBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  completeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  completeBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  jobList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  jobRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  jobIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  jobInfo: { flex: 1 },
  jobService: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  jobMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  jobAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  leadBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  leadBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  leadService: { fontSize: 22, fontFamily: "Inter_700Bold" },
  leadRows: { gap: 10 },
  leadRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  leadRowText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  denyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  denyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  acceptBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
