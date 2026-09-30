"use client";
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Clock, ShieldCheck, ShieldAlert, CheckCircle2, 
  Copy, ExternalLink, MessageCircle, User, Stethoscope, 
  FileText, Plus, Trash2, Search, ArrowLeft, AlertTriangle, 
  TrendingUp, RefreshCw, Sun, Sunrise, Moon, Calendar, 
  Check, Phone, HelpCircle, Pill, ChevronRight, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminDbQuery } from '@/lib/admin-api';
import { Product } from '@/lib/types';
import { getMarkupSettings, applyMarkupToProduct } from '@/lib/markup';

interface ConsultantCopilotProps {
  onBack?: () => void;
  onLogout?: () => void;
  initialOrderId?: number;
}

interface SelectedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const PRESET_COMPLAINTS = [
  { label: 'Выпадение волос и ломкость ногтей', text: 'Женщина 32 года. Сильное выпадение волос последние 3 месяца, ломкие ногти, тусклая кожа. Роды были 1.5 года назад, ГВ завершено.' },
  { label: 'Хроническая усталость и сонливость', text: 'Мужчина 38 лет. Постоянная усталость, тяжело просыпаться по утрам, нет энергии к обеду, частые простуды.' },
  { label: 'Боли и хруст в суставах', text: 'Клиент 50 лет. Хруст и ноющая боль в коленях при ходьбе и подъеме по лестнице. Физические нагрузки средние.' },
  { label: 'Тревожность и бессонница', text: 'Девушка 27 лет. Высокий уровень стресса на работе, трудно заснуть до 2 ночи, поверхностный прерывистый сон.' },
  { label: 'Спорт, выносливость и восстановление', text: 'Парень 25 лет. Активно занимается в тренажерном зале 4 раза в неделю. Жалуется на долгие крепатуры и мышечную усталость.' },
];

const PRESET_LABS = [
  { label: 'Латентный железодефицит', text: 'Ферритин: 14 нг/мл, Гемоглобин: 118 г/л, Сывороточное железо: 8 мкмоль/л, Витамин D (25-OH): 19 нг/мл' },
  { label: 'Субклинический гипотиреоз / Щитовидка', text: 'ТТГ (TSH): 3.8 мкМЕ/мл, Т4 свободный: 11 пмоль/л, Ферритин: 22 нг/мл, Витамин B12: 240 пг/мл' },
  { label: 'Дефицит витамина D и остеопения', text: 'Витамин D 25-OH: 12 нг/мл, Кальций общий: 2.15 ммоль/л, Фосфор: 1.05 ммоль/л' },
];

