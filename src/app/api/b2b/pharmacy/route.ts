import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

function extractProductBrand(p: any): string {
  if (p.brand && typeof p.brand === 'string' && p.brand.trim()) {
    return p.brand.trim();
  }
  const tagsStr = Array.isArray(p.tags) ? p.tags.join(' ') : (p.tags || '');
  const text = `${p.name || ''} ${p.full_name || ''} ${tagsStr}`.toLowerCase();
  
  if (text.includes('gls')) return 'GLS Pharmaceuticals';
  if (text.includes('now foods') || /\bnow\b/.test(text)) return 'NOW Foods';
  if (text.includes('solgar') || text.includes('солгар')) return 'Solgar';
  if (text.includes('doppelherz') || text.includes('доппельгерц')) return 'Doppelherz';
  if (text.includes('nature') && text.includes('bounty')) return "Nature's Bounty";
  if (text.includes('california gold') || text.includes('cgn')) return 'California Gold Nutrition';
  if (text.includes('swanson')) return 'Swanson';
  if (text.includes('doctor') && text.includes('best')) return "Doctor's Best";
  if (text.includes('evalar') || text.includes('эвалар')) return 'Эвалар';
  if (text.includes('21st century')) return '21st Century';
  if (text.includes('thorne')) return 'Thorne';
  if (text.includes('life extension')) return 'Life Extension';
  if (text.includes('nutricost')) return 'Nutricost';

  return 'TOJ-VITAMIN';
}

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

    // Получаем наценку розницы и список скрытых товаров
    const { data: settingsData } = await supabaseAdmin
      .from('site_settings')
      .select('*');
    const percentSetting = settingsData?.find((s: any) => s.key === 'price_markup_percent');
    const flatSetting = settingsData?.find((s: any) => s.key === 'price_markup_flat');
    const markupSettings = {
      percent: parseFloat(percentSetting?.value || '0') || 0,
      flat: parseFloat(flatSetting?.value || '0') || 0
    };

    const hiddenSetting = settingsData?.find((s: any) => s.key === 'hidden_product_ids');
    let hiddenIds: string[] = [];
    if (hiddenSetting?.value) {
      try {
        const parsed = JSON.parse(hiddenSetting.value);
        if (Array.isArray(parsed)) hiddenIds = parsed.map(String);
      } catch (e) {}
    }

    const retailOnlySetting = settingsData?.find((s: any) => s.key === 'retail_only_product_ids');
    let retailOnlyIds: string[] = [];
    if (retailOnlySetting?.value) {
      try {
        const parsed = JSON.parse(retailOnlySetting.value);
        if (Array.isArray(parsed)) retailOnlyIds = parsed.map(String);
      } catch (e) {}
    }

    // Исключаем товары «Только для розницы» из оптового B2B каталога
    const wholesaleProducts = products.filter((p: any) => !retailOnlyIds.includes(String(p.id)));

    const customPricesSetting = settingsData?.find((s: any) => s.key === 'custom_retail_prices');
    let customPrices: Record<string, number> = {};
    if (customPricesSetting?.value) {
      try {
        const parsed = JSON.parse(customPricesSetting.value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.entries(parsed).forEach(([k, v]) => {
            const num = Number(v);
            if (!isNaN(num) && num > 0) customPrices[String(k)] = num;
          });
        }
      } catch (e) {}
    }

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
      const b2bProducts = wholesaleProducts.map((p: any) => {
        const baseWholesale = Number(p.price) || 0;
        const pId = String(p.id);
        const customRetail = customPrices[pId] || (p.retail_price ? Number(p.retail_price) : undefined);
        
        let retailPrice: number;
        if (customRetail && customRetail > 0) {
          retailPrice = Math.round(customRetail);
        } else {
          let retail = baseWholesale;
          if (markupSettings.percent > 0) retail = retail * (1 + markupSettings.percent / 100);
          retail = retail + markupSettings.flat;
          retailPrice = Math.round(retail);
        }

        const discountPrice = Math.round(baseWholesale * (1 - (Number(pharmacy.discount_percent) || 0) / 100));
        const isHidden = Boolean(p.is_hidden || hiddenIds.includes(pId));

        return {
          id: p.id,
          name: p.name,
          full_name: p.full_name,
          description: p.description,
          image_url: p.image_url,
          icon_type: p.icon_type,
          retail_price: retailPrice,
          price: discountPrice,
          discount_percent: pharmacy.discount_percent,
          brand: extractProductBrand(p),
          is_hidden: isHidden,
          in_stock: !isHidden
        };
      });

      // Загружаем историю заказов данной аптеки
      const { data: ordersData } = await supabaseAdmin
        .from('pharmacy_orders')
        .select('*')
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false });

      return NextResponse.json({ pharmacy, products: b2bProducts, orders: ordersData || [] });
    }

    // Формируем чистые оптовые товары для публичного доступа
    const b2bProducts = wholesaleProducts.map((p: any) => {
      const isHidden = Boolean(p.is_hidden || hiddenIds.includes(String(p.id)));
      return {
        id: p.id,
        name: p.name,
        full_name: p.full_name,
        description: p.description,
        image_url: p.image_url,
        icon_type: p.icon_type,
        price: Number(p.price) || 0, // Базовая оптовая цена из базы данных
        brand: extractProductBrand(p),
        is_hidden: isHidden,
        in_stock: !isHidden
      };
    });

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

      // Если адрес, телефон, контактное лицо или название были переданы или изменены — обновляем профиль аптеки
      const updateData: any = {};
      if (address !== undefined && address.trim() && address.trim() !== pharmacy.address) {
        updateData.address = address.trim();
      }
      if (phone !== undefined && phone.trim() && phone.trim() !== pharmacy.phone) {
        updateData.phone = phone.trim();
      }
      if (body.contact_person !== undefined && body.contact_person.trim() && body.contact_person.trim() !== pharmacy.contact_person) {
        updateData.contact_person = body.contact_person.trim();
      }
      if (pharmacy_name !== undefined && pharmacy_name.trim() && pharmacy_name.trim() !== pharmacy.name && pharmacy_name.trim() !== 'Оптовый покупатель') {
        updateData.name = pharmacy_name.trim();
      }

      if (Object.keys(updateData).length > 0) {
        await supabaseAdmin.from('pharmacies').update(updateData).eq('id', pharmacy.id);
        pharmacy = { ...pharmacy, ...updateData };
      }
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

      // Если аптека уже есть, при необходимости обновляем название и контакты
      if (pharmacy) {
        const updateData: any = {};
        if (pharmacy_name && pharmacy_name !== 'Оптовый покупатель' && (!pharmacy.name || pharmacy.name === 'Оптовый покупатель')) {
          updateData.name = pharmacy_name.trim();
        }
        if (address && address.trim() && address.trim() !== pharmacy.address) {
          updateData.address = address.trim();
        }
        if (body.contact_person && body.contact_person.trim() && body.contact_person.trim() !== pharmacy.contact_person) {
          updateData.contact_person = body.contact_person.trim();
        }
        if (!pharmacy.phone && phone) {
          updateData.phone = phone.trim();
        }
        if (Object.keys(updateData).length > 0) {
          await supabaseAdmin.from('pharmacies').update(updateData).eq('id', pharmacy.id);
          pharmacy = { ...pharmacy, ...updateData };
        }
      } else {
        // Если аптеки нет, создаем новую запись со статусом 'lead'
        const { data: newPharm, error: createError } = await supabaseAdmin
          .from('pharmacies')
          .insert({
            name: pharmacy_name.trim(),
            phone: phone.trim(),
            address: (address || '').trim(),
            contact_person: (body.contact_person || '').trim(),
            status: 'lead', // Помечаем как заявку, чтобы менеджер мог одобрить партнера
            discount_percent: 0, // У лида скидка 0% на первый заказ (идут по базовой оптовой цене)
            credit_limit: 0,
            balance: 0,
            token: randomUUID() // генерируем валидный UUID токен
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

    // Проверяем скрытые товары (которых нет в наличии) и розничные товары
    const [{ data: hiddenSettingData }, { data: retailOnlySettingData }] = await Promise.all([
      supabaseAdmin.from('site_settings').select('value').eq('key', 'hidden_product_ids').maybeSingle(),
      supabaseAdmin.from('site_settings').select('value').eq('key', 'retail_only_product_ids').maybeSingle()
    ]);

    let postHiddenIds: string[] = [];
    if (hiddenSettingData?.value) {
      try {
        const parsed = JSON.parse(hiddenSettingData.value);
        if (Array.isArray(parsed)) postHiddenIds = parsed.map(String);
      } catch (e) {}
    }

    let postRetailOnlyIds: string[] = [];
    if (retailOnlySettingData?.value) {
      try {
        const parsed = JSON.parse(retailOnlySettingData.value);
        if (Array.isArray(parsed)) postRetailOnlyIds = parsed.map(String);
      } catch (e) {}
    }

    let totalAmount = 0;
    const orderItems = items.map((cartItem: any) => {
      const dbProd = dbProducts.find(p => String(p.id) === String(cartItem.product_id));
      if (!dbProd) {
        throw new Error(`Товар с ID ${cartItem.product_id} не найден в базе данных`);
      }

      if (postHiddenIds.includes(String(dbProd.id))) {
        throw new Error(`Товар "${dbProd.name}" временно отсутствует на складе и недоступен для заказа`);
      }

      if (postRetailOnlyIds.includes(String(dbProd.id))) {
        throw new Error(`Товар "${dbProd.name}" доступен только для розничной продажи и не может быть включен в оптовый заказ`);
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

    // 4. Кредитный лимит отключен — аптеки могут свободно оформлять заказы

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

/**
 * PATCH /api/b2b/pharmacy
 * Обновляет реквизиты аптеки (название, телефон, адрес, контактное лицо) по её токену
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { token, name, phone, address, contact_person } = body;

    if (!token) {
      return NextResponse.json({ error: 'Токен авторизации обязателен' }, { status: 400 });
    }

    const { data: existing, error: findError } = await supabaseAdmin
      .from('pharmacies')
      .select('*')
      .eq('token', token)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Аптека не найдена или ссылка недействительна' }, { status: 404 });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (address !== undefined) updates.address = String(address).trim();
    if (contact_person !== undefined) updates.contact_person = String(contact_person).trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, pharmacy: existing });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('pharmacies')
      .update(updates)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, pharmacy: updated });
  } catch (error: any) {
    console.error('B2B Pharmacy PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Ошибка при обновлении профиля аптеки' }, { status: 500 });
  }
}

