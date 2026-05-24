import { supabase } from './supabase';

export interface MarkupSettings {
  percent: number;
  flat: number;
}

/**
 * Loads pricing markup settings from the site_settings table.
 */
export async function getMarkupSettings(): Promise<MarkupSettings> {
  try {
    const { data } = await supabase.from('site_settings').select('key, value');
    const percentSetting = data?.find(s => s.key === 'price_markup_percent');
    const flatSetting = data?.find(s => s.key === 'price_markup_flat');
    
    return {
      percent: parseFloat(percentSetting?.value || '0') || 0,
      flat: parseFloat(flatSetting?.value || '0') || 0
    };
  } catch (e) {
    console.error('Failed to load markup settings:', e);
    return { percent: 0, flat: 0 };
  }
}

/**
 * Applies both percentage and flat markups to a base price and rounds the result nicely.
 */
export function applyMarkupToPrice(basePrice: number, settings: MarkupSettings): number {
  if (!basePrice || basePrice <= 0) return 0;
  let finalPrice = basePrice;
  if (settings.percent > 0) {
    finalPrice = finalPrice * (1 + settings.percent / 100);
  }
  finalPrice = finalPrice + settings.flat;
  return Math.round(finalPrice);
}

/**
 * Applies markup to a product object.
 */
export function applyMarkupToProduct(product: any, settings: MarkupSettings) {
  if (!product) return product;
  return {
    ...product,
    price: applyMarkupToPrice(Number(product.price) || 0, settings)
  };
}
