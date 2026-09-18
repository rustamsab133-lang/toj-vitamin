import { supabase } from './supabase';

export interface MarkupSettings {
  percent: number;
  flat: number;
  customRetailPrices?: Record<string, number>;
}

let cachedSettings: MarkupSettings | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds cache

/**
 * Loads pricing markup settings and custom retail prices from the site_settings table.
 */
export async function getMarkupSettings(forceRefresh = false): Promise<MarkupSettings> {
  const now = Date.now();
  if (!forceRefresh && cachedSettings !== null && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    const { data } = await supabase.from('site_settings').select('key, value');
    const percentSetting = data?.find(s => s.key === 'price_markup_percent');
    const flatSetting = data?.find(s => s.key === 'price_markup_flat');
    const customPricesSetting = data?.find(s => s.key === 'custom_retail_prices');

    let customRetailPrices: Record<string, number> = {};
    if (customPricesSetting?.value) {
      try {
        const parsed = JSON.parse(customPricesSetting.value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.entries(parsed).forEach(([k, v]) => {
            const num = Number(v);
            if (!isNaN(num) && num > 0) {
              customRetailPrices[String(k)] = num;
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse custom_retail_prices JSON:', e);
      }
    }
    
    cachedSettings = {
      percent: parseFloat(percentSetting?.value || '0') || 0,
      flat: parseFloat(flatSetting?.value || '0') || 0,
      customRetailPrices
    };
    lastFetchTime = now;
    return cachedSettings;
  } catch (e) {
    console.error('Failed to load markup settings:', e);
    return cachedSettings || { percent: 0, flat: 0, customRetailPrices: {} };
  }
}

/**
 * Invalidate in-memory cache for immediate updates after editing in admin.
 */
export function invalidateMarkupCache() {
  cachedSettings = null;
  lastFetchTime = 0;
}

/**
 * Applies both percentage and flat markups to a base price and rounds the result nicely.
 * If a valid customPrice is provided, it takes precedence.
 */
export function applyMarkupToPrice(
  basePrice: number, 
  settings: MarkupSettings, 
  customPrice?: number | null
): number {
  if (customPrice !== undefined && customPrice !== null) {
    const numCustom = Number(customPrice);
    if (!isNaN(numCustom) && numCustom > 0) {
      return Math.round(numCustom);
    }
  }

  if (!basePrice || basePrice <= 0) return 0;
  let finalPrice = basePrice;
  if (settings.percent > 0) {
    finalPrice = finalPrice * (1 + settings.percent / 100);
  }
  finalPrice = finalPrice + settings.flat;
  return Math.round(finalPrice);
}

/**
 * Applies markup or custom retail price to a product object.
 */
export function applyMarkupToProduct(product: any, settings: MarkupSettings) {
  if (!product) return product;

  const prodId = String(product.id);
  const customPrice = (product.retail_price !== undefined && product.retail_price !== null && Number(product.retail_price) > 0)
    ? Number(product.retail_price)
    : (settings.customRetailPrices ? settings.customRetailPrices[prodId] : undefined);

  const calculatedRetailPrice = applyMarkupToPrice(Number(product.price) || 0, settings, customPrice);

  return {
    ...product,
    wholesale_price: Number(product.price) || 0,
    retail_price: calculatedRetailPrice,
    is_custom_retail_price: Boolean(customPrice && Number(customPrice) > 0),
    price: calculatedRetailPrice
  };
}
