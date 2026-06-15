import { Icon as Feather } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetService,
  useGetBooking,
  useListProviders,
  useCreateBooking,
  getListBookingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { PaymentModeCard, type PaymentMode } from "@/components/PaymentModeCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useUserId } from "@/constants/user";
import { useConsumerSocket, type BookingStatusEvent, type NoProviderEvent } from "@/hooks/useSocket";

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
  "05:00 PM", "06:00 PM",
];

const DATES = (() => {
  const dates: { label: string; value: string; day: string }[] = [];
  const today = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      label: d.getDate().toString(),
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      value: d.toISOString().split("T")[0],
    });
  }
  return dates;
})();

export default function BookingScreen() {
  const { id, providerId } = useLocalSearchParams<{ id: string; providerId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedAddress } = useApp();
  const queryClient = useQueryClient();
  const userId = useUserId();

  const serviceId = parseInt(id ?? "0", 10);
  const providerIdNum = parseInt(providerId ?? "0", 10);

  const { data: service, isLoading: serviceLoading } = useGetService(serviceId, {
    query: { enabled: !!serviceId },
  });
  const { data: providers } = useListProviders(
    { category: service?.category },
    { query: { enabled: !!service } }
  );
  const provider = providers?.find((p) => p.id === providerIdNum) ?? providers?.[0];

  const createBooking = useCreateBooking({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListBookingsQueryKey({ userId }),
        });
      },
    },
  });

  const [selectedDate, setSelectedDate] = useState<string>(DATES[0].value);
  const [selectedTime, setSelectedTime] = useState<string>(TIME_SLOTS[2]);
  const [step, setStep] = useState<"scheduling" | "payment" | "finding" | "no_provider" | "confirmed">("scheduling");
  const [paymentInfo, setPaymentInfo] = useState<{
    razorpayOrderId: string | null;
    razorpayAmount: number | null;
    razorpayKeyId: string | null;
  } | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("upi");
  const [searchAttempts, setSearchAttempts] = useState(0);

  type BufferedEvent =
    | { kind: "status"; event: BookingStatusEvent }
    | { kind: "no_provider"; event: NoProviderEvent };
  const eventBufferRef = useRef<BufferedEvent[]>([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (step === "finding") {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [step, pulseAnim]);

  const applyStatusEvent = useCallback(
    (event: BookingStatusEvent) => {
      if (event.status === "accepted") {
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey({ userId }) });
        setStep("confirmed");
      } else if (event.status === "searching") {
        setSearchAttempts((prev) => prev + 1);
      }
    },
    [queryClient, userId],
  );

  useEffect(() => {
    if (!createdBookingId) return;
    const matching = eventBufferRef.current.filter(
      (e) => e.event.bookingId === createdBookingId,
    );
    eventBufferRef.current = [];
    for (const buffered of matching) {
      if (buffered.kind === "status") {
        applyStatusEvent(buffered.event);
      } else {
        setStep("no_provider");
      }
    }
  }, [createdBookingId, applyStatusEvent]);

  useConsumerSocket(
    userId,
    (event) => {
      if (!createdBookingId) {
        eventBufferRef.current.push({ kind: "status", event });
        return;
      }
      if (event.bookingId !== createdBookingId) return;
      applyStatusEvent(event);
    },
    undefined,
    (event) => {
      if (!createdBookingId) {
        eventBufferRef.current.push({ kind: "no_provider", event });
        return;
      }
      if (event.bookingId !== createdBookingId) return;
      setStep("no_provider");
    },
  );

  const { data: polledBooking } = useGetBooking(createdBookingId ?? 0, {
    query: {
      enabled: step === "finding" && !!createdBookingId,
      refetchInterval: 5000,
    },
  });

  useEffect(() => {
    if (!polledBooking || step !== "finding") return;
    if (polledBooking.status === "accepted") {
      queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey({ userId }) });
      setStep("confirmed");
    }
  }, [polledBooking, step, queryClient, userId]);

  if (serviceLoading) {
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

  const handleConfirm = async () => {
    if (!provider) return;
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    createBooking.mutate(
      {
        data: {
          userId,
          serviceId: service.id,
          providerId: provider.id,
          date: selectedDate,
          time: selectedTime,
          address: selectedAddress,
          price: service.startingPrice,
        },
      },
      {
        onSuccess: (data) => {
          const d = data as typeof data & {
            razorpayOrderId?: string | null;
            razorpayAmount?: number | null;
            razorpayKeyId?: string | null;
          };
          setPaymentInfo({
            razorpayOrderId: d.razorpayOrderId ?? null,
            razorpayAmount: d.razorpayAmount ?? null,
            razorpayKeyId: d.razorpayKeyId ?? null,
          });
          setCreatedBookingId(data.id);
          setStep("payment");
        },
      }
    );
  };

  if (step === "payment") {
    const totalRupees = service.startingPrice + 29;
    const orderId = paymentInfo?.razorpayOrderId;
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.successIcon, { backgroundColor: "#eff6ff" }]}>
            <Feather name="credit-card" size={48} color="#3b82f6" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Complete Payment</Text>
          <Text style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
            Your booking is reserved. Complete payment to confirm.
          </Text>

          <View style={[styles.successDetails, { backgroundColor: colors.muted, borderRadius: 12, padding: 16, gap: 10 }]}>
            <View style={styles.successRow}>
              <Feather name="briefcase" size={15} color={colors.mutedForeground} />
              <Text style={[styles.successRowText, { color: colors.foreground }]} numberOfLines={1}>
                {service.name}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Service charge</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>₹{service.startingPrice}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Platform fee</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>₹29</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryTotal, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.summaryTotalValue, { color: colors.primary }]}>₹{totalRupees}</Text>
            </View>
            {orderId && (
              <View style={styles.successRow}>
                <Feather name="hash" size={13} color={colors.mutedForeground} />
                <Text style={[{ fontSize: 11, color: colors.mutedForeground, flex: 1 }]} numberOfLines={1}>
                  Order: {orderId}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.paymentModeSection}>
            <Text style={[styles.paymentModeTitle, { color: colors.foreground }]}>
              Choose payment method
            </Text>
            <View style={styles.paymentModeGrid}>
              {(["upi", "cash", "card", "netbanking"] as const).map((mode) => (
                <PaymentModeCard
                  key={mode}
                  mode={mode}
                  isSelected={paymentMode === mode}
                  onSelect={() => setPaymentMode(mode)}
                />
              ))}
            </View>
          </View>

          <View style={[styles.sandboxBadge, { backgroundColor: "#fef9c3", borderColor: "#fde047" }]}>
            <Feather name="info" size={13} color="#a16207" />
            <Text style={styles.sandboxText}>Demo mode — no real charge</Text>
          </View>

          <Pressable
            onPress={() => {
              queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey({ userId }) });
              setSearchAttempts(0);
              setStep("finding");
            }}
            style={({ pressed }) => [
              styles.successBtn,
              { backgroundColor: "#22c55e" },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={styles.successBtnText}>Simulate Payment Success</Text>
          </Pressable>

          <Pressable
            onPress={() => setStep("scheduling")}
            style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.homeBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === "finding") {
    const isRetrying = searchAttempts > 1;
    const headline = isRetrying
      ? "Retrying — finding next available provider"
      : "Finding your provider...";
    const subtext = isRetrying
      ? "One provider was unavailable. We're checking the next best match."
      : "We're contacting nearby providers. This usually takes under a minute.";

    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Animated.View
            style={[
              styles.pulseRing,
              { backgroundColor: colors.primary + "20", transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={[styles.successIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="search" size={40} color={colors.primary} />
            </View>
          </Animated.View>

          <Text style={[styles.successTitle, { color: colors.foreground, marginTop: 8 }]}>
            {headline}
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
            {subtext}
          </Text>

          <View style={[styles.statusRow, { backgroundColor: colors.muted, borderRadius: 12, padding: 14 }]}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {isRetrying ? `Attempt ${searchAttempts} in progress…` : "Contacting providers nearby…"}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              router.dismissAll();
              router.push("/(tabs)/bookings");
            }}
            style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.homeBtnText, { color: colors.mutedForeground }]}>
              View My Bookings
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === "no_provider") {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.successIcon, { backgroundColor: "#fef3c7" }]}>
            <Feather name="alert-circle" size={48} color="#f59e0b" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>
            No Provider Available
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
            We couldn't find an available provider for {service.name} right now. Please try again or check back later.
          </Text>

          <Pressable
            onPress={() => {
              setSearchAttempts(0);
              setCreatedBookingId(null);
              eventBufferRef.current = [];
              setStep("scheduling");
            }}
            style={({ pressed }) => [
              styles.successBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Feather name="refresh-cw" size={18} color="#fff" />
            <Text style={styles.successBtnText}>Try Again</Text>
          </Pressable>

          <Pressable
            onPress={() => router.dismissAll()}
            style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.homeBtnText, { color: colors.mutedForeground }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === "confirmed") {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.successIcon, { backgroundColor: "#E0F2FE" }]}>
            <Feather name="check-circle" size={48} color="#10b981" />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>
            Booking Confirmed!
          </Text>
          <Text style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
            Your booking for {service.name} has been confirmed
            {provider ? ` with ${provider.name}` : ""}.
          </Text>
          <View style={[styles.successDetails, { backgroundColor: colors.muted, borderRadius: 12, padding: 16, gap: 10 }]}>
            <View style={styles.successRow}>
              <Feather name="calendar" size={15} color={colors.mutedForeground} />
              <Text style={[styles.successRowText, { color: colors.foreground }]}>
                {new Date(selectedDate).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
            </View>
            <View style={styles.successRow}>
              <Feather name="clock" size={15} color={colors.mutedForeground} />
              <Text style={[styles.successRowText, { color: colors.foreground }]}>
                {selectedTime}
              </Text>
            </View>
            <View style={styles.successRow}>
              <Feather name="map-pin" size={15} color={colors.mutedForeground} />
              <Text
                style={[styles.successRowText, { color: colors.foreground }]}
                numberOfLines={2}
              >
                {selectedAddress}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              router.dismissAll();
              router.push("/(tabs)/bookings");
            }}
            style={({ pressed }) => [
              styles.successBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.successBtnText}>View My Bookings</Text>
          </Pressable>
          <Pressable
            onPress={() => router.dismissAll()}
            style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.homeBtnText, { color: colors.mutedForeground }]}>
              Go to Home
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Book Service</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.serviceInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.serviceIconBg, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="briefcase" size={24} color={colors.primary} />
          </View>
          <View style={styles.serviceDetails}>
            <Text style={[styles.serviceName, { color: colors.foreground }]}>
              {service.name}
            </Text>
            {provider && (
              <Text style={[styles.serviceProvider, { color: colors.mutedForeground }]}>
                with {provider.name}
              </Text>
            )}
          </View>
          <Text style={[styles.servicePrice, { color: colors.primary }]}>
            ₹{service.startingPrice}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
            {DATES.map((date) => (
              <Pressable
                key={date.value}
                onPress={() => setSelectedDate(date.value)}
                style={[
                  styles.dateItem,
                  {
                    backgroundColor: selectedDate === date.value ? colors.primary : colors.card,
                    borderColor: selectedDate === date.value ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.dateDay, { color: selectedDate === date.value ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>
                  {date.day}
                </Text>
                <Text style={[styles.dateNum, { color: selectedDate === date.value ? "#fff" : colors.foreground }]}>
                  {date.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Time</Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((slot) => (
              <Pressable
                key={slot}
                onPress={() => setSelectedTime(slot)}
                style={[
                  styles.timeSlot,
                  {
                    backgroundColor: selectedTime === slot ? colors.primary : colors.card,
                    borderColor: selectedTime === slot ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.timeText, { color: selectedTime === slot ? "#fff" : colors.foreground }]}>
                  {slot}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Service Address</Text>
          <View style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="map-pin" size={18} color={colors.primary} />
            <Text style={[styles.addressText, { color: colors.foreground }]}>
              {selectedAddress}
            </Text>
            <Pressable onPress={() => router.push("/address")}>
              <Text style={[styles.changeText, { color: colors.primary }]}>Change</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Service charge</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>₹{service.startingPrice}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Platform fee</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>₹29</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryTotal, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.summaryTotalValue, { color: colors.primary }]}>
              ₹{service.startingPrice + 29}
            </Text>
          </View>
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
        <Pressable
          onPress={handleConfirm}
          disabled={createBooking.isPending}
          style={({ pressed }) => [
            styles.confirmBtn,
            { backgroundColor: colors.primary },
            (pressed || createBooking.isPending) && { opacity: 0.75 },
          ]}
        >
          {createBooking.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>
                Confirm Booking · ₹{service.startingPrice + 29}
              </Text>
              <Feather name="check" size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  placeholder: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 20 },
  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  serviceIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceDetails: { flex: 1 },
  serviceName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  serviceProvider: { fontSize: 13, marginTop: 2 },
  servicePrice: { fontSize: 18, fontFamily: "Inter_700Bold" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  dateList: { gap: 10 },
  dateItem: {
    width: 56,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 4,
  },
  dateDay: { fontSize: 11, fontFamily: "Inter_500Medium" },
  dateNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeSlot: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5 },
  timeText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  addressText: { flex: 1, fontSize: 14 },
  changeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  summary: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  summaryTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  summaryDivider: { height: 1, marginVertical: 4 },
  summaryTotal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  summaryTotalValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  footer: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  successCard: { width: "100%", borderRadius: 24, borderWidth: 1, padding: 28, alignItems: "center", gap: 16 },
  pulseRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  successSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  successDetails: { width: "100%" },
  successRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  successRowText: { fontSize: 14, flex: 1 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%" },
  statusText: { fontSize: 14, flex: 1 },
  successBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  successBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sandboxBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    width: "100%",
  },
  sandboxText: { fontSize: 12, color: "#a16207", fontFamily: "Inter_500Medium" },
  paymentModeSection: { width: "100%", gap: 10 },
  paymentModeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "left" },
  paymentModeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  homeBtn: { paddingVertical: 8 },
  homeBtnText: { fontSize: 14 },
});
