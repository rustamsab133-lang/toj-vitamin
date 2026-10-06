import { supabase } from './supabase';
import { getMarkupSettings, applyMarkupToProduct } from './markup';
import { Product } from './types';
import { getHiddenProductIds, filterVisibleProducts, isProductHidden } from './hiddenProducts';

import enrichedData from '@/data/enriched_gls_products.json';

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
    return visibleProducts.map(p => {
      const marked = applyMarkupToProduct(p, markupSettings);
      const enriched = findEnrichmentForProduct(marked.name, enrichedData, marked.id);
      const gallery: string[] = (marked as any).images || enriched?.gallery || [];
      const images = gallery.length > 0 ? gallery : (marked.image_url ? [marked.image_url] : []);
      const back_image_url = images.length > 1 ? images[1] : undefined;
      const byId = (enrichedData as any).by_product_id?.[String(marked.id)];
      const properties = (byId?.properties && byId.properties.length > 0) ? byId.properties : enriched?.properties;
      const description = marked.description || byId?.description || enriched?.description;
      const instructions = byId?.instructions || enriched?.instructions;
      const instructions_en = byId?.instructions_en || enriched?.instructions_en;
      return {
        ...marked,
        description,
        properties,
        images,
        back_image_url,
        instructions,
        instructions_en
      };
    });
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
    const marked = applyMarkupToProduct(product, markupSettings);
    const enriched = findEnrichmentForProduct(marked.name, enrichedData, marked.id);
    const gallery: string[] = (marked as any).images || enriched?.gallery || [];
    const images = gallery.length > 0 ? gallery : (marked.image_url ? [marked.image_url] : []);
    const back_image_url = images.length > 1 ? images[1] : undefined;
    const byId = (enrichedData as any).by_product_id?.[String(marked.id)];
    const properties = (byId?.properties && byId.properties.length > 0) ? byId.properties : enriched?.properties;
    const description = marked.description || byId?.description || enriched?.description;
    const instructions = byId?.instructions || enriched?.instructions;
    const instructions_en = byId?.instructions_en || enriched?.instructions_en;
    return {
      ...marked,
      description,
      properties,
      images,
      back_image_url,
      instructions,
      instructions_en
    };
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
export function findEnrichmentForProduct(pName: string, enrichedData: Record<string, any>, productId?: string | number): any {
  if (!pName || !enrichedData) return {};
  const name = pName.toLowerCase().trim();

  // Helper to attach exact verified data by product ID if available
  const attachIdData = (res: any) => {
    if (!res || typeof res !== 'object') res = {};
    if (productId && (enrichedData as any).by_product_id?.[String(productId)]) {
      const byId = (enrichedData as any).by_product_id[String(productId)];
      return {
        ...res,
        description: byId.description || res.description,
        properties: (byId.properties && byId.properties.length > 0) ? byId.properties : res.properties,
        instructions: byId.instructions || res.instructions,
        instructions_en: byId.instructions_en || res.instructions_en,
        properties_en: (byId.properties_en && byId.properties_en.length > 0) ? byId.properties_en : res.properties_en
      };
    }
    return res;
  };

  // Non-GLS brand protection: products from other brands (NOW, Solaray, QEEP, etc.)
  // have their own rich data in Supabase and should not be matched to GLS enrichment.
  const nonGlsBrandMarkers = [
    'now foods', 'now', 'solaray', 'qeep', 'solgar', 'thorne',
    'life extension', 'california gold', 'swanson', "doctor's best",
    '21st century', 'optimum nutrition', 'natrol', 'jarrow',
    'nordic naturals', 'pure encapsulations'
  ];
  if (nonGlsBrandMarkers.some(brand => name.startsWith(brand) || name.includes(brand))) {
    return attachIdData({});
  }

  // Priority specific formulas & aliases
  if (name.includes('максиферт')) return attachIdData(enrichedData['инозитол (максиферт)'] || {});
  if (name.includes('термо')) return attachIdData(enrichedData['термо комплекс'] || {});
  if (name.includes('глюко баланс') || name.includes('глюкобаланс')) return attachIdData(enrichedData['глюко баланс'] || {});
  if (name.includes('климмикс')) return attachIdData(enrichedData['климмикс'] || {});
  if (name.includes('хлорофил')) return attachIdData(enrichedData['жидкий хлорофил'] || enrichedData['хлорофилл'] || {});
  if (name.includes('карнитин') && (name.includes('gls') || !name.includes(' '))) return attachIdData(enrichedData['л-карнитин'] || {});
  if (name.includes('аргинин') && (name.includes('gls') || !name.includes(' '))) return attachIdData(enrichedData['аргинин 1000'] || enrichedData['л аргинин'] || {});
  if (name.includes('мужчин') && (name.includes('комплекс') || name.includes('формула'))) return attachIdData(enrichedData['мужская формула'] || {});
  if (name.includes('женская формула') || (name.includes('женщин') && name.includes('формула'))) return attachIdData(enrichedData['женская формула'] || {});
  if (name.includes('берберин') || name.includes('барбарис')) return attachIdData(enrichedData['барбарис берберин'] || {});
  if (name.includes('коллаген')) {
    if (name.includes('сустав')) return attachIdData(enrichedData['коллаген для суставов с мартинией'] || enrichedData['коллаген'] || {});
    return attachIdData(enrichedData['коллаген'] || {});
  }
  if (name.includes('в-комплекс') || name.includes('b-complex') || (name.includes('комплекс') && (/\bв\b/i.test(name) || /\bb\b/i.test(name)))) {
    return attachIdData(enrichedData['в-комплекс'] || {});
  }
  
  // 1. Try exact match
  if (enrichedData[name]) return attachIdData(enrichedData[name]);

  // Helper to normalize strings for comparison (remove spaces, symbols)
  const normalize = (str: string) => str.replace(/[\(\)\d№мгг\-\+\s_%—]/g, '');
  const nameNorm = normalize(name);

  // 2. Try normalized exact match
  const keys = Object.keys(enrichedData);
  for (const key of keys) {
    if (normalize(key) === nameNorm) {
      return attachIdData(enrichedData[key]);
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
      return attachIdData(enrichedData[key]);
    }
  }

  // 5. Try standard substring matching on raw cleaned
  const sortedKeys = [...keys].sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return attachIdData(enrichedData[key]);
    }
  }

  // 6. Word-by-word fallback
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 1) {
    const firstWord = words[0];
    if (enrichedData[firstWord]) return attachIdData(enrichedData[firstWord]);
    if (words.length >= 2) {
      const firstTwo = firstWord + ' ' + words[1];
      if (enrichedData[firstTwo]) return attachIdData(enrichedData[firstTwo]);
    }
  }

  return attachIdData({});
}

