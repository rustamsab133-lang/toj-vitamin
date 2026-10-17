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

// Helper to load extended employee HR profiles stored in site_settings
async function getHrProfilesMap(): Promise<Record<string, any>> {
  try {
    const { data } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'rep_hr_profiles')
      .maybeSingle();
    if (!data?.value) return {};
    return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
  } catch (e) {
    return {};
  }
}

async function saveHrProfileForRep(repId: string, hrData: Record<string, any>): Promise<void> {
  try {
    const current = await getHrProfilesMap();
    current[repId] = {
      ...(current[repId] || {}),
      ...hrData,
      updated_at: new Date().toISOString()
    };
    await supabaseAdmin
      .from('site_settings')
      .upsert({ key: 'rep_hr_profiles', value: JSON.stringify(current) }, { onConflict: 'key' });
  } catch (e) {
    console.warn('saveHrProfileForRep warning:', e);
  }
}

function mergeRepWithHr(rep: any, hrMap: Record<string, any>) {
  const hr = hrMap[rep.id] || {};
  return {
    ...rep,
    position: hr.position || 'Медицинский представитель',
    daily_visit_target: Number(hr.daily_visit_target) || 12,
    hire_date: hr.hire_date || (rep.created_at ? rep.created_at.slice(0, 10) : '2026-01-15'),
    passport_info: hr.passport_info || '',
    transport_type: hr.transport_type || 'foot',
    bio_notes: hr.bio_notes || '',
    experience_years: hr.experience_years || ''
  };
}

