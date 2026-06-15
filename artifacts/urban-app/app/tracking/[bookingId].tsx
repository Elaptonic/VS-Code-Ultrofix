import { Icon as Feather } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { useConsumerSocket, type LocationUpdate } from "@/hooks/useSocket";
import { useUserId } from "@/constants/user";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== "web") {
  try {
    const maps = require("react-native-maps");
    MapView = maps.default;
    Marker = maps.Marker;
  } catch (_) {}
}

const DEFAULT_REGION = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export default function TrackingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const userId = useUserId();

  const [providerLocation, setProviderLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLive, setIsLive] = useState(false);
  const mapRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleLocationUpdate = useCallback(
    (update: LocationUpdate) => {
      if (String(update.bookingId) !== String(bookingId)) return;
      setProviderLocation({ lat: update.lat, lng: update.lng });
      setIsLive(true);
      mapRef.current?.animateToRegion(
        {
          latitude: update.lat,
          longitude: update.lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        600,
      );
    },
    [bookingId],
  );

  useConsumerSocket(userId, undefined, handleLocationUpdate);

  const region = providerLocation
    ? {
        latitude: providerLocation.lat,
        longitude: providerLocation.lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
    : DEFAULT_REGION;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card }]}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Track Provider</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.mapContainer}>
        {Platform.OS !== "web" && MapView ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            region={region}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {providerLocation && Marker && (
              <Marker
                coordinate={{
                  latitude: providerLocation.lat,
                  longitude: providerLocation.lng,
                }}
                title="Your Provider"
                description="On the way to you"
              >
                <View style={styles.markerContainer}>
                  <View style={[styles.markerBg, { backgroundColor: colors.primary }]}>
                    <Feather name="truck" size={16} color="#fff" />
                  </View>
                  <View style={[styles.markerTail, { borderTopColor: colors.primary }]} />
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          <View style={[styles.mapFallback, { backgroundColor: colors.muted }]}>
            <Feather name="map" size={48} color={colors.mutedForeground} />
            <Text style={[styles.mapFallbackText, { color: colors.mutedForeground }]}>
              Map not available on web
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statusRow}>
          <Animated.View
            style={[
              styles.liveDot,
              {
                backgroundColor: isLive ? "#22c55e" : "#f59e0b",
                transform: [{ scale: isLive ? pulseAnim : 1 }],
              },
            ]}
          />
          <Text style={[styles.statusText, { color: colors.foreground }]}>
            {isLive ? "Provider is en route" : "Waiting for provider location…"}
          </Text>
          {!isLive && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {providerLocation && (
          <View style={styles.coordRow}>
            <Feather name="navigation" size={13} color={colors.mutedForeground} />
            <Text style={[styles.coordText, { color: colors.mutedForeground }]}>
              {providerLocation.lat.toFixed(5)}, {providerLocation.lng.toFixed(5)}
            </Text>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.infoRow}>
          <View style={[styles.infoIconWrap, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="clock" size={16} color={colors.primary} />
          </View>
          <View style={styles.infoText}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Estimated arrival</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {isLive ? "15–20 min" : "Calculating…"}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={[styles.infoIconWrap, { backgroundColor: "#10b981" + "15" }]}>
            <Feather name="shield" size={16} color="#10b981" />
          </View>
          <View style={styles.infoText}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Safety</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              Verified & background-checked provider
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  mapFallbackText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  markerContainer: { alignItems: "center" },
  markerBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  infoCard: {
    margin: 16,
    marginBottom: 24,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  coordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coordText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  divider: { height: StyleSheet.hairlineWidth },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  infoValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
