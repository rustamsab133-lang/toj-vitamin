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
export const revalidate = 0;

/**
 * GET /api/b2b/pharmacy
 * Возвращает каталог товаров с базовыми оптовыми ценами (products.price)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // Получаем список всех товаров
    const { data: products, error: prodError } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('name');

    if (prodError || !products) {
      throw prodError || new Error('Ошибка загрузки каталога товаров');
    }

    // Получаем наценку розницы
    const { data: settingsData } = await supabaseAdmin
      .from('site_settings')
      .select('*');
    const percentSetting = settingsData?.find((s: any) => s.key === 'price_markup_percent');
    const flatSetting = settingsData?.find((s: any) => s.key === 'price_markup_flat');
    const markupSettings = {
      percent: parseFloat(percentSetting?.value || '0') || 0,
      flat: parseFloat(flatSetting?.value || '0') || 0
    };

    if (token) {
      // Ищем аптеку по токену
      const { data: pharmacy, error: pharmError } = await supabaseAdmin
        .from('pharmacies')
        .select('*')
        .eq('token', token)
        .eq('status', 'active')
        .single();

      if (pharmError || !pharmacy) {
        return NextResponse.json({ error: 'Недействительный B2B токен или партнер заблокирован' }, { status: 404 });
      }

      // Пересчитываем товары со скидкой аптеки
      const b2bProducts = products.map((p: any) => {
        const baseWholesale = Number(p.price) || 0;
        
        let retail = baseWholesale;
        if (markupSettings.percent > 0) retail = retail * (1 + markupSettings.percent / 100);
        retail = retail + markupSettings.flat;
        const retailPrice = Math.round(retail);

        const discountPrice = Math.round(baseWholesale * (1 - (Number(pharmacy.discount_percent) || 0) / 100));

        return {
          id: p.id,
          name: p.name,
          full_name: p.full_name,
          description: p.description,
          image_url: p.image_url,
          icon_type: p.icon_type,
          retail_price: retailPrice,
          price: discountPrice,
          discount_percent: pharmacy.discount_percent
        };
      });

      return NextResponse.json({ pharmacy, products: b2bProducts });
    }

    // Формируем чистые оптовые товары для публичного доступа
    const b2bProducts = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      full_name: p.full_name,
      description: p.description,
      image_url: p.image_url,
      icon_type: p.icon_type,
      price: Number(p.price) || 0 // Базовая оптовая цена из базы данных
    }));

    return NextResponse.json({ products: b2bProducts });
  } catch (error: any) {
    console.error('B2B GET Products Error:', error);
    return NextResponse.json({ error: error.message || 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/b2b/pharmacy
 * Оформление заказа B2B с поиском или авто-регистрацией аптеки по номеру телефона
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, phone, pharmacy_name, address, notes, delivery_date, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Корзина заказа пуста' }, { status: 400 });
    }

    let pharmacy: any = null;

    if (token) {
      // 1. Оформление через личный кабинет по токену
      const { data: pharmData, error: fetchError } = await supabaseAdmin
        .from('pharmacies')
        .select('*')
        .eq('token', token)
        .eq('status', 'active')
        .single();

      if (fetchError || !pharmData) {
        return NextResponse.json({ error: 'Недействительный токен аптеки' }, { status: 404 });
      }
      pharmacy = pharmData;
    } else {
      // 2. Публичное оформление в один клик
      if (!phone || !pharmacy_name) {
        return NextResponse.json({ error: 'Номер телефона и название аптеки обязательны' }, { status: 400 });
      }

      // Очищаем номер телефона для точного поиска
      const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');

      // Ищем, есть ли уже такая аптека в базе данных (по очищенному номеру телефона)
      const { data: pharmacies, error: fetchError } = await supabaseAdmin
        .from('pharmacies')
        .select('*');

      if (fetchError) throw fetchError;

      pharmacy = pharmacies?.find(p => {
        if (!p.phone) return false;
        const dbClean = p.phone.replace(/[\s\-\(\)\+]/g, '');
        return dbClean.endsWith(cleanPhone) || cleanPhone.endsWith(dbClean);
      });

      // Если аптеки нет, создаем новую запись со статусом 'lead'
      if (!pharmacy) {
        const { data: newPharm, error: createError } = await supabaseAdmin
          .from('pharmacies')
          .insert({
            name: pharmacy_name.trim(),
            phone: phone.trim(),
            address: (address || '').trim(),
            status: 'lead', // Помечаем как заявку, чтобы менеджер мог одобрить партнера
            discount_percent: 0, // У лида скидка 0% на первый заказ (идут по базовой оптовой цене)
            credit_limit: 0,
            balance: 0,
            token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) // генерируем случайный токен
          })
          .select('*')
          .single();

        if (createError) throw createError;
        pharmacy = newPharm;
      }
    }

    // 3. Сверяем товары и рассчитываем итоговую сумму заказа с учетом скидки аптеки
    const productIds = items.map(i => i.product_id);
    const { data: dbProducts, error: prodError } = await supabaseAdmin
      .from('products')
      .select('id, name, price')
      .in('id', productIds);

    if (prodError || !dbProducts) {
      throw prodError || new Error('Ошибка при проверке каталога товаров');
    }

    let totalAmount = 0;
    const orderItems = items.map((cartItem: any) => {
      const dbProd = dbProducts.find(p => String(p.id) === String(cartItem.product_id));
      if (!dbProd) {
        throw new Error(`Товар с ID ${cartItem.product_id} не найден в базе данных`);
      }

      // Берем оптовую цену со скидкой аптеки
      const baseWholesale = Number(dbProd.price) || 0;
      const discount = Number(pharmacy.discount_percent) || 0;
      const price = Math.round(baseWholesale * (1 - discount / 100));
      
      const qty = parseInt(cartItem.quantity) || 1;
      const subtotal = price * qty;
      totalAmount += subtotal;

      return {
        product_id: dbProd.id,
        name: dbProd.name,
        quantity: qty,
        price: price
      };
    });

    // 4. Проверяем кредитный лимит для зарегистрированных аптек
    if (token) {
      const availableCredit = Math.max(pharmacy.credit_limit - pharmacy.balance, 0);
      if (totalAmount > availableCredit) {
        return NextResponse.json({ error: 'Превышен лимит долга аптеки' }, { status: 400 });
      }
    }

    // 5. Создаем заказ
    const { data: orderData, error: insertError } = await supabaseAdmin
      .from('pharmacy_orders')
      .insert({
        pharmacy_id: pharmacy.id,
        items: orderItems,
        total_amount: totalAmount,
        payment_method: 'deferred',
        payment_status: 'unpaid',
        order_status: 'new',
        notes: notes || '',
        delivery_date: delivery_date || null
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    // 6. Обновляем баланс долга аптеки
    const newBalance = (Number(pharmacy.balance) || 0) + totalAmount;
    await supabaseAdmin
      .from('pharmacies')
      .update({ balance: newBalance })
      .eq('id', pharmacy.id);

    return NextResponse.json({
      success: true,
      order_id: orderData.id,
      balance: newBalance,
      total_amount: totalAmount,
      pharmacy_status: pharmacy.status
    });
  } catch (error: any) {
    console.error('B2B Order Submission Error:', error);
    return NextResponse.json({ error: error.message || 'Ошибка при оформлении заказа' }, { status: 500 });
  }
}