/**
 * GET /api/rep
 * Получение профиля представителя, списка аптек с координатами, истории визитов или сводки руководителя
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list_pharmacies';
    const repId = searchParams.get('rep_id');
    const phone = searchParams.get('phone');
    const dateParam = searchParams.get('date'); // YYYY-MM-DD for track filtering

    if (action === 'get_profile') {
      if (!repId && !phone) {
        return NextResponse.json({ error: 'Укажите rep_id или phone' }, { status: 400 });
      }

      let query = supabaseAdmin.from('brand_reps').select('*');
      if (repId) query = query.eq('id', repId);
      if (phone) query = query.eq('phone', phone);

      const [{ data: rep, error }, hrMap] = await Promise.all([
        query.single(),
        getHrProfilesMap()
      ]);
      if (error || !rep) {
        return NextResponse.json({ error: 'Представитель не найден' }, { status: 404 });
      }

      return NextResponse.json({ success: true, rep: mergeRepWithHr(rep, hrMap) });
    }

    if (action === 'list_reps') {
      const [{ data: reps }, hrMap] = await Promise.all([
        supabaseAdmin.from('brand_reps').select('*').order('name'),
        getHrProfilesMap()
      ]);

      const merged = (reps || []).map(r => mergeRepWithHr(r, hrMap));
      return NextResponse.json({ success: true, reps: merged });
    }

    if (action === 'supervisor_overview') {
      // Determine date range for tracks (default: today)
      const targetDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const [
        { data: reps },
        hrMap,
        { data: pharmacies },
        { data: rawVisits },
        { data: rawTracks },
        { data: rawActiveShifts }
      ] = await Promise.all([
        supabaseAdmin.from('brand_reps').select('*').order('name'),
        getHrProfilesMap(),
        supabaseAdmin.from('pharmacies').select('*').order('created_at', { ascending: false }),
        supabaseAdmin
          .from('rep_visits')
          .select('*, pharmacies(name, address, latitude, longitude, phone, contact_person, token, category)')
          .order('created_at', { ascending: false })
          .limit(400),
        supabaseAdmin
          .from('rep_tracks')
          .select('*')
          .gte('recorded_at', dayStart.toISOString())
          .lte('recorded_at', dayEnd.toISOString())
          .order('recorded_at', { ascending: true }),
        supabaseAdmin
          .from('rep_shifts')
          .select('*')
          .eq('status', 'active')
      ]);

      const mergedReps = (reps || []).map(r => mergeRepWithHr(r, hrMap));
      const repNameById: Record<string, string> = {};
      mergedReps.forEach(r => {
        repNameById[r.id] = r.name;
      });

      // Enrich visits with brand_reps: { name } so supervisor UI always shows the rep's name
      const visits = (rawVisits || []).map((v: any) => ({
        ...v,
        brand_reps: v.brand_reps || { name: repNameById[v.rep_id] || 'Медпредставитель' }
      }));

      // Group raw track points by rep_id into polyline objects with total_km
      const tracksByRep: Record<string, { rep_id: string; points: Array<{ lat: number; lng: number; recorded_at?: string }>; distMeters: number }> = {};
      (rawTracks || []).forEach((pt: any) => {
        if (!pt.rep_id || pt.latitude == null || pt.longitude == null) return;
        const lat = Number(pt.latitude);
        const lng = Number(pt.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        if (!tracksByRep[pt.rep_id]) {
          tracksByRep[pt.rep_id] = { rep_id: pt.rep_id, points: [], distMeters: 0 };
        }
        const group = tracksByRep[pt.rep_id];
        if (group.points.length > 0) {
          const prev = group.points[group.points.length - 1];
          const d = calculateDistanceMeters(prev.lat, prev.lng, lat, lng);
          // Ignore unrealistic single jumps > 5km
          if (d <= 5000) {
            group.distMeters += d;
          }
        }
        group.points.push({ lat, lng, recorded_at: pt.recorded_at });
      });

      const groupedTracks = Object.values(tracksByRep).map(g => ({
        rep_id: g.rep_id,
        points: g.points,
        total_km: Number((g.distMeters / 1000).toFixed(2))
      }));

      // Map active shifts by rep_id
      const activeShiftsMap: Record<string, any> = {};
      (rawActiveShifts || []).forEach((sh: any) => {
        if (sh.rep_id && !activeShiftsMap[sh.rep_id]) {
          activeShiftsMap[sh.rep_id] = sh;
        }
      });

      return NextResponse.json({
        success: true,
        reps: mergedReps,
        pharmacies: pharmacies || [],
        visits,
        tracks: groupedTracks,
        activeShifts: activeShiftsMap
      });
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

    if (action === 'get_active_shift') {
      if (!repId) {
        return NextResponse.json({ error: 'Не указан rep_id' }, { status: 400 });
      }

      const { data: shift, error } = await supabaseAdmin
        .from('rep_shifts')
        .select('*')
        .eq('rep_id', repId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ success: true, shift: null });
      }

      return NextResponse.json({ success: true, shift });
    }

    if (action === 'get_today_track') {
      if (!repId) {
        return NextResponse.json({ error: 'Не указан rep_id' }, { status: 400 });
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: points, error } = await supabaseAdmin
        .from('rep_tracks')
        .select('latitude, longitude, recorded_at')
        .eq('rep_id', repId)
        .gte('recorded_at', todayStart.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) {
        // Table might not exist yet if migration pending
        return NextResponse.json({ success: true, points: [] });
      }

      return NextResponse.json({ success: true, points: points || [] });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/rep error:', err);
    return NextResponse.json({ error: err.message || 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

/**
 * POST /api/rep
 * Операции: вход по PIN, создание аптеки по GPS, фиксация визита, сохранение трека
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // --- 1. Авторизация представителя по индивидуальному PIN ---
    if (action === 'login') {
      const { phone, pin_code } = body;
      if (!phone || !pin_code) {
        return NextResponse.json({ error: 'Введите номер телефона и PIN-код' }, { status: 400 });
      }

      const inputDigits = String(phone).replace(/\D/g, '');
      const inputTail9 = inputDigits.slice(-9);

      const { data: activeReps, error } = await supabaseAdmin
        .from('brand_reps')
        .select('*')
        .eq('status', 'active');

      const rep = (activeReps || []).find((r: any) => {
        const rDigits = String(r.phone || '').replace(/\D/g, '');
        return rDigits === inputDigits || (inputTail9.length === 9 && rDigits.slice(-9) === inputTail9);
      });

      if (error || !rep) {
        return NextResponse.json({ error: 'Представитель с таким номером не найден' }, { status: 404 });
      }

      if (String(rep.pin_code).trim() !== String(pin_code).trim()) {
        return NextResponse.json({ error: 'Неверный PIN-код доступа' }, { status: 401 });
      }

      const hrMap = await getHrProfilesMap();
      return NextResponse.json({
        success: true,
        rep: mergeRepWithHr(rep, hrMap)
      });
    }

    // --- 1b. Создание или обновление карточки сотрудника (Руководитель / Кабинет) ---
    if (action === 'save_rep') {
      const {
        id,
        name,
        phone,
        pin_code,
        territory,
        brand_name = 'TOJ-VITAMIN',
        target_monthly_visits = 60,
        target_monthly_sales = 25000,
        status = 'active',
        position = 'Медицинский представитель',
        daily_visit_target = 12,
        hire_date = '',
        passport_info = '',
        transport_type = 'foot',
        bio_notes = '',
        experience_years = ''
      } = body;

      if (!name?.trim() || !phone?.trim() || !pin_code?.trim()) {
        return NextResponse.json({ error: 'ФИО, телефон и PIN-код обязательны' }, { status: 400 });
      }

      const dbPayload: any = {
        name: name.trim(),
        phone: phone.trim(),
        pin_code: pin_code.trim(),
        territory: territory?.trim() || 'Душанбе',
        brand_name: brand_name.trim(),
        target_monthly_visits: Number(target_monthly_visits) || 60,
        target_monthly_sales: Number(target_monthly_sales) || 25000,
        status
      };

      let savedRep: any = null;
      if (id) {
        const { data, error } = await supabaseAdmin
          .from('brand_reps')
          .update(dbPayload)
          .eq('id', id)
          .select()
          .single();
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        savedRep = data;
      } else {
        const { data, error } = await supabaseAdmin
          .from('brand_reps')
          .insert(dbPayload)
          .select()
          .single();
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        savedRep = data;
      }

      await saveHrProfileForRep(savedRep.id, {
        position: position.trim(),
        daily_visit_target: Number(daily_visit_target) || 12,
        hire_date,
        passport_info: passport_info.trim(),
        transport_type,
        bio_notes: bio_notes.trim(),
        experience_years: experience_years.trim()
      });

      const hrMap = await getHrProfilesMap();
      return NextResponse.json({
        success: true,
        rep: mergeRepWithHr(savedRep, hrMap)
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

    // --- 5. Управление рабочими сменами (Start / End Shift) ---
    if (action === 'start_shift') {
      const { rep_id, start_lat, start_lng } = body;
      if (!rep_id) {
        return NextResponse.json({ error: 'Не указан rep_id' }, { status: 400 });
      }

      const shiftPayload: any = {
        rep_id,
        status: 'active',
        started_at: new Date().toISOString(),
        start_lat: start_lat ? Number(start_lat) : null,
        start_lng: start_lng ? Number(start_lng) : null,
        total_km: 0,
        visits_count: 0,
        pharmacies_added: 0
      };

      const { data: shift, error } = await supabaseAdmin
        .from('rep_shifts')
        .insert(shiftPayload)
        .select()
        .single();

      if (error) {
        console.warn('start_shift fallback to local session:', error.message);
        return NextResponse.json({
          success: true,
          shift: {
            id: randomUUID(),
            rep_id,
            status: 'active',
            started_at: shiftPayload.started_at,
            start_lat: shiftPayload.start_lat,
            start_lng: shiftPayload.start_lng,
            is_fallback: true
          }
        });
      }

      return NextResponse.json({ success: true, shift });
    }

    if (action === 'end_shift') {
      const { shift_id, rep_id, end_lat, end_lng, total_km, visits_count, pharmacies_added } = body;
      if (!shift_id && !rep_id) {
        return NextResponse.json({ error: 'Не указан shift_id или rep_id' }, { status: 400 });
      }

      const updateData: any = {
        status: 'completed',
        ended_at: new Date().toISOString()
      };
      if (end_lat !== undefined && end_lat !== null) updateData.end_lat = Number(end_lat);
      if (end_lng !== undefined && end_lng !== null) updateData.end_lng = Number(end_lng);
      if (total_km !== undefined) updateData.total_km = Number(total_km);
      if (visits_count !== undefined) updateData.visits_count = Number(visits_count);
      if (pharmacies_added !== undefined) updateData.pharmacies_added = Number(pharmacies_added);

      if (shift_id) {
        const { data: updated, error } = await supabaseAdmin
          .from('rep_shifts')
          .update(updateData)
          .eq('id', shift_id)
          .select()
          .maybeSingle();

        if (error) {
          console.warn('end_shift update warning:', error.message);
        }
        return NextResponse.json({ success: true, shift: updated || updateData });
      } else {
        const { data: updated } = await supabaseAdmin
          .from('rep_shifts')
          .update(updateData)
          .eq('rep_id', rep_id)
          .eq('status', 'active')
          .select();

        return NextResponse.json({ success: true, shifts: updated });
      }
    }

    // --- 6. Сохранение точек GPS-трека представителя (Нить Ариадны) ---
    if (action === 'save_track_points') {
      const { rep_id, shift_id, points } = body;
      if (!rep_id || !Array.isArray(points) || points.length === 0) {
        return NextResponse.json({ success: true, saved: 0 });
      }

      const payloadWithShift = points.map((p: any) => ({
        rep_id,
        ...(shift_id ? { shift_id } : {}),
        latitude: Number(p.lat || p.latitude),
        longitude: Number(p.lng || p.longitude),
        accuracy: p.accuracy ? Number(p.accuracy) : null,
        speed: p.speed ? Number(p.speed) : null,
        recorded_at: p.recorded_at || new Date().toISOString()
      })).filter((p: any) => !isNaN(p.latitude) && !isNaN(p.longitude));

      let { error } = await supabaseAdmin
        .from('rep_tracks')
        .insert(payloadWithShift);

      // Если в таблице еще нет колонки shift_id, вставляем без нее
      if (error && (error.code === 'PGRST204' || error.message?.includes('shift_id'))) {
        const payloadWithoutShift = payloadWithShift.map(({ shift_id: _s, ...rest }: any) => rest);
        const retry = await supabaseAdmin
          .from('rep_tracks')
          .insert(payloadWithoutShift);
        error = retry.error;
      }

      if (error) {
        console.warn('Track points save warning:', error.message);
        return NextResponse.json({ success: false, error: error.message });
      }

      return NextResponse.json({ success: true, saved: payloadWithShift.length });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/rep error:', err);
    return NextResponse.json({ error: err.message || 'Внутренняя ошибка' }, { status: 500 });
  }
}
