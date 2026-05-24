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
