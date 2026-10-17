"use client";
import React, { useState, useEffect } from 'react';
import { 
  X, Clock, MapPin, CheckCircle2, AlertTriangle, 
  ShoppingCart, MessageSquare, Phone, FileText, 
  Calendar, Loader2, Sparkles, Building2, ExternalLink 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Pharmacy } from '@/lib/types';
import { buildPharmacyWhatsAppUrl, enqueueOfflineAction } from '@/lib/repOfflineQueue';

interface ActiveVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacy: Pharmacy;
  repId: string;
  repName?: string;
  userLat?: number | null;
  userLng?: number | null;
  onVisitCompleted: (visit: any) => void;
}

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

export const ActiveVisitModal: React.FC<ActiveVisitModalProps> = ({
  isOpen,
  onClose,
  pharmacy,
  repId,
  repName,
  userLat,
  userLng,
  onVisitCompleted
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [resultType, setResultType] = useState<'presentation' | 'order' | 'agreement' | 'rescheduled'>('presentation');
  const [notes, setNotes] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate distance to pharmacy
  let distanceMeters: number | null = null;
  if (userLat && userLng && pharmacy.latitude && pharmacy.longitude) {
    distanceMeters = calculateDistance(userLat, userLng, Number(pharmacy.latitude), Number(pharmacy.longitude));
  }
  const isGpsVerified = distanceMeters !== null && distanceMeters <= 200;

  // Visit timer
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinishVisit = async () => {
    setSubmitting(true);
    setError(null);

    const payload = {
      action: 'record_visit',
      rep_id: repId,
      pharmacy_id: pharmacy.id,
      checkin_lat: userLat,
      checkin_lng: userLng,
      result_type: resultType,
      notes: notes.trim() || null,
      next_visit_date: nextVisitDate || null,
      duration_minutes: Math.max(1, Math.round(secondsElapsed / 60))
    };

    try {
      const response = await fetch('/api/rep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при сохранении визита');
      }

      onVisitCompleted({
        ...data.visit,
        pharmacies: {
          name: pharmacy.name,
          address: pharmacy.address,
          category: pharmacy.category
        }
      });
      onClose();
    } catch (err: any) {
      // Offline fallback: save visit in local queue so rep in basement pharmacy doesn't lose report
      enqueueOfflineAction('record_visit', payload);
      const offlineVisit = {
        id: `offline_visit_${Date.now()}`,
        ...payload,
        distance_meters: distanceMeters,
        is_gps_verified: isGpsVerified,
        is_offline_queued: true,
        created_at: new Date().toISOString(),
        pharmacies: {
          name: pharmacy.name,
          address: pharmacy.address,
          category: pharmacy.category
        }
      };
      onVisitCompleted(offlineVisit);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const waUrl = buildPharmacyWhatsAppUrl(pharmacy, repName);

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold animate-pulse">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-emerald-100 font-semibold">
                Визит в процессе
              </div>
              <h2 className="text-sm font-bold truncate max-w-[240px]">{pharmacy.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-bold bg-white/20 px-2.5 py-1 rounded-xl">
              {formatTimer(secondsElapsed)}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* GPS Verification Badge */}
          <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
            isGpsVerified 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              {isGpsVerified ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>
                {isGpsVerified
                  ? `GPS подтвержден: Вы в аптеке (дистанция ${distanceMeters}м)`
                  : distanceMeters !== null
                  ? `Удаленный визит (дистанция ${distanceMeters}м)`
                  : 'GPS не определен (визит засчитывается со статусом проверки)'}
              </span>
            </div>
          </div>

          {/* Key Pharmacy Insights */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Заведующая / ЛПР:</span>
              <span className="font-semibold text-slate-800">{pharmacy.contact_person || 'Не указана'}</span>
            </div>
            {pharmacy.phone && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Телефон:</span>
                <a href={`tel:${pharmacy.phone}`} className="font-semibold text-emerald-600">
                  {pharmacy.phone}
                </a>
              </div>
            )}
            {pharmacy.landmark && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ориентир:</span>
                <span className="font-medium text-slate-700">{pharmacy.landmark}</span>
              </div>
            )}
            {pharmacy.rep_notes && (
              <div className="pt-1.5 border-t border-slate-200 text-slate-600">
                <span className="font-semibold text-slate-700">Заметки: </span>
                {pharmacy.rep_notes}
              </div>
            )}
          </div>

          {/* Quick Actions During Visit */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`/b2b/${pharmacy.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              B2B Заказ на месте
            </a>

            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/40 hover:bg-[#25D366]/20 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-[#1da851]" />
                Написать в WhatsApp
              </a>
            ) : (
              <div className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 text-xs text-center flex items-center justify-center">
                Нет WhatsApp
              </div>
            )}
          </div>

          {/* Completion Form */}
          <div className="pt-2 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Итог визита:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'presentation', label: '🎓 Презентация новинок' },
                { id: 'order', label: '🛍️ Оформлен заказ' },
                { id: 'agreement', label: '🤝 Договор о поставке' },
                { id: 'rescheduled', label: '⏳ Заведующей не было' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setResultType(opt.id as any)}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                    resultType === opt.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Заметки по договоренностям:
              </label>
              <textarea
                rows={2}
                placeholder="Что обсудили? Какие позиции заинтересовали? Что привезти в следующий раз?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Дата следующего визита:
              </label>
              <input
                type="date"
                value={nextVisitDate}
                onChange={(e) => setNextVisitDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Finish Button */}
          <div className="pt-2">
            <button
              onClick={handleFinishVisit}
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Сохранение отчета...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Завершить визит и сохранить отчет
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