export const ConsultantCopilot: React.FC<ConsultantCopilotProps> = ({ onBack, onLogout, initialOrderId }) => {
  const [activeTab, setActiveTab] = useState<'order' | 'consult' | 'labs' | 'dossier'>('dossier');
  const [lang, setLang] = useState<'ru' | 'tj'>('ru');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // --- TAB 1: Order Analysis State ---
  const [orderItems, setOrderItems] = useState<SelectedItem[]>([]);
  const [orderPhone, setOrderPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderSearchId, setOrderSearchId] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderAnalysisResult, setOrderAnalysisResult] = useState<any>(null);

  // --- TAB 2: Clinical Consultation State ---
  const [consultQuery, setConsultQuery] = useState('');
  const [consultAge, setConsultAge] = useState('');
  const [consultGender, setConsultGender] = useState<'female' | 'male' | 'unknown'>('female');
  const [consultChronic, setConsultChronic] = useState('');
  const [consultMeds, setConsultMeds] = useState('');
  const [consultLoading, setConsultLoading] = useState(false);
  const [consultResult, setConsultResult] = useState<any>(null);

  // --- TAB 3: Labs State ---
  const [labsText, setLabsText] = useState('');
  const [labsAge, setLabsAge] = useState('');
  const [labsGender, setLabsGender] = useState<'female' | 'male' | 'unknown'>('female');
  const [labsLoading, setLabsLoading] = useState(false);
  const [labsResult, setLabsResult] = useState<any>(null);

  // --- TAB 4: Product Dossier State (Когда клиент спрашивает про 1 конкретный товар) ---
  const [dossierProductName, setDossierProductName] = useState('');
  const [dossierProductId, setDossierProductId] = useState('');
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierResult, setDossierResult] = useState<any>(null);
  const [dossierPhone, setDossierPhone] = useState('');

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Load catalog on mount
  useEffect(() => {
    const loadCatalog = async () => {
      setLoadingProducts(true);
      try {
        const [prodRes, markup] = await Promise.all([
          adminDbQuery({ action: 'select', table: 'products' }),
          getMarkupSettings()
        ]);
        if (prodRes?.data) {
          const retail = prodRes.data.map((p: Product) => applyMarkupToProduct(p, markup));
          setProducts(retail);
        }
      } catch (err) {
        console.error('Ошибка загрузки каталога:', err);
      } finally {
        setLoadingProducts(false);
      }
    };
    loadCatalog();
  }, []);

  // If initialOrderId provided, auto load order
  useEffect(() => {
    if (initialOrderId) {
      loadOrderById(initialOrderId);
    }
  }, [initialOrderId]);

  const loadOrderById = async (id: number | string) => {
    if (!id) return;
    setOrderLoading(true);
    try {
      const { data } = await adminDbQuery({
        action: 'select',
        table: 'orders',
        data: { search: { column: 'id', query: String(id) } }
      });
      if (data && data.length > 0) {
        const ord = data[0];
        setOrderPhone(ord.phone || '');
        setOrderNotes(ord.operator_notes || ord.delivery_notes || '');
        if (Array.isArray(ord.items)) {
          setOrderItems(ord.items.map((it: any) => ({
            id: String(it.id || it.name),
            name: it.name,
            price: Number(it.price) || 0,
            quantity: Number(it.quantity) || 1
          })));
        }
      } else {
        alert('Заказ не найден');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при поиске заказа');
    } finally {
      setOrderLoading(false);
    }
  };

  const addProductToOrder = (prod: Product) => {
    setOrderItems(prev => {
      const exists = prev.find(p => p.id === prod.id);
      if (exists) {
        return prev.map(p => p.id === prod.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { id: prod.id, name: prod.name, price: prod.price, quantity: 1 }];
    });
    setSearchQuery('');
  };

  const removeProductFromOrder = (id: string) => {
    setOrderItems(prev => prev.filter(p => p.id !== id));
  };

  // --- API Handlers ---
  const handleAnalyzeOrder = async () => {
    if (orderItems.length === 0) {
      alert('Добавьте хотя бы один товар в состав заказа для анализа');
      return;
    }
    setOrderLoading(true);
    setOrderAnalysisResult(null);
    try {
      const res = await fetch('/api/agents/consultant-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_order',
          items: orderItems,
          customerPhone: orderPhone,
          customerNotes: orderNotes,
          lang
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setOrderAnalysisResult(json.data);
      } else {
        alert(json.error || 'Ошибка анализа заказа');
      }
    } catch (err) {
      console.error(err);
      alert('Не удалось связаться с сервером ИИ-Нутрициолога');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleConsult = async () => {
    if (!consultQuery.trim()) {
      alert('Введите жалобу или вопрос клиента');
      return;
    }
    setConsultLoading(true);
    setConsultResult(null);
    try {
      const res = await fetch('/api/agents/consultant-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clinical_consult',
          query: consultQuery,
          customerProfile: {
            age: consultAge,
            gender: consultGender,
            chronicConditions: consultChronic,
            currentMedications: consultMeds
          },
          lang
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setConsultResult(json.data);
      } else {
        alert(json.error || 'Ошибка консультации');
      }
    } catch (err) {
      console.error(err);
      alert('Не удалось связаться с сервером ИИ-Нутрициолога');
    } finally {
      setConsultLoading(false);
    }
  };

  const handleDecodeLabs = async () => {
    if (!labsText.trim()) {
      alert('Введите показатели анализов крови клиента');
      return;
    }
    setLabsLoading(true);
    setLabsResult(null);
    try {
      const res = await fetch('/api/agents/consultant-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decode_labs',
          labResultsText: labsText,
          customerProfile: {
            age: labsAge,
            gender: labsGender
          },
          lang
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setLabsResult(json.data);
      } else {
        alert(json.error || 'Ошибка расшифровки анализов');
      }
    } catch (err) {
      console.error(err);
      alert('Не удалось связаться с сервером ИИ-Нутрициолога');
    } finally {
      setLabsLoading(false);
    }
  };

  const handleGenerateDossier = async (prodName?: string, prodId?: string) => {
    const name = (prodName || dossierProductName).trim();
    if (!name) {
      alert('Укажите или выберите товар из каталога');
      return;
    }
    setDossierLoading(true);
    setDossierResult(null);
    try {
      const res = await fetch('/api/agents/consultant-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'product_dossier',
          productName: name,
          productId: prodId || dossierProductId,
          lang
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDossierResult(json.data);
      } else {
        alert(json.error || 'Ошибка формирования досье товара');
      }
    } catch (e) {
      console.error(e);
      alert('Не удалось связаться с сервером ИИ-Нутрициолога');
    } finally {
      setDossierLoading(false);
    }
  };

  const filteredCatalog = products.filter(p => 
    searchQuery.trim().length > 1 &&
    (p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  ).slice(0, 6);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Stethoscope size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">ИИ-Нутрициолог (Copilot)</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-100 text-emerald-800">
                PRO для оператора
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Клинический советник, суточные схемы приёма, скрипты допродажи и разбор анализов
            </p>
          </div>
        </div>

        {/* Right tools: Language selector and optional Logout */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setLang('ru')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                lang === 'ru' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🇷🇺 Русский
            </button>
            <button
              onClick={() => setLang('tj')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                lang === 'tj' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🇹🇯 Тоҷикӣ
            </button>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 text-xs font-bold transition-all"
              title="Выйти из кабинета"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-1">
        <button
          onClick={() => setActiveTab('dossier')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'dossier'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
          }`}
        >
          <Pill size={16} />
          Досье на 1 товар & Продажа
        </button>

        <button
          onClick={() => setActiveTab('order')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'order'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
          }`}
        >
          <FileText size={16} />
          Разбор корзины и заказа
          {orderItems.length > 0 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeTab === 'order' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {orderItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('consult')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'consult'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
          }`}
        >
          <Sparkles size={16} />
          Клиническая консультация
        </button>

        <button
          onClick={() => setActiveTab('labs')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${
            activeTab === 'labs'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
          }`}
        >
          <TrendingUp size={16} />
          Расшифровка анализов
        </button>
      </div>

      {/* TAB 0: PRODUCT DOSSIER (Клиент спросил про 1 конкретный товар) */}
      {activeTab === 'dossier' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Pill size={18} className="text-emerald-600" /> Досье на конкретный товар
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Клиент спросил про отдельный препарат? Получите клинические свойства, точную инструкцию по приёму, предостережения и скрипт допродажи.
                </p>
              </div>

              {/* Popular quick chips */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Популярные запросы клиентов:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Коллаген с витамином C',
                    'Магний Хелат',
                    'Магния цитрат с B6',
                    'Омега 3',
                    'Витамин D3',
                    'Железо хелат',
                    'Цинк хелат',
                    '5-HTP (Триптофан)',
                    'Хрома пиколинат'
                  ].map((pName, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setDossierProductName(pName);
                        handleGenerateDossier(pName);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition-colors font-medium"
                    >
                      {pName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Searchable input */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-500">
                  Название товара:
                </label>
                <div className="relative mt-1">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={dossierProductName}
                    onChange={e => setDossierProductName(e.target.value)}
                    placeholder="Введите название (например: Берберин, Кальций...)"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Dropdown if matches products */}
                {dossierProductName.trim().length > 1 && products.filter(p => 
                  p.name?.toLowerCase().includes(dossierProductName.toLowerCase()) || 
                  p.full_name?.toLowerCase().includes(dossierProductName.toLowerCase())
                ).slice(0, 5).length > 0 && !dossierResult && (
                  <div className="mt-1 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden divide-y divide-slate-100">
                    {products.filter(p => 
                      p.name?.toLowerCase().includes(dossierProductName.toLowerCase()) || 
                      p.full_name?.toLowerCase().includes(dossierProductName.toLowerCase())
                    ).slice(0, 5).map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setDossierProductName(p.name);
                          setDossierProductId(p.id);
                          handleGenerateDossier(p.name, p.id);
                        }}
                        className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-semibold text-slate-800">{p.name}</span>
                        <span className="font-bold text-emerald-600">{p.price} смн</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500">Телефон клиента (для отправки в WhatsApp):</label>
                <input
                  type="text"
                  value={dossierPhone}
                  onChange={e => setDossierPhone(e.target.value)}
                  placeholder="+992 90 000 0000"
                  className="w-full mt-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleGenerateDossier()}
                disabled={dossierLoading || !dossierProductName.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {dossierLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Составляем досье и скрипт продаж...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Получить досье, инструкцию и скрипт
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Dossier Result */}
          <div className="lg:col-span-7 space-y-4">
            {dossierResult ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* One liner & Bioavailability */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                      <Stethoscope size={15} /> Клиническое досье: {dossierResult.product_name}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      GLS Pharmaceuticals
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-800 leading-snug">
                    {dossierResult.pitch_one_liner}
                  </p>

                  {dossierResult.form_and_bioavailability && (
                    <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100/70 text-xs text-emerald-950">
                      <span className="font-bold">Биодоступность & форма:</span> {dossierResult.form_and_bioavailability}
                    </div>
                  )}
                </div>

                {/* Key Benefits */}
                {dossierResult.key_benefits && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-2.5">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600" /> Основные действия и терапевтическая польза
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {dossierResult.key_benefits.map((b: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Usage Instructions */}
                {dossierResult.usage_instructions && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Clock size={16} className="text-emerald-600" /> Как правильно принимать (Инструкция)
                      </h4>
                      {dossierResult.usage_instructions.course_duration && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center gap-1">
                          <Calendar size={12} /> {dossierResult.usage_instructions.course_duration}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <p className="font-bold text-slate-500 text-[10px] uppercase">Дозировка и приём:</p>
                        <p className="font-bold text-slate-900">{dossierResult.usage_instructions.dosage}</p>
                        <p className="text-slate-600">{dossierResult.usage_instructions.timing}</p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                        <p className="font-bold text-slate-500 text-[10px] uppercase">Взаимодействие с пищей:</p>
                        <p className="text-slate-700">{dossierResult.usage_instructions.food_interaction || 'Запивать достаточным количеством воды'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cautions */}
                {dossierResult.cautions_and_contraindications && (
                  <div className="bg-amber-50/80 rounded-3xl p-4 border border-amber-200 text-amber-900 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] text-amber-800">
                      <ShieldAlert size={14} className="text-amber-600" /> Противопоказания и предостережения:
                    </div>
                    <p>{dossierResult.cautions_and_contraindications}</p>
                  </div>
                )}

                {/* Cross-sell Bundle & Phone Script */}
                {dossierResult.cross_sell_bundle && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-5 border border-indigo-100 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                        <TrendingUp size={15} /> 🚀 Идеальная связка для допродажи (Cross-sell)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200/60 text-indigo-800">
                        +30-50% к чеку
                      </span>
                    </div>

                    <div className="bg-white/80 p-3 rounded-2xl border border-indigo-100 space-y-1">
                      <p className="font-bold text-slate-900 text-sm">
                        Предложите вместе: <span className="text-indigo-600">{dossierResult.cross_sell_bundle.recommended_product}</span>
                      </p>
                      <p className="text-xs text-slate-600">{dossierResult.cross_sell_bundle.medical_synergy}</p>
                    </div>

                    {dossierResult.cross_sell_bundle.phone_pitch && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Скрипт для звонка оператора:
                          </label>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(dossierResult.cross_sell_bundle.phone_pitch, 'dossier_pitch')}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            {copiedKey === 'dossier_pitch' ? <Check size={12} /> : <Copy size={12} />}
                            {copiedKey === 'dossier_pitch' ? 'Скопировано!' : 'Скопировать скрипт'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 bg-white p-3 rounded-2xl border border-indigo-100 italic">
                          «{dossierResult.cross_sell_bundle.phone_pitch}»
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* WhatsApp Showcase */}
                {dossierResult.whatsapp_card && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                        <MessageCircle size={15} /> Карточка товара для WhatsApp клиенту
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(dossierResult.whatsapp_card, 'dossier_wa')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          {copiedKey === 'dossier_wa' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          {copiedKey === 'dossier_wa' ? 'Скопировано!' : 'Скопировать'}
                        </button>
                        {dossierPhone && (
                          <a
                            href={`https://wa.me/${dossierPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(dossierResult.whatsapp_card)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                          >
                            <ExternalLink size={13} /> В WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                    <pre className="text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">
                      {dossierResult.whatsapp_card}
                    </pre>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Pill size={28} />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Здесь появится досье на товар</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Выберите товар слева или кликните один из популярных быстрых шаблонов (Коллаген, Магний, Омега-3...), чтобы мгновенно получить клинические свойства, инструкцию и продающий скрипт.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: ORDER ANALYSIS */}
      {activeTab === 'order' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Input parameters */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Pill size={18} className="text-emerald-600" /> Состав анализируемого заказа
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Загрузите по номеру заказа или добавьте товары вручную
                </p>
              </div>

              {/* Quick load by ID */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={orderSearchId}
                  onChange={e => setOrderSearchId(e.target.value)}
                  placeholder="ID существующего заказа..."
                  className="flex-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={() => loadOrderById(orderSearchId)}
                  disabled={orderLoading || !orderSearchId}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Загрузить
                </button>
              </div>

              {/* Product search & add */}
              <div className="relative">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Добавить товар из каталога:
                </label>
                <div className="relative mt-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию (Магний, Омега, Железо...)"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                  />
                </div>

                {filteredCatalog.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100">
                    {filteredCatalog.map(p => (
                      <div
                        key={p.id}
                        onClick={() => addProductToOrder(p)}
                        className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-semibold text-slate-800">{p.name}</span>
                        <span className="font-bold text-emerald-600">{p.price} смн</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Выбрано позиций ({orderItems.length}):
                </span>
                {orderItems.length === 0 ? (
                  <div className="p-4 text-center border-2 border-dashed border-slate-100 rounded-2xl text-xs text-slate-400">
                    Товары ещё не добавлены. Найдите в поиске выше или загрузите по ID заказа.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {orderItems.map(it => (
                      <div key={it.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex-1 truncate mr-2">
                          <p className="font-semibold text-slate-800 truncate">{it.name}</p>
                          <p className="text-[10px] text-slate-400">{it.price} смн × {it.quantity} шт.</p>
                        </div>
                        <button
                          onClick={() => removeProductFromOrder(it.id)}
                          className="w-6 h-6 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Phone & Notes */}
              <div className="grid grid-cols-1 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Телефон клиента (для WhatsApp):</label>
                  <input
                    type="text"
                    value={orderPhone}
                    onChange={e => setOrderPhone(e.target.value)}
                    placeholder="+992 90 000 0000"
                    className="w-full mt-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Жалобы или примечания клиента:</label>
                  <textarea
                    rows={2}
                    value={orderNotes}
                    onChange={e => setOrderNotes(e.target.value)}
                    placeholder="Например: кормит грудью, пьет кофе, болит желудок..."
                    className="w-full mt-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleAnalyzeOrder}
                disabled={orderLoading || orderItems.length === 0}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {orderLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Составляем схему приёма и скрипт...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Сформировать схему и скрипт допродажи
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Results View */}
          <div className="lg:col-span-7 space-y-4">
            {orderAnalysisResult ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Summary */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                    <Stethoscope size={15} /> Экспертное заключение нутрициолога
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {orderAnalysisResult.summary}
                  </p>
                </div>

                {/* Intake Schedule Cards */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Clock size={16} className="text-emerald-600" /> Суточная схема приёма препаратов
                    </h4>
                    {orderAnalysisResult.schedule?.duration && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center gap-1">
                        <Calendar size={12} /> {orderAnalysisResult.schedule.duration}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Morning */}
                    <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                        <Sunrise size={15} className="text-amber-600" /> 🌅 УТРО
                      </div>
                      {orderAnalysisResult.schedule?.morning?.length > 0 ? (
                        orderAnalysisResult.schedule.morning.map((it: any, i: number) => (
                          <div key={i} className="text-xs space-y-1 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                            <p className="font-bold text-slate-800">{it.product}</p>
                            <p className="text-[11px] font-semibold text-amber-900">{it.dosage}</p>
                            {it.timing && <p className="text-[10px] text-slate-500">{it.timing}</p>}
                            {it.clinical_note && <p className="text-[10px] text-slate-400 italic">💡 {it.clinical_note}</p>}
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Нет назначений на утро</p>
                      )}
                    </div>

                    {/* Afternoon */}
                    <div className="bg-orange-50/70 border border-orange-200/60 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-orange-800">
                        <Sun size={15} className="text-orange-600" /> ☀️ ОБЕД
                      </div>
                      {orderAnalysisResult.schedule?.afternoon?.length > 0 ? (
                        orderAnalysisResult.schedule.afternoon.map((it: any, i: number) => (
                          <div key={i} className="text-xs space-y-1 bg-white/80 p-2.5 rounded-xl border border-orange-100">
                            <p className="font-bold text-slate-800">{it.product}</p>
                            <p className="text-[11px] font-semibold text-orange-900">{it.dosage}</p>
                            {it.timing && <p className="text-[10px] text-slate-500">{it.timing}</p>}
                            {it.clinical_note && <p className="text-[10px] text-slate-400 italic">💡 {it.clinical_note}</p>}
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Нет назначений на обед</p>
                      )}
                    </div>

                    {/* Evening */}
                    <div className="bg-indigo-50/70 border border-indigo-200/60 rounded-2xl p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-800">
                        <Moon size={15} className="text-indigo-600" /> 🌙 ВЕЧЕР
                      </div>
                      {orderAnalysisResult.schedule?.evening?.length > 0 ? (
                        orderAnalysisResult.schedule.evening.map((it: any, i: number) => (
                          <div key={i} className="text-xs space-y-1 bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                            <p className="font-bold text-slate-800">{it.product}</p>
                            <p className="text-[11px] font-semibold text-indigo-900">{it.dosage}</p>
                            {it.timing && <p className="text-[10px] text-slate-500">{it.timing}</p>}
                            {it.clinical_note && <p className="text-[10px] text-slate-400 italic">💡 {it.clinical_note}</p>}
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Нет назначений на вечер</p>
                      )}
                    </div>
                  </div>

                  {orderAnalysisResult.schedule?.rules && orderAnalysisResult.schedule.rules.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Правила приёма:</p>
                      <ul className="text-xs text-slate-600 space-y-0.5 list-disc list-inside">
                        {orderAnalysisResult.schedule.rules.map((r: string, idx: number) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Compatibility and Warnings */}
                {orderAnalysisResult.compatibility_and_risks && (
                  <div className={`rounded-3xl p-5 border space-y-3 ${
                    orderAnalysisResult.compatibility_and_risks.status === 'warning'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {orderAnalysisResult.compatibility_and_risks.status === 'warning' ? (
                        <ShieldAlert size={18} className="text-amber-600" />
                      ) : (
                        <ShieldCheck size={18} className="text-emerald-600" />
                      )}
                      <span>Совместимость: {orderAnalysisResult.compatibility_and_risks.status_label || 'Проверено'}</span>
                    </div>
                    {orderAnalysisResult.compatibility_and_risks.details && (
                      <ul className="text-xs space-y-1">
                        {orderAnalysisResult.compatibility_and_risks.details.map((d: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="font-bold">•</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {orderAnalysisResult.compatibility_and_risks.contraindications && (
                      <p className="text-[11px] pt-1 text-slate-500 font-medium">
                        Предостережения: {orderAnalysisResult.compatibility_and_risks.contraindications}
                      </p>
                    )}
                  </div>
                )}

                {/* Upsell / Cross-sell box */}
                {orderAnalysisResult.upsell && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-5 border border-indigo-100 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
                        <TrendingUp size={15} /> 🚀 Подсказка для допродажи (Cross-sell)
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200/60 text-indigo-800">
                        Рост чека
                      </span>
                    </div>

                    <div className="bg-white/80 p-3 rounded-2xl border border-indigo-100 space-y-1">
                      <p className="font-bold text-slate-800 text-sm">
                        Рекомендуем предложить: <span className="text-indigo-600">{orderAnalysisResult.upsell.recommended_product}</span>
                      </p>
                      <p className="text-xs text-slate-600">{orderAnalysisResult.upsell.reason}</p>
                    </div>

                    {orderAnalysisResult.upsell.operator_phone_script && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Скрипт для звонка оператора:
                          </label>
                          <button
                            onClick={() => copyToClipboard(orderAnalysisResult.upsell.operator_phone_script, 'script')}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            {copiedKey === 'script' ? <Check size={12} /> : <Copy size={12} />}
                            {copiedKey === 'script' ? 'Скопировано!' : 'Скопировать скрипт'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 bg-white p-3 rounded-2xl border border-indigo-100 italic">
                          «{orderAnalysisResult.upsell.operator_phone_script}»
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* WhatsApp Message Preview & Actions */}
                {orderAnalysisResult.whatsapp_message && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                        <MessageCircle size={16} /> Готовое сообщение в WhatsApp для клиента
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(orderAnalysisResult.whatsapp_message, 'wa')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          {copiedKey === 'wa' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          {copiedKey === 'wa' ? 'Скопировано!' : 'Скопировать'}
                        </button>
                        {orderPhone && (
                          <a
                            href={`https://wa.me/${orderPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(orderAnalysisResult.whatsapp_message)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                          >
                            <ExternalLink size={13} /> Открыть в WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                    <pre className="text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">
                      {orderAnalysisResult.whatsapp_message}
                    </pre>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Stethoscope size={28} />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Здесь появится разбор заказа</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Добавьте товары в заказ слева и нажмите «Сформировать схему», чтобы получить суточный график, проверку рисков и продающий скрипт.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CLINICAL CONSULTATION */}
      {activeTab === 'consult' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-600" /> Запрос на клинический подбор
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Опишите симптомы, цели или выберите готовый сценарий
                </p>
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Быстрые шаблоны частых обращений:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COMPLAINTS.map((ps, idx) => (
                    <button
                      key={idx}
                      onClick={() => setConsultQuery(ps.text)}
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors font-medium text-left"
                    >
                      {ps.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text query */}
              <div>
                <label className="text-[11px] font-bold text-slate-500">Жалобы и вопросы клиента:</label>
                <textarea
                  rows={4}
                  value={consultQuery}
                  onChange={e => setConsultQuery(e.target.value)}
                  placeholder="Опишите ситуацию: возраст, жалобы, цели, образ жизни..."
                  className="w-full mt-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Profile fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Возраст:</label>
                  <input
                    type="text"
                    value={consultAge}
                    onChange={e => setConsultAge(e.target.value)}
                    placeholder="Например: 35"
                    className="w-full mt-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Пол:</label>
                  <select
                    value={consultGender}
                    onChange={e => setConsultGender(e.target.value as any)}
                    className="w-full mt-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500 bg-white"
                  >
                    <option value="female">Женский</option>
                    <option value="male">Мужской</option>
                    <option value="unknown">Не указан</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500">Принимаемые лекарства (важно для совместимости):</label>
                <input
                  type="text"
                  value={consultMeds}
                  onChange={e => setConsultMeds(e.target.value)}
                  placeholder="Например: Эутирокс, Кардиомагнил, КОК..."
                  className="w-full mt-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500">Хронические диагнозы / особенности:</label>
                <input
                  type="text"
                  value={consultChronic}
                  onChange={e => setConsultChronic(e.target.value)}
                  placeholder="Например: гастрит, камни в почках, беременность..."
                  className="w-full mt-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500"
                />
              </div>

              <button
                onClick={handleConsult}
                disabled={consultLoading || !consultQuery.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {consultLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Клинический анализ и подбор...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Подобрать комплекс и схему
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-7 space-y-4">
            {consultResult ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Summary */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                    <Stethoscope size={15} /> Диагностическое резюме ситуации
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {consultResult.summary}
                  </p>
                </div>

                {/* Recommended Supplements */}
                {consultResult.recommended_supplements && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Pill size={16} className="text-emerald-600" /> Рекомендованные нутрицевтики из нашего каталога
                    </h4>
                    <div className="space-y-2">
                      {consultResult.recommended_supplements.map((s: any, idx: number) => (
                        <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                              {s.priority && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  s.priority === 'Основа курса'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {s.priority}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600">{s.why_needed}</p>
                            <p className="text-[11px] font-semibold text-emerald-700">Дозировка: {s.dosage}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drug interactions and precautions */}
                {consultResult.cautions_and_drugs && (
                  <div className="bg-amber-50/70 rounded-3xl p-5 border border-amber-200/70 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800">
                      <ShieldAlert size={15} className="text-amber-600" /> Лекарственные взаимодействия и предостережения
                    </div>
                    {consultResult.cautions_and_drugs.drug_interactions && (
                      <p className="text-xs text-amber-900">
                        <span className="font-bold">Взаимодействие:</span> {consultResult.cautions_and_drugs.drug_interactions}
                      </p>
                    )}
                    {consultResult.cautions_and_drugs.contraindications && (
                      <p className="text-xs text-amber-900">
                        <span className="font-bold">Противопоказания:</span> {consultResult.cautions_and_drugs.contraindications}
                      </p>
                    )}
                  </div>
                )}

                {/* Sales Pitch for Operator */}
                {consultResult.sales_closing && (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-5 border border-indigo-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                        <TrendingUp size={15} /> Скрипт презентации комплекса клиенту
                      </span>
                      <button
                        onClick={() => copyToClipboard(consultResult.sales_closing.bundle_pitch, 'consult_pitch')}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        {copiedKey === 'consult_pitch' ? <Check size={12} /> : <Copy size={12} />}
                        {copiedKey === 'consult_pitch' ? 'Скопировано!' : 'Скопировать'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 bg-white p-3 rounded-2xl border border-indigo-100 italic">
                      «{consultResult.sales_closing.bundle_pitch}»
                    </p>
                  </div>
                )}

                {/* WhatsApp Message */}
                {consultResult.whatsapp_message && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                        <MessageCircle size={15} /> Готовый текст для отправки в WhatsApp
                      </span>
                      <button
                        onClick={() => copyToClipboard(consultResult.whatsapp_message, 'consult_wa')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        {copiedKey === 'consult_wa' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        {copiedKey === 'consult_wa' ? 'Скопировано!' : 'Скопировать текст'}
                      </button>
                    </div>
                    <pre className="text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">
                      {consultResult.whatsapp_message}
                    </pre>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Sparkles size={28} />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Здесь появятся рекомендации</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Опишите проблему клиента слева или кликните один из быстрых шаблонов, затем нажмите «Подобрать комплекс».
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LAB RESULTS DECODER */}
      {activeTab === 'labs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-600" /> Расшифровка лабораторных анализов
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Вставьте показатели из бланка анализа крови клиента
                </p>
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Примеры частых анализов:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LABS.map((pl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setLabsText(pl.text)}
                      className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors font-medium text-left"
                    >
                      {pl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500">Показатели анализов (текст или цифры):</label>
                <textarea
                  rows={4}
                  value={labsText}
                  onChange={e => setLabsText(e.target.value)}
                  placeholder="Например: Ферритин 12, Витамин D 18, ТТГ 3.5, Гемоглобин 115..."
                  className="w-full mt-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Возраст:</label>
                  <input
                    type="text"
                    value={labsAge}
                    onChange={e => setLabsAge(e.target.value)}
                    placeholder="Например: 30"
                    className="w-full mt-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Пол:</label>
                  <select
                    value={labsGender}
                    onChange={e => setLabsGender(e.target.value as any)}
                    className="w-full mt-1 text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-emerald-500 bg-white"
                  >
                    <option value="female">Женский</option>
                    <option value="male">Мужской</option>
                    <option value="unknown">Не указан</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleDecodeLabs}
                disabled={labsLoading || !labsText.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {labsLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Расшифровываем показатели...
                  </>
                ) : (
                  <>
                    <TrendingUp size={16} />
                    Расшифровать и подобрать добавки
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-7 space-y-4">
            {labsResult ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Summary */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600">
                    <Stethoscope size={15} /> Интегративное заключение по анализам
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {labsResult.summary}
                  </p>
                </div>

                {/* Lab Breakdown Table */}
                {labsResult.lab_breakdown && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm">Таблица показателей и норм</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                            <th className="pb-2">Маркер</th>
                            <th className="pb-2">Значение клиента</th>
                            <th className="pb-2">Оптимум (норма)</th>
                            <th className="pb-2">Оценка</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {labsResult.lab_breakdown.map((b: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="py-2.5 font-bold text-slate-900">{b.marker}</td>
                              <td className="py-2.5 font-mono text-emerald-700 font-semibold">{b.client_value}</td>
                              <td className="py-2.5 text-slate-500">{b.optimal_functional_range}</td>
                              <td className="py-2.5">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  b.interpretation?.includes('Дефицит')
                                    ? 'bg-red-100 text-red-700'
                                    : b.interpretation?.includes('Латент')
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {b.interpretation}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Targeted Supplements */}
                {labsResult.targeted_supplements && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Pill size={16} className="text-emerald-600" /> Препараты для компенсации дефицитов
                    </h4>
                    <div className="space-y-2">
                      {labsResult.targeted_supplements.map((ts: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{ts.name}</p>
                            <p className="text-xs text-slate-500">{ts.role}</p>
                            <p className="text-[11px] font-semibold text-emerald-700 mt-1">Курс: {ts.dosage} • {ts.duration}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phone script & WhatsApp */}
                {labsResult.operator_phone_script && (
                  <div className="bg-indigo-50/70 rounded-3xl p-5 border border-indigo-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                        Скрипт звонка по анализам:
                      </span>
                      <button
                        onClick={() => copyToClipboard(labsResult.operator_phone_script, 'labs_script')}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                      >
                        {copiedKey === 'labs_script' ? <Check size={12} /> : <Copy size={12} />}
                        {copiedKey === 'labs_script' ? 'Скопировано!' : 'Скопировать'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 bg-white p-3 rounded-2xl border border-indigo-100 italic">
                      «{labsResult.operator_phone_script}»
                    </p>
                  </div>
                )}

                {labsResult.whatsapp_message && (
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                        <MessageCircle size={15} /> Готовый разбор для отправки в WhatsApp
                      </span>
                      <button
                        onClick={() => copyToClipboard(labsResult.whatsapp_message, 'labs_wa')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        {copiedKey === 'labs_wa' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        {copiedKey === 'labs_wa' ? 'Скопировано!' : 'Скопировать'}
                      </button>
                    </div>
                    <pre className="text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">
                      {labsResult.whatsapp_message}
                    </pre>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <TrendingUp size={28} />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Здесь появится расшифровка анализов</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Введите показатели анализов слева или кликните один из примеров, чтобы получить интегративную оценку и подбор добавок.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
