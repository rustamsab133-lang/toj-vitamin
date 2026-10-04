import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  {
    auth: { persistSession: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  }
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/b2b/export-price
 * Генерирует официальный CSV-файл с оптовыми ценами продукции GLS Pharmaceuticals
 */
export async function GET() {
  try {
    // 1. Получаем товары из базы данных и список товаров только для розницы
    const [{ data: products, error }, { data: retailOnlySetting }] = await Promise.all([
      supabaseAdmin
        .from('products')
        .select('id, name, price, description')
        .order('name'),
      supabaseAdmin
        .from('site_settings')
        .select('value')
        .eq('key', 'retail_only_product_ids')
        .maybeSingle()
    ]);

    if (error || !products) {
      throw error || new Error('Не удалось получить товары');
    }

    let retailOnlyIds: string[] = [];
    if (retailOnlySetting?.value) {
      try {
        const parsed = JSON.parse(retailOnlySetting.value);
        if (Array.isArray(parsed)) retailOnlyIds = parsed.map(String);
      } catch (e) {}
    }

    // Исключаем товары «Только для розницы»
    const wholesaleProducts = products.filter(p => !retailOnlyIds.includes(String(p.id)));

    // Фильтруем или помечаем как GLS Pharmaceuticals
    const filename = 'price_gls_pharmaceuticals_tojvitamin.csv';

    // 2. Формируем CSV контент
    const headers = ['Бренд', 'Название товара', 'Базовая оптовая цена (TJS)', 'Форма выпуска / Описание'];
    const rows = wholesaleProducts.map(p => [
      '"GLS Pharmaceuticals"',
      `"${p.name.replace(/"/g, '""')}"`,
      p.price || 0,
      `"${(p.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    // Объединяем в CSV строку с разделителем точка с запятой (для русской локали Excel)
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

    // Добавляем UTF-8 BOM чтобы Excel правильно читал кириллицу
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    
    return new Response(blob, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error: any) {
    console.error('B2B Price Export Error:', error);
    return NextResponse.json({ error: 'Не удалось экспортировать прайс-лист' }, { status: 500 });
  }
}
