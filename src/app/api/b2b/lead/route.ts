import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Инициализируем защищенный клиент Supabase с Service Role Key для обхода RLS на сервере
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
 * POST /api/b2b/lead
 * Принимает заявку от новой аптеки с публичной страницы /opt
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, address, contact_person } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Название аптеки и номер телефона обязательны' }, { status: 400 });
    }

    // Сохраняем лид в таблицу pharmacies со статусом 'lead'
    const { data, error } = await supabaseAdmin
      .from('pharmacies')
      .insert({
        name,
        phone,
        address: address || '',
        contact_person: contact_person || '',
        status: 'lead', // Устанавливаем статус лида
        discount_percent: 0, // По умолчанию скидка 0%
        balance: 0,
        credit_limit: 0 // По умолчанию лимит долга 0 сомони
      })
      .select('id, name')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Заявка успешно принята',
      lead: data
    });
  } catch (error: any) {
    console.error('B2B Lead Submission Error:', error);
    return NextResponse.json({ error: error.message || 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
