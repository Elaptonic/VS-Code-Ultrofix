import * as Location from "expo-location";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

interface ActiveJob {
  bookingId: number;
  userId: string;
}

interface TrackingEmitters {
  emitLocation: (bookingId: number, lat: number, lng: number, userId: string) => void;
  emitLocationStop: (bookingId: number, userId: string) => void;
}

export function useProviderTracking(
  emitters: TrackingEmitters,
  activeJob: ActiveJob | null,
) {
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const emittersRef = useRef(emitters);
  emittersRef.current = emitters;

  useEffect(() => {
    if (!activeJob || Platform.OS === "web") return;
    const job = activeJob;

    let cancelled = false;

    async function startTracking() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("[tracking] Location permission denied");
          return;
        }
        if (cancelled) return;

        watchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 15,
          },
          (location) => {
            emittersRef.current.emitLocation(
              job.bookingId,
              location.coords.latitude,
              location.coords.longitude,
              job.userId,
            );
            console.log(
              `[tracking] Emitted location for booking ${job.bookingId}: ` +
                `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`,
            );
          },
        );
        console.log(`[tracking] Started GPS watch for booking ${job.bookingId}`);
      } catch (err) {
        console.log("[tracking] Failed to start location watch:", err);
      }
    }

    startTracking();

    return () => {
      cancelled = true;
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
      emittersRef.current.emitLocationStop(activeJob.bookingId, activeJob.userId);
      console.log(`[tracking] Stopped GPS watch for booking ${activeJob.bookingId}`);
    };
  }, [activeJob?.bookingId]);
}
