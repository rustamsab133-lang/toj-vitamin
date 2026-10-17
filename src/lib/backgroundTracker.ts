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
let lastAcceptedPoint: { lat: number; lng: number; time: number } | null = null;

export interface GeoLocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  time?: number | null;
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Anti-drift & anti-glitch GPS validator:
 * Filters out indoor concrete reflection jumps (accuracy > 65m) and cell-tower teleportation (> 130 km/h)
 */
export function isValidGpsPoint(point: GeoLocationPoint): boolean {
  // 1. Accuracy check: ignore very low accuracy indoor bounce (> 65 meters)
  if (typeof point.accuracy === "number" && point.accuracy > 65) {
    return false;
  }

  // 2. Speed / Teleportation check against previous accepted point
  const now = point.time || Date.now();
  if (lastAcceptedPoint) {
    const dtSec = Math.max(1, (now - lastAcceptedPoint.time) / 1000);
    const distMeters = haversineMeters(
      lastAcceptedPoint.lat,
      lastAcceptedPoint.lng,
      point.latitude,
      point.longitude
    );
    const speedMetersPerSec = distMeters / dtSec;
    // 36 m/s = ~130 km/h. If jump is faster and within < 120s, it's a cell tower glitch
    if (speedMetersPerSec > 36 && dtSec < 120) {
      return false;
    }
  }

  lastAcceptedPoint = { lat: point.latitude, lng: point.longitude, time: now };
  return true;
}

/**
 * Start Background GPS Tracking
 * On Native Android/iOS: Launches Foreground Service with notification allowing screen to be locked.
 * On Web: Uses Geolocation API with high accuracy and anti-drift filter.
 */
export async function startBackgroundTracker(
  onLocationUpdate: (point: GeoLocationPoint) => void,
  onError?: (err: any) => void
): Promise<string | number | null> {
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
          distanceFilter: 15
        },
        (location, error) => {
          if (error) {
            console.warn("BackgroundGeolocation error:", error);
            if (onError) onError(error);
            return;
          }
          if (location && location.latitude && location.longitude) {
            const candidate: GeoLocationPoint = {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              speed: location.speed,
              time: location.time
            };
            if (isValidGpsPoint(candidate)) {
              onLocationUpdate(candidate);
            }
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
        const candidate: GeoLocationPoint = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          time: pos.timestamp
        };
        if (isValidGpsPoint(candidate)) {
          onLocationUpdate(candidate);
        }
      },
      (err) => {
        console.warn("Browser geolocation watch error:", err);
        if (onError) onError(err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
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
  lastAcceptedPoint = null;
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

/**
 * Detects phone vendor from User-Agent to give exact battery-saver instructions for field reps
 */
export interface PhoneVendorGuide {
  brand: 'xiaomi' | 'samsung' | 'tecno' | 'oppo' | 'huawei' | 'ios' | 'generic';
  title: string;
  steps: string[];
}

export function detectPhoneVendorGuide(): PhoneVendorGuide {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";

  if (ua.includes("xiaomi") || ua.includes("redmi") || ua.includes("poco") || ua.includes("miui")) {
    return {
      brand: 'xiaomi',
      title: 'Xiaomi / Redmi / POCO (MIUI & HyperOS)',
      steps: [
        'Зажмите иконку приложения «Toj-Vitamin» → «О приложении».',
        'Включите тумблер «Автозапуск» (Autostart).',
        'Нажмите «Контроль активности» (Экономия энергии) → выберите «Нет ограничений».',
        'Разрешения → Местоположение → «Разрешить в любом режиме».'
      ]
    };
  }

  if (ua.includes("samsung") || ua.includes("sm-")) {
    return {
      brand: 'samsung',
      title: 'Samsung Galaxy (One UI)',
      steps: [
        'Зажмите иконку приложения → «О приложении» (значок i).',
        'Перейдите в раздел «Батарея» → выберите «Не ограничено» (Unrestricted).',
        'Перейдите в «Разрешения» → «Геоданные» → «Разрешать всегда».'
      ]
    };
  }

  if (ua.includes("tecno") || ua.includes("infinix") || ua.includes("itel")) {
    return {
      brand: 'tecno',
      title: 'Tecno / Infinix (HiOS & XOS)',
      steps: [
        'Откройте «Мастер телефона» (Phone Master) → «Автозапуск» → включите для Toj-Vitamin.',
        'Настройки → Батарея → Настройки экономии → отключите оптимизацию для Toj-Vitamin.',
        'В списке открытых приложений потяните карточку вниз, чтобы повесить «Замочек» 🔒.'
      ]
    };
  }

  if (ua.includes("iphone") || ua.includes("ipad")) {
    return {
      brand: 'ios',
      title: 'Apple iPhone (iOS)',
      steps: [
        'Настройки → Конфиденциальность → Службы геолокации → включите «Всегда».',
        'При работе через браузер Safari нажмите «Поделиться» → «На экран Домой».'
      ]
    };
  }

  return {
    brand: 'generic',
    title: 'Android смартфон (Xiaomi / Samsung / Tecno)',
    steps: [
      'Зажмите иконку приложения → «О приложении» → «Батарея» → выберите «Нет ограничений».',
      'Включите «Автозапуск» в фоновом режиме.',
      'В разделе «Разрешения → Геоданные» выберите «Разрешать всегда».'
    ]
  };
}
