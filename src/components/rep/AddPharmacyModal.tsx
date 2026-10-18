"use client";
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  X, MapPin, Building2, Phone, User, Clock, 
  Tag, FileText, CheckCircle2, Loader2, Sparkles, 
  ExternalLink, Copy, Check, ArrowRight, Compass, Plus,
  MessageCircle, WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildPharmacyWhatsAppUrl, enqueueOfflineAction } from '@/lib/repOfflineQueue';

// Dynamic import of Leaflet map to prevent SSR issues
const PharmacyMapPicker = dynamic(
  () => import('./PharmacyMapPicker').then(mod => mod.PharmacyMapPicker),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-[320px] rounded-2xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2 border border-slate-200">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        <span className="text-xs">Загрузка интерактивной карты...</span>
      </div>
    )
  }
);

interface AddPharmacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  repId?: string;
  repName?: string;
  canSendB2bLinks?: boolean;
  initialLat?: number | null;
  initialLng?: number | null;
  existingPharmacies?: Array<{
    id: string;
    name: string;
    latitude?: number | null;
    longitude?: number | null;
    category?: string;
  }>;
  onPharmacyAdded: (newPharmacy: any) => void;
}

const PREFERRED_TIME_PRESETS = [
  '10:00 - 12:00 (утро)',
  '13:30 - 15:30 (после пересменки)',
  '16:00 - 18:00 (вечер)'
];

const CATEGORY_INFO: Record<string, { label: string; desc: string; color: string }> = {
  A: { label: 'Категория A (VIP / Крупная)', desc: 'Высокий трафик, сеть или центр города', color: 'border-amber-400 bg-amber-50 text-amber-900' },
  B: { label: 'Категория B (Стандарт)', desc: 'Обычная аптека со стабильным спросом', color: 'border-blue-400 bg-blue-50 text-blue-900' },
  C: { label: 'Категория C (Малая)', desc: 'Небольшой пункт, спальный район', color: 'border-slate-300 bg-slate-50 text-slate-800' }
};

