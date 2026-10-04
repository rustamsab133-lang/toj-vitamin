"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { adminDbQuery } from '@/lib/admin-api';
import { getMarkupSettings, applyMarkupToPrice, MarkupSettings, invalidateMarkupCache } from '@/lib/markup';
import { Search, Plus, Save, Trash2, X, Upload, Image as ImageIcon, ChevronLeft, Loader2, TrendingUp, Eye, EyeOff, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '@/lib/imageUtils';
import { invalidateHiddenProductsCache } from '@/lib/hiddenProducts';
import { invalidateRetailOnlyCache } from '@/lib/retailOnlyProducts';

import { Product } from '@/lib/types';

export const ProductEditor: React.FC<{ onBack: () => void; initialProductId?: string }> = ({ onBack, initialProductId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [hiddenProductIds, setHiddenProductIds] = useState<string[]>([]);
  const [retailOnlyProductIds, setRetailOnlyProductIds] = useState<string[]>([]);
  const [customRetailPrices, setCustomRetailPrices] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'wholesale_and_retail' | 'retail_only' | 'visible' | 'hidden'>('all');
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
  const [markupSettings, setMarkupSettings] = useState<MarkupSettings>({ percent: 0, flat: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (initialProductId && products.length > 0) {
      const prod = products.find(p => p.id === initialProductId);
      if (prod) {
        setEditing(prod);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    }
  }, [initialProductId, products]);

  const loadProducts = async () => {
    try {
      const [{ data: prodData }, { data: settingsData }, { data: customPricesData }, { data: retailOnlyData }, markupRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('site_settings').select('value').eq('key', 'hidden_product_ids').maybeSingle(),
        supabase.from('site_settings').select('value').eq('key', 'custom_retail_prices').maybeSingle(),
        supabase.from('site_settings').select('value').eq('key', 'retail_only_product_ids').maybeSingle(),
        getMarkupSettings(true)
      ]);

      let hiddenIds: string[] = [];
      if (settingsData?.value) {
        try {
          const parsed = JSON.parse(settingsData.value);
          if (Array.isArray(parsed)) hiddenIds = parsed.map(String);
        } catch (e) {}
      }
      setHiddenProductIds(hiddenIds);

      let retailOnlyIds: string[] = [];
      if (retailOnlyData?.value) {
        try {
          const parsed = JSON.parse(retailOnlyData.value);
          if (Array.isArray(parsed)) retailOnlyIds = parsed.map(String);
        } catch (e) {}
      }
      setRetailOnlyProductIds(retailOnlyIds);

      let customPrices: Record<string, number> = {};
      if (customPricesData?.value) {
        try {
          const parsed = JSON.parse(customPricesData.value);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            Object.entries(parsed).forEach(([k, v]) => {
              const num = Number(v);
              if (!isNaN(num) && num > 0) customPrices[String(k)] = num;
            });
          }
        } catch (e) {}
      }
      setCustomRetailPrices(customPrices);
      if (markupRes) setMarkupSettings(markupRes);

      if (prodData) {
        const collator = new Intl.Collator(['ru', 'tg', 'en'], { sensitivity: 'base', numeric: true });
        const sorted = [...prodData].map(p => {
          const pId = String(p.id);
          const isRetailOnly = retailOnlyIds.includes(pId);
          const customPrice = customPrices[pId] || (p.retail_price ? Number(p.retail_price) : undefined);
          return {
            ...p,
            retail_price: customPrice,
            is_hidden: Boolean(p.is_hidden || hiddenIds.includes(pId)),
            is_retail_only: isRetailOnly
          };
        }).sort((a, b) => collator.compare((a.name || '').trim(), (b.name || '').trim()));
        setProducts(sorted);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const filtered = products
    .filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        String(p.id).includes(search);
      if (!matchesSearch) return false;

      if (statusFilter === 'wholesale_and_retail') return !p.is_hidden && !p.is_retail_only;
      if (statusFilter === 'retail_only') return !p.is_hidden && p.is_retail_only;
      if (statusFilter === 'visible') return !p.is_hidden;
      if (statusFilter === 'hidden') return p.is_hidden;
      return true;
    })
    .sort((a, b) => {
      const collator = new Intl.Collator(['ru', 'tg', 'en'], { sensitivity: 'base', numeric: true });
      return collator.compare((a.name || '').trim(), (b.name || '').trim());
    });

  const toggleHideProduct = async (e: React.MouseEvent, p: Product) => {
    e.stopPropagation();
    const newHidden = !p.is_hidden;

    // Оптимистичное обновление интерфейса
    const updatedHiddenIds = newHidden
      ? Array.from(new Set([...hiddenProductIds, String(p.id)]))
      : hiddenProductIds.filter(id => id !== String(p.id));

    setHiddenProductIds(updatedHiddenIds);
    setProducts(prev => prev.map(item => item.id === p.id ? { ...item, is_hidden: newHidden } : item));
    if (editing?.id === p.id) {
      setEditing(prev => prev ? { ...prev, is_hidden: newHidden } : null);
    }

    setMsg(newHidden ? `👁️ Товар скрыт (нет в наличии)` : `✅ Товар снова отображается`);
    setTimeout(() => setMsg(''), 3000);

    try {
      await adminDbQuery({
        action: 'upsert',
        table: 'site_settings',
        data: {
          key: 'hidden_product_ids',
          value: JSON.stringify(updatedHiddenIds)
        }
      });
      invalidateHiddenProductsCache();
    } catch (err: any) {
      console.error('Error toggling hidden product:', err);
      setMsg(`❌ Ошибка сохранения статуса: ${err.message || 'Ошибка'}`);
      loadProducts();
    }
  };

  const handleSave = async (productOverride?: Product) => {
    const target = productOverride || editing;
    if (!target) return;
    setSaving(true);
    setMsg('');
    try {
      const isRetailOnly = Boolean(target.is_retail_only);
      const targetPrice = Number(target.price) || 0;
      const targetRetail = target.retail_price !== undefined && target.retail_price !== null ? Number(target.retail_price) : 0;
      
      // Для товаров "Только розница" цена товара на сайте является прямой розничной ценой
      const effectivePrice = isRetailOnly ? (targetRetail > 0 ? targetRetail : targetPrice) : targetPrice;

      // 1. Сохраняем основные данные товара
      await adminDbQuery({
        action: 'upsert',
        table: 'products',
        data: {
          id: target.id,
          name: target.name,
          full_name: target.full_name,
          description: target.description,
          price: effectivePrice,
          icon_type: target.icon_type,
          image_url: target.image_url,
          barcode: target.barcode || null,
          stock_quantity: target.stock_quantity || 0,
        }
      });

      // 2. Сохраняем статус видимости (скрытия) товара
      const isNowHidden = Boolean(target.is_hidden);
      let updatedHiddenIds = [...hiddenProductIds];
      if (isNowHidden) {
        if (!updatedHiddenIds.includes(String(target.id))) {
          updatedHiddenIds.push(String(target.id));
        }
      } else {
        updatedHiddenIds = updatedHiddenIds.filter(id => id !== String(target.id));
      }

      await adminDbQuery({
        action: 'upsert',
        table: 'site_settings',
        data: {
          key: 'hidden_product_ids',
          value: JSON.stringify(updatedHiddenIds)
        }
      });
      setHiddenProductIds(updatedHiddenIds);
      invalidateHiddenProductsCache();

      // 3. Сохраняем статус "Только для розницы"
      let updatedRetailOnlyIds = [...retailOnlyProductIds];
      if (isRetailOnly) {
        if (!updatedRetailOnlyIds.includes(String(target.id))) {
          updatedRetailOnlyIds.push(String(target.id));
        }
      } else {
        updatedRetailOnlyIds = updatedRetailOnlyIds.filter(id => id !== String(target.id));
      }

      await adminDbQuery({
        action: 'upsert',
        table: 'site_settings',
        data: {
          key: 'retail_only_product_ids',
          value: JSON.stringify(updatedRetailOnlyIds)
        }
      });
      setRetailOnlyProductIds(updatedRetailOnlyIds);
      invalidateRetailOnlyCache();

      // 4. Сохраняем индивидуальную розничную цену (если розничный товар или задана вручную)
      const updatedCustomPrices = { ...customRetailPrices };
      if (isRetailOnly) {
        // Для чисто розничного товара фиксируем финальную цену продажи без наценок
        if (effectivePrice > 0) {
          updatedCustomPrices[String(target.id)] = Math.round(effectivePrice);
        }
      } else if (targetRetail > 0) {
        updatedCustomPrices[String(target.id)] = Math.round(targetRetail);
      } else {
        delete updatedCustomPrices[String(target.id)];
      }

      await adminDbQuery({
        action: 'upsert',
        table: 'site_settings',
        data: {
          key: 'custom_retail_prices',
          value: JSON.stringify(updatedCustomPrices)
        }
      });
      setCustomRetailPrices(updatedCustomPrices);
      invalidateMarkupCache();

      setMsg('✅ Сохранено!');
      setTimeout(() => setMsg(''), 3000);
      loadProducts();
    } catch (err: any) {
      console.error('Save error:', err);
      const errText = err?.message || 'Ошибка';
      if (errText.includes('Unauthorized') || errText.includes('401')) {
        setMsg('❌ Ошибка: Неверный пароль администратора. Войдите заново.');
      } else {
        setMsg(`❌ Ошибка сохранения: ${errText}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот товар навсегда?')) return;
    setDeleting(true);
    setMsg('Удаление...');
    
    try {
      const { error } = await adminDbQuery({
        action: 'delete',
        table: 'products',
        id: id
      });
      
      if (error) {
        console.error('Delete error:', error);
        // Специальное сообщение для ошибок ForeignKey
        if (error.code === '23503') {
          setMsg('Ошибка: Товар используется в комплексах или квизе. Сначала удалите связи!');
        } else {
          setMsg(`Ошибка: ${error.message}`);
        }
      } else {
        // Очищаем из скрытых если он там был
        if (hiddenProductIds.includes(String(id))) {
          const updated = hiddenProductIds.filter(hId => hId !== String(id));
          await adminDbQuery({
            action: 'upsert',
            table: 'site_settings',
            data: {
              key: 'hidden_product_ids',
              value: JSON.stringify(updated)
            }
          });
          setHiddenProductIds(updated);
          invalidateHiddenProductsCache();
        }

        // Очищаем из списка "Только розница"
        if (retailOnlyProductIds.includes(String(id))) {
          const updatedRetail = retailOnlyProductIds.filter(rId => rId !== String(id));
          await adminDbQuery({
            action: 'upsert',
            table: 'site_settings',
            data: {
              key: 'retail_only_product_ids',
              value: JSON.stringify(updatedRetail)
            }
          });
          setRetailOnlyProductIds(updatedRetail);
          invalidateRetailOnlyCache();
        }

        // Очищаем из кастомных розничных цен если был
        if (customRetailPrices[String(id)]) {
          const updatedCustom = { ...customRetailPrices };
          delete updatedCustom[String(id)];
          await adminDbQuery({
            action: 'upsert',
            table: 'site_settings',
            data: {
              key: 'custom_retail_prices',
              value: JSON.stringify(updatedCustom)
            }
          });
          setCustomRetailPrices(updatedCustom);
          invalidateMarkupCache();
        }

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
    setMsg('Сжимаем и загружаем фото...');

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

        // 3. Обновляем локальный стейт с новым URL
        const updatedProduct = { ...editing, image_url: urlData.publicUrl };
        setEditing(updatedProduct);
        setMsg('Фото загружено! Автосохранение...');

        // 4. Автоматически сохраняем в БД сразу после загрузки фото
        setUploading(false);
        await handleSave(updatedProduct);
      } else {
        console.error('Upload error:', uploadError);
        setMsg(`❌ Ошибка загрузки фото: ${uploadError.message}`);
        setUploading(false);
      }
    } catch (err) {
      console.error('Compression/upload error:', err);
      setMsg('❌ Ошибка сжатия или загрузки изображения');
      setUploading(false);
    }
    // Reset file input so the same file can be selected again
    if (fileRef.current) fileRef.current.value = '';
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
      barcode: '',
      stock_quantity: 0,
      is_hidden: false,
      is_retail_only: false,
      retail_price: undefined
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

  const visibleCount = products.filter(p => !p.is_hidden).length;
  const hiddenCount = products.filter(p => p.is_hidden).length;
  const retailOnlyCount = products.filter(p => !p.is_hidden && p.is_retail_only).length;
  const wholesaleCount = products.filter(p => !p.is_hidden && !p.is_retail_only).length;

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

      {/* Search and Status Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или ID..."
            className="w-full h-12 bg-white rounded-xl pl-11 pr-4 text-sm font-medium outline-none border border-slate-100 focus:border-slate-200 transition-all placeholder:text-slate-300 shadow-sm"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-100 hover:border-slate-200'
            }`}
          >
            Все ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('wholesale_and_retail')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'wholesale_and_retail'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-100 hover:border-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Опт + Розница ({wholesaleCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('retail_only')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'retail_only'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-100 hover:border-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Только розница ({retailOnlyCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('hidden')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'hidden'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-100 hover:border-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Скрытые ({hiddenCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6 items-start relative">
        {/* Product List - Hidden on mobile if editing */}
        <div className={`space-y-2 lg:max-h-[600px] lg:overflow-y-auto no-scrollbar ${editing ? 'hidden lg:block' : 'block'}`}>
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => {
                const prodCustomRetail = customRetailPrices[String(p.id)];
                setEditing({
                  ...p,
                  retail_price: prodCustomRetail
                });
                // На мобилках скроллим вверх при выборе
                if (window.innerWidth < 1024) window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all border group ${
                editing?.id === p.id 
                  ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                  : p.is_hidden
                    ? 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-200/70 shadow-none'
                    : 'bg-white hover:bg-slate-50 border-slate-100 shadow-sm'
              }`}
            >
              <div className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative ${
                editing?.id === p.id ? 'bg-white/10' : p.is_hidden ? 'bg-amber-100/60' : 'bg-slate-50'
              }`}>
                {p.image_url ? (
                  <img src={p.image_url} alt="" className={`w-full h-full object-cover ${p.is_hidden ? 'opacity-70' : ''}`} />
                ) : (
                  <ImageIcon size={20} className={editing?.id === p.id ? 'text-white/40' : 'text-slate-300'} />
                )}
                {p.is_hidden && (
                  <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[0.5px] flex items-center justify-center">
                    <EyeOff size={14} className="text-amber-800" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={`font-bold text-sm truncate ${editing?.id === p.id ? 'text-white' : 'text-slate-700'}`}>
                    {p.name}
                  </p>
                  {p.is_retail_only && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                      editing?.id === p.id 
                        ? 'bg-purple-400/20 text-purple-200 border border-purple-400/30' 
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}>
                      Только розница
                    </span>
                  )}
                  {p.is_hidden && (
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                      editing?.id === p.id 
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      Скрыт
                    </span>
                  )}
                </div>
                {(() => {
                  const hasCustom = Boolean(customRetailPrices[String(p.id)]);
                  const effectiveRetail = applyMarkupToPrice(p.price, markupSettings, customRetailPrices[String(p.id)]);
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {p.is_retail_only ? (
                        <p className={`text-xs ${editing?.id === p.id ? 'text-white/80' : 'text-purple-700 font-semibold'}`}>
                          Розница: <span className={`font-bold ${editing?.id === p.id ? 'text-white' : 'text-slate-800'}`}>{effectiveRetail} смн</span> <span className="text-[10px] text-slate-400 font-normal">(без опта)</span>
                        </p>
                      ) : (
                        <p className={`text-xs ${editing?.id === p.id ? 'text-white/60' : 'text-slate-400'}`}>
                          Опт: <span className="font-semibold">{p.price}</span> → Розница: <span className={`font-bold ${editing?.id === p.id ? 'text-white' : 'text-slate-700'}`}>{effectiveRetail} смн</span>
                        </p>
                      )}
                      {hasCustom && !p.is_retail_only && (
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase ${
                          editing?.id === p.id 
                            ? 'bg-blue-400/20 text-blue-200 border border-blue-400/30' 
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          Ручная
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Quick toggle button */}
              <button
                type="button"
                onClick={(e) => toggleHideProduct(e, p)}
                title={p.is_hidden ? 'Товар скрыт. Нажмите, чтобы снова показывать' : 'Товар в наличии. Нажмите, чтобы скрыть'}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                  editing?.id === p.id
                    ? 'hover:bg-white/20 text-white/70 hover:text-white'
                    : p.is_hidden
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 shadow-sm'
                      : 'hover:bg-slate-100 text-slate-300 hover:text-slate-600'
                }`}
              >
                {p.is_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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

              {/* Visibility Status Toggle (В наличии / Скрыть товар) */}
              <div className={`p-4 rounded-xl border transition-all ${
                editing.is_hidden 
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
                  : 'bg-emerald-50/60 border-emerald-100 text-slate-800'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${editing.is_hidden ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className="text-xs font-bold">
                        {editing.is_hidden ? 'Товар скрыт (нет в наличии)' : 'Товар в наличии (активен)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {editing.is_hidden 
                        ? 'Скрыт на сайте и в поиске. В B2B заказе отображается с пометкой «Нет в наличии».' 
                        : 'Отображается на сайте и доступен для заказа розничным клиентам и B2B.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, is_hidden: !editing.is_hidden })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                      editing.is_hidden
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {editing.is_hidden ? (
                      <>
                        <EyeOff size={14} /> Скрыт
                      </>
                    ) : (
                      <>
                        <Eye size={14} /> Показывается
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sales Channel Toggle: Wholesale+Retail vs Retail Only */}
              <div className={`p-4 rounded-xl border transition-all ${
                editing.is_retail_only 
                  ? 'bg-purple-50/70 border-purple-200 text-purple-950' 
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${editing.is_retail_only ? 'bg-purple-600' : 'bg-blue-500'}`} />
                      <span className="text-xs font-bold">
                        {editing.is_retail_only ? 'Только для розницы (B2C)' : 'Опт + Розница (B2B и B2C)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {editing.is_retail_only 
                        ? 'Товар виден только на сайте. Полностью скрыт из оптового B2B кабинета и прайс-листов аптек.' 
                        : 'Товар отображается и на сайте, и в оптовом каталоге для партнерских аптек.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextRetailOnly = !editing.is_retail_only;
                      setEditing({
                        ...editing,
                        is_retail_only: nextRetailOnly,
                        // При переключении в розницу фиксируем цену
                        retail_price: nextRetailOnly 
                          ? (editing.retail_price || editing.price || 0)
                          : editing.retail_price
                      });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                      editing.is_retail_only
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {editing.is_retail_only ? '🛍️ Только розница' : '🏢 Опт + Розница'}
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <Field label="Название" value={editing.name} onChange={(v) => setEditing({...editing, name: v})} />
                <Field label="Полное название" value={editing.full_name} onChange={(v) => setEditing({...editing, full_name: v})} />
                <Field label="Описание" value={editing.description || ''} onChange={(v) => setEditing({...editing, description: v})} multiline />
                {/* Pricing Block: Wholesale vs Retail */}
                <div className={`p-4 rounded-xl border space-y-3 transition-colors ${
                  editing.is_retail_only 
                    ? 'bg-purple-50/50 border-purple-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Ценообразование
                    </span>
                    {editing.is_retail_only ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        Финальная розничная цена
                      </span>
                    ) : Boolean(editing.retail_price && Number(editing.retail_price) > 0) ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        Индивидуальная розница
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Авторасчёт наценки
                      </span>
                    )}
                  </div>

                  {editing.is_retail_only ? (
                    /* Режим: Только розница — одна прямая финальная цена */
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 block">
                        Цена продажи на сайте (смн)
                      </label>
                      <input
                        type="number"
                        value={editing.retail_price !== undefined ? String(editing.retail_price) : (editing.price ? String(editing.price) : '')}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : (Number(e.target.value) || 0);
                          setEditing({
                            ...editing,
                            price: val,
                            retail_price: val
                          });
                        }}
                        placeholder="Укажите розничную цену в сомони"
                        className="w-full h-11 px-3.5 rounded-xl border border-purple-300 bg-white text-base text-purple-950 font-bold focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all shadow-xs"
                      />
                      <p className="text-[11px] text-purple-900 font-medium">
                        🎯 Это точная розничная цена для покупателей на сайте. Автоматические наценки сайта не накладываются. В оптовом каталоге и заказах аптек товар отображаться не будет.
                      </p>
                    </div>
                  ) : (
                    /* Режим: Опт + Розница */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Оптовая цена */}
                      <div>
                        <Field 
                          label="Оптовая / B2B цена (смн)" 
                          value={String(editing.price)} 
                          onChange={(v) => setEditing({...editing, price: Number(v) || 0})} 
                          type="number" 
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Базовая оптовая цена для аптек и складов</p>
                      </div>

                      {/* Розничная цена */}
                      <div>
                        {(() => {
                          const autoPrice = applyMarkupToPrice(editing.price, markupSettings);
                          const hasCustom = Boolean(editing.retail_price && Number(editing.retail_price) > 0);

                          return (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 block">
                                  Розничная цена (смн)
                                </label>
                                {hasCustom ? (
                                  <button
                                    type="button"
                                    onClick={() => setEditing({ ...editing, retail_price: undefined })}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                                    title="Вернуть автоматический расчет по формуле сайта"
                                  >
                                    <RotateCcw size={10} /> Сбросить на авто
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditing({ ...editing, retail_price: autoPrice })}
                                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                                  >
                                    <Sparkles size={10} /> Задать вручную
                                  </button>
                                )}
                              </div>

                              <input
                                type="number"
                                value={hasCustom ? String(editing.retail_price) : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditing({
                                    ...editing,
                                    retail_price: val === '' ? undefined : (Number(val) || 0)
                                  });
                                }}
                                placeholder={`Авто: ${autoPrice} смн`}
                                className={`w-full h-10 px-3 rounded-lg border text-sm font-medium outline-none transition-colors ${
                                  hasCustom 
                                    ? 'bg-white border-blue-300 text-blue-900 font-bold focus:border-blue-500 shadow-sm' 
                                    : 'bg-slate-100/70 border-slate-200 text-slate-600 placeholder:text-slate-400 focus:bg-white'
                                }`}
                              />

                              <div className="mt-1.5">
                                {hasCustom ? (
                                  <p className="text-[11px] text-blue-700 font-semibold flex items-center gap-1">
                                    <span>✨ Фиксированная розница: {editing.retail_price} смн. Опт ({editing.price} смн) не меняется.</span>
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <TrendingUp size={11} className="text-emerald-500 shrink-0" />
                                    <span>
                                      По формуле: {autoPrice} смн
                                      <span className="text-slate-400 ml-1">
                                        ({markupSettings.percent > 0 ? `+${markupSettings.percent}%` : ''}{markupSettings.flat > 0 ? ` +${markupSettings.flat} смн` : ''})
                                      </span>
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Штрихкод" value={editing.barcode || ''} onChange={(v) => setEditing({...editing, barcode: v})} placeholder="Скан штрихкода" />
                  <Field label="Остаток на складе" value={String(editing.stock_quantity || 0)} onChange={(v) => setEditing({...editing, stock_quantity: Number(v) || 0})} type="number" placeholder="0" />
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                  <Field label="Ссылка на фото (URL)" value={editing.image_url || ''} onChange={(v) => setEditing({...editing, image_url: v || null})} placeholder="Или загрузите выше" />
                </div>
              </div>

               <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => handleSave()} 
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
