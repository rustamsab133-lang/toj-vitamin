"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Save, Trash2, X, Upload, Image as ImageIcon, ChevronLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '@/lib/imageUtils';

import { Product } from '@/lib/types';

export const ProductEditor: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [glsQuery, setGlsQuery] = useState('');
  const [glsResults, setGlsResults] = useState<any[]>([]);
  const [isGlsSearching, setIsGlsSearching] = useState(false);
  const [showGlsPicker, setShowGlsPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('name');
    if (data) {
      const collator = new Intl.Collator(['ru', 'tg', 'en'], { sensitivity: 'base', numeric: true });
      const sorted = [...data].sort((a, b) => collator.compare((a.name || '').trim(), (b.name || '').trim()));
      setProducts(sorted);
    }
  };

  const filtered = products
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.id).includes(search)
    )
    .sort((a, b) => {
      const collator = new Intl.Collator(['ru', 'tg', 'en'], { sensitivity: 'base', numeric: true });
      return collator.compare((a.name || '').trim(), (b.name || '').trim());
    });

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from('products').upsert({
      id: editing.id,
      name: editing.name,
      full_name: editing.full_name,
      description: editing.description,
      price: editing.price,
      icon_type: editing.icon_type,
      image_url: editing.image_url,
    });
    if (!error) {
      setMsg('Сохранено!');
      setTimeout(() => setMsg(''), 2000);
      loadProducts();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот товар навсегда?')) return;
    setDeleting(true);
    setMsg('Удаление...');
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      
      if (error) {
        console.error('Delete error:', error);
        // Специальное сообщение для ошибок ForeignKey
        if (error.code === '23503') {
          setMsg('Ошибка: Товар используется в комплексах или квизе. Сначала удалите связи!');
        } else {
          setMsg(`Ошибка: ${error.message}`);
        }
      } else {
        setMsg('Удалено успешно!');
        setEditing(null);
        await loadProducts();
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (err) {
      console.error('Catch error:', err);
      setMsg('Критическая ошибка при удалении');
    } finally {
      setDeleting(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);

    try {
      // 1. Сжимаем фото до ~200 КБ перед отправкой
      const compressedBlob = await compressImage(file, 200);
      const ext = 'jpg'; // Сжимаем в JPEG
      const fileName = `${editing.id}-${Date.now()}.${ext}`;

      // 2. Загружаем уже сжатый Blob
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, compressedBlob, { 
          contentType: 'image/jpeg',
          upsert: true 
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        setEditing({ ...editing, image_url: urlData.publicUrl });
      } else {
        console.error('Upload error:', uploadError);
        setMsg('Ошибка загрузки фото');
      }
    } catch (err) {
      console.error('Compression error:', err);
      setMsg('Ошибка сжатия изображения');
    } finally {
      setUploading(false);
    }
  };

  const handleNewProduct = () => {
    const newId = String(Math.max(...products.map(p => Number(p.id) || 0), 0) + 1);
    setEditing({
      id: newId,
      name: '',
      full_name: '',
      description: '',
      price: 0,
      icon_type: 'pill',
      image_url: null,
    });
  };

  const handleGlsSearch = async () => {
    if (!editing) return;
    setIsGlsSearching(true);
    setGlsResults([]);
    setShowGlsPicker(true);
    
    // Clean query
    const query = editing.name.split('(')[0].split('№')[0].trim();
    setGlsQuery(query);

    try {
      const res = await fetch(`/api/admin/gls-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.results) setGlsResults(data.results);
    } catch (e) {
      setMsg('Ошибка поиска на GLS');
    } finally {
      setIsGlsSearching(false);
    }
  };

  const handleSelectGlsProduct = async (detailUrl: string) => {
    if (!editing) return;
    setIsGlsSearching(true);
    try {
      // 1. Get High Res URL
      const res = await fetch(`/api/admin/gls-extract?url=${encodeURIComponent(detailUrl)}`);
      const data = await res.json();
      if (!data.highResUrl) throw new Error('No high res image');

      // 2. Download and Upload to Supabase (to avoid hotlinking)
      setMsg('Загружаем оригинал...');
      const imgRes = await fetch(data.highResUrl);
      const blob = await imgRes.blob();
      
      const fileName = `${editing.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, blob, { 
          contentType: 'image/jpeg',
          upsert: true 
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
        setEditing({ ...editing, image_url: urlData.publicUrl });
        setShowGlsPicker(false);
        setMsg('Оригинал успешно загружен!');
        setTimeout(() => setMsg(''), 2000);
      }
    } catch (e) {
      setMsg('Ошибка получения оригинала');
    } finally {
      setIsGlsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Товары</h2>
          <span className="text-sm text-slate-400 font-medium">{products.length} шт</span>
        </div>
        <button onClick={handleNewProduct} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors">
          <Plus size={16} /> Новый товар
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или ID..."
          className="w-full h-12 bg-white rounded-xl pl-11 pr-4 text-sm font-medium outline-none border border-slate-100 focus:border-slate-200 transition-all placeholder:text-slate-300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6 items-start relative">
        {/* Product List - Hidden on mobile if editing */}
        <div className={`space-y-2 lg:max-h-[600px] lg:overflow-y-auto no-scrollbar ${editing ? 'hidden lg:block' : 'block'}`}>
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => {
                setEditing(p);
                // На мобилках скроллим вверх при выборе
                if (window.innerWidth < 1024) window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                editing?.id === p.id 
                  ? 'bg-slate-800 text-white border-slate-800' 
                  : 'bg-white hover:bg-slate-50 border-slate-100 shadow-sm'
              }`}
            >
              <div className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${
                editing?.id === p.id ? 'bg-white/10' : 'bg-slate-50'
              }`}>
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={20} className={editing?.id === p.id ? 'text-white/40' : 'text-slate-300'} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${editing?.id === p.id ? 'text-white' : 'text-slate-700'}`}>{p.name}</p>
                <p className={`text-xs mt-0.5 ${editing?.id === p.id ? 'text-white/50' : 'text-slate-400'}`}>ID: {p.id} · {p.price} смн</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center py-10 text-slate-400 text-sm">Ничего не найдено</p>}
        </div>

        {/* Edit Panel */}
        <AnimatePresence mode="wait">
          {editing && (
            <motion.div
              key={editing.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 lg:sticky lg:top-24 shadow-xl lg:shadow-none"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Редактирование
                </h3>
                <button onClick={() => setEditing(null)} className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 lg:hidden">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setEditing(null)} className="w-10 h-10 rounded-xl hover:bg-slate-100 items-center justify-center text-slate-400 hidden lg:flex">
                  <X size={20} />
                </button>
              </div>

               {/* Photo Upload */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex justify-between">
                  Фото <span>сжатие до 200кб</span>
                </label>
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  className={`relative aspect-[4/3] rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 hover:border-slate-400 cursor-pointer flex items-center justify-center overflow-hidden transition-all group ${uploading ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {editing.image_url ? (
                    <>
                      <img src={editing.image_url} alt="" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload size={28} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-3 px-6">
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 group-hover:text-slate-600 transition-colors">
                        {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                      </div>
                      <p className="text-xs text-slate-500 font-bold">
                        {uploading ? 'Сжимаем и загружаем...' : 'Нажмите, чтобы выбрать или сделать фото'}
                      </p>
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100 overflow-hidden">
                      <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '0%' }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-full h-full bg-blue-500"
                      />
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
                
                {/* GLS Search Trigger */}
                <button 
                  onClick={handleGlsSearch}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Search size={14} /> Найти оригинал на gls.store
                </button>

                {/* GLS Results Modal-like Overlay */}
                <AnimatePresence>
                  {showGlsPicker && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute inset-x-0 top-0 bottom-0 bg-white z-50 p-6 flex flex-col space-y-4 rounded-2xl"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-800">Результаты на GLS</h4>
                        <button onClick={() => setShowGlsPicker(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600">
                          <X size={18} />
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pr-1">
                        {isGlsSearching && (
                          <div className="py-10 text-center space-y-3">
                            <Loader2 className="animate-spin text-slate-300 mx-auto" size={24} />
                            <p className="text-xs text-slate-400 font-medium">Ищем на сайте производителя...</p>
                          </div>
                        )}
                        
                        {!isGlsSearching && glsResults.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => handleSelectGlsProduct(r.detailUrl)}
                            className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                          >
                            <p className="text-xs font-bold text-slate-700 leading-relaxed group-hover:text-blue-600">
                              {r.name}
                            </p>
                          </button>
                        ))}
                        
                        {!isGlsSearching && glsResults.length === 0 && (
                          <p className="py-10 text-center text-xs text-slate-400">Ничего не найдено. Попробуйте изменить название.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <Field label="Название" value={editing.name} onChange={(v) => setEditing({...editing, name: v})} />
                <Field label="Полное название" value={editing.full_name} onChange={(v) => setEditing({...editing, full_name: v})} />
                <Field label="Описание" value={editing.description || ''} onChange={(v) => setEditing({...editing, description: v})} multiline />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Цена (смн)" value={String(editing.price)} onChange={(v) => setEditing({...editing, price: Number(v) || 0})} type="number" />
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5 block">Иконка</label>
                    <select
                      value={editing.icon_type}
                      onChange={(e) => setEditing({...editing, icon_type: e.target.value})}
                      className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium outline-none"
                    >
                      {[
                        {v:'pill', l:'Таблетка'},
                        {v:'brain', l:'Мозг (Когнитив)'},
                        {v:'activity', l:'Активность'},
                        {v:'zap', l:'Энергия'},
                        {v:'sparkles', l:'Красота/Сияние'},
                        {v:'dumbbell', l:'Спорт'},
                        {v:'heart', l:'Сердце/Забота'},
                        {v:'shield', l:'Защита/Иммунитет'}
                      ].map(t => (
                        <option key={t.v} value={t.v}>{t.l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Field label="Ссылка на фото (URL)" value={editing.image_url || ''} onChange={(v) => setEditing({...editing, image_url: v || null})} placeholder="Или загрузите выше" />
              </div>

               <div className="flex gap-2 pt-2">
                <button 
                  onClick={handleSave} 
                  disabled={saving || deleting} 
                  className="flex-1 h-11 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={14} /> {saving ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button 
                  onClick={() => handleDelete(editing.id)} 
                  disabled={saving || deleting}
                  className="h-11 px-4 rounded-xl bg-red-50 text-red-500 text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>

              {msg && <p className="text-center text-sm font-semibold text-emerald-500">{msg}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// === Reusable Field ===
const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
}> = ({ label, value, onChange, type = 'text', multiline, placeholder }) => (
  <div>
    <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5 block">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium outline-none resize-none focus:border-slate-200 transition-colors placeholder:text-slate-300"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-100 text-sm font-medium outline-none focus:border-slate-200 transition-colors placeholder:text-slate-300"
      />
    )}
  </div>
);
