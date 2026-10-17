"use client";
import { Pharmacy } from './types';

const OFFLINE_QUEUE_KEY = 'toj_rep_offline_queue_v1';
const CACHED_PHARMACIES_KEY = 'toj_rep_cached_pharmacies_v1';
const CACHED_VISITS_KEY = 'toj_rep_cached_visits_v1';

export interface OfflineQueueItem {
  id: string;
  createdAt: string;
  payload: Record<string, any>;
  description: string;
}

/**
 * Formats a phone number to clean international format for WhatsApp (wa.me)
 * Works without saving the contact to the phone book!
 */
export function formatWhatsAppPhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;

  // If 9 digits (e.g. 900123456 in Tajikistan), prepend 992
  if (digits.length === 9) {
    return `992${digits}`;
  }
  // If starts with 0 and 10 digits (e.g. 0900123456), replace leading 0 with 992
  if (digits.length === 10 && digits.startsWith('0')) {
    return `992${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Builds a direct 1-click WhatsApp chat URL with pre-filled B2B message
 */
export function buildPharmacyWhatsAppUrl(
  pharmacy: Partial<Pharmacy>,
  repName?: string
): string | null {
  const cleanPhone = formatWhatsAppPhone(pharmacy.phone);
  if (!cleanPhone) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.toj-vitamin.tj';
  const b2bLink = pharmacy.token ? `${origin}/b2b/${pharmacy.token}` : `${origin}/b2b`;
  const greetingName = pharmacy.contact_person ? `, ${pharmacy.contact_person}` : '';
  const senderInfo = repName ? `Это ${repName}, медицинский представитель` : 'Это представительство';

  const message =
    `Ассалому алейкум${greetingName}! 👋\n` +
    `${senderInfo} компании *TOJ-VITAMIN (GLS Pharmaceuticals)*.\n\n` +
    `Для вашей аптеки *«${pharmacy.name || 'Аптека'}»* активирован персональный оптовый B2B-кабинет` +
    (pharmacy.discount_percent ? ` со специальной скидкой *${pharmacy.discount_percent}%*` : '') +
    `:\n👉 ${b2bLink}\n\n` +
    `По этой ссылке вы можете в любой момент смотреть актуальное наличие, оптовые цены и оформлять заказ в 1 клик без звонков. Если будут вопросы — пишите мне прямо сюда!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds a direct WhatsApp URL to message a representative
 */
export function buildRepWhatsAppUrl(phone?: string | null, repName?: string): string | null {
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone) return null;
  const text = `Салом${repName ? `, ${repName}` : ''}! Пишу из пульта руководителя TOJ-VITAMIN.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

// ==== OFFLINE CACHING ====

export function saveCachedPharmacies(pharmacies: Pharmacy[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHED_PHARMACIES_KEY, JSON.stringify(pharmacies));
  } catch (e) {
    console.warn('Failed to cache pharmacies:', e);
  }
}

export function getCachedPharmacies(): Pharmacy[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHED_PHARMACIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveCachedVisits(visits: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHED_VISITS_KEY, JSON.stringify(visits));
  } catch (e) {
    console.warn('Failed to cache visits:', e);
  }
}

export function getCachedVisits(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHED_VISITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// ==== OFFLINE QUEUE MANAGEMENT ====

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function enqueueOfflineAction(
  arg1: Record<string, any> | string,
  arg2?: string | Record<string, any>
): OfflineQueueItem {
  const payload: Record<string, any> = typeof arg1 === 'object' && arg1 !== null ? arg1 : (typeof arg2 === 'object' && arg2 !== null ? arg2 : {});
  const description: string = typeof arg1 === 'string' ? arg1 : (typeof arg2 === 'string' ? arg2 : 'Offline action');

  const item: OfflineQueueItem = {
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    payload,
    description
  };

  if (typeof window !== 'undefined') {
    try {
      const current = getOfflineQueue();
      const updated = [...current, item];
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('toj-offline-queue-changed'));
    } catch (e) {
      console.warn('Failed to enqueue offline action:', e);
    }
  }
  return item;
}

export function removeOfflineQueueItem(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getOfflineQueue();
    const updated = current.filter(i => i.id !== id);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('toj-offline-queue-changed'));
  } catch (e) {}
}

/**
 * Flushes all queued offline actions to /api/rep when connection is available
 */
let isFlushing = false;
export async function flushOfflineQueue(): Promise<{ synced: number; remaining: number }> {
  if (typeof window === 'undefined' || isFlushing) {
    return { synced: 0, remaining: getOfflineQueue().length };
  }
  if (!navigator.onLine) {
    return { synced: 0, remaining: getOfflineQueue().length };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { synced: 0, remaining: 0 };
  }

  isFlushing = true;
  let syncedCount = 0;
  const resolvedPharmacyIds: Record<string, string> = {};

  try {
    for (const item of queue) {
      try {
        const bodyPayload = { ...item.payload };

        // If this is a visit to a pharmacy that was created offline in the same queue, substitute its real UUID
        if (
          bodyPayload.pharmacy_id &&
          typeof bodyPayload.pharmacy_id === 'string' &&
          resolvedPharmacyIds[bodyPayload.pharmacy_id]
        ) {
          bodyPayload.pharmacy_id = resolvedPharmacyIds[bodyPayload.pharmacy_id];
        }

        const res = await fetch('/api/rep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (bodyPayload.action === 'create_pharmacy' && bodyPayload.temp_id && data?.pharmacy?.id) {
            resolvedPharmacyIds[bodyPayload.temp_id] = data.pharmacy.id;
          }
          removeOfflineQueueItem(item.id);
          syncedCount++;
        }
      } catch (networkErr) {
        // Stop flushing if network dropped again
        break;
      }
    }
  } finally {
    isFlushing = false;
  }

  return { synced: syncedCount, remaining: getOfflineQueue().length };
}
