import { supabase } from './supabase';
import { getMarkupSettings, applyMarkupToProduct } from './markup';
import { Product } from './types';
import { getHiddenProductIds, filterVisibleProducts, isProductHidden } from './hiddenProducts';

/**
 * Unified helper to fetch all active products from Supabase with the pricing markup automatically applied.
 * ALWAYS use this helper in new components, pages, or API routes instead of querying supabase.from('products') directly!
 */
export async function getProductsWithMarkup(): Promise<Product[]> {
  try {
    const [{ data: products, error }, hiddenIds] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .order('id'),
      getHiddenProductIds()
    ]);

    if (error || !products) {
      console.error('❌ Error fetching products:', error?.message);
      return [];
    }

    // Filter out hidden products (out of stock)
    const visibleProducts = filterVisibleProducts(products, hiddenIds);

    // Apply pricing markup dynamically
    const markupSettings = await getMarkupSettings();
    return visibleProducts.map(p => applyMarkupToProduct(p, markupSettings));
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
    const hiddenIds = await getHiddenProductIds();
    if (isProductHidden(id, hiddenIds)) {
      return null;
    }

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      console.error(`❌ Error fetching product ID ${id}:`, error?.message);
      return null;
    }

    if (isProductHidden(product.id, hiddenIds) || product.is_hidden) {
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

  // Priority specific formulas & aliases
  if (name.includes('максиферт') || name.includes('инозитол')) return enrichedData['инозитол (максиферт)'] || {};
  if (name.includes('термо')) return enrichedData['термо комплекс'] || {};
  if (name.includes('глюко баланс') || name.includes('глюкобаланс')) return enrichedData['глюко баланс'] || {};
  if (name.includes('климмикс')) return enrichedData['климмикс'] || {};
  if (name.includes('хлорофил')) return enrichedData['жидкий хлорофил'] || enrichedData['хлорофилл'] || {};
  if (name.includes('карнитин')) return enrichedData['л-карнитин'] || {};
  if (name.includes('аргинин')) return enrichedData['аргинин 1000'] || enrichedData['л аргинин'] || {};
  if (name.includes('мужчин') && (name.includes('комплекс') || name.includes('формула'))) return enrichedData['мужская формула'] || {};
  if (name.includes('женская формула') || (name.includes('женщин') && name.includes('формула'))) return enrichedData['женская формула'] || {};
  if (name.includes('коллаген') && name.includes('сустав')) return enrichedData['коллаген для суставов с мартинией'] || enrichedData['коллаген'] || {};
  if (name.includes('коллаген')) return enrichedData['коллаген'] || {};
  if (name.includes('в-комплекс') || name.includes('b-complex') || (name.includes('комплекс') && name.includes('в'))) return enrichedData['в-комплекс'] || {};
  
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
    if (keyNorm.length > 3 && (cleanedNorm.includes(keyNorm) || keyNorm.includes(cleanedNorm))) {
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

  return {};
}

