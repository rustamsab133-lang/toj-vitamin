"use client";
import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, List, Clock, User, Phone, CheckCircle2, 
  Plus, Compass, Search, Filter, ShieldCheck, Loader2, 
  TrendingUp, Award, LogOut, RefreshCw, ChevronRight, 
  Building2, MessageSquare, AlertTriangle, ArrowUpRight 
} from 'lucide-react';
import { Pharmacy, BrandRep } from '@/lib/types';
import { AddPharmacyModal } from '@/components/rep/AddPharmacyModal';
import { ActiveVisitModal } from '@/components/rep/ActiveVisitModal';

// Dynamically import Overview Map to prevent SSR errors
const PharmaciesOverviewMap = dynamic(
  () => import('@/components/rep/PharmaciesOverviewMap').then(m => m.PharmaciesOverviewMap),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="text-sm font-medium">Загрузка карты аптек...</span>
      </div>
    )
  }
);

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function BrandRepPortalPage() {
  const [rep, setRep] = useState<BrandRep | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [phoneInput, setPhoneInput] = useState('+992900000001');
  const [pinInput, setPinInput] = useState('2024');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Core Data
  const [activeTab, setActiveTab] = useState<'map' | 'route' | 'history'>('map');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // User GPS
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeVisitPharmacy, setActiveVisitPharmacy] = useState<Pharmacy | null>(null);

  // Search & Filters in Route Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');

  // Check saved session
  useEffect(() => {
    const savedRep = localStorage.getItem('toj_brand_rep_session');
    if (savedRep) {
      try {
        setRep(JSON.parse(savedRep));
      } catch (e) {}
    }
    setAuthLoading(false);
  }, []);

  // Track GPS
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsError(null);
      },
      (err) => {
        console.warn('Geolocation watch error:', err);
        setGpsError('GPS недоступен');
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Load Pharmacies and Visits
  const loadPortalData = async () => {
    setLoadingData(true);
    try {
      const pharmRes = await fetch('/api/rep?action=list_pharmacies');
      const pharmData = await pharmRes.json();
      if (pharmData.success && pharmData.pharmacies) {
        setPharmacies(pharmData.pharmacies);
      }

      if (rep?.id) {
        const visitRes = await fetch(`/api/rep?action=list_visits&rep_id=${rep.id}`);
        const visitData = await visitRes.json();
        if (visitData.success && visitData.visits) {
          setVisits(visitData.visits);
        }
      }
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (rep) {
      loadPortalData();
    }
  }, [rep]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/rep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          phone: phoneInput.trim(),
          pin_code: pinInput.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка входа');
      }

      setRep(data.rep);
      localStorage.setItem('toj_brand_rep_session', JSON.stringify(data.rep));
    } catch (err: any) {
      setLoginError(err.message || 'Ошибка подключения');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('toj_brand_rep_session');
    setRep(null);
  };

  // Sort pharmacies by distance to representative
  const sortedPharmacies = useMemo(() => {
    return [...pharmacies].map(p => {
      let distanceMeters = Infinity;
      if (userCoords && p.latitude && p.longitude) {
        distanceMeters = calculateDistance(userCoords.lat, userCoords.lng, Number(p.latitude), Number(p.longitude));
      }
      return { ...p, distanceMeters };
    }).sort((a, b) => {
      // Pharmacies with distance come first, sorted ascending
      return a.distanceMeters - b.distanceMeters;
    }).filter(p => {
      if (filterCategory !== 'ALL' && (p.category || 'B') !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q) ||
          p.contact_person?.toLowerCase().includes(q) ||
          p.landmark?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pharmacies, userCoords, filterCategory, searchQuery]);

  // --- 0. AUTH LOADING SCREEN ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
        <span className="text-xs text-slate-400">Загрузка сессии представителя...</span>
      </div>
    );
  }

  // --- 1. LOGIN SCREEN ---
  if (!rep) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <MapPin className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Терминал медпреда</h1>
            <p className="text-xs text-slate-500">Полевой модуль визитов и картографирования</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Номер телефона
              </label>
              <input
                type="tel"
                required
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+992 900 00 00 01"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PIN-код доступа
              </label>
              <input
                type="password"
                required
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="2024"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-widest text-center"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              Войти в терминал
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              Тестовый доступ: тел <code className="text-slate-600">+992900000001</code>, PIN: <code className="text-slate-600">2024</code>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. MAIN APPLICATION INTERFACE ---
  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
            {rep?.name?.charAt(0) || 'P'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900 leading-tight">{rep?.name}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>{rep?.brand_name || 'TOJ-VITAMIN'}</span>
              <span>•</span>
              <span>{rep?.territory || 'Душанбе'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Data */}
          <button
            onClick={loadPortalData}
            disabled={loadingData}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            title="Обновить данные"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeTab === 'map' && (
          <PharmaciesOverviewMap
            pharmacies={pharmacies}
            userLat={userCoords?.lat}
            userLng={userCoords?.lng}
            onStartVisit={(pharm) => setActiveVisitPharmacy(pharm)}
            onAddNewPharmacy={() => setIsAddModalOpen(true)}
          />
        )}

        {activeTab === 'route' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
            {/* Header info in Route tab */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Маршрутный лист</h2>
                <p className="text-xs text-slate-500">
                  {userCoords ? 'Аптеки отсортированы «Рядом со мной» по GPS' : 'Поиск по базе аптек'}
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>

            {/* Search Input */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
              <input
                type="text"
                placeholder="Поиск по названию, ориентиру, заведующей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
              />
            </div>

            {/* Category filter */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {(['ALL', 'A', 'B', 'C'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                    filterCategory === cat
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat === 'ALL' ? 'Все' : `Кат. ${cat}`}
                </button>
              ))}
            </div>

            {/* Pharmacies List */}
            <div className="space-y-2.5">
              {sortedPharmacies.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Building2 className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-xs">Аптеки не найдены</p>
                </div>
              ) : (
                sortedPharmacies.map((pharm) => (
                  <div
                    key={pharm.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-emerald-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            pharm.category === 'A' ? 'bg-amber-100 text-amber-800' :
                            pharm.category === 'B' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            Категория {pharm.category || 'B'}
                          </span>

                          {pharm.distanceMeters && pharm.distanceMeters !== Infinity && (
                            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              📍 {pharm.distanceMeters > 1000 
                                ? `${(pharm.distanceMeters / 1000).toFixed(1)} км` 
                                : `${pharm.distanceMeters} м`}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm text-slate-900">{pharm.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-1">{pharm.address}</p>
                        {pharm.landmark && (
                          <p className="text-[11px] text-emerald-700 font-medium">
                            Ориентир: {pharm.landmark}
                          </p>
                        )}
                      </div>

                      {/* B2B Link Quick Badge */}
                      <a
                        href={`/b2b/${pharm.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg font-medium flex items-center gap-1"
                        title="Открыть B2B витрину"
                      >
                        B2B <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Contacts & Time */}
                    <div className="text-xs text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400">ЛПР: </span>
                        <span className="font-medium text-slate-800">{pharm.contact_person || 'Заведующая'}</span>
                      </div>
                      {pharm.preferred_time && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{pharm.preferred_time}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {pharm.phone ? (
                        <a
                          href={`tel:${pharm.phone}`}
                          className="py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center justify-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          Звонок
                        </a>
                      ) : (
                        <div className="py-2 rounded-xl bg-slate-50 text-slate-300 text-xs text-center">
                          Нет тел.
                        </div>
                      )}

                      {pharm.latitude && pharm.longitude ? (
                        <a
                          href={`https://yandex.ru/maps/?rtext=~${pharm.latitude},${pharm.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center justify-center gap-1"
                        >
                          <Compass className="w-3.5 h-3.5 text-indigo-600" />
                          2GIS / Яндекс
                        </a>
                      ) : (
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-medium"
                        >
                          + GPS
                        </button>
                      )}

                      <button
                        onClick={() => setActiveVisitPharmacy(pharm)}
                        className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Визит
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Журнал визитов</h2>
                <p className="text-xs text-slate-500">История ваших посещений аптек</p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Всего: {visits.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {visits.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Clock className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-xs">Вы еще не совершали визитов сегодня</p>
                </div>
              ) : (
                visits.map((v) => (
                  <div key={v.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {v.pharmacies?.name || 'Аптека'}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {new Date(v.created_at).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })} • {v.duration_minutes || 15} мин в аптеке
                        </p>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        v.is_gps_verified 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {v.is_gps_verified ? '✓ GPS в аптеке' : 'Удаленный'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="font-semibold text-slate-700">
                        Результат: {
                          v.result_type === 'order' ? '🛍️ Заказ оформлен' :
                          v.result_type === 'agreement' ? '🤝 Договор о поставке' :
                          v.result_type === 'rescheduled' ? '⏳ Перенос встречи' : '🎓 Презентация новинок'
                        }
                      </div>
                      {v.notes && <p className="mt-1 text-slate-600">{v.notes}</p>}
                    </div>

                    {v.next_visit_date && (
                      <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Следующий контакт: {new Date(v.next_visit_date).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Mobile Tab Bar */}
      <nav className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2 flex items-center justify-around shrink-0 z-30 shadow-lg">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition-all ${
            activeTab === 'map' ? 'text-emerald-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span>Карта</span>
        </button>

        <button
          onClick={() => setActiveTab('route')}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition-all ${
            activeTab === 'route' ? 'text-emerald-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <List className="w-5 h-5" />
          <span>Маршрут</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition-all ${
            activeTab === 'history' ? 'text-emerald-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span>Визиты</span>
        </button>
      </nav>

      {/* Modals */}
      <AddPharmacyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        repId={rep.id}
        existingPharmacies={pharmacies}
        onPharmacyAdded={(newPharm) => {
          setPharmacies(prev => [newPharm, ...prev]);
        }}
      />

      {activeVisitPharmacy && (
        <ActiveVisitModal
          isOpen={true}
          onClose={() => setActiveVisitPharmacy(null)}
          pharmacy={activeVisitPharmacy}
          repId={rep.id}
          userLat={userCoords?.lat}
          userLng={userCoords?.lng}
          onVisitCompleted={(visit) => {
            setVisits(prev => [visit, ...prev]);
          }}
        />
      )}
    </div>
  );
}
