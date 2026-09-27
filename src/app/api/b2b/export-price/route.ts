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

function extractBrand(name: string, description: string): string {
  const text = `${name || ''} ${description || ''}`.toLowerCase();
  if (text.includes('gls')) return 'GLS Pharmaceuticals';
  if (text.includes('now') || text.includes('now foods')) return 'NOW Foods';
  if (text.includes('solgar') || text.includes('солгар')) return 'Solgar';
  if (text.includes('doppelherz') || text.includes('доппельгерц')) return 'Doppelherz';
  return 'TOJ-VITAMIN';
}

/**
 * GET /api/b2b/export-price
 * Генерирует CSV-файл с оптовыми ценами товаров (с фильтрацией по бренду: ?brand=gls|now|all)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandFilter = searchParams.get('brand')?.toLowerCase();

    // 1. Получаем все товары из базы данных
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('name, price, description')
      .order('name');

    if (error || !products) {
      throw error || new Error('Не удалось получить товары');
    }

    // 2. Добавляем бренд и фильтруем при необходимости
    const enriched = products.map(p => ({
      ...p,
      brand: extractBrand(p.name, p.description || '')
    }));

    let filtered = enriched;
    let filename = 'price_tojvitamin_distribution.csv';

    if (brandFilter) {
      if (brandFilter === 'gls') {
        filtered = enriched.filter(p => p.brand === 'GLS Pharmaceuticals');
        filename = 'price_gls_pharmaceuticals_tojvitamin.csv';
      } else if (brandFilter === 'now' || brandFilter === 'nowfoods') {
        filtered = enriched.filter(p => p.brand === 'NOW Foods');
        filename = 'price_now_foods_tojvitamin.csv';
      } else if (brandFilter === 'solgar') {
        filtered = enriched.filter(p => p.brand === 'Solgar');
        filename = 'price_solgar_tojvitamin.csv';
      }
    }

    // 3. Формируем CSV контент
    const headers = ['Бренд', 'Название товара', 'Базовая оптовая цена (TJS)', 'Форма выпуска / Описание'];
    const rows = filtered.map(p => [
      `"${p.brand}"`,
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
