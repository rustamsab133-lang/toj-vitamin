/**
 * Shared catalog builder — cached product loading and formatting.
 * Eliminates per-request SELECT * from products table.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { loadEnrichedData, findEnrichmentForProduct } from './enrichment';
import { getMarkupSettings, applyMarkupToPrice } from '@/lib/markup';
import { MAX_RELEVANT_PRODUCTS } from './config';

// In-memory product cache
let cachedProducts: any[] | null = null;
let productsCacheTime = 0;
const PRODUCTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory settings cache
let cachedSettings: Record<string, string> | null = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active products (price > 0, not deleted) with caching.
 */
export async function getActiveProducts(): Promise<any[]> {
  const now = Date.now();
  if (cachedProducts && (now - productsCacheTime) < PRODUCTS_CACHE_TTL) {
    return cachedProducts;
  }

  const [{ data: dbProducts }, settings] = await Promise.all([
    supabaseAdmin.from('products').select('*'),
    getCachedSettings()
  ]);

  let hiddenIds: string[] = [];
  if (settings.hidden_product_ids) {
    try {
      const parsed = JSON.parse(settings.hidden_product_ids);
      if (Array.isArray(parsed)) hiddenIds = parsed.map(String);
    } catch (e) {}
  }

  cachedProducts = dbProducts
    ? dbProducts.filter((p: any) => 
        p.price > 0 && 
        !p.name?.includes('[УДАЛЕН]') && 
        !p.is_hidden && 
        !hiddenIds.includes(String(p.id))
      )
    : [];
  productsCacheTime = now;
  return cachedProducts;
}

/**
 * Get site settings as a key-value map with caching.
 */
export async function getCachedSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedSettings && (now - settingsCacheTime) < SETTINGS_CACHE_TTL) {
    return cachedSettings;
  }

  const { data: settingsData } = await supabaseAdmin.from('site_settings').select('key, value');
  const map: Record<string, string> = {};
  if (settingsData) {
    for (const s of settingsData) {
      map[s.key] = s.value;
    }
  }
  cachedSettings = map;
  settingsCacheTime = now;
  return map;
}

/**
 * Helper: get a single setting with a default value.
 */
export function getSetting(settings: Record<string, string>, key: string, defaultValue: string): string {
  return settings[key] || defaultValue;
}

/**
 * Format product list with enrichment data (properties, synergies) and markup pricing
 * into a RAG-friendly text string for AI prompts.
 */
export async function formatCatalogProducts(dbProducts: any[]): Promise<string> {
  try {
    if (!dbProducts || dbProducts.length === 0) return 'Каталог пуст.';

    const enrichedData = await loadEnrichedData();
    const markupSettings = await getMarkupSettings();

    return dbProducts
      .map((p: any) => {
        const enrich = findEnrichmentForProduct(p.name, enrichedData);
        const props = enrich.properties ? enrich.properties.join(', ') : 'Общее оздоровление';
        const synergies = enrich.synergies ? enrich.synergies.join('; ') : 'Отсутствует';
        const markedPrice = applyMarkupToPrice(Number(p.price) || 0, markupSettings);
        return `- [ID: ${p.id}] ${p.name} (${p.full_name || p.name}): Цена: ${markedPrice} сомони. Свойства: [${props}]. Синергия: [${synergies}]`;
      })
      .join('\n');
  } catch (error) {
    console.error('❌ Ошибка при сборке каталога:', error);
    return 'Ошибка загрузки каталога.';
  }
}
