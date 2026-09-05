"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { adminDbQuery } from '@/lib/admin-api';
import { Save, Plus, Trash2, ChevronLeft, Eye, EyeOff, Sparkles, Check, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { Product } from '@/lib/types';

interface ComboBannerConfig {
  id: string;
  is_active: boolean;
  sort_order: number;
  preset_theme: 'slate' | 'mystic-dark' | 'emerald-green' | 'sunset-orange';
  price: number;
  product_ids: string[];
  badge_ru: string;
  badge_tg: string;
  title_ru: string;
  title_tg: string;
  subtitle_ru: string;
  subtitle_tg: string;
  desc_ru: string;
  desc_tg: string;
}

const THEME_PRESETS = {
  'slate': {
    name: 'Светлый минимализм (Slate)',
    bg: 'from-[#F8FAFC] to-[#F1F5F9]',
    border: 'border-[#2563EB]/10',
    text: 'text-[#1D1D1F]',
    subtitle: 'text-[#2563EB]',
    desc: 'text-[#64748B]',
    badge: 'bg-[#2563EB]/10 text-[#2563EB]',
    button: 'bg-[#1D1D1F] hover:bg-blue-600 text-white shadow-[#1D1D1F]/20',
  },
  'mystic-dark': {
    name: 'Темный премиум (Mystic)',
    bg: 'from-[#0F172A] to-[#1E293B]',
    border: 'border-amber-500/20',
    text: 'text-white',
    subtitle: 'text-amber-400',
    desc: 'text-slate-400',
    badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    button: 'bg-amber-500 hover:bg-amber-600 text-[#0F172A] shadow-amber-500/20',
  },
  'emerald-green': {
    name: 'Эко-дзен (Green)',
    bg: 'from-[#F0FDF4] to-[#DCFCE7]',
    border: 'border-emerald-600/10',
    text: 'text-[#166534]',
    subtitle: 'text-emerald-700',
    desc: 'text-emerald-800/70',
    badge: 'bg-emerald-600/10 text-emerald-700',
    button: 'bg-emerald-800 hover:bg-emerald-700 text-white shadow-emerald-850/20',
  },
  'sunset-orange': {
    name: 'Энергия (Orange)',
    bg: 'from-[#FFF7ED] to-[#FFEDD5]',
    border: 'border-orange-500/10',
    text: 'text-[#9A3412]',
    subtitle: 'text-orange-600',
    desc: 'text-orange-850/70',
    badge: 'bg-orange-500/10 text-orange-600',
    button: 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20',
  }
};

export const ComboEditor: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<ComboBannerConfig[]>([]);
  const [editing, setEditing] = useState<ComboBannerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // 1. Load products
      const { data: pData } = await supabase.from('products').select('*').order('id');
      const loadedProducts = pData || [];
      setProducts(loadedProducts);

      // 2. Load site settings to find combo_banners
      const { data: sData } = await supabase.from('site_settings').select('*');
      const settingItem = sData?.find(s => s.key === 'combo_banners');
      
      let loadedCombos: ComboBannerConfig[] = [];
      if (settingItem && settingItem.value) {
        try {
          loadedCombos = JSON.parse(settingItem.value);
        } catch (e) {
          console.error("Failed to parse combo_banners setting", e);
        }
      }

      // If no combos exist in database, initialize with default PMS/Zen combo banner
      if (loadedCombos.length === 0 && loadedProducts.length > 0) {
        const magnesium = loadedProducts.find(p => p.name.toLowerCase().includes('магний') && p.name.toLowerCase().includes('хелат'));
        const inositol = loadedProducts.find(p => p.name.toLowerCase().includes('инозитол'));
        
        const defaultProdIds = [];
        if (magnesium) defaultProdIds.push(magnesium.id);
        if (inositol) defaultProdIds.push(inositol.id);

        loadedCombos = [{
          id: `combo-${Date.now()}`,
          is_active: true,
          sort_order: 0,
          preset_theme: 'slate',
          price: 254,
          product_ids: defaultProdIds,
          badge_ru: 'Бестселлер GLS',
          badge_tg: 'Бестселлери GLS',
          title_ru: 'Жизнь без ПМС',
          title_tg: 'Ҳаёт бидуни ПМС',
          subtitle_ru: '& Абсолютный Дзен',
          subtitle_tg: '& Дзени Мутлақ',
          desc_ru: 'Восстановите баланс и спокойствие с нашим дуэтом.',
          desc_tg: 'Мувозинат ва оромиро бо дуэти мо барқарор кунед.'
        }];
      }

      // Sort combos by sort_order
      loadedCombos.sort((a, b) => a.sort_order - b.sort_order);
      setCombos(loadedCombos);
    } catch (err) {
      console.error("Error loading admin combo editor data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async (updatedList: ComboBannerConfig[]) => {
    setSaving(true);
    try {
      await adminDbQuery({
        action: 'upsert',
        table: 'site_settings',
        data: {
          key: 'combo_banners',
          value: JSON.stringify(updatedList),
          updated_at: new Date().toISOString()
        }
      });
      setMsg('Настройки сохранены в БД!');
      setTimeout(() => setMsg(''), 2500);
      loadAll();
    } catch (e) {
      console.error(e);
      alert('Ошибка при сохранении в БД');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCurrentEditing = () => {
    if (!editing) return;
    const index = combos.findIndex(c => c.id === editing.id);
    let updatedList = [...combos];
    if (index !== -1) {
      updatedList[index] = editing;
    } else {
      updatedList.push(editing);
    }
    setCombos(updatedList);
    handleSaveAll(updatedList);
  };

  const handleGenerateAi = async () => {
    if (!editing || editing.product_ids.length === 0) {
      alert('Пожалуйста, выберите сначала хотя бы один продукт в списке внизу!');
      return;
    }
    setGeneratingAi(true);
    try {
      const selectedProductsList = editing.product_ids.map(id => {
        const p = products.find(prod => String(prod.id) === String(id));
        return { name: p?.name || '', price: p?.price || 0 };
      });

      const password = sessionStorage.getItem('toj-admin-password') || '';
      const res = await fetch('/api/admin/combo/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({
          products: selectedProductsList,
          prompt: aiPrompt
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Не удалось получить ответ от ИИ-ассистента');
      }

      const data = await res.json();
      
      setEditing({
        ...editing,
        badge_ru: data.badge_ru || editing.badge_ru,
        badge_tg: data.badge_tg || editing.badge_tg,
        title_ru: data.title_ru || editing.title_ru,
        title_tg: data.title_tg || editing.title_tg,
        subtitle_ru: data.subtitle_ru || editing.subtitle_ru,
        subtitle_tg: data.subtitle_tg || editing.subtitle_tg,
        desc_ru: data.desc_ru || editing.desc_ru,
        desc_tg: data.desc_tg || editing.desc_tg,
        price: data.price || editing.price,
      });
      
      setMsg('ИИ сгенерировал данные! Посмотрите предпросмотр выше.');
      setTimeout(() => setMsg(''), 4000);
    } catch (e: any) {
      alert('Ошибка генерации ИИ: ' + e.message);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleNew = () => {
    setEditing({
      id: `combo-${Date.now()}`,
      is_active: true,
      sort_order: combos.length,
      preset_theme: 'slate',
      price: 200,
      product_ids: [],
      badge_ru: 'НОВИНКА',
      badge_tg: 'НАВГОНӢ',
      title_ru: 'Новое комбо',
      title_tg: 'Маҷмӯаи нав',
      subtitle_ru: '& Энергия здоровья',
      subtitle_tg: '& Энергияи саломатӣ',
      desc_ru: 'Комплексная поддержка вашего организма на каждый день.',
      desc_tg: 'Дастгирии ҳамаҷонибаи организми шумо барои ҳар рӯз.'
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот комбо-баннер?')) return;
    const updatedList = combos.filter(c => c.id !== id);
    setCombos(updatedList);
    setEditing(null);
    handleSaveAll(updatedList);
  };

  const toggleActive = (c: ComboBannerConfig) => {
    const updated = combos.map(item => item.id === c.id ? { ...item, is_active: !item.is_active } : item);
    setCombos(updated);
    handleSaveAll(updated);
  };

  const handleProductToggle = (prodId: string) => {
    if (!editing) return;
    const exists = editing.product_ids.includes(prodId);
    let newIds = [];
    if (exists) {
      newIds = editing.product_ids.filter(id => id !== prodId);
    } else {
      newIds = [...editing.product_ids, prodId];
    }
    setEditing({ ...editing, product_ids: newIds });
  };

  const moveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= combos.length) return;
    
    let updated = [...combos];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    
    // Recalculate sort order
    updated = updated.map((c, i) => ({ ...c, sort_order: i }));
    setCombos(updated);
    handleSaveAll(updated);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toString().includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-semibold text-sm">Загрузка комбо-баннеров...</p>
      </div>
    );
  }

  // Find products associated with the editing combo to display in preview
  const editingProducts = editing 
    ? editing.product_ids.map(id => products.find(p => String(p.id) === String(id))).filter(Boolean) as Product[]
    : [];

  const previewTheme = editing ? THEME_PRESETS[editing.preset_theme] : THEME_PRESETS.slate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Комбо-баннеры</h2>
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors">
          <Plus size={16} /> Добавить комбо
        </button>
      </div>

      {/* Grid of combos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {combos.map((c, idx) => {
          const theme = THEME_PRESETS[c.preset_theme] || THEME_PRESETS.slate;
          return (
            <div
              key={c.id}
              onClick={() => setEditing(c)}
              className={`relative p-5 rounded-2xl cursor-pointer border transition-all flex flex-col justify-between ${
                editing?.id === c.id ? 'ring-2 ring-slate-800 shadow-md scale-[1.01]' : 'border-slate-200 hover:border-slate-300'
              } ${!c.is_active ? 'opacity-50' : ''} bg-gradient-to-r ${theme.bg}`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${theme.badge}`}>
                    {c.badge_ru || 'КОМБО'}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleActive(c); }}
                      className="w-7 h-7 rounded-lg hover:bg-white/40 flex items-center justify-center transition-colors"
                      title={c.is_active ? "Деактивировать" : "Активировать"}
                    >
                      {c.is_active ? <Eye size={13} className="text-slate-600" /> : <EyeOff size={13} className="text-slate-400" />}
                    </button>
                    <button
                      disabled={idx === 0}
                      onClick={(e) => { e.stopPropagation(); moveOrder(idx, 'up'); }}
                      className="w-7 h-7 rounded-lg hover:bg-white/40 flex items-center justify-center transition-colors disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      disabled={idx === combos.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveOrder(idx, 'down'); }}
                      className="w-7 h-7 rounded-lg hover:bg-white/40 flex items-center justify-center transition-colors disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                <h3 className={`font-bold text-[16px] leading-tight ${theme.text}`}>
                  {c.title_ru} <span className={theme.subtitle}>{c.subtitle_ru}</span>
                </h3>
                <p className={`text-[12px] mt-1 line-clamp-2 ${theme.desc}`}>{c.desc_ru}</p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5">
                <span className={`text-[14px] font-bold ${theme.text}`}>{c.price} смн</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  Продуктов: {c.product_ids.length}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor & Preview Form */}
      {editing && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6"
        >
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg">Редактирование комбо-баннера</h3>
            <button onClick={() => handleDelete(editing.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 text-xs font-bold transition-colors">
              <Trash2 size={13} /> Удалить
            </button>
          </div>

          {/* VISUAL REALTIME PREVIEW */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Интерактивный Предпросмотр (Дизайн)</span>
            
            <div className={`rounded-3xl p-6 relative overflow-hidden bg-gradient-to-r border ${previewTheme.bg} ${previewTheme.border} min-h-[160px] flex flex-col md:flex-row items-center justify-between gap-6`}>
              {/* Overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.4)_0%,_transparent_100%)] pointer-events-none" />
              
              <div className="w-full md:w-[60%] flex flex-col items-center md:items-start text-center md:text-left gap-3 relative z-10">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-[0.2em] shadow-sm backdrop-blur-sm ${previewTheme.badge}`}>
                  <Sparkles size={10} />
                  <span>{editing.badge_ru || 'БЕСТСЕЛЛЕР'}</span>
                </div>
                
                <h4 className={`text-[20px] font-bold leading-tight font-outfit ${previewTheme.text}`}>
                  {editing.title_ru || 'Без заголовка'}{' '}
                  <span className={previewTheme.subtitle}>{editing.subtitle_ru}</span>
                </h4>
                
                <p className={`text-[12px] leading-relaxed max-w-sm hidden md:block ${previewTheme.desc}`}>
                  {editing.desc_ru || 'Без описания...'}
                </p>

                <div className="flex items-center gap-5 pt-1">
                  <div className="flex flex-col items-start">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Комбо-цена</span>
                    <div className={`flex items-baseline gap-0.5 font-outfit ${previewTheme.text}`}>
                      <span className="text-[28px] font-bold tracking-tighter leading-none">{editing.price}</span>
                      <span className="text-[12px] font-bold uppercase opacity-60">смн</span>
                    </div>
                  </div>

                  <div className={`h-10 px-5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-md ${previewTheme.button}`}>
                    <ShoppingBag size={14} />
                    <span>Купить комбо</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              </div>

              {/* Float Images list preview */}
              <div className="w-full md:w-[35%] flex justify-center items-center gap-2 relative h-[100px] md:h-[130px]">
                {editingProducts.length === 0 ? (
                  <span className="text-slate-400 text-xs font-semibold italic">Товары не выбраны</span>
                ) : (
                  editingProducts.map((p, pIdx) => (
                    <div 
                      key={p.id} 
                      className="relative transition-transform hover:scale-105 duration-300"
                      style={{ 
                        transform: `translateY(${pIdx % 2 === 0 ? '-6px' : '6px'})`,
                        zIndex: 10 + pIdx 
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image_url || '/placeholder.jpg'}
                        alt={p.name}
                        className="w-[50px] h-[65px] md:w-[70px] md:h-[85px] object-contain drop-shadow-md bg-white/20 rounded-md p-1 border border-white/10"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ИИ ГЕНЕРАТОР */}
          <div className="bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/70 rounded-2xl p-5 border border-indigo-100 space-y-3">
            <div className="flex items-center gap-2 text-indigo-900">
              <Sparkles size={16} className="text-indigo-600 animate-pulse" />
              <h4 className="font-extrabold text-[12px] uppercase tracking-wider">Генератор баннера с ИИ (Gemini Flash)</h4>
            </div>
            
            <p className="text-[11px] text-slate-500 font-medium">
              Выберите товары для комбо в списке внизу, введите ваши пожелания (например, &quot;сделать упор на мужскую силу и выносливость&quot;, или &quot;успокаивающий эффект для сна&quot;) и нажмите кнопку генерации. Gemini сам сгенерирует цепляющие заголовки, описание на русском и таджикском языках, а также предложит отличную пакетную цену со скидкой!
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Пожелания к текстам (например: 'потенция, энергия, бодрость, для молодых парней')"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors"
                disabled={generatingAi}
              />
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={generatingAi || editing.product_ids.length === 0}
                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {generatingAi ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Генерируем...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Сгенерировать с ИИ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visual theme preset */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Тема оформления (Дизайн)</label>
              <select 
                value={editing.preset_theme} 
                onChange={(e) => setEditing({...editing, preset_theme: e.target.value as any})} 
                className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold outline-none"
              >
                {Object.entries(THEME_PRESETS).map(([key, t]) => (
                  <option key={key} value={key}>{t.name}</option>
                ))}
              </select>
            </div>
            
            {/* Price */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Комбо-цена (смн)</label>
              <input 
                type="number" 
                value={editing.price} 
                onChange={(e) => setEditing({...editing, price: Number(e.target.value)})} 
                className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold outline-none focus:border-slate-350 transition-colors" 
              />
            </div>
          </div>

          {/* Bilingual Text Fields */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
            <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1.5">Русский язык (RU)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Бейдж (Badge)" value={editing.badge_ru} onChange={(v) => setEditing({...editing, badge_ru: v})} />
              <Field label="Заголовок" value={editing.title_ru} onChange={(v) => setEditing({...editing, title_ru: v})} />
              <Field label="Подзаголовок" value={editing.subtitle_ru} onChange={(v) => setEditing({...editing, subtitle_ru: v})} />
            </div>
            <Field label="Описание комбо" value={editing.desc_ru} onChange={(v) => setEditing({...editing, desc_ru: v})} multiline />
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
            <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1.5">Таджикский язык (TJ)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Бейҷ (Badge)" value={editing.badge_tg} onChange={(v) => setEditing({...editing, badge_tg: v})} />
              <Field label="Сарлавҳа" value={editing.title_tg} onChange={(v) => setEditing({...editing, title_tg: v})} />
              <Field label="Зери сарлавҳа" value={editing.subtitle_tg} onChange={(v) => setEditing({...editing, subtitle_tg: v})} />
            </div>
            <Field label="Тавсифи комбо" value={editing.desc_tg} onChange={(v) => setEditing({...editing, desc_tg: v})} multiline />
          </div>

          {/* Product Selector with Search */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Входящие в комбо продукты ({editing.product_ids.length})</label>
              <input
                type="text"
                placeholder="Поиск по названию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold outline-none w-56 focus:border-slate-350 transition-colors"
              />
            </div>

            <div className="max-h-[260px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-2 space-y-1">
              {filteredProducts.map(p => {
                const isSelected = editing.product_ids.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => handleProductToggle(p.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-xs font-semibold ${
                      isSelected ? 'bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={p.image_url || '/placeholder.jpg'} 
                        alt={p.name} 
                        className="w-7 h-7 object-contain bg-white/20 rounded p-0.5" 
                      />
                      <span>{p.name} (ID: {p.id})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="opacity-70">{p.price} смн</span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        isSelected ? 'bg-white border-white text-slate-800' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <button 
              onClick={handleSaveCurrentEditing} 
              disabled={saving} 
              className="flex-1 h-12 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} /> {saving ? 'Сохраняем комбо...' : 'Сохранить изменения'}
            </button>
            <button 
              onClick={() => setEditing(null)} 
              className="h-12 px-6 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-semibold transition-colors"
            >
              Отмена
            </button>
          </div>
          {msg && <p className="text-center text-sm font-semibold text-emerald-500">{msg}</p>}
        </motion.div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; multiline?: boolean }> = ({ label, value, onChange, multiline }) => (
  <div className="flex-1">
    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">{label}</label>
    {multiline ? (
      <textarea 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        rows={2} 
        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-semibold outline-none resize-none focus:border-slate-350 transition-colors" 
      />
    ) : (
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold outline-none focus:border-slate-350 transition-colors" 
      />
    )}
  </div>
);
