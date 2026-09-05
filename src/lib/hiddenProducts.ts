import { supabase } from './supabase';
import { Product } from './types';

let cachedHiddenIds: string[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds cache

/**
 * Получить массив ID скрытых товаров из site_settings
 */
export async function getHiddenProductIds(forceRefresh = false): Promise<string[]> {
  const now = Date.now();
  if (!forceRefresh && cachedHiddenIds !== null && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedHiddenIds;
  }

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'hidden_product_ids')
      .maybeSingle();

    if (error) {
      console.warn('⚠️ Warning fetching hidden_product_ids:', error.message);
      return cachedHiddenIds || [];
    }

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) {
          cachedHiddenIds = parsed.map(String);
          lastFetchTime = now;
          return cachedHiddenIds;
        }
      } catch (e) {
        console.error('Failed to parse hidden_product_ids JSON:', e);
      }
    }

    cachedHiddenIds = [];
    lastFetchTime = now;
    return [];
  } catch (err) {
    console.error('Failed to load hidden product IDs:', err);
    return cachedHiddenIds || [];
  }
}

/**
 * Очистить локальный кэш (вызывать после обновления в админке)
 */
export function invalidateHiddenProductsCache() {
  cachedHiddenIds = null;
  lastFetchTime = 0;
}

/**
 * Проверить, скрыт ли конкретный товар
 */
export function isProductHidden(productId: string | number, hiddenIds: string[]): boolean {
  return hiddenIds.includes(String(productId));
}

/**
 * Отфильтровать только видимые товары (исключая скрытые)
 */
export function filterVisibleProducts<T extends { id: string | number; is_hidden?: boolean }>(
  products: T[],
  hiddenIds?: string[]
): T[] {
  if (!products || !Array.isArray(products)) return [];
  const idsSet = hiddenIds ? new Set(hiddenIds.map(String)) : null;

  return products.filter(p => {
    if (p.is_hidden === true) return false;
    if (idsSet && idsSet.has(String(p.id))) return false;
    return true;
  });
}
