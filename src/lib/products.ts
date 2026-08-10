import { supabase } from './supabase';
import { getMarkupSettings, applyMarkupToProduct } from './markup';
import { Product } from './types';

/**
 * Unified helper to fetch all active products from Supabase with the pricing markup automatically applied.
 * ALWAYS use this helper in new components, pages, or API routes instead of querying supabase.from('products') directly!
 */
export async function getProductsWithMarkup(): Promise<Product[]> {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('id');

    if (error || !products) {
      console.error('❌ Error fetching products:', error?.message);
      return [];
    }

    // Apply pricing markup dynamically
    const markupSettings = await getMarkupSettings();
    return products.map(p => applyMarkupToProduct(p, markupSettings));
  } catch (err) {
    console.error('❌ Failed to load products with markup:', err);
    return [];
  }
}

/**
 * Unified helper to fetch a single product by ID from Supabase with the pricing markup automatically applied.
 */
export async function getProductByIdWithMarkup(id: string | number): Promise<Product | null> {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      console.error(`❌ Error fetching product ID ${id}:`, error?.message);
      return null;
    }

    // Apply pricing markup dynamically
    const markupSettings = await getMarkupSettings();
    return applyMarkupToProduct(product, markupSettings);
  } catch (err) {
    console.error(`❌ Failed to load product ID ${id} with markup:`, err);
    return null;
  }
}

/**
 * Robustly matches a product name from the database (e.g. including dosage, quantity, brand) 
 * with the simplified keys of the local RAG enriched product details file.
 * Returns the enrichment object if found, or an empty object.
 */
export function findEnrichmentForProduct(pName: string, enrichedData: Record<string, any>): any {
  if (!pName || !enrichedData) return {};
  const name = pName.toLowerCase().trim();
  
  // 1. Try exact match
  if (enrichedData[name]) return enrichedData[name];

  // Helper to normalize strings for comparison (remove spaces, symbols)
  const normalize = (str: string) => str.replace(/[\(\)\d№мгг\-\+\s_%—]/g, '');
  const nameNorm = normalize(name);

  // 2. Try normalized exact match
  const keys = Object.keys(enrichedData);
  for (const key of keys) {
    if (normalize(key) === nameNorm) {
      return enrichedData[key];
    }
  }

  // 3. Clear stop words, drug forms, dosages
  const cleaned = name
    .replace(/\([^)]+\)/g, ' ') // Remove round brackets contents
    .replace(/капс\.*|таб\.*|порошок|экстракт|комплекс|сироп/gi, ' ')
    .replace(/gls|pharm|№\d+|\d+\s*мг|\d+\s*г|\d+\s*ие|\d+\s*ме/gi, ' ')
    .trim();

  const cleanedNorm = normalize(cleaned);

  // 4. Try normalized match on cleaned string
  for (const key of keys) {
    const keyNorm = normalize(key);
    if (keyNorm.length > 2 && (cleanedNorm.includes(keyNorm) || keyNorm.includes(cleanedNorm))) {
      return enrichedData[key];
    }
  }

  // 5. Try standard substring matching on raw cleaned
  const sortedKeys = [...keys].sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return enrichedData[key];
    }
  }

  // 6. Word-by-word fallback
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 1) {
    const firstWord = words[0];
    if (enrichedData[firstWord]) return enrichedData[firstWord];
    if (words.length >= 2) {
      const firstTwo = firstWord + ' ' + words[1];
      if (enrichedData[firstTwo]) return enrichedData[firstTwo];
    }
  }

  // 7. Special cases
  if (name.includes('максиферт') || name.includes('инозитол')) {
    return enrichedData['инозитол (максиферт)'] || {};
  }

  return {};
}

