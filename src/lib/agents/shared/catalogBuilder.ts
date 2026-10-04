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
 * Get all active products (price > 0, not deleted) with caching and local fallback.
 */
export async function getActiveProducts(): Promise<any[]> {
  const now = Date.now();
  if (cachedProducts && cachedProducts.length > 0 && (now - productsCacheTime) < PRODUCTS_CACHE_TTL) {
    return cachedProducts;
  }

  try {
    const [{ data: dbProducts, error: dbError }, settings] = await Promise.all([
      supabaseAdmin.from('products').select('*'),
      getCachedSettings()
    ]);

    if (dbError) {
      console.error('❌ Ошибка загрузки продуктов из Supabase:', dbError);
    }

    let hiddenIds: string[] = [];
    if (settings && settings.hidden_product_ids) {
      try {
        const parsed = JSON.parse(settings.hidden_product_ids);
        if (Array.isArray(parsed)) hiddenIds = parsed.map(String);
      } catch (e) {}
    }

    if (dbProducts && Array.isArray(dbProducts) && dbProducts.length > 0) {
      const active = dbProducts.filter((p: any) => 
        p.price > 0 && 
        !p.name?.includes('[УДАЛЕН]') && 
        !p.is_hidden && 
        !hiddenIds.includes(String(p.id))
      );
      if (active.length > 0) {
        cachedProducts = active;
        productsCacheTime = now;
        return cachedProducts;
      }
    }
  } catch (err) {
    console.error('❌ Исключение при получении активных продуктов:', err);
  }

  // Если кеш уже есть и в нем есть товары, возвращаем его
  if (cachedProducts && cachedProducts.length > 0) {
    return cachedProducts;
  }

  // Резервный локальный фоллбек: загрузка из src/data/products_db.json
  try {
    const fs = await import('fs');
    const path = await import('path');
    const dbJsonPath = path.join(process.cwd(), 'src/data/products_db.json');
    if (fs.existsSync(dbJsonPath)) {
      const fallbackData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));
      if (Array.isArray(fallbackData) && fallbackData.length > 0) {
        cachedProducts = fallbackData.map((p: any) => ({
          ...p,
          price: p.price || 150
        }));
        productsCacheTime = now;
        console.warn(`⚠️ getActiveProducts: использован локальный фоллбек (${cachedProducts.length} позиций)`);
        return cachedProducts;
      }
    }
  } catch (fallbackErr) {
    console.error('❌ Ошибка загрузки локального фоллбека продуктов:', fallbackErr);
  }

  return cachedProducts || [];
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
export async function formatCatalogProducts(dbProducts: any[], lang: string = 'ru'): Promise<string> {
  try {
    if (!dbProducts || dbProducts.length === 0) {
      return lang === 'en' ? 'Catalog is empty.' : (lang === 'tj' ? 'Каталог холӣ аст.' : 'Каталог пуст.');
    }

    const enrichedData = await loadEnrichedData();
    const markupSettings = await getMarkupSettings();

    return dbProducts
      .map((p: any) => {
        const enrich = findEnrichmentForProduct(p.name, enrichedData);
        const customPrice = markupSettings.customRetailPrices?.[String(p.id)];
        const markedPrice = applyMarkupToPrice(Number(p.price) || 0, markupSettings, customPrice);

        if (lang === 'en') {
          const props = (enrich.properties_en && enrich.properties_en.length > 0)
            ? enrich.properties_en.join(', ')
            : (enrich.properties ? enrich.properties.join(', ') : 'General Wellness');
          const synergies = (enrich.synergies_en && enrich.synergies_en.length > 0)
            ? enrich.synergies_en.join('; ')
            : (enrich.synergies ? enrich.synergies.join('; ') : 'None');

          let instructStr = '';
          const instEn = enrich.instructions_en;
          if (instEn) {
            const parts: string[] = [];
            if (instEn.usage) parts.push(`Suggested use: ${instEn.usage}`);
            if (instEn.course) parts.push(`Duration: ${instEn.course}`);
            if (instEn.contraindications) parts.push(`Contraindications: ${instEn.contraindications}`);
            if (parts.length > 0) instructStr = `. Manufacturer Guidelines: [${parts.join('; ')}]`;
          }

          const enTitle = enrich.title_en || p.name;
          return `- [ID: ${p.id}] ${enTitle} (Original: ${p.name}): Price: ${markedPrice} TJS. Clinical Properties: [${props}]. Synergy Pairs: [${synergies}]${instructStr}`;
        }

        const props = enrich.properties ? enrich.properties.join(', ') : 'Общее оздоровление';
        const synergies = enrich.synergies ? enrich.synergies.join('; ') : 'Отсутствует';

        let instructStr = '';
        if (enrich.instructions) {
          const parts: string[] = [];
          if (enrich.instructions.usage) parts.push(`Прием: ${enrich.instructions.usage}`);
          if (enrich.instructions.course) parts.push(`Курс: ${enrich.instructions.course}`);
          if (enrich.instructions.contraindications) parts.push(`Противопоказания: ${enrich.instructions.contraindications}`);
          if (parts.length > 0) instructStr = `. Инструкция производителя GLS: [${parts.join('; ')}]`;
        }

        return `- [ID: ${p.id}] ${p.name} (${p.full_name || p.name}): Цена: ${markedPrice} сомони. Свойства: [${props}]. Синергия: [${synergies}]${instructStr}`;
      })
      .join('\n');
  } catch (error) {
    console.error('❌ Ошибка при сборке каталога:', error);
    return lang === 'en' ? 'Catalog loading error.' : 'Ошибка загрузки каталога.';
  }
}