export const AddPharmacyModal: React.FC<AddPharmacyModalProps> = ({
  isOpen,
  onClose,
  repId,
  repName,
  canSendB2bLinks = false,
  initialLat,
  initialLng,
  existingPharmacies = [],
  onPharmacyAdded
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number | null>(initialLat ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialLng ?? null);
  const [district, setDistrict] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [category, setCategory] = useState<'A' | 'B' | 'C'>('B');
  const [repNotes, setRepNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPharmacy, setCreatedPharmacy] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const resetForm = () => {
    setName('');
    setAddress('');
    setLandmark('');
    setLatitude(initialLat ?? null);
    setLongitude(initialLng ?? null);
    setDistrict('');
    setContactPerson('');
    setPhone('');
    setPreferredTime('');
    setCategory('B');
    setRepNotes('');
    setError(null);
    setCreatedPharmacy(null);
    setCopiedLink(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLocationSelect = (data: {
    lat: number;
    lng: number;
    suggestedAddress?: string;
    district?: string;
  }) => {
    setLatitude(data.lat);
    setLongitude(data.lng);
    if (data.suggestedAddress && !address) {
      setAddress(data.suggestedAddress);
    }
    if (data.district && !district) {
      setDistrict(data.district);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Пожалуйста, введите название аптеки');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      action: 'create_pharmacy',
      name: name.trim(),
      address: address.trim() || 'Указан по GPS на карте',
      latitude,
      longitude,
      district: district.trim() || null,
      landmark: landmark.trim() || null,
      contact_person: contactPerson.trim() || null,
      phone: phone.trim() || null,
      preferred_time: preferredTime.trim() || null,
      category,
      rep_notes: repNotes.trim() || null,
      rep_id: repId || null
    };

    try {
      const response = await fetch('/api/rep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при сохранении аптеки');
      }

      setCreatedPharmacy(data.pharmacy);
      onPharmacyAdded(data.pharmacy);
    } catch (err: any) {
      // Offline-First Fallback: Save to phone queue if network is down in basement pharmacy
      const tempId = `offline_pharm_${Date.now()}`;
      enqueueOfflineAction({ ...payload, temp_id: tempId }, `Добавление аптеки «${name.trim()}»`);
      const offlinePharmacy = {
        id: tempId,
        ...payload,
        discount_percent: 15,
        credit_limit: 5000,
        balance: 0,
        token: `pending-sync`,
        is_offline_queued: true,
        created_at: new Date().toISOString()
      };
      setCreatedPharmacy(offlinePharmacy);
      onPharmacyAdded(offlinePharmacy);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyB2bLink = () => {
    if (!createdPharmacy?.token) return;
    const url = `${window.location.origin}/b2b/${createdPharmacy.token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const whatsappDirectUrl = createdPharmacy ? buildPharmacyWhatsAppUrl(createdPharmacy, repName, canSendB2bLinks) : null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Добавить аптеку на карту</h2>
              <p className="text-xs text-slate-500">Полевое добавление точки с точным GPS</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 space-y-5">
          {createdPharmacy ? (
            /* Success State */
            <div className="py-5 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {createdPharmacy.is_offline_queued ? 'Сохранено в оффлайн-память!' : 'Аптека успешно добавлена!'}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  «{createdPharmacy.name}» зафиксирована на вашей карте.
                </p>
                {createdPharmacy.is_offline_queued && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                    <WifiOff className="w-3.5 h-3.5" />
                    Связь слабая — точка автоматически улетит в базу при появлении 4G
                  </div>
                )}
              </div>

              {/* 1-CLICK WHATSAPP DIRECT BUTTON (WITHOUT SAVING TO PHONE CONTACTS) */}
              {whatsappDirectUrl && (
                <div className="max-w-md mx-auto">
                  <a
                    href={whatsappDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm shadow-lg shadow-green-500/30 flex items-center justify-center gap-2.5 active:scale-95 transition-all"
                  >
                    <MessageCircle className="w-5 h-5 fill-white" />
                    Написать заведующей в WhatsApp
                  </a>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    {canSendB2bLinks
                      ? `Откроет чат напрямую с ${createdPharmacy.phone} и вставит визитку с вашей B2B-ссылкой!`
                      : `Откроет чат напрямую с ${createdPharmacy.phone} без сохранения в контакты (оптовая ссылка скрыта до одобрения)`}
                  </p>
                </div>
              )}

              {/* B2B Wholesale Link Box (Only when supervisor gave permission) */}
              {canSendB2bLinks ? (
                !createdPharmacy.is_offline_queued && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left max-w-md mx-auto space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Персональный B2B-кабинет аптеки:</span>
                      <span className="font-semibold text-emerald-600">Скидка: {createdPharmacy.discount_percent}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/b2b/${createdPharmacy.token}` : ''}
                        className="flex-1 bg-white border border-slate-200 text-xs text-slate-700 px-3 py-2 rounded-lg truncate font-mono"
                      />
                      <button
                        onClick={handleCopyB2bLink}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 text-xs font-medium flex items-center gap-1 transition-all"
                      >
                        {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copiedLink ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-left max-w-md mx-auto space-y-1">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <span>🔒</span>
                    <span>Персональная оптовая ссылка (/b2b/...)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Доступ к персональной оптовой ссылке для аптеки откроется после подтверждения руководителем. В WhatsApp отправлено приветствие представителя.
                  </p>
                </div>
              )}

              <div className="pt-3 flex flex-col sm:flex-row gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-xs hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20"
                >
                  <Plus className="w-4 h-4" />
                  Добавить еще одну аптеку
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-all"
                >
                  Вернуться к списку аптек
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {error}
                </div>
              )}

              {/* 1. MAP SECTION */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-emerald-600" />
                    1. Укажите положение на карте (GPS или переместите маркер)
                  </span>
                  {latitude && longitude && (
                    <span className="text-[11px] text-emerald-600 font-medium">
                      ✓ Точка зафиксирована
                    </span>
                  )}
                </label>
                
                <PharmacyMapPicker
                  initialLat={latitude}
                  initialLng={longitude}
                  existingPharmacies={existingPharmacies}
                  onLocationSelect={handleLocationSelect}
                />
              </div>

              {/* 2. GENERAL INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Название аптеки *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Аптека «Шифо-Фарм №12»"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Адрес (определен картой)
                  </label>
                  <input
                    type="text"
                    placeholder="Улица, номер здания"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Точный ориентир на месте
                  </label>
                  <input
                    type="text"
                    placeholder="Напр: напротив роддома, вход с торца"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 3. CONTACT PERSON & PHONE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    Заведующая / Провизор (ЛПР)
                  </label>
                  <input
                    type="text"
                    placeholder="ФИО (напр. Нигина Рахимова)"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    Телефон
                  </label>
                  <input
                    type="tel"
                    placeholder="+992 900 00 00 00"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 4. PREFERRED TIME PRESETS */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Лучшее время для визитов:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {PREFERRED_TIME_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPreferredTime(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        preferredTime === preset
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Или введите вручную (напр. 'Вторник и Четверг до 14:00')"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* 5. CATEGORY SELECTION */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  Категория потенциала аптеки:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['A', 'B', 'C'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        category === cat
                          ? `${CATEGORY_INFO[cat].color} border-2 shadow-sm`
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className="font-bold text-xs">Категория {cat}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                        {cat === 'A' ? 'VIP трафик' : cat === 'B' ? 'Стандарт' : 'Малая точка'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. REP NOTES */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  Личные заметки представителя (характер, предпочтения)
                </label>
                <textarea
                  rows={2}
                  placeholder="Напр: заведующая просила образцы Омеги-3, строгая, любит презентации с цифрами маржи"
                  value={repNotes}
                  onChange={(e) => setRepNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Сохранение на карте...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      Сохранить и добавить аптеку
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
