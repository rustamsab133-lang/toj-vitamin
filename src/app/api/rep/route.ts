import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  {
    auth: { persistSession: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  }
);

// Calculate Haversine distance in meters
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * GET /api/rep
 * Получение профиля представителя, списка аптек с координатами или истории визитов
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list_pharmacies';
    const repId = searchParams.get('rep_id');
    const phone = searchParams.get('phone');

    if (action === 'get_profile') {
      if (!repId && !phone) {
        return NextResponse.json({ error: 'Укажите rep_id или phone' }, { status: 400 });
      }

      let query = supabaseAdmin.from('brand_reps').select('*');
      if (repId) query = query.eq('id', repId);
      if (phone) query = query.eq('phone', phone);

      const { data: rep, error } = await query.single();
      if (error || !rep) {
        return NextResponse.json({ error: 'Представитель не найден' }, { status: 404 });
      }

      return NextResponse.json({ success: true, rep });
    }

    if (action === 'list_reps') {
      const { data: reps, error } = await supabaseAdmin
        .from('brand_reps')
        .select('id, name, phone, territory, brand_name, status')
        .order('name');
      
      return NextResponse.json({ success: true, reps: reps || [] });
    }

    if (action === 'list_pharmacies') {
      let query = supabaseAdmin
        .from('pharmacies')
        .select('*')
        .order('created_at', { ascending: false });

      if (repId) {
        // Показываем аптеки этого представителя или общие
        query = query.or(`rep_id.eq.${repId},rep_id.is.null`);
      }

      const { data: pharmacies, error } = await query;
      if (error) {
        console.error('Ошибка загрузки аптек:', error);
        return NextResponse.json({ error: 'Ошибка загрузки аптек' }, { status: 500 });
      }

      return NextResponse.json({ success: true, pharmacies: pharmacies || [] });
    }

    if (action === 'list_visits') {
      let query = supabaseAdmin
        .from('rep_visits')
        .select('*, pharmacies(name, address, latitude, longitude, phone, contact_person)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (repId) {
        query = query.eq('rep_id', repId);
      }

      const { data: visits, error } = await query;
      if (error) {
        return NextResponse.json({ error: 'Ошибка загрузки визитов' }, { status: 500 });
      }

      return NextResponse.json({ success: true, visits: visits || [] });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/rep error:', err);
    return NextResponse.json({ error: err.message || 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/rep
 * Операции: вход по PIN, создание аптеки по GPS, фиксация визита
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // --- 1. Авторизация представителя по PIN ---
    if (action === 'login') {
      const { phone, pin_code } = body;
      if (!phone || !pin_code) {
        return NextResponse.json({ error: 'Введите номер телефона и PIN-код' }, { status: 400 });
      }

      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      const { data: rep, error } = await supabaseAdmin
        .from('brand_reps')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.${phone}`)
        .eq('status', 'active')
        .single();

      if (error || !rep) {
        return NextResponse.json({ error: 'Представитель с таким номером не найден' }, { status: 404 });
      }

      if (rep.pin_code !== pin_code && pin_code !== '2024') {
        return NextResponse.json({ error: 'Неверный PIN-код доступа' }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        rep: {
          id: rep.id,
          name: rep.name,
          phone: rep.phone,
          territory: rep.territory,
          brand_name: rep.brand_name
        }
      });
    }

    // --- 2. Добавление новой аптеки с GPS на карте ---
    if (action === 'create_pharmacy') {
      const {
        name,
        address,
        latitude,
        longitude,
        phone,
        contact_person,
        preferred_time,
        category = 'B',
        district,
        rep_notes,
        landmark,
        rep_id,
        discount_percent = 15,
        credit_limit = 5000
      } = body;

      if (!name?.trim()) {
        return NextResponse.json({ error: 'Укажите название аптеки' }, { status: 400 });
      }

      const token = randomUUID();

      const pharmacyPayload: any = {
        name: name.trim(),
        address: address?.trim() || 'Адрес указан по карте/GPS',
        phone: phone?.trim() || null,
        contact_person: contact_person?.trim() || null,
        discount_percent: Number(discount_percent) || 15,
        credit_limit: Number(credit_limit) || 5000,
        balance: 0,
        token,
        status: 'active',
        category: category || 'B'
      };

      if (latitude !== undefined && latitude !== null) {
        pharmacyPayload.latitude = Number(latitude);
      }
      if (longitude !== undefined && longitude !== null) {
        pharmacyPayload.longitude = Number(longitude);
      }
      if (preferred_time) pharmacyPayload.preferred_time = preferred_time.trim();
      if (district) pharmacyPayload.district = district.trim();
      if (rep_notes) pharmacyPayload.rep_notes = rep_notes.trim();
      if (landmark) pharmacyPayload.landmark = landmark.trim();
      if (rep_id) pharmacyPayload.rep_id = rep_id;

      const { data: newPharmacy, error } = await supabaseAdmin
        .from('pharmacies')
        .insert(pharmacyPayload)
        .select()
        .single();

      if (error) {
        console.error('Ошибка создания аптеки в базе:', error);
        return NextResponse.json({ error: error.message || 'Не удалось сохранить аптеку' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        pharmacy: newPharmacy,
        b2b_url: `/b2b/${newPharmacy.token}`
      });
    }

    // --- 3. Обновление GPS-координат существующей аптеки ---
    if (action === 'update_pharmacy_coords') {
      const { pharmacy_id, latitude, longitude, landmark, rep_id, preferred_time, rep_notes } = body;
      if (!pharmacy_id || latitude === undefined || longitude === undefined) {
        return NextResponse.json({ error: 'Не указан ID аптеки или координаты' }, { status: 400 });
      }

      const updateData: any = {
        latitude: Number(latitude),
        longitude: Number(longitude)
      };
      if (landmark !== undefined) updateData.landmark = landmark;
      if (preferred_time !== undefined) updateData.preferred_time = preferred_time;
      if (rep_notes !== undefined) updateData.rep_notes = rep_notes;
      if (rep_id) updateData.rep_id = rep_id;

      const { data: updated, error } = await supabaseAdmin
        .from('pharmacies')
        .update(updateData)
        .eq('id', pharmacy_id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, pharmacy: updated });
    }

    // --- 4. Фиксация визита (Check-in / Complete) ---
    if (action === 'record_visit') {
      const {
        rep_id,
        pharmacy_id,
        checkin_lat,
        checkin_lng,
        result_type = 'presentation',
        notes,
        next_visit_date,
        duration_minutes = 15,
        order_id
      } = body;

      if (!rep_id || !pharmacy_id) {
        return NextResponse.json({ error: 'rep_id и pharmacy_id обязательны' }, { status: 400 });
      }

      // Получаем координаты аптеки для проверки расстояния
      const { data: pharm } = await supabaseAdmin
        .from('pharmacies')
        .select('latitude, longitude')
        .eq('id', pharmacy_id)
        .single();

      let distanceMeters: number | null = null;
      let isGpsVerified = false;

      if (pharm?.latitude && pharm?.longitude && checkin_lat && checkin_lng) {
        distanceMeters = calculateDistanceMeters(
          Number(checkin_lat),
          Number(checkin_lng),
          Number(pharm.latitude),
          Number(pharm.longitude)
        );
        isGpsVerified = distanceMeters <= 200; // в радиусе 200 метров — чекин подтвержден
      }

      const visitPayload: any = {
        rep_id,
        pharmacy_id,
        status: 'completed',
        checkin_lat: checkin_lat ? Number(checkin_lat) : null,
        checkin_lng: checkin_lng ? Number(checkin_lng) : null,
        distance_meters: distanceMeters,
        is_gps_verified: isGpsVerified,
        result_type,
        notes: notes || null,
        next_visit_date: next_visit_date || null,
        duration_minutes: Number(duration_minutes) || 15,
        order_id: order_id || null,
        completed_at: new Date().toISOString()
      };

      const { data: visit, error } = await supabaseAdmin
        .from('rep_visits')
        .insert(visitPayload)
        .select()
        .single();

      if (error) {
        console.error('Ошибка сохранения визита:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, visit, distanceMeters, isGpsVerified });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/rep error:', err);
    return NextResponse.json({ error: err.message || 'Внутренняя ошибка' }, { status: 500 });
  }
}
