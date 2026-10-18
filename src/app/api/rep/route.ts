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

const DEFAULT_REP_COLORS = [
  '#2563eb', // Ярко-синий
  '#7c3aed', // Фиолетовый
  '#ea580c', // Оранжевый
  '#db2777', // Малиновый
  '#0d9488', // Бирюзовый
  '#4f46e5', // Индиго
  '#ca8a04', // Золотой
  '#0284c7', // Голубой
  '#9333ea', // Пурпурный
  '#dc2626', // Алый
];

function getDeterministicRepColor(repId: string, index?: number): string {
  if (typeof index === 'number' && index >= 0) {
    return DEFAULT_REP_COLORS[index % DEFAULT_REP_COLORS.length];
  }
  let hash = 0;
  const str = String(repId || '');
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return DEFAULT_REP_COLORS[hash % DEFAULT_REP_COLORS.length];
}

// Fetch all GPS points from rep_tracks across PostgREST 1000-row pages
async function fetchAllTrackPointsPaginated(maxPages = 15): Promise<any[]> {
  const pageSize = 1000;
  const allRows: any[] = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabaseAdmin
      .from('rep_tracks')
      .select('id, rep_id, latitude, longitude, accuracy, speed, recorded_at')
      .order('recorded_at', { ascending: true })
      .range(from, to);

    if (error || !data || data.length === 0) {
      break;
    }
    allRows.push(...data);
    if (data.length < pageSize) {
      break;
    }
  }
  return allRows;
}

