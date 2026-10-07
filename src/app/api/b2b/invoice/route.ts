import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  {
    auth: { persistSession: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  }
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');

    if (!orderId) {
      return NextResponse.json({ error: 'Параметр id обязателен' }, { status: 400 });
    }

    // 1. Fetch Order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('pharmacy_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    // 2. Fetch Pharmacy
    const { data: pharmacy } = await supabaseAdmin
      .from('pharmacies')
      .select('id, name, phone, address, contact_person, discount_percent')
      .eq('id', order.pharmacy_id)
      .maybeSingle();

    const orderItems: any[] = Array.isArray(order.items) ? order.items : [];
    const phDiscount = Number(pharmacy?.discount_percent) || 0;

    // 3. Optional: Fetch product base prices to check if items were saved discounted
    const productIds = orderItems.map(it => String(it.product_id)).filter(Boolean);
    let dbProducts: any[] = [];
    if (productIds.length > 0) {
      const { data: prods } = await supabaseAdmin
        .from('products')
        .select('id, price')
        .in('id', productIds);
      if (prods) dbProducts = prods;
    }

    const storedSubtotal = Math.round(
      orderItems.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0) * 100
    ) / 100;

    const finalTotal = Number(order.total_amount) || storedSubtotal;

    let subtotal = storedSubtotal;
    let discountPercent = 0;
    let discountAmount = 0;
    let items = orderItems;

    if (storedSubtotal > finalTotal) {
      discountAmount = Math.round((storedSubtotal - finalTotal) * 100) / 100;
      discountPercent = phDiscount > 0 ? phDiscount : Math.round((discountAmount / storedSubtotal) * 100);
    } else if (phDiscount > 0 && dbProducts.length > 0) {
      const canRestore = orderItems.some(it => {
        const prod = dbProducts.find(p => String(p.id) === String(it.product_id));
        return prod && Number(prod.price) > Number(it.price);
      });

      if (canRestore) {
        const restored = orderItems.map(it => {
          const prod = dbProducts.find(p => String(p.id) === String(it.product_id));
          const bp = prod ? Number(prod.price) : Number(it.price);
          return { ...it, price: bp };
        });
        const restoredSubtotal = Math.round(
          restored.reduce((acc, it) => acc + (Number(it.quantity) || 0) * Number(it.price), 0) * 100
        ) / 100;
        if (restoredSubtotal > finalTotal) {
          items = restored;
          subtotal = restoredSubtotal;
          discountAmount = Math.round((subtotal - finalTotal) * 100) / 100;
          discountPercent = phDiscount;
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        created_at: order.created_at,
        notes: order.notes || '',
        delivery_date: order.delivery_date || null,
        order_status: order.order_status,
        payment_status: order.payment_status
      },
      pharmacy: {
        id: pharmacy?.id || order.pharmacy_id,
        name: pharmacy?.name || 'Оптовый покупатель',
        phone: pharmacy?.phone || '',
        address: pharmacy?.address || '',
        contact_person: pharmacy?.contact_person || '',
        discount_percent: discountPercent
      },
      items,
      subtotal,
      discountPercent,
      discountAmount,
      finalTotal
    });
  } catch (error: any) {
    console.error('Invoice API error:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
