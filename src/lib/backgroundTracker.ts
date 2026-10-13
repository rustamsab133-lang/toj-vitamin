"use client";
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";

let BackgroundGeolocation: BackgroundGeolocationPlugin | null = null;
if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
  try {
    BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");
  } catch (e) {
    console.warn("BackgroundGeolocation plugin not available:", e);
  }
}

let activeWatcherId: string | null = null;
let browserWatchId: number | null = null;

export interface GeoLocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  time?: number | null;
}

/**
 * Start Background GPS Tracking
 * On Native Android/iOS: Launches Foreground Service with notification allowing screen to be locked.
 * On Web: Uses Geolocation API with high accuracy.
 */
export async function startBackgroundTracker(
  onLocationUpdate: (point: GeoLocationPoint) => void,
  onError?: (err: any) => void
): Promise<string | number | null> {
  // If already tracking, don't duplicate
  if (activeWatcherId || browserWatchId) {
    return activeWatcherId || browserWatchId;
  }

  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform();

  if (isNative && BackgroundGeolocation) {
    try {
      const watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: "Toj-Vitamin • Смена активна",
          backgroundMessage: "Запись рабочего маршрута. Экран можно заблокировать.",
          requestPermissions: true,
          stale: false,
          distanceFilter: 15 // minimum movement in meters
        },
        (location, error) => {
          if (error) {
            console.warn("BackgroundGeolocation error:", error);
            if (onError) onError(error);
            return;
          }
          if (location && location.latitude && location.longitude) {
            onLocationUpdate({
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              speed: location.speed,
              time: location.time
            });
          }
        }
      );

      activeWatcherId = watcherId;
      return watcherId;
    } catch (err) {
      console.warn("Failed to start native background tracker, falling back to browser:", err);
    }
  }

  // Browser Fallback
  if (typeof navigator !== "undefined" && navigator.geolocation) {
    browserWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        onLocationUpdate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          time: pos.timestamp
        });
      },
      (err) => {
        console.warn("Browser geolocation watch error:", err);
        if (onError) onError(err);
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return browserWatchId;
  }

  return null;
}

/**
 * Stop Background GPS Tracking
 * Releases Android Foreground Service, turns off GPS chip.
 */
export async function stopBackgroundTracker(): Promise<void> {
  if (activeWatcherId && BackgroundGeolocation) {
    try {
      await BackgroundGeolocation.removeWatcher({ id: activeWatcherId });
    } catch (e) {
      console.warn("Error removing background geolocation watcher:", e);
    }
    activeWatcherId = null;
  }

  if (browserWatchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
    navigator.geolocation.clearWatch(browserWatchId);
    browserWatchId = null;
  }
}

/**
 * Check if running inside native Android / iOS application
 */
export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}
