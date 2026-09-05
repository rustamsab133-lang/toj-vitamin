/**
 * Unified enrichment module — single source of truth for product enrichment data.
 * Replaces duplicated findEnrichmentForProduct across web-chat, instagram, and instagram/chat routes.
 * 
 * Data loading priority:
 * 1. In-memory cache (if TTL not expired)
 * 2. Supabase site_settings (key: 'enriched_gls_products_data')
 * 3. Local JSON file fallback (src/data/enriched_gls_products.json)
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';

// In-memory cache with TTL
let cachedEnrichedData: Record<string, any> | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load enriched product data with caching.
 * Tries Supabase first, then falls back to local JSON file.
 */
export async function loadEnrichedData(): Promise<Record<string, any>> {
  const now = Date.now();
  if (cachedEnrichedData && (now - cacheLoadedAt) < CACHE_TTL_MS) {
    return cachedEnrichedData;
  }

  let data: Record<string, any> = {};

  // 1. Try Supabase
  try {
    const { data: setting } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'enriched_gls_products_data')
      .single();

    if (setting?.value) {
      data = JSON.parse(setting.value);
    }
  } catch (e) {
    console.error('❌ Ошибка загрузки enriched данных из Supabase:', e);
  }

  // 2. Fallback to local file (only in Node.js runtime, not Edge)
  if (Object.keys(data).length === 0) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const jsonPath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');
      if (fs.existsSync(jsonPath)) {
        data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      }
    } catch (err) {
      console.warn('⚠️ Не удалось загрузить локальный файл обогащения:', err);
    }
  }

  cachedEnrichedData = data;
  cacheLoadedAt = now;
  return data;
}

/**
 * Smart fuzzy matching of product names to enrichment data keys.
 * Uses a 4-step matching strategy:
 * 1. Exact match (lowercased)
 * 2. Cleaned match (remove dosage forms, brands, packaging info)
 * 3. Substring match (longest key first for specificity)
 * 4. Word-level match (first word or first two words)
 */
export function findEnrichmentForProduct(
  productName: string,
  enrichedData: Record<string, any>
): Record<string, any> {
  if (!productName) return {};
  const name = productName.toLowerCase().trim();

  // 1. Exact match
  if (enrichedData[name]) return enrichedData[name];

  // 2. Cleaned match — remove dosage forms, brands, packaging
  let cleaned = name
    .replace(/\([^)]+\)/g, ' ')
    .replace(/капс\.*|таб\.*|порошок|экстракт|комплекс|сироп/gi, ' ')
    .replace(/gls|pharm|№\d+|\d+\s*мг|\d+\s*г|\d+\s*ие|\d+\s*ме/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (enrichedData[cleaned]) return enrichedData[cleaned];

  // 3. Substring match (longer keys first for specificity)
  const keys = Object.keys(enrichedData).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return enrichedData[key];
    }
  }

  // 4. Word-level match
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 1) {
    const firstWord = words[0];
    if (enrichedData[firstWord]) return enrichedData[firstWord];
    if (words.length >= 2) {
      const firstTwo = `${words[0]} ${words[1]}`;
      if (enrichedData[firstTwo]) return enrichedData[firstTwo];
    }
  }

  return {};
}
