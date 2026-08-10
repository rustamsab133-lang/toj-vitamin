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
 * Генерирует CSV-файл с оптовыми ценами товаров (products.price)
 */
export async function GET() {
  try {
    // 1. Получаем все товары из базы данных
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('name, price, description')
      .order('name');

    if (error || !products) {
      throw error || new Error('Не удалось получить товары');
    }

    // 2. Формируем CSV контент
    // Заголовки колонок
    const headers = ['Название товара', 'Оптовая цена (TJS)', 'Описание'];
    const rows = products.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.price || 0,
      `"${(p.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    // Объединяем в CSV строку с разделителем точка с запятой (для русской локали Excel)
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');

    // Добавляем UTF-8 BOM (Byte Order Mark) чтобы Excel правильно читал кириллицу
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Возвращаем файл для скачивания
    return new Response(blob, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': 'attachment; filename="opt_price_tojvitamin.csv"'
      }
    });
  } catch (error: any) {
    console.error('B2B Price Export Error:', error);
    return NextResponse.json({ error: 'Не удалось экспортировать прайс-лист' }, { status: 500 });
  }
}
