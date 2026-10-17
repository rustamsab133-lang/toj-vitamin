"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft, MapPin, Users, ClipboardCheck, Plus, Edit3,
  Phone, MessageSquare, CheckCircle2, AlertTriangle, Clock,
  Calendar, Car, Target, Award, RefreshCw, Search, ShieldCheck,
  Building2, Footprints, ExternalLink, X, Save, Loader2
} from 'lucide-react';
import { BrandRep, Pharmacy } from '@/lib/types';
import { buildPharmacyWhatsAppUrl, formatWhatsAppPhone } from '@/lib/repOfflineQueue';

interface BrandRepsSupervisorProps {
  onBack: () => void;
}

const REP_COLORS = ['#0284c7', '#7c3aed', '#db2777', '#ea580c', '#059669', '#4f46e5'];

export const BrandRepsSupervisor: React.FC<BrandRepsSupervisorProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'map' | 'staff' | 'audit'>('map');
  const [loading, setLoading] = useState(true);

  const [reps, setReps] = useState<BrandRep[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [activeShifts, setActiveShifts] = useState<Record<string, any>>({});

  // Map & Filter states
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('ALL');
  const [freshnessFilter, setFreshnessFilter] = useState<'ALL' | 'green' | 'yellow' | 'red'>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [hasExplicitlyPickedDate, setHasExplicitlyPickedDate] = useState<boolean>(false);
  const [availableTrackDates, setAvailableTrackDates] = useState<Array<{ date: string; pointsCount: number }>>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Reverse-geocoded street names per track: Record<rep_id, Array<{ time: string; street: string; lat: number; lng: number; isStart?: boolean; isEnd?: boolean }>>
  const [streetTimelines, setStreetTimelines] = useState<Record<string, Array<{ time: string; street: string; lat: number; lng: number; isStart?: boolean; isEnd?: boolean }>>>({});
  const [loadingStreets, setLoadingStreets] = useState<boolean>(false);

  // Leaflet Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const tracksLayerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Employee Edit / Create Modal
  const [isRepModalOpen, setIsRepModalOpen] = useState(false);
  const [savingRep, setSavingRep] = useState(false);
  const [editingRep, setEditingRep] = useState<Partial<BrandRep>>({
    name: '',
    phone: '+992',
    pin_code: '2024',
    territory: 'Душанбе',
    brand_name: 'TOJ-VITAMIN',
    position: 'Медицинский представитель',
    daily_visit_target: 12,
    target_monthly_visits: 120,
    target_monthly_sales: 15000,
    transport_type: 'foot',
    hire_date: new Date().toISOString().slice(0, 10),
    passport_info: '',
    bio_notes: '',
    status: 'active'
  });

  const loadSupervisorData = async (dateToLoad?: string, explicit?: boolean) => {
    setLoading(true);
    try {
      const d = dateToLoad ?? selectedDate;
      const expFlag = (explicit ?? hasExplicitlyPickedDate) ? '&explicit_date=1' : '';
      const res = await fetch(`/api/rep?action=supervisor_overview&date=${d}${expFlag}`);
      const data = await res.json();
      if (data.success) {
        setReps(data.reps || []);
        setPharmacies(data.pharmacies || []);
        setVisits(data.visits || []);
        setTracks(data.tracks || []);
        setActiveShifts(data.activeShifts || {});
        if (Array.isArray(data.availableTrackDates)) {
          setAvailableTrackDates(data.availableTrackDates);
        }
        if (data.effectiveDate && data.effectiveDate !== selectedDate && !(explicit ?? hasExplicitlyPickedDate)) {
          setSelectedDate(data.effectiveDate);
        }
      }
    } catch (err) {
      console.error('Supervisor load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupervisorData(selectedDate, hasExplicitlyPickedDate);
  }, [selectedDate]);

  // Resolve GPS track coordinates into human-readable street names (Nominatim + localStorage cache)
  useEffect(() => {
    let cancelled = false;
    async function resolveTrackStreets() {
      if (!tracks || tracks.length === 0) {
        setStreetTimelines({});
        return;
      }
      setLoadingStreets(true);
      const cacheKey = 'toj_supervisor_street_cache_v1';
      let geoCache: Record<string, string> = {};
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) geoCache = JSON.parse(raw);
      } catch (e) {}

      const nextTimelines: Record<string, Array<{ time: string; street: string; lat: number; lng: number; isStart?: boolean; isEnd?: boolean }>> = {};

      for (const tr of tracks) {
        const pts = Array.isArray(tr.points) ? tr.points : [];
        if (pts.length === 0) continue;

        // Sample up to 8 key points along the route (Start, intermediate street turns, End)
        const sampleIndices: number[] = [0];
        const step = Math.max(1, Math.floor((pts.length - 1) / 6));
        for (let i = step; i < pts.length - 1; i += step) {
          sampleIndices.push(i);
        }
        if (pts.length > 1 && sampleIndices[sampleIndices.length - 1] !== pts.length - 1) {
          sampleIndices.push(pts.length - 1);
        }

        const repSteps: Array<{ time: string; street: string; lat: number; lng: number; isStart?: boolean; isEnd?: boolean }> = [];

        for (let idx = 0; idx < sampleIndices.length; idx++) {
          if (cancelled) return;
          const ptIndex = sampleIndices[idx];
          const pt = pts[ptIndex];
          const lat = Number(pt.lat);
          const lng = Number(pt.lng);
          const roundedKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;

          let streetName = geoCache[roundedKey];
          if (!streetName) {
            try {
              const r = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'ru,tg,en' } }
              );
              if (r.ok) {
                const g = await r.json();
                const a = g.address || {};
                const road = a.road || a.street || a.pedestrian || a.residential || a.suburb || a.neighbourhood || '';
                const house = a.house_number ? `, д. ${a.house_number}` : '';
                const poi = a.amenity || a.shop || a.building || '';
                const district = a.city_district || a.suburb || '';
                streetName = road
                  ? `${road}${house}${district && district !== road ? ` (${district})` : ''}`
                  : poi || g.display_name?.split(',').slice(0, 2).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                geoCache[roundedKey] = streetName;
                try {
                  localStorage.setItem(cacheKey, JSON.stringify(geoCache));
                } catch (e) {}
              }
            } catch (e) {}
          }

          if (!streetName) {
            streetName = `Координаты ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          }

          const timeStr = pt.recorded_at
            ? new Date(pt.recorded_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            : '';

          // Deduplicate consecutive identical street names unless it's start or end
          const isStart = idx === 0;
          const isEnd = idx === sampleIndices.length - 1 && sampleIndices.length > 1;
          const prevStep = repSteps[repSteps.length - 1];
          if (!isStart && !isEnd && prevStep && prevStep.street === streetName) {
            continue;
          }

          repSteps.push({
            time: timeStr,
            street: streetName,
            lat,
            lng,
            isStart,
            isEnd
          });
        }

        nextTimelines[tr.rep_id] = repSteps;
      }

      if (!cancelled) {
        setStreetTimelines(nextTimelines);
        setLoadingStreets(false);
      }
    }

    resolveTrackStreets();
    return () => {
      cancelled = true;
    };
  }, [tracks]);

  // Compute last visit date per pharmacy & freshness status
  const pharmacyFreshnessMap = useMemo(() => {
    const map: Record<string, { daysAgo: number | null; status: 'green' | 'yellow' | 'red'; lastVisit?: any }> = {};
    const now = Date.now();

    pharmacies.forEach(p => {
      const pharmVisits = visits.filter(v => v.pharmacy_id === p.id);
      if (pharmVisits.length === 0) {
        map[p.id] = { daysAgo: null, status: 'red' };
      } else {
        const latest = pharmVisits[0];
        const diffDays = Math.floor((now - new Date(latest.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const status = diffDays <= 7 ? 'green' : diffDays <= 14 ? 'yellow' : 'red';
        map[p.id] = { daysAgo: diffDays, status, lastVisit: latest };
      }
    });

    return map;
  }, [pharmacies, visits]);

  // Summary counts
  const freshnessCounts = useMemo(() => {
    let green = 0, yellow = 0, red = 0;
    pharmacies.forEach(p => {
      const st = pharmacyFreshnessMap[p.id]?.status || 'red';
      if (st === 'green') green++;
      else if (st === 'yellow') yellow++;
      else red++;
    });
    return { green, yellow, red };
  }, [pharmacies, pharmacyFreshnessMap]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const visitsToday = useMemo(
    () => visits.filter(v => (v.created_at || '').startsWith(todayStr)),
    [visits, todayStr]
  );
  const gpsVerifiedPct = useMemo(() => {
    if (visits.length === 0) return 100;
    const verified = visits.filter(v => v.is_gps_verified).length;
    return Math.round((verified / visits.length) * 100);
  }, [visits]);

  // Initialize Leaflet Map when on 'map' tab
  useEffect(() => {
    if (activeTab !== 'map') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
      return;
    }

    let isMounted = true;
    async function initSupervisorMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;
      try {
        const L = (await import('leaflet')).default;
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (!isMounted || !mapContainerRef.current) return;

        const map = L.map(mapContainerRef.current, {
          center: [38.5598, 68.7870],
          zoom: 13
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);

        tracksLayerRef.current = L.layerGroup().addTo(map);
        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        setMapReady(true);
      } catch (e) {
        console.error('Supervisor map init error:', e);
      }
    }

    initSupervisorMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [activeTab]);

  // Render Pharmacies & Rep GPS Tracks on Supervisor Map
  useEffect(() => {
    async function renderSupervisorLayers() {
      if (!mapReady || !mapInstanceRef.current || !markersLayerRef.current || !tracksLayerRef.current) return;
      const L = (await import('leaflet')).default;

      markersLayerRef.current.clearLayers();
      tracksLayerRef.current.clearLayers();

      const allTrackBounds: Array<[number, number]> = [];

      // 1. Render GPS Tracks per Rep with Start, Checkpoints, and Finish pins
      const filteredTracks = tracks.filter(t => selectedRepFilter === 'ALL' || t.rep_id === selectedRepFilter);
      filteredTracks.forEach((tr, idx) => {
        if (!Array.isArray(tr.points) || tr.points.length === 0) return;
        const repObj = reps.find(r => r.id === tr.rep_id);
        const color = REP_COLORS[idx % REP_COLORS.length];
        const latlngs = tr.points.map((pt: any) => [Number(pt.lat), Number(pt.lng)] as [number, number]);
        latlngs.forEach((ll: [number, number]) => allTrackBounds.push(ll));

        if (latlngs.length >= 2) {
          // White outer casing for street contrast
          L.polyline(latlngs, {
            color: '#ffffff',
            weight: 9,
            opacity: 0.9,
            lineJoin: 'round'
          }).addTo(tracksLayerRef.current);

          // Colored route line
          const poly = L.polyline(latlngs, {
            color,
            weight: 5,
            opacity: 0.95,
            lineJoin: 'round'
          }).addTo(tracksLayerRef.current);

          poly.bindTooltip(`Маршрут: ${repObj?.name || 'Медпред'} (${tr.total_km || 0} км, точек: ${tr.points.length})`, { sticky: true });
        }

        // Start Marker
        const firstPt = tr.points[0];
        const firstTime = firstPt.recorded_at
          ? new Date(firstPt.recorded_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
          : '';
        const startIcon = L.divIcon({
          className: 'supervisor-track-start',
          html: `
            <div style="
              background: #10b981;
              color: white;
              padding: 3px 8px;
              border-radius: 999px;
              font-size: 10px;
              font-weight: 800;
              border: 2px solid white;
              box-shadow: 0 3px 8px rgba(0,0,0,0.3);
              white-space: nowrap;
              transform: translate(-50%, -50%);
            ">
              🟢 Старт ${firstTime} (${repObj?.name?.split(' ')[0] || 'Медпред'})
            </div>
          `,
          iconSize: [110, 24],
          iconAnchor: [55, 12]
        });
        L.marker([Number(firstPt.lat), Number(firstPt.lng)], { icon: startIcon, zIndexOffset: 900 }).addTo(tracksLayerRef.current);

        // Intermediate Direction / Time Dots along the streets
        tr.points.forEach((pt: any, ptIdx: number) => {
          if (ptIdx === 0 || ptIdx === tr.points.length - 1) return;
          const tStr = pt.recorded_at
            ? new Date(pt.recorded_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            : '';
          const dotIcon = L.divIcon({
            className: 'supervisor-track-dot',
            html: `
              <div style="
                background: ${color};
                color: white;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                font-size: 9px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                transform: translate(-50%, -50%);
              " title="${tStr}">
                ${ptIdx}
              </div>
            `,
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });
          L.marker([Number(pt.lat), Number(pt.lng)], { icon: dotIcon, zIndexOffset: 700 })
            .bindTooltip(`${repObj?.name || 'Медпред'} • Точка #${ptIdx} в ${tStr}`)
            .addTo(tracksLayerRef.current);
        });

        // Finish Marker (if more than 1 point)
        if (tr.points.length > 1) {
          const lastPt = tr.points[tr.points.length - 1];
          const lastTime = lastPt.recorded_at
            ? new Date(lastPt.recorded_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            : '';
          const endIcon = L.divIcon({
            className: 'supervisor-track-end',
            html: `
              <div style="
                background: #0f172a;
                color: white;
                padding: 3px 8px;
                border-radius: 999px;
                font-size: 10px;
                font-weight: 800;
                border: 2px solid white;
                box-shadow: 0 3px 8px rgba(0,0,0,0.35);
                white-space: nowrap;
                transform: translate(-50%, -50%);
              ">
                🏁 Финиш ${lastTime} (${tr.total_km || 0} км)
              </div>
            `,
            iconSize: [120, 24],
            iconAnchor: [60, 12]
          });
          L.marker([Number(lastPt.lat), Number(lastPt.lng)], { icon: endIcon, zIndexOffset: 950 }).addTo(tracksLayerRef.current);
        }
      });

      // Automatically fit map bounds to the employee's street route so the supervisor sees the streets immediately
      if (allTrackBounds.length >= 2) {
        try {
          mapInstanceRef.current.fitBounds(allTrackBounds, { padding: [50, 50], maxZoom: 16 });
        } catch (e) {}
      } else if (allTrackBounds.length === 1) {
        mapInstanceRef.current.setView(allTrackBounds[0], 16);
      }

      // 2. Render Pharmacies colored by visit freshness
      pharmacies.forEach(pharm => {
        if (!pharm.latitude || !pharm.longitude) return;
        if (selectedRepFilter !== 'ALL' && pharm.rep_id && pharm.rep_id !== selectedRepFilter) return;

        const freshness = pharmacyFreshnessMap[pharm.id] || { daysAgo: null, status: 'red' };
        if (freshnessFilter !== 'ALL' && freshness.status !== freshnessFilter) return;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            pharm.name?.toLowerCase().includes(q) ||
            pharm.address?.toLowerCase().includes(q) ||
            pharm.contact_person?.toLowerCase().includes(q);
          if (!match) return;
        }

        const pinColor =
          freshness.status === 'green' ? '#10b981' :
          freshness.status === 'yellow' ? '#f59e0b' : '#ef4444';

        const badgeText =
          freshness.daysAgo === null ? 'Не были' :
          freshness.daysAgo === 0 ? 'Сегодня' : `${freshness.daysAgo}д`;

        const icon = L.divIcon({
          className: 'supervisor-pharm-pin',
          html: `
            <div style="
              background: ${pinColor};
              color: white;
              padding: 3px 8px;
              border-radius: 12px;
              display: inline-flex;
              align-items: center;
              gap: 4px;
              box-shadow: 0 3px 8px rgba(0,0,0,0.28);
              border: 2px solid white;
              font-family: sans-serif;
              font-size: 11px;
              font-weight: 700;
              white-space: nowrap;
              transform: translate(-50%, -100%);
              cursor: pointer;
            ">
              <span>🏥</span>
              <span>${pharm.name.length > 13 ? pharm.name.substring(0, 13) + '…' : pharm.name}</span>
              <span style="background: rgba(0,0,0,0.22); padding: 1px 4px; border-radius: 6px; font-size: 9px;">${badgeText}</span>
            </div>
          `,
          iconSize: [90, 28],
          iconAnchor: [45, 28]
        });

        const marker = L.marker([Number(pharm.latitude), Number(pharm.longitude)], { icon });
        marker.on('click', () => {
          setSelectedPharmacy(pharm);
        });
        markersLayerRef.current.addLayer(marker);
      });
    }

    renderSupervisorLayers();
  }, [mapReady, pharmacies, tracks, reps, pharmacyFreshnessMap, selectedRepFilter, freshnessFilter, searchQuery]);

  // Open Modal to Create or Edit Employee
  const handleOpenRepModal = (repToEdit?: BrandRep) => {
    if (repToEdit) {
      setEditingRep({
        ...repToEdit,
        position: repToEdit.position || 'Медицинский представитель',
        daily_visit_target: repToEdit.daily_visit_target || 12,
        target_monthly_visits: repToEdit.target_monthly_visits || 120,
        target_monthly_sales: repToEdit.target_monthly_sales || 15000,
        transport_type: repToEdit.transport_type || 'foot',
        hire_date: repToEdit.hire_date || '2024-01-15',
        passport_info: repToEdit.passport_info || '',
        bio_notes: repToEdit.bio_notes || ''
      });
    } else {
      setEditingRep({
        name: '',
        phone: '+992',
        pin_code: '2024',
        territory: 'Душанбе (Сино)',
        brand_name: 'TOJ-VITAMIN',
        position: 'Медицинский представитель',
        daily_visit_target: 12,
        target_monthly_visits: 120,
        target_monthly_sales: 15000,
        transport_type: 'foot',
        hire_date: new Date().toISOString().slice(0, 10),
        passport_info: '',
        bio_notes: '',
        status: 'active'
      });
    }
    setIsRepModalOpen(true);
  };

  const handleSaveRep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRep.name || !editingRep.phone) return;
    setSavingRep(true);
    try {
      const res = await fetch('/api/rep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_rep',
          ...editingRep
        })
      });
      const data = await res.json();
      if (data.success && data.rep) {
        setIsRepModalOpen(false);
        await loadSupervisorData();
      } else {
        alert(data.error || 'Ошибка при сохранении сотрудника');
      }
    } catch (err) {
      alert('Ошибка соединения с сервером');
    } finally {
      setSavingRep(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Пульт руководителя медпредставителей</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                GPS + B2B Контроль
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Общая карта покрытия аптек, личные кабинеты штата, маршруты и аудит визитов
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/rep"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Терминал медпреда
          </a>
          <button
            onClick={() => handleOpenRepModal()}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Добавить сотрудника
          </button>
          <button
            onClick={() => loadSupervisorData()}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
            title="Обновить сводку"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Штат / На смене</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{reps.length}</span>
            <span className="text-xs font-semibold text-emerald-600">
              • {Object.keys(activeShifts).length} сейчас в поле
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Охват базы аптек</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{pharmacies.length}</span>
            <span className="text-xs text-slate-500">
              🟢{freshnessCounts.green} 🟡{freshnessCounts.yellow} 🔴{freshnessCounts.red}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Визитов сегодня / всего</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{visitsToday.length}</span>
            <span className="text-xs text-slate-500">всего в базе: {visits.length}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Честность GPS (≤200м)</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">{gpsVerifiedPct}%</span>
            <span className="text-xs text-slate-500">подтверждено в аптеке</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-600" />
          🗺️ Общая карта руководителя
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          👥 Личные кабинеты сотрудников ({reps.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-amber-600" />
          📋 Аудит визитов ({visits.length})
        </button>
      </div>

      {/* TAB 1: SUPERVISOR LIVE MAP */}
      {activeTab === 'map' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Map Filters Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter by Rep */}
              <select
                value={selectedRepFilter}
                onChange={(e) => setSelectedRepFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="ALL">👥 Все сотрудники ({reps.length})</option>
                {reps.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.territory || 'Душанбе'})</option>
                ))}
              </select>

              {/* Filter by Freshness */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setFreshnessFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${freshnessFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                >
                  Все ({pharmacies.length})
                </button>
                <button
                  onClick={() => setFreshnessFilter('green')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${freshnessFilter === 'green' ? 'bg-emerald-600 text-white' : 'text-emerald-700'}`}
                  title="Посещены за последние 7 дней"
                >
                  🟢 &lt;7д ({freshnessCounts.green})
                </button>
                <button
                  onClick={() => setFreshnessFilter('yellow')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${freshnessFilter === 'yellow' ? 'bg-amber-500 text-white' : 'text-amber-700'}`}
                  title="Посещены 7–14 дней назад"
                >
                  🟡 7-14д ({freshnessCounts.yellow})
                </button>
                <button
                  onClick={() => setFreshnessFilter('red')}
                  className={`px-2.5 py-1 rounded-lg font-semibold ${freshnessFilter === 'red' ? 'bg-red-600 text-white' : 'text-red-700'}`}
                  title="Забытые аптеки (>14 дней или ни разу не посещались)"
                >
                  🔴 Забытые ({freshnessCounts.red})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Треки за:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setHasExplicitlyPickedDate(true);
                    setSelectedDate(e.target.value);
                  }}
                  className="font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              {availableTrackDates.length > 0 && (
                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200 text-[11px]">
                  <span className="text-slate-500 px-1.5 font-medium">Записи GPS:</span>
                  {availableTrackDates.slice(0, 4).map((d) => {
                    const isSelected = selectedDate === d.date;
                    const label = new Date(d.date + 'T00:00:00').toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                    });
                    return (
                      <button
                        key={d.date}
                        onClick={() => {
                          setHasExplicitlyPickedDate(true);
                          setSelectedDate(d.date);
                        }}
                        className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                        title={`Записано GPS-точек: ${d.pointsCount}`}
                      >
                        {label} ({d.pointsCount})
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Поиск аптеки..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Map Canvas */}
          <div className="relative w-full h-[540px]">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Selected Pharmacy Inspector Card on Map */}
            {selectedPharmacy && (
              <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[500] bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        Кат. {selectedPharmacy.category || 'B'}
                      </span>
                      {pharmacyFreshnessMap[selectedPharmacy.id]?.daysAgo !== null ? (
                        <span className="text-[11px] font-bold text-emerald-700">
                          Был визит: {pharmacyFreshnessMap[selectedPharmacy.id]?.daysAgo === 0 ? 'Сегодня' : `${pharmacyFreshnessMap[selectedPharmacy.id]?.daysAgo} дн. назад`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-red-600">
                          ⚠️ Ни разу не посещалась
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 mt-1">{selectedPharmacy.name}</h3>
                    <p className="text-xs text-slate-500">{selectedPharmacy.address}</p>
                    {selectedPharmacy.landmark && (
                      <p className="text-[11px] text-emerald-700 font-medium">📍 {selectedPharmacy.landmark}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedPharmacy(null)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Заведующая (ЛПР):</span>
                    <span className="font-semibold text-slate-800">{selectedPharmacy.contact_person || 'Не указана'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Телефон:</span>
                    <span className="font-semibold text-slate-800">{selectedPharmacy.phone || '—'}</span>
                  </div>
                  {pharmacyFreshnessMap[selectedPharmacy.id]?.lastVisit && (
                    <div className="pt-1 border-t border-slate-200/80 text-[11px] text-slate-600">
                      Последний отчет ({pharmacyFreshnessMap[selectedPharmacy.id]?.lastVisit?.brand_reps?.name || 'Медпред'}):{' '}
                      <span className="font-medium text-slate-800">
                        {pharmacyFreshnessMap[selectedPharmacy.id]?.lastVisit?.notes || 'Презентация проведена'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {buildPharmacyWhatsAppUrl(selectedPharmacy, 'Руководитель TOJ-VITAMIN') ? (
                    <a
                      href={buildPharmacyWhatsAppUrl(selectedPharmacy, 'Руководитель TOJ-VITAMIN')!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Написать в WhatsApp
                    </a>
                  ) : (
                    <div className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 text-xs text-center">
                      Нет WhatsApp
                    </div>
                  )}

                  <a
                    href={`/b2b/${selectedPharmacy.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Витрина аптеки
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Street-by-Street Walked Route Breakdown */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  По каким улицам проходили сотрудники ({new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU')})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Нажмите на любую улицу в цепочке, чтобы приблизить этот участок на карте
              </span>
            </div>

            {(() => {
              const activeTracks = tracks.filter(
                (tr) =>
                  (selectedRepFilter === 'ALL' || selectedRepFilter === tr.rep_id) &&
                  Array.isArray(tr.points) &&
                  tr.points.length > 0
              );

              if (activeTracks.length === 0) {
                return (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      За выбранную дату ({new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU')}) записанных GPS-точек маршрута нет.
                    </div>
                    {availableTrackDates.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">Перейти к дате с маршрутом:</span>
                        {availableTrackDates.slice(0, 3).map((d) => (
                          <button
                            key={d.date}
                            onClick={() => {
                              setHasExplicitlyPickedDate(true);
                              setSelectedDate(d.date);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors"
                          >
                            {new Date(d.date + 'T00:00:00').toLocaleDateString('ru-RU')} ({d.pointsCount} тчк)
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 gap-3">
                  {activeTracks.map((tr, idx) => {
                    const repId = tr.rep_id;
                    const rep = reps.find((r) => r.id === repId);
                    const rawPts = Array.isArray(tr.points) ? tr.points : [];
                    const distKm = Number(tr.total_km || 0);
                    const steps = streetTimelines[repId] || [];
                    const color = REP_COLORS[idx % REP_COLORS.length];
                    const firstTime = rawPts[0]?.recorded_at
                      ? new Date(rawPts[0].recorded_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                      : '';
                    const lastTime = rawPts[rawPts.length - 1]?.recorded_at
                      ? new Date(rawPts[rawPts.length - 1].recorded_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <div
                        key={tr.id || repId}
                        className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-bold text-xs text-slate-900">
                              {rep?.name || 'Сотрудник'}
                            </span>
                            {rep?.territory && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                                {rep.territory}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                              👣 Пройдено: {distKm.toFixed(2)} км ({rawPts.length} GPS-точек)
                            </span>
                            {firstTime && lastTime && (
                              <span className="text-slate-500 font-medium">
                                🕒 {firstTime} — {lastTime}
                              </span>
                            )}
                          </div>
                        </div>

                        {loadingStreets && steps.length === 0 ? (
                          <div className="text-xs text-slate-400 flex items-center gap-2 py-1">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            Определяем названия улиц по GPS-координатам...
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {steps.map((step, sIdx) => {
                              const isStart = sIdx === 0;
                              const isEnd = sIdx === steps.length - 1 && steps.length > 1;
                              return (
                                <React.Fragment key={`${step.lat}-${step.lng}-${sIdx}`}>
                                  <button
                                    onClick={() => {
                                      if (mapInstanceRef.current) {
                                        mapInstanceRef.current.setView([step.lat, step.lng], 17, {
                                          animate: true,
                                        });
                                      }
                                    }}
                                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition-all text-left ${
                                      isStart
                                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 font-bold hover:bg-emerald-100'
                                        : isEnd
                                        ? 'bg-slate-900 border-slate-900 text-white font-bold hover:bg-slate-800'
                                        : 'bg-slate-50 hover:bg-indigo-50 border-slate-200 hover:border-indigo-200 text-slate-800 font-medium'
                                    }`}
                                    title="Нажмите, чтобы показать эту улицу крупно на карте"
                                  >
                                    <span>
                                      {isStart ? '🟢 Старт:' : isEnd ? '🏁 Финиш:' : `${sIdx}.`}
                                    </span>
                                    <span>{step.street}</span>
                                    {step.time && (
                                      <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                          isEnd
                                            ? 'bg-slate-700 text-slate-200'
                                            : 'bg-white/80 text-slate-500 border border-slate-200/60'
                                        }`}
                                      >
                                        {step.time}
                                      </span>
                                    )}
                                  </button>
                                  {sIdx < steps.length - 1 && (
                                    <span className="text-slate-300 font-bold text-xs select-none">→</span>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 2: STAFF & EMPLOYEE PERSONAL CABINETS (Личные кабинеты каждого сотрудника + HR данные) */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Штат сотрудников и личные карточки (HR + KPI)</h2>
              <p className="text-xs text-slate-500">
                Прикрепляйте данные о каждом сотруднике, назначайте территории, дневные нормы и отслеживайте выполнение
              </p>
            </div>
            <button
              onClick={() => handleOpenRepModal()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Новый сотрудник
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reps.map((r) => {
              const repVisits = visits.filter(v => v.rep_id === r.id);
              const repVisitsToday = repVisits.filter(v => (v.created_at || '').startsWith(todayStr)).length;
              const repPharmaciesCount = pharmacies.filter(p => p.rep_id === r.id).length;
              const shift = activeShifts[r.id];
              const dailyTarget = r.daily_visit_target || 12;
              const monthlyTarget = r.target_monthly_visits || 120;
              const dailyPct = Math.min(100, Math.round((repVisitsToday / Math.max(1, dailyTarget)) * 100));
              const monthlyPct = Math.min(100, Math.round((repVisits.length / Math.max(1, monthlyTarget)) * 100));
              const repWaPhone = formatWhatsAppPhone(r.phone);

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:border-emerald-300 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                          {r.name?.charAt(0) || 'М'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-900">{r.name}</h3>
                            {shift ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                На смене
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                                Вне смены
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {r.position || 'Медицинский представитель'} • Район: <strong className="text-slate-700">{r.territory || 'Душанбе'}</strong>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenRepModal(r)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Данные
                      </button>
                    </div>

                    {/* HR Dossier Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Телефон / PIN</span>
                        <span className="font-semibold text-slate-800">{r.phone}</span>
                        <span className="text-[10px] text-slate-400 ml-1">(PIN: {r.pin_code || '2024'})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Транспорт</span>
                        <span className="font-semibold text-slate-800">
                          {r.transport_type === 'car' ? '🚗 Авто' : r.transport_type === 'public' ? '🚌 Обществ.' : '👟 Пешком'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Дата приема</span>
                        <span className="font-semibold text-slate-800">
                          {r.hire_date ? new Date(r.hire_date).toLocaleDateString('ru-RU') : '2024'}
                        </span>
                      </div>
                    </div>

                    {r.passport_info && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <strong className="text-slate-700">Паспорт / Документы:</strong> {r.passport_info}
                      </div>
                    )}

                    {r.bio_notes && (
                      <div className="text-xs text-emerald-900 bg-emerald-50/70 px-3 py-2 rounded-xl border border-emerald-200/60">
                        <strong className="text-emerald-800">Заметка руководителя:</strong> {r.bio_notes}
                      </div>
                    )}

                    {/* KPI Progress Bars */}
                    <div className="space-y-2 pt-1">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Визиты сегодня:</span>
                          <span className="font-bold text-emerald-700">{repVisitsToday} / {dailyTarget} ({dailyPct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${dailyPct}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Визиты за месяц:</span>
                          <span className="font-bold text-indigo-700">{repVisits.length} / {monthlyTarget} ({monthlyPct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${monthlyPct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Аптек: <strong className="text-slate-800">{repPharmaciesCount}</strong></span>
                      <span>•</span>
                      <span>Маршрут: <strong className="text-sky-700">{tracks.find(t => t.rep_id === r.id)?.total_km || 0} км</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      {repWaPhone && (
                        <a
                          href={`https://wa.me/${repWaPhone}?text=${encodeURIComponent(`Здравствуйте, ${r.name}! Пишу из пульта руководителя TOJ-VITAMIN.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-emerald-900 font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#1da851]" />
                          WhatsApp сотруднику
                        </a>
                      )}
                      <button
                        onClick={() => {
                          setSelectedRepFilter(r.id);
                          setActiveTab('map');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        На карте
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: VISIT AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Журнал аудита визитов</h2>
              <p className="text-xs text-slate-500">Проверка физического присутствия в аптеках по GPS и итогов переговоров</p>
            </div>

            <select
              value={selectedRepFilter}
              onChange={(e) => setSelectedRepFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
            >
              <option value="ALL">Все сотрудники</option>
              {reps.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-slate-100">
            {visits
              .filter(v => selectedRepFilter === 'ALL' || v.rep_id === selectedRepFilter)
              .slice(0, 100)
              .map((v) => {
                const pharm = pharmacies.find(p => p.id === v.pharmacy_id);
                const waUrl = pharm ? buildPharmacyWhatsAppUrl(pharm, 'Руководитель TOJ-VITAMIN') : null;
                return (
                  <div key={v.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {v.pharmacies?.name || pharm?.name || 'Аптека'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.is_gps_verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {v.is_gps_verified
                            ? `✓ GPS подтвержден (${v.distance_meters ?? 20}м)`
                            : `⚠️ Удаленно (${v.distance_meters ? `${v.distance_meters}м` : 'без GPS'})`}
                        </span>
                        <span className="text-xs text-slate-400">
                          • Медпред: <strong className="text-slate-700">{v.brand_reps?.name || 'Сотрудник'}</strong>
                        </span>
                      </div>

                      <div className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">
                          {v.result_type === 'order' ? '🛍️ Заказ оформлен' :
                           v.result_type === 'agreement' ? '🤝 Договор о поставке' :
                           v.result_type === 'rescheduled' ? '⏳ Перенос встречи' : '🎓 Презентация'}
                        </span>
                        {v.notes && <span> — {v.notes}</span>}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        {new Date(v.created_at).toLocaleString('ru-RU')} • Длительность: {v.duration_minutes || 15} мин
                      </div>
                    </div>

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-emerald-900 font-bold text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#1da851]" />
                        WhatsApp аптеки
                      </a>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT EMPLOYEE & HR PROFILE */}
      {isRepModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {editingRep.id ? 'Личная карточка сотрудника' : 'Добавить нового сотрудника'}
                </h3>
                <p className="text-xs text-slate-400">Данные отображаются в личном кабинете медпреда</p>
              </div>
              <button
                onClick={() => setIsRepModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRep} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ФИО сотрудника *</label>
                  <input
                    type="text"
                    required
                    value={editingRep.name || ''}
                    onChange={(e) => setEditingRep({ ...editingRep, name: e.target.value })}
                    placeholder="Рустам Сабиров"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Должность</label>
                  <input
                    type="text"
                    value={editingRep.position || ''}
                    onChange={(e) => setEditingRep({ ...editingRep, position: e.target.value })}
                    placeholder="Старший медпредставитель"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Телефон (логин для входа) *</label>
                  <input
                    type="tel"
                    required
                    value={editingRep.phone || ''}
                    onChange={(e) => setEditingRep({ ...editingRep, phone: e.target.value })}
                    placeholder="+992900000001"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PIN-код для входа *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={editingRep.pin_code || ''}
                    onChange={(e) => setEditingRep({ ...editingRep, pin_code: e.target.value })}
                    placeholder="2024"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Закрепленная территория / район</label>
                  <input
                    type="text"
                    value={editingRep.territory || ''}
                    onChange={(e) => setEditingRep({ ...editingRep, territory: e.target.value })}
                    placeholder="Душанбе (Сино, Сомони)"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Тип передвижения</label>
                  <select
                    value={editingRep.transport_type || 'foot'}
                    onChange={(e) => setEditingRep({ ...editingRep, transport_type: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="foot">👟 Пеший маршрут</option>
                    <option value="car">🚗 Личный автомобиль</option>
                    <option value="public">🚌 Общественный транспорт</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Норма визитов в день</label>
                  <input
                    type="number"
                    value={editingRep.daily_visit_target ?? 12}
                    onChange={(e) => setEditingRep({ ...editingRep, daily_visit_target: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">План визитов в месяц</label>
                  <input
                    type="number"
                    value={editingRep.target_monthly_visits ?? 120}
                    onChange={(e) => setEditingRep({ ...editingRep, target_monthly_visits: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">План продаж в месяц (сомони)</label>
                  <input
                    type="number"
                    value={editingRep.target_monthly_sales ?? 15000}
                    onChange={(e) => setEditingRep({ ...editingRep, target_monthly_sales: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Дата приема на работу</label>
                  <input
                    type="date"
                    value={editingRep.hire_date || ''}
                    onChange={(e) => setEditingRep({ ...editingRep, hire_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Паспортные данные / ИНН / Документы</label>
                <input
                  type="text"
                  value={editingRep.passport_info || ''}
                  onChange={(e) => setEditingRep({ ...editingRep, passport_info: e.target.value })}
                  placeholder="Серия А 0000000, выдан ОМВД Сино..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Задачи от руководителя / Фокусные препараты (видно в кабинете сотрудника)</label>
                <textarea
                  rows={2}
                  value={editingRep.bio_notes || ''}
                  onChange={(e) => setEditingRep({ ...editingRep, bio_notes: e.target.value })}
                  placeholder="Фокус на аптеках категории А в районе Караболо, презентация новой линейки Омега-3 и Магний B6."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRepModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingRep}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {savingRep ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Сохранить данные сотрудника
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
