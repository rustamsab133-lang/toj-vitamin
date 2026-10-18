"use client";
import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, List, Clock, User, Phone, CheckCircle2, 
  Plus, Compass, Search, ShieldCheck, Loader2, 
  Award, LogOut, RefreshCw, Building2, MessageSquare, 
  ArrowUpRight, Play, Pause, Footprints, Wifi, WifiOff, 
  UploadCloud, Smartphone, Briefcase, Calendar, Car, 
  Target, FileText, BatteryCharging
} from 'lucide-react';
import { Pharmacy, BrandRep } from '@/lib/types';
import { AddPharmacyModal } from '@/components/rep/AddPharmacyModal';
import { ActiveVisitModal } from '@/components/rep/ActiveVisitModal';
import { 
  buildPharmacyWhatsAppUrl, 
  saveCachedPharmacies, 
  getCachedPharmacies, 
  saveCachedVisits, 
  getCachedVisits, 
  getOfflineQueue, 
  flushOfflineQueue,
  enqueueOfflineAction
} from '@/lib/repOfflineQueue';
import { detectPhoneVendorGuide, startBackgroundTracker, stopBackgroundTracker } from '@/lib/backgroundTracker';

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
  const [pendingRep, setPendingRep] = useState<BrandRep | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('+992 ');
  const [regPassword, setRegPassword] = useState('');
  const [regTerritory, setRegTerritory] = useState('Душанбе');
  const [regTransport, setRegTransport] = useState<'foot' | 'car' | 'public'>('foot');
  const [regExperience, setRegExperience] = useState('');
  const [checkingPendingStatus, setCheckingPendingStatus] = useState(false);

  // Core Data & Tabs
  const [activeTab, setActiveTab] = useState<'map' | 'route' | 'history' | 'profile'>('map');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Offline & Sync State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);

  // User GPS
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeVisitPharmacy, setActiveVisitPharmacy] = useState<Pharmacy | null>(null);

  // Search & Filters in Route Tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');

  // Work Shift (Начать / Завершить смену)
  const [activeShift, setActiveShift] = useState<any | null>(null);
  const [isEndShiftModalOpen, setIsEndShiftModalOpen] = useState(false);
  const [isShiftActionLoading, setIsShiftActionLoading] = useState(false);
  const [shiftRequiredPrompt, setShiftRequiredPrompt] = useState<{
    type: 'add_pharmacy' | 'start_visit';
    pharmacy?: Pharmacy;
  } | null>(null);

  // Vendor battery guide
  const vendorGuide = useMemo(() => detectPhoneVendorGuide(), []);

  // Check saved session & offline cache on mount
  useEffect(() => {
    const savedRep = localStorage.getItem('toj_brand_rep_session');
    if (savedRep) {
      try {
        setRep(JSON.parse(savedRep));
      } catch (e) {}
    } else {
      const savedPending = localStorage.getItem('toj_brand_rep_pending');
      if (savedPending) {
        try {
          setPendingRep(JSON.parse(savedPending));
        } catch (e) {}
      }
    }
    const cachedPharms = getCachedPharmacies();
    if (cachedPharms.length > 0) setPharmacies(cachedPharms);

    const cachedVisits = getCachedVisits();
    if (cachedVisits.length > 0) setVisits(cachedVisits);

    setPendingOfflineCount(getOfflineQueue().length);
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    setAuthLoading(false);
  }, []);

  // Monitor Online / Offline & Auto-Flush Offline Queue
  const handleSyncOfflineQueue = async () => {
    const q = getOfflineQueue();
    setPendingOfflineCount(q.length);
    if (q.length === 0) return;

    setIsSyncingOffline(true);
    try {
      const result = await flushOfflineQueue();
      setPendingOfflineCount(result.remaining);
      if (result.synced > 0) {
        await loadPortalData();
      }
    } catch (e) {
    } finally {
      setIsSyncingOffline(false);
    }
  };

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      handleSyncOfflineQueue();
    };
    const onOffline = () => {
      setIsOnline(false);
      setPendingOfflineCount(getOfflineQueue().length);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const syncInterval = setInterval(() => {
      const qLen = getOfflineQueue().length;
      setPendingOfflineCount(qLen);
      if (navigator.onLine && qLen > 0) {
        handleSyncOfflineQueue();
      }
    }, 20000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(syncInterval);
    };
  }, [rep?.id]);

  // Sync Shift Session with localStorage and Supabase
  useEffect(() => {
    if (!rep?.id) return;
    try {
      const savedShift = localStorage.getItem('toj_rep_active_shift');
      if (savedShift) {
        setActiveShift(JSON.parse(savedShift));
      }
    } catch (e) {}

    fetch(`/api/rep?action=get_active_shift&rep_id=${rep.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          if (data.shift) {
            setActiveShift(data.shift);
            localStorage.setItem('toj_rep_active_shift', JSON.stringify(data.shift));
          } else {
            const savedShift = localStorage.getItem('toj_rep_active_shift');
            if (savedShift) {
              const parsed = JSON.parse(savedShift);
              if (!parsed.is_fallback) {
                setActiveShift(null);
                localStorage.removeItem('toj_rep_active_shift');
              }
            }
          }
        }
      })
      .catch(() => {});
  }, [rep?.id]);

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

  // Keep background GPS route recording active even when user is on Route / History / Profile tab
  useEffect(() => {
    if (!activeShift) {
      stopBackgroundTracker();
      return;
    }
    if (activeTab === 'map' || !rep?.id) return;

    startBackgroundTracker(
      (point) => {
        try {
          const todayStr = new Date().toISOString().slice(0, 10);
          const savedDate = localStorage.getItem('toj_rep_trail_date');
          let pts: Array<[number, number]> = [];
          if (savedDate === todayStr) {
            const raw = localStorage.getItem('toj_rep_trail_points');
            if (raw) pts = JSON.parse(raw);
          }
          const last = pts[pts.length - 1];
          if (last) {
            const d = calculateDistance(last[0], last[1], point.latitude, point.longitude);
            if (d < 15) return;
          }
          pts.push([point.latitude, point.longitude]);
          localStorage.setItem('toj_rep_trail_date', todayStr);
          localStorage.setItem('toj_rep_trail_points', JSON.stringify(pts));
        } catch (e) {}

        const trackPayload = {
          action: 'save_track_points',
          rep_id: rep.id,
          shift_id: activeShift.id,
          points: [{
            lat: point.latitude,
            lng: point.longitude,
            accuracy: point.accuracy,
            speed: point.speed,
            recorded_at: new Date().toISOString()
          }]
        };
        fetch('/api/rep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trackPayload)
        })
          .then(res => {
            if (!res.ok) throw new Error('Track save failed');
          })
          .catch(() => {
            enqueueOfflineAction('save_track_points', trackPayload);
          });
      },
      (err) => console.warn('Background tracker error:', err)
    );
  }, [activeShift, activeTab, rep?.id]);

  // Load Pharmacies, Visits, and fresh Rep HR Profile
  const loadPortalData = async () => {
    setLoadingData(true);
    try {
      const pharmRes = await fetch('/api/rep?action=list_pharmacies');
      const pharmData = await pharmRes.json();
      if (pharmData.success && pharmData.pharmacies) {
        setPharmacies(pharmData.pharmacies);
        saveCachedPharmacies(pharmData.pharmacies);
      }

      if (rep?.id) {
        const visitRes = await fetch(`/api/rep?action=list_visits&rep_id=${rep.id}`);
        const visitData = await visitRes.json();
        if (visitData.success && visitData.visits) {
          setVisits(visitData.visits);
          saveCachedVisits(visitData.visits);
        }

        // Refresh Rep profile (including HR fields and approval status updated by supervisor)
        const repsRes = await fetch('/api/rep?action=list_reps');
        const repsData = await repsRes.json();
        if (repsData.success && Array.isArray(repsData.reps)) {
          const freshMe = repsData.reps.find((r: any) => r.id === rep.id || r.phone === rep.phone);
          if (freshMe) {
            if (freshMe.status === 'pending') {
              setRep(null);
              localStorage.removeItem('toj_brand_rep_session');
              setPendingRep(freshMe);
              localStorage.setItem('toj_brand_rep_pending', JSON.stringify(freshMe));
            } else if (freshMe.status === 'inactive' || freshMe.status === 'rejected') {
              setRep(null);
              localStorage.removeItem('toj_brand_rep_session');
              setLoginError('⛔ Ваш доступ к приложению приостановлен руководителем.');
            } else {
              setRep(freshMe);
              localStorage.setItem('toj_brand_rep_session', JSON.stringify(freshMe));
            }
          }
        }
      }
      setIsOnline(true);
    } catch (err) {
      // Fallback to offline cache silently
      const cachedPharms = getCachedPharmacies();
      if (cachedPharms.length > 0 && pharmacies.length === 0) setPharmacies(cachedPharms);
      const cachedVisits = getCachedVisits();
      if (cachedVisits.length > 0 && visits.length === 0) setVisits(cachedVisits);
    } finally {
      setLoadingData(false);
      setPendingOfflineCount(getOfflineQueue().length);
    }
  };

  useEffect(() => {
    if (rep) {
      loadPortalData();
    }
  }, [rep?.id]);

  // Poll pending approval status automatically every 10s when on Pending Screen
  const handleCheckPendingStatus = async (silent = false) => {
    if (!pendingRep?.id) return;
    if (!silent) setCheckingPendingStatus(true);
    try {
      const res = await fetch(`/api/rep?action=get_profile&rep_id=${pendingRep.id}`);
      const data = await res.json();
      if (data.success && data.rep) {
        if (data.rep.status === 'active') {
          localStorage.removeItem('toj_brand_rep_pending');
          setPendingRep(null);
          setRep(data.rep);
          localStorage.setItem('toj_brand_rep_session', JSON.stringify(data.rep));
        } else if (data.rep.status === 'inactive' || data.rep.status === 'rejected') {
          localStorage.removeItem('toj_brand_rep_pending');
          setPendingRep(null);
          setLoginError('⛔ Ваша заявка была отклонена руководителем.');
        }
      } else if (res.status === 404) {
        localStorage.removeItem('toj_brand_rep_pending');
        setPendingRep(null);
        setLoginError('Заявка не найдена или была удалена.');
      }
    } catch (e) {
    } finally {
      if (!silent) setCheckingPendingStatus(false);
    }
  };

  useEffect(() => {
    if (!pendingRep?.id || rep) return;
    const interval = setInterval(() => {
      handleCheckPendingStatus(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [pendingRep?.id, rep]);

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
      if (data.status === 'pending' && data.pendingRep) {
        setPendingRep(data.pendingRep);
        localStorage.setItem('toj_brand_rep_pending', JSON.stringify(data.pendingRep));
        return;
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка входа');
      }

      localStorage.removeItem('toj_brand_rep_pending');
      setPendingRep(null);
      setRep(data.rep);
      localStorage.setItem('toj_brand_rep_session', JSON.stringify(data.rep));
    } catch (err: any) {
      setLoginError(err.message || 'Ошибка подключения');
    } finally {
      setAuthLoading(false);
    }
  };

  // Self-Registration handler (status: 'pending' -> requires Supervisor approval)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/rep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_rep',
          name: regName.trim(),
          phone: regPhone.trim(),
          pin_code: regPassword.trim(),
          territory: regTerritory,
          transport_type: regTransport,
          experience_years: regExperience.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось отправить заявку');
      }

      if (data.pendingRep) {
        setPendingRep(data.pendingRep);
        localStorage.setItem('toj_brand_rep_pending', JSON.stringify(data.pendingRep));
      }
    } catch (err: any) {
      setLoginError(err.message || 'Ошибка подключения');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('toj_brand_rep_session');
    localStorage.removeItem('toj_brand_rep_pending');
    setPendingRep(null);
    setRep(null);
  };

  // Helper: Calculate total km from local trail points
  const calculateShiftKm = () => {
    try {
      const trail = localStorage.getItem('toj_rep_trail_points');
      if (trail) {
        const pts = JSON.parse(trail);
        if (Array.isArray(pts) && pts.length > 1) {
          let dist = 0;
          for (let i = 1; i < pts.length; i++) {
            dist += calculateDistance(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
          }
          return (dist / 1000).toFixed(2);
        }
      }
    } catch (e) {}
    return '0.00';
  };

  // Start Work Shift
  const handleStartShift = async () => {
    if (!rep?.id) return;
    setIsShiftActionLoading(true);
    try {
      const res = await fetch('/api/rep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_shift',
          rep_id: rep.id,
          start_lat: userCoords?.lat || null,
          start_lng: userCoords?.lng || null
        })
      });
      const data = await res.json();
      if (data.success && data.shift) {
        setActiveShift(data.shift);
        localStorage.setItem('toj_rep_active_shift', JSON.stringify(data.shift));
      }
    } catch (err) {
      // Offline shift start fallback
      const fallbackShift = {
        id: `offline_shift_${Date.now()}`,
        rep_id: rep.id,
        status: 'active',
        started_at: new Date().toISOString(),
        start_lat: userCoords?.lat || null,
        start_lng: userCoords?.lng || null,
        is_fallback: true
      };
      setActiveShift(fallbackShift);
      localStorage.setItem('toj_rep_active_shift', JSON.stringify(fallbackShift));
    } finally {
      setIsShiftActionLoading(false);
    }
  };

  // Strict Shift Guard: Require active shift before adding pharmacy or starting visit
  const handleRequestAddPharmacy = () => {
    if (!activeShift) {
      setShiftRequiredPrompt({ type: 'add_pharmacy' });
      return;
    }
    setIsAddModalOpen(true);
  };

  const handleRequestStartVisit = (pharm: Pharmacy) => {
    if (!activeShift) {
      setShiftRequiredPrompt({ type: 'start_visit', pharmacy: pharm });
      return;
    }
    setActiveVisitPharmacy(pharm);
  };

  const handleStartShiftAndProceed = async () => {
    const pending = shiftRequiredPrompt;
    await handleStartShift();
    setShiftRequiredPrompt(null);
    if (pending?.type === 'add_pharmacy') {
      setIsAddModalOpen(true);
    } else if (pending?.type === 'start_visit' && pending.pharmacy) {
      setActiveVisitPharmacy(pending.pharmacy);
    }
  };

  // End Work Shift
  const handleEndShift = async () => {
    if (!rep?.id || !activeShift) return;
    setIsShiftActionLoading(true);

    const totalKm = Number(calculateShiftKm());
    const shiftStartTime = new Date(activeShift.started_at).getTime();
    const visitsOnShift = visits.filter(v => new Date(v.created_at).getTime() >= shiftStartTime).length;
    const pharmsOnShift = pharmacies.filter(p => p.created_at && new Date(p.created_at).getTime() >= shiftStartTime && p.rep_id === rep.id).length;

    try {
      await fetch('/api/rep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end_shift',
          shift_id: activeShift.id,
          rep_id: rep.id,
          end_lat: userCoords?.lat || null,
          end_lng: userCoords?.lng || null,
          total_km: totalKm,
          visits_count: visitsOnShift,
          pharmacies_added: pharmsOnShift
        })
      });
    } catch (err) {
      console.warn('End shift sync error:', err);
    } finally {
      setActiveShift(null);
      localStorage.removeItem('toj_rep_active_shift');
      setIsEndShiftModalOpen(false);
      setIsShiftActionLoading(false);
    }
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

  // Personal Cabinet KPI calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const visitsTodayCount = useMemo(
    () => visits.filter(v => (v.created_at || '').startsWith(todayStr)).length,
    [visits, todayStr]
  );
  const visitsMonthCount = useMemo(
    () => visits.filter(v => (v.created_at || '').startsWith(currentMonthPrefix)).length,
    [visits, currentMonthPrefix]
  );
  const dailyTarget = rep?.daily_visit_target || 12;
  const monthlyTarget = rep?.target_monthly_visits || 120;
  const dailyProgressPct = Math.min(100, Math.round((visitsTodayCount / Math.max(1, dailyTarget)) * 100));
  const monthlyProgressPct = Math.min(100, Math.round((visitsMonthCount / Math.max(1, monthlyTarget)) * 100));

  // --- 0. AUTH LOADING SCREEN ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
        <span className="text-xs text-slate-400">Загрузка сессии представителя...</span>
      </div>
    );
  }

  // --- 1. LOGIN & SELF-REGISTRATION SCREEN ---
  if (!rep) {
    // 1a. Pending Supervisor Approval Screen
    if (pendingRep) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-5 text-center">
            <img
              src="/rep-logo.png"
              alt="Toj-Vitamin"
              className="w-20 h-20 rounded-2xl object-contain bg-white border border-slate-100 shadow-md mx-auto p-1"
            />

            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-bold text-slate-900">Ожидание подтверждения</h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ваша заявка отправлена руководителю. Как только руководитель подтвердит ваш аккаунт в админ-панели, доступ к карте и аптекам откроется автоматически.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Сотрудник:</span>
                <span className="font-bold text-slate-800">{pendingRep.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Телефон:</span>
                <span className="font-mono font-semibold text-slate-700">{pendingRep.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Территория:</span>
                <span className="font-semibold text-slate-700">{pendingRep.territory || 'Душанбе'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/70">
                <span className="text-slate-400">Статус:</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  ⏳ На проверке у руководителя
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={checkingPendingStatus}
                onClick={() => handleCheckPendingStatus(false)}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${checkingPendingStatus ? 'animate-spin' : ''}`} />
                {checkingPendingStatus ? 'Проверка статуса...' : 'Проверить подтверждение'}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors"
              >
                Вернуться ко входу
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 1b. Standard Login & Self-Registration Tabs
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-5">
          <div className="text-center space-y-2">
            <img
              src="/rep-logo.png"
              alt="Toj-Vitamin"
              className="w-20 h-20 rounded-2xl object-contain bg-white border border-slate-100 shadow-md mx-auto p-1"
            />
            <h1 className="text-xl font-bold text-slate-900">Терминал медпреда</h1>
            <p className="text-xs text-slate-500">Полевой модуль визитов, личного кабинета и карт</p>
          </div>

          {/* Mode Switcher: Login vs Register */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setLoginError(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                authMode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🔑 Вход
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setLoginError(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                authMode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              📝 Регистрация
            </button>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {loginError}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ваш номер телефона
                </label>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+992 900 00 00 00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Пароль / PIN-код доступа
                </label>
                <input
                  type="password"
                  required
                  maxLength={32}
                  autoComplete="current-password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Введите ваш пароль"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ваше ФИО полностью *
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Например: Алишер Рахимов"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Номер телефона (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+992 900 00 00 00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Придумайте пароль или PIN-код (мин. 4 символа) *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  maxLength={32}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Придумайте личный пароль"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Город / Район
                  </label>
                  <select
                    value={regTerritory}
                    onChange={(e) => setRegTerritory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Душанбе">Душанбе</option>
                    <option value="Худжанд">Худжанд</option>
                    <option value="Бохтар">Бохтар</option>
                    <option value="Куляб">Куляб</option>
                    <option value="Гиссар">Гиссар</option>
                    <option value="Турсунзаде">Турсунзаде</option>
                    <option value="Вахдат">Вахдат</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Передвижение
                  </label>
                  <select
                    value={regTransport}
                    onChange={(e) => setRegTransport(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="foot">🚶 Пешком</option>
                    <option value="car">🚗 Личное авто</option>
                    <option value="public">🚌 Общ. транспорт</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Опыт работы (необязательно)
                </label>
                <input
                  type="text"
                  value={regExperience}
                  onChange={(e) => setRegExperience(e.target.value)}
                  placeholder="Например: 2 года в фарме"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900">
                🔒 После отправки анкеты руководитель получит уведомление и подтвердит ваш доступ к базе аптек.
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                Отправить заявку руководителю
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- 2. MAIN APPLICATION INTERFACE ---
  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 shrink-0 flex items-center justify-between z-20">
        <div
          onClick={() => setActiveTab('profile')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <img
            src="/rep-logo.png"
            alt="Toj-Vitamin"
            className="w-10 h-10 rounded-2xl object-contain bg-white border border-slate-200 p-0.5 shadow-sm shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900 leading-tight">{rep?.name}</span>
              {activeShift ? (
                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  На смене
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-500 text-[10px] font-medium px-2 py-0.5 rounded-full">
                  Вне смены
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>{rep?.position || 'Медпредставитель'}</span>
              <span>•</span>
              <span>{rep?.territory || 'Душанбе'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Offline / Queue Indicator */}
          {!isOnline ? (
            <div className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-1.5 rounded-xl text-[11px] font-bold">
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              <span>Оффлайн {pendingOfflineCount > 0 ? `(${pendingOfflineCount})` : ''}</span>
            </div>
          ) : pendingOfflineCount > 0 ? (
            <button
              onClick={handleSyncOfflineQueue}
              disabled={isSyncingOffline}
              className="flex items-center gap-1 bg-sky-100 hover:bg-sky-200 text-sky-800 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors"
              title="Отправить сохраненные в подвале данные на сервер"
            >
              <UploadCloud className={`w-3.5 h-3.5 text-sky-600 ${isSyncingOffline ? 'animate-bounce' : ''}`} />
              <span>Синхр. ({pendingOfflineCount})</span>
            </button>
          ) : null}

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
            repId={rep.id}
            repName={rep.name}
            repColor={rep.track_color || '#2563eb'}
            userLat={userCoords?.lat}
            userLng={userCoords?.lng}
            activeShift={activeShift}
            onStartShift={handleStartShift}
            onRequestEndShift={() => setIsEndShiftModalOpen(true)}
            onStartVisit={(pharm) => handleRequestStartVisit(pharm)}
            onAddNewPharmacy={handleRequestAddPharmacy}
          />
        )}

        {activeTab === 'route' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
            {/* Shift Notice if off duty */}
            {!activeShift && (
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Вы вне смены. Начните рабочий день для автоматической записи визитов и маршрута.</span>
                </div>
                <button
                  onClick={handleStartShift}
                  disabled={isShiftActionLoading}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-sm transition-all"
                >
                  Начать смену
                </button>
              </div>
            )}

            {/* Header info in Route tab */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Маршрутный лист</h2>
                <p className="text-xs text-slate-500">
                  {userCoords ? 'Аптеки отсортированы «Рядом со мной» по GPS' : 'Работает даже без интернета (из кэша)'}
                </p>
              </div>

              <button
                onClick={handleRequestAddPharmacy}
                className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all ${
                  activeShift
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-slate-800 hover:bg-slate-900 border border-amber-400/50'
                }`}
              >
                <Plus className="w-4 h-4" />
                {activeShift ? 'Добавить аптеку' : '🔒 Добавить аптеку'}
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
                  {cat === 'ALL' ? `Все (${pharmacies.length})` : `Кат. ${cat}`}
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
                sortedPharmacies.map((pharm) => {
                  const waUrl = buildPharmacyWhatsAppUrl(pharm, rep.name);
                  return (
                    <div
                      key={pharm.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-emerald-300 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
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

                            {(pharm as any).is_offline_queued && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                                ⏳ В оффлайн-очереди
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
                          className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg font-medium flex items-center gap-1 shrink-0"
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

                      {/* Action Buttons: 4-button row with direct WhatsApp */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {pharm.phone ? (
                          <a
                            href={`tel:${pharm.phone}`}
                            className="py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-200/60"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            Звонок
                          </a>
                        ) : (
                          <div className="py-2 rounded-xl bg-slate-50 text-slate-300 text-xs text-center">
                            Нет тел.
                          </div>
                        )}

                        {/* DIRECT WHATSAPP WITHOUT SAVING NUMBER */}
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                            title="Открыть чат в WhatsApp сразу без сохранения номера в контакты"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#1da851]" />
                            В WhatsApp
                          </a>
                        ) : (
                          <div className="py-2 rounded-xl bg-slate-50 text-slate-300 text-xs text-center">
                            Нет WhatsApp
                          </div>
                        )}

                        {pharm.latitude && pharm.longitude ? (
                          <a
                            href={`https://yandex.ru/maps/?rtext=~${pharm.latitude},${pharm.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-200/60"
                          >
                            <Compass className="w-3.5 h-3.5 text-indigo-600" />
                            Навигатор
                          </a>
                        ) : (
                          <button
                            onClick={handleRequestAddPharmacy}
                            className="py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-medium"
                          >
                            + GPS
                          </button>
                        )}

                        <button
                          onClick={() => handleRequestStartVisit(pharm)}
                          className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Начать визит
                        </button>
                      </div>
                    </div>
                  );
                })
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

                      <div className="flex items-center gap-1.5">
                        {v.is_offline_queued && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                            ⏳ Оффлайн
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.is_gps_verified 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {v.is_gps_verified ? '✓ GPS в аптеке' : 'Удаленный'}
                        </span>
                      </div>
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

        {/* 4. PERSONAL EMPLOYEE CABINET (Личный кабинет каждого сотрудника + HR данные + Шпаргалка Android) */}
        {activeTab === 'profile' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
            {/* Employee Digital Badge */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold text-2xl shadow-lg">
                    {rep.name?.charAt(0) || 'М'}
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">
                      <Award className="w-3 h-3" /> Личный кабинет сотрудника
                    </div>
                    <h2 className="text-lg font-bold leading-tight">{rep.name}</h2>
                    <p className="text-xs text-slate-300">
                      {rep.position || 'Медицинский представитель'} • {rep.brand_name || 'TOJ-VITAMIN'}
                    </p>
                  </div>
                </div>
              </div>

              {/* HR Metadata Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10 text-xs">
                <div className="bg-white/5 rounded-2xl p-2.5">
                  <div className="text-slate-400 text-[10px] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" /> Закрепленный район
                  </div>
                  <div className="font-bold text-white mt-0.5">{rep.territory || 'Душанбе'}</div>
                </div>

                <div className="bg-white/5 rounded-2xl p-2.5">
                  <div className="text-slate-400 text-[10px] flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" /> Рабочий номер
                  </div>
                  <div className="font-bold text-white mt-0.5">{rep.phone}</div>
                </div>

                <div className="bg-white/5 rounded-2xl p-2.5">
                  <div className="text-slate-400 text-[10px] flex items-center gap-1">
                    <Car className="w-3 h-3 text-sky-400" /> Передвижение
                  </div>
                  <div className="font-bold text-white mt-0.5">
                    {rep.transport_type === 'car' ? '🚗 Личный авто' : rep.transport_type === 'public' ? '🚌 Обществ. транспорт' : '👟 Пеший маршрут'}
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-2.5">
                  <div className="text-slate-400 text-[10px] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" /> В компании с
                  </div>
                  <div className="font-bold text-white mt-0.5">
                    {rep.hire_date ? new Date(rep.hire_date).toLocaleDateString('ru-RU') : '2024 г.'}
                  </div>
                </div>
              </div>

              {rep.bio_notes && (
                <div className="bg-white/5 rounded-2xl p-3 text-xs text-slate-200 border border-white/10">
                  <span className="text-emerald-400 font-semibold">Фокус и задачи от руководителя: </span>
                  {rep.bio_notes}
                </div>
              )}
            </div>

            {/* Live KPI & Plan Progress */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  Выполнение плана KPI
                </h3>
                <span className="text-[11px] font-semibold text-slate-500">
                  План продаж: {(rep.target_monthly_sales || 15000).toLocaleString()} с.
                </span>
              </div>

              {/* Daily Visits Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">План визитов на сегодня</span>
                  <span className="font-bold text-emerald-700">{visitsTodayCount} из {dailyTarget} аптек ({dailyProgressPct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${dailyProgressPct}%` }}
                  />
                </div>
              </div>

              {/* Monthly Visits Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">План визитов за месяц</span>
                  <span className="font-bold text-indigo-700">{visitsMonthCount} из {monthlyTarget} визитов ({monthlyProgressPct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${monthlyProgressPct}%` }}
                  />
                </div>
              </div>

              {/* Quick Personal Stats */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <div className="text-lg font-bold text-slate-900">{calculateShiftKm()} км</div>
                  <div className="text-[10px] text-slate-500">Пройдено сегодня</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <div className="text-lg font-bold text-emerald-600">
                    {pharmacies.filter(p => p.rep_id === rep.id).length}
                  </div>
                  <div className="text-[10px] text-slate-500">Моих аптек в базе</div>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 text-center border border-slate-100">
                  <div className="text-lg font-bold text-indigo-600">
                    {visits.filter(v => v.result_type === 'order' || v.result_type === 'agreement').length}
                  </div>
                  <div className="text-[10px] text-slate-500">Заказов / Договоров</div>
                </div>
              </div>
            </div>

            {/* Offline Queue & Basement Mode Card */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Оффлайн-режим (Работа в подвальных аптеках)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      В кэше телефона: {pharmacies.length} аптек • В очереди отправки: {pendingOfflineCount}
                    </p>
                  </div>
                </div>
                {pendingOfflineCount > 0 && (
                  <button
                    onClick={handleSyncOfflineQueue}
                    disabled={isSyncingOffline}
                    className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm"
                  >
                    {isSyncingOffline ? 'Отправка...' : 'Синхронизировать'}
                  </button>
                )}
              </div>
            </div>

            {/* Download Updated Native Android APK (with new Logo & Background GPS) */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/rep-logo.png"
                  alt="Toj-Vitamin APK"
                  className="w-11 h-11 rounded-2xl object-contain bg-white border border-slate-200 p-0.5 shadow-sm shrink-0"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Мобильное приложение Android (APK)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Обновлённая версия с фирменным логотипом и фоновым GPS в кармане (6.7 МБ)
                  </p>
                </div>
              </div>
              <a
                href="/toj-vitamin-rep.apk"
                download="Toj-Vitamin-Rep.apk"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 shadow-sm transition-all"
              >
                Скачать APK
              </a>
            </div>

            {/* Android Pocket Mode Instructions (Xiaomi, Samsung, Tecno) */}
            <div className="bg-amber-50/70 rounded-3xl p-4 border border-amber-200/80 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <BatteryCharging className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Настройка для работы в кармане: {vendorGuide.title}</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Чтобы система Android не отключала GPS-трекер через 15 минут после блокировки экрана в кармане, выполните 3 шага:
              </p>
              <div className="space-y-1.5 pt-1">
                {vendorGuide.steps.map((step, idx) => (
                  <div key={idx} className="text-[11px] text-amber-950 bg-white/80 px-3 py-2 rounded-xl border border-amber-200/50 font-medium">
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Mobile Tab Bar (4 Tabs) */}
      <nav className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shrink-0 z-30 shadow-lg">
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

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 text-xs font-semibold transition-all relative ${
            activeTab === 'profile' ? 'text-emerald-600 scale-105' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Кабинет</span>
          {pendingOfflineCount > 0 && (
            <span className="absolute -top-1 right-1 w-2 h-2 rounded-full bg-amber-500"></span>
          )}
        </button>
      </nav>

      {/* Modals */}
      {isAddModalOpen && (
        <AddPharmacyModal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          repId={rep.id}
          repName={rep.name}
          initialLat={userCoords?.lat}
          initialLng={userCoords?.lng}
          existingPharmacies={pharmacies}
          onPharmacyAdded={(newPharm) => {
            setPharmacies(prev => {
              const next = [newPharm, ...prev];
              saveCachedPharmacies(next);
              return next;
            });
            setPendingOfflineCount(getOfflineQueue().length);
          }}
        />
      )}

      {activeVisitPharmacy && (
        <ActiveVisitModal
          isOpen={true}
          onClose={() => setActiveVisitPharmacy(null)}
          pharmacy={activeVisitPharmacy}
          repId={rep.id}
          repName={rep.name}
          userLat={userCoords?.lat}
          userLng={userCoords?.lng}
          onVisitCompleted={(visit) => {
            setVisits(prev => {
              const next = [visit, ...prev];
              saveCachedVisits(next);
              return next;
            });
            setPendingOfflineCount(getOfflineQueue().length);
          }}
        />
      )}

      {/* End Shift Summary Modal */}
      {isEndShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <Pause className="w-7 h-7 fill-red-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Завершить рабочий день?</h2>
              <p className="text-xs text-slate-500">
                GPS-трекинг будет полностью отключен, а итоги дня сохранены в отчете руководителя.
              </p>
            </div>

            {/* Shift Stats Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Время старта:
                </span>
                <span className="font-semibold text-slate-800">
                  {activeShift?.started_at ? new Date(activeShift.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Footprints className="w-3.5 h-3.5 text-sky-500" />
                  Пройденный маршрут:
                </span>
                <span className="font-bold text-slate-900">
                  {calculateShiftKm()} км
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Визитов за смену:
                </span>
                <span className="font-bold text-emerald-700">
                  {activeShift ? visits.filter(v => new Date(v.created_at).getTime() >= new Date(activeShift.started_at).getTime()).length : 0}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-500" />
                  Новых аптек добавлено:
                </span>
                <span className="font-bold text-indigo-700">
                  {activeShift ? pharmacies.filter(p => p.created_at && new Date(p.created_at).getTime() >= new Date(activeShift.started_at).getTime() && p.rep_id === rep.id).length : 0}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-2 text-[11px] text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Ваша приватность гарантирована: после закрытия смены координаты и передвижения не отслеживаются.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEndShiftModalOpen(false)}
                className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Продолжить
              </button>

              <button
                type="button"
                disabled={isShiftActionLoading}
                onClick={handleEndShift}
                className="py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isShiftActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Завершить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strict Shift Required Guard Modal (Вариант 1) */}
      {shiftRequiredPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <Play className="w-7 h-7 fill-amber-500 ml-0.5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Сначала начните работу</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {shiftRequiredPrompt.type === 'add_pharmacy'
                  ? 'Добавление новых аптек заблокировано вне смены. Включите рабочий день, чтобы ваш маршрут по улице и новая точка зафиксировались на карте руководителя и в дневном отчёте.'
                  : `Оформление визита в аптеку «${shiftRequiredPrompt.pharmacy?.name || ''}» доступно только во время активной смены для записи GPS-маршрута и отчёта дня.`}
              </p>
            </div>

            <div className="bg-emerald-50/80 rounded-2xl p-3.5 border border-emerald-200/80 flex items-start gap-2.5 text-[11px] text-emerald-900">
              <Footprints className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                При нажатии кнопки ниже смена откроется автоматически, включится запись маршрута, и сразу откроется нужная форма.
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isShiftActionLoading}
                onClick={handleStartShiftAndProceed}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isShiftActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    {shiftRequiredPrompt.type === 'add_pharmacy'
                      ? 'Начать работу и добавить аптеку'
                      : 'Начать работу и открыть визит'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShiftRequiredPrompt(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
