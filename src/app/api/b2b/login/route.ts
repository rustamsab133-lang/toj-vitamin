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
 * POST /api/b2b/login
 * Проверяет номер телефона аптеки и возвращает её токен для входа
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, pharmacy_name, address, contact_person } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Номер телефона обязателен' }, { status: 400 });
    }

    // Очищаем вводимый номер телефона от лишних символов (пробелы, тире, скобки, плюс) для гибкого поиска
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');

    if (cleanPhone.length < 7) {
      return NextResponse.json({ error: 'Неверный формат номера телефона (минимум 7-9 цифр)' }, { status: 400 });
    }

    // Загружаем все аптеки, чтобы сравнить очищенные номера телефонов
    const { data: pharmacies, error } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name, phone, token, status');

    if (error) {
      throw error || new Error('Ошибка при проверке базы данных');
    }

    // Ищем аптеку по совпадению очищенных номеров
    const matchedPharmacy = pharmacies?.find(p => {
      if (!p.phone) return false;
      const dbCleanPhone = p.phone.replace(/[\s\-\(\)\+]/g, '');
      return dbCleanPhone.endsWith(cleanPhone) || cleanPhone.endsWith(dbCleanPhone);
    });

    if (matchedPharmacy) {
      return NextResponse.json({
        success: true,
        token: matchedPharmacy.token,
        name: matchedPharmacy.name
      });
    }

    // Если аптека еще не зарегистрирована, но указано название — регистрируем в 1 клик
    if (pharmacy_name && pharmacy_name.trim()) {
      const { randomUUID } = await import('crypto');
      const newToken = randomUUID();
      const formattedPhone = cleanPhone.startsWith('992') ? `+${cleanPhone}` : `+992${cleanPhone}`;

      const { data: newPharm, error: createError } = await supabaseAdmin
        .from('pharmacies')
        .insert({
          name: pharmacy_name.trim(),
          phone: formattedPhone,
          address: (address || '').trim(),
          contact_person: (contact_person || '').trim(),
          status: 'active',
          discount_percent: 0,
          credit_limit: 0,
          balance: 0,
          token: newToken
        })
        .select('*')
        .single();

      if (createError) throw createError;

      return NextResponse.json({
        success: true,
        token: newPharm.token,
        name: newPharm.name,
        is_new: true
      });
    }

    return NextResponse.json({ 
      not_found: true,
      error: 'Номер телефона не найден в базе. Укажите название вашей аптеки для мгновенного создания кабинета.' 
    }, { status: 404 });
  } catch (error: any) {
    console.error('B2B Login Error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
