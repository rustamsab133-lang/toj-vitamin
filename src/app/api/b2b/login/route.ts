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
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Номер телефона обязателен' }, { status: 400 });
    }

    // Очищаем вводимый номер телефона от лишних символов (пробелы, тире, скобки, плюс) для гибкого поиска
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');

    if (cleanPhone.length < 7) {
      return NextResponse.json({ error: 'Неверный формат номера телефона' }, { status: 400 });
    }

    // Загружаем все аптеки, чтобы сравнить очищенные номера телефонов
    // (так как в базе номера могут быть записаны по-разному: с пробелами или кодом страны)
    const { data: pharmacies, error } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name, phone, token, status')
      .eq('status', 'active'); // Пропускаем только одобренных партнеров

    if (error || !pharmacies) {
      throw error || new Error('Ошибка при проверке базы данных');
    }

    // Ищем аптеку по совпадению очищенных номеров
    const matchedPharmacy = pharmacies.find(p => {
      if (!p.phone) return false;
      const dbCleanPhone = p.phone.replace(/[\s\-\(\)\+]/g, '');
      // Проверяем, совпадает ли хвост номера (последние 7 цифр) или полный номер
      return dbCleanPhone.endsWith(cleanPhone) || cleanPhone.endsWith(dbCleanPhone);
    });

    if (!matchedPharmacy) {
      return NextResponse.json({ 
        error: 'Аптека с таким номером телефона не найдена или еще не одобрена администратором.' 
      }, { status: 404 });
    }

    // Возвращаем токен для перенаправления
    return NextResponse.json({
      success: true,
      token: matchedPharmacy.token,
      name: matchedPharmacy.name
    });
  } catch (error: any) {
    console.error('B2B Login Error:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