function mergeRepWithHr(rep: any, hrMap: Record<string, any>, repIndex?: number) {
  const hr = hrMap[rep.id] || {};
  return {
    ...rep,
    position: hr.position || 'Медицинский представитель',
    daily_visit_target: Number(hr.daily_visit_target) || 12,
    hire_date: hr.hire_date || (rep.created_at ? rep.created_at.slice(0, 10) : '2026-01-15'),
    passport_info: hr.passport_info || '',
    transport_type: hr.transport_type || 'foot',
    bio_notes: hr.bio_notes || '',
    experience_years: hr.experience_years || '',
    track_color: hr.track_color || getDeterministicRepColor(rep.id, repIndex)
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
    const dateParam = searchParams.get('date'); // YYYY-MM-DD or 'ALL' for all-time tracks

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

      const merged = (reps || []).map((r, idx) => mergeRepWithHr(r, hrMap, idx));
      return NextResponse.json({ success: true, reps: merged });
    }

    if (action === 'supervisor_overview') {
      const explicitDate = searchParams.get('explicit_date') === '1';

      const [
        { data: reps },
        hrMap,
        { data: pharmacies },
        { data: rawVisits },
        allHistoricalTracks,
        { data: rawActiveShifts }
      ] = await Promise.all([
        supabaseAdmin.from('brand_reps').select('*').order('name'),
        getHrProfilesMap(),
        supabaseAdmin.from('pharmacies').select('*').order('created_at', { ascending: false }),
        supabaseAdmin
          .from('rep_visits')
          .select('*, pharmacies(name, address, latitude, longitude, phone, contact_person, token, category)')
          .order('created_at', { ascending: false })
          .limit(500),
        fetchAllTrackPointsPaginated(15),
        supabaseAdmin
          .from('rep_shifts')
          .select('*')
          .eq('status', 'active')
      ]);

      // Compute available dates that have GPS tracks
      const dateCountsMap: Record<string, number> = {};
      (allHistoricalTracks || []).forEach((pt: any) => {
        if (pt.recorded_at) {
          const dStr = String(pt.recorded_at).slice(0, 10);
          dateCountsMap[dStr] = (dateCountsMap[dStr] || 0) + 1;
        }
      });

      const availableTrackDates = Object.entries(dateCountsMap)
        .map(([date, pointsCount]) => ({ date, pointsCount }))
        .sort((a, b) => b.date.localeCompare(a.date));

      const isAllTime = dateParam === 'ALL';
      const todayStr = new Date().toISOString().slice(0, 10);
      let effectiveDate = isAllTime ? 'ALL' : (dateParam || todayStr);

      // If not explicitly locked by user and requested date has 0 tracks, automatically show latest date with tracks
      if (!isAllTime && !explicitDate && !dateCountsMap[effectiveDate] && availableTrackDates.length > 0) {
        effectiveDate = availableTrackDates[0].date;
      }

      const rawTracks = isAllTime
        ? (allHistoricalTracks || [])
        : (allHistoricalTracks || []).filter((pt: any) =>
            pt.recorded_at && String(pt.recorded_at).startsWith(effectiveDate)
          );

      const mergedReps = (reps || []).map((r, idx) => mergeRepWithHr(r, hrMap, idx));
      const repNameById: Record<string, string> = {};
      mergedReps.forEach(r => {
        repNameById[r.id] = r.name;
      });

      // Enrich visits with brand_reps: { name } so supervisor UI always shows the rep's name
      const visits = (rawVisits || []).map((v: any) => ({
        ...v,
        brand_reps: v.brand_reps || { name: repNameById[v.rep_id] || 'Медпредставитель' }
      }));

      // Group raw track points by (rep_id + track_date) so different days never connect with fake straight lines
      const tracksBySegment: Record<
        string,
        {
          id: string;
          rep_id: string;
          track_date: string;
          rawPoints: Array<{ lat: number; lng: number; recorded_at?: string }>;
          distMeters: number;
        }
      > = {};

      rawTracks.forEach((pt: any) => {
        if (!pt.rep_id || pt.latitude == null || pt.longitude == null) return;
        const lat = Number(pt.latitude);
        const lng = Number(pt.longitude);
        if (isNaN(lat) || isNaN(lng)) return;

        const dayStr = pt.recorded_at ? String(pt.recorded_at).slice(0, 10) : todayStr;
        const segmentKey = `${pt.rep_id}__${dayStr}`;

        if (!tracksBySegment[segmentKey]) {
          tracksBySegment[segmentKey] = {
            id: segmentKey,
            rep_id: pt.rep_id,
            track_date: dayStr,
            rawPoints: [],
            distMeters: 0
          };
        }
        const group = tracksBySegment[segmentKey];
        if (group.rawPoints.length > 0) {
          const prev = group.rawPoints[group.rawPoints.length - 1];
          const d = calculateDistanceMeters(prev.lat, prev.lng, lat, lng);
          // Ignore unrealistic single jumps > 5km
          if (d <= 5000) {
            group.distMeters += d;
          }
        }
        group.rawPoints.push({ lat, lng, recorded_at: pt.recorded_at });
      });

      const groupedTracks = Object.values(tracksBySegment)
        .map(g => {
          // In ALL-TIME mode, thin points within <18m of each other (keeping start & finish) so 1 year of tracks stays super fast
          let finalPoints = g.rawPoints;
          if (isAllTime && g.rawPoints.length > 3) {
            const thinned: Array<{ lat: number; lng: number; recorded_at?: string }> = [g.rawPoints[0]];
            for (let i = 1; i < g.rawPoints.length - 1; i++) {
              const prevKept = thinned[thinned.length - 1];
              const cur = g.rawPoints[i];
              if (calculateDistanceMeters(prevKept.lat, prevKept.lng, cur.lat, cur.lng) >= 18) {
                thinned.push(cur);
              }
            }
            thinned.push(g.rawPoints[g.rawPoints.length - 1]);
            finalPoints = thinned;
          }

          return {
            id: g.id,
            rep_id: g.rep_id,
            track_date: g.track_date,
            points: finalPoints,
            raw_points_count: g.rawPoints.length,
            total_km: Number((g.distMeters / 1000).toFixed(2))
          };
        })
        .sort((a, b) => b.track_date.localeCompare(a.track_date));

      // Map active shifts by rep_id
      const activeShiftsMap: Record<string, any> = {};
      (rawActiveShifts || []).forEach((sh: any) => {
        if (sh.rep_id && !activeShiftsMap[sh.rep_id]) {
          activeShiftsMap[sh.rep_id] = sh;
        }
      });

      return NextResponse.json({
        success: true,
        effectiveDate,
        availableTrackDates,
        totalHistoricalPoints: (allHistoricalTracks || []).length,
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

      const todayStr = new Date().toISOString().slice(0, 10);

      const { data: points, error } = await supabaseAdmin
        .from('rep_tracks')
        .select('latitude, longitude, recorded_at')
        .eq('rep_id', repId)
        .order('recorded_at', { ascending: true })
        .limit(1000);

      if (error) {
        return NextResponse.json({ success: true, points: [], historyByDate: {} });
      }

      const todayPoints = (points || []).filter((p: any) =>
        p.recorded_at && String(p.recorded_at).startsWith(todayStr)
      );

      // Group past days for optional history overlay on rep's own map
      const historyByDate: Record<string, Array<[number, number]>> = {};
      (points || []).forEach((p: any) => {
        if (!p.recorded_at || p.latitude == null || p.longitude == null) return;
        const dStr = String(p.recorded_at).slice(0, 10);
        if (dStr === todayStr) return;
        if (!historyByDate[dStr]) historyByDate[dStr] = [];
        historyByDate[dStr].push([Number(p.latitude), Number(p.longitude)]);
      });

      return NextResponse.json({
        success: true,
        points: todayPoints,
        historyByDate
      });
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
        .eq('status', 'active')
        .order('name');

      const repIdx = (activeReps || []).findIndex((r: any) => {
        const rDigits = String(r.phone || '').replace(/\D/g, '');
        return rDigits === inputDigits || (inputTail9.length === 9 && rDigits.slice(-9) === inputTail9);
      });
      const rep = repIdx >= 0 ? (activeReps || [])[repIdx] : null;

      if (error || !rep) {
        return NextResponse.json({ error: 'Представитель с таким номером не найден' }, { status: 404 });
      }

      if (String(rep.pin_code).trim() !== String(pin_code).trim()) {
        return NextResponse.json({ error: 'Неверный PIN-код доступа' }, { status: 401 });
      }

      const hrMap = await getHrProfilesMap();
      return NextResponse.json({
        success: true,
        rep: mergeRepWithHr(rep, hrMap, repIdx)
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
        experience_years = '',
        track_color = ''
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
        experience_years: experience_years.trim(),
        ...(track_color ? { track_color: track_color.trim() } : {})
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

      // Также фиксируем координаты добавленной аптеки в rep_tracks, чтобы точка гарантированно легла на маршрут сотрудника
      if (rep_id && latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
        try {
          const nowIso = new Date().toISOString();
          await supabaseAdmin.from('rep_tracks').insert({
            rep_id,
            lat: Number(latitude),
            lng: Number(longitude),
            accuracy: 10,
            recorded_at: nowIso,
            track_date: nowIso.slice(0, 10)
          });
        } catch (trackErr) {
          // ignore if rep_tracks insert fails
        }
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

      // Also record check-in location into rep_tracks so visited pharmacies are always part of the street route
      if (checkin_lat && checkin_lng && !isNaN(Number(checkin_lat)) && !isNaN(Number(checkin_lng))) {
        await supabaseAdmin.from('rep_tracks').insert({
          rep_id,
          latitude: Number(checkin_lat),
          longitude: Number(checkin_lng),
          recorded_at: new Date().toISOString()
        });
      }

      return NextResponse.json({ success: true, visit, distanceMeters, isGpsVerified });
    }

    // --- 5. Управление рабочими сменами (Start / End Shift) ---
    if (action === 'start_shift') {
      const { rep_id, start_lat, start_lng } = body;
      if (!rep_id) {
        return NextResponse.json({ error: 'Не указан rep_id' }, { status: 400 });
      }

      const nowIso = new Date().toISOString();
      if (start_lat && start_lng && !isNaN(Number(start_lat)) && !isNaN(Number(start_lng))) {
        await supabaseAdmin.from('rep_tracks').insert({
          rep_id,
          latitude: Number(start_lat),
          longitude: Number(start_lng),
          recorded_at: nowIso
        });
      }

      const shiftPayload: any = {
        rep_id,
        status: 'active',
        started_at: nowIso,
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

      const endedIso = new Date().toISOString();
      if (rep_id && end_lat && end_lng && !isNaN(Number(end_lat)) && !isNaN(Number(end_lng))) {
        await supabaseAdmin.from('rep_tracks').insert({
          rep_id,
          latitude: Number(end_lat),
          longitude: Number(end_lng),
          recorded_at: endedIso
        });
      }

      const updateData: any = {
        status: 'completed',
        ended_at: endedIso
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
