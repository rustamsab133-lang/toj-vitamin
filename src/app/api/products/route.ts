import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getMarkupSettings, applyMarkupToProduct } from '@/lib/markup';
import { findEnrichmentForProduct } from '@/lib/products';
import { getHiddenProductIds, filterVisibleProducts } from '@/lib/hiddenProducts';
import enrichedData from '@/data/enriched_gls_products.json';

export const revalidate = 60; // Кэшировать на Edge CDN на 60 секунд

export async function GET() {
  try {
    // 1. Получаем свежие продукты из Supabase и список скрытых товаров
    const [{ data: products, error }, hiddenIds] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .order('id'),
      getHiddenProductIds()
    ]);

    if (error || !products) {
      return NextResponse.json({ error: error?.message || 'Failed to fetch products' }, { status: 500 });
    }

    // Исключаем скрытые товары (которых временно нет в наличии)
    const visibleProducts = filterVisibleProducts(products, hiddenIds);

    // 2. Получаем наценки
    const markupSettings = await getMarkupSettings();
    const enrichedMap = enrichedData as Record<string, any>;

    // 3. Применяем наценки и обогащаем продукты RAG-данными на сервере
    const enriched = visibleProducts.map(p => {
      const markedUpProduct = applyMarkupToProduct(p, markupSettings);
      const enrichment = findEnrichmentForProduct(p.name, enrichedMap);
      return {
        ...enrichment,
        ...markedUpProduct
      };
    });

    // Возвращаем JSON с заголовками кэширования для Edge Network
    return NextResponse.json(enriched, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600'
      }
    });
  } catch (err: any) {
    console.error('API products route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
