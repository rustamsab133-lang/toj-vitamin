import { supabase } from './supabase';

let cachedRetailOnlyIds: string[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds cache

/**
 * Получить массив ID товаров, доступных только в розницу (из site_settings)
 */
export async function getRetailOnlyProductIds(forceRefresh = false): Promise<string[]> {
  const now = Date.now();
  if (!forceRefresh && cachedRetailOnlyIds !== null && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedRetailOnlyIds;
  }

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'retail_only_product_ids')
      .maybeSingle();

    if (error) {
      console.warn('⚠️ Warning fetching retail_only_product_ids:', error.message);
      return cachedRetailOnlyIds || [];
    }

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed)) {
          cachedRetailOnlyIds = parsed.map(String);
          lastFetchTime = now;
          return cachedRetailOnlyIds;
        }
      } catch (e) {
        console.error('Failed to parse retail_only_product_ids JSON:', e);
      }
    }

    cachedRetailOnlyIds = [];
    lastFetchTime = now;
    return [];
  } catch (err) {
    console.error('Failed to load retail only product IDs:', err);
    return cachedRetailOnlyIds || [];
  }
}

/**
 * Очистить локальный кэш розничных товаров (после обновления в админке)
 */
export function invalidateRetailOnlyCache() {
  cachedRetailOnlyIds = null;
  lastFetchTime = 0;
}

/**
 * Проверить, является ли конкретный товар исключительно розничным
 */
export function isProductRetailOnly(productId: string | number, retailOnlyIds: string[]): boolean {
  return retailOnlyIds.includes(String(productId));
}

/**
 * Отфильтровать товары для оптового канала (исключая товары «Только для розницы»)
 */
export function filterWholesaleProducts<T extends { id: string | number; is_retail_only?: boolean }>(
  products: T[],
  retailOnlyIds?: string[]
): T[] {
  if (!products || !Array.isArray(products)) return [];
  const idsSet = retailOnlyIds ? new Set(retailOnlyIds.map(String)) : null;

  return products.filter(p => {
    if (p.is_retail_only === true) return false;
    if (idsSet && idsSet.has(String(p.id))) return false;
    return true;
  });
}
