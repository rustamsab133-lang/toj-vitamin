"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  Printer, 
  Search, 
  Phone, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Truck, 
  Building2, 
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  ExternalLink,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { CatalogProduct, CatalogDataResult } from '@/lib/catalogData';

interface CatalogViewProps {
  initialData: CatalogDataResult;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export default function CatalogView({ initialData }: CatalogViewProps) {
  const [data, setData] = useState<CatalogDataResult>(initialData);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceType, setPriceType] = useState<'retail' | 'wholesale' | 'none'>('retail');

  // Handle switching price mode
  const handlePriceTypeChange = async (newType: 'retail' | 'wholesale' | 'none') => {
    if (newType === priceType) return;
    setPriceType(newType);
    try {
      const res = await fetch(`/api/catalog/data?priceType=${newType}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to change price mode:', e);
    }
  };

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return data.products.filter(p => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.instructions.usage && p.instructions.usage.toLowerCase().includes(q))
      );
    });
  }, [data.products, search, selectedCategory]);

  // Chunk products: exactly 4 items per physical A4 page
  const ITEMS_PER_PAGE = 4;
  const productPages = useMemo(() => {
    return chunkArray(filteredProducts, ITEMS_PER_PAGE);
  }, [filteredProducts]);

  const totalPagesCount = productPages.length + 2; // Cover + Product Pages + Back Cover

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Антистресс и сон':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Для мужчин':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Для женщин и красоты':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'Суставы и кости':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Сердце и Омега-3':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Мозг и энергия':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Иммунитет и защита':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Метаболизм и тонус':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 font-sans print:bg-white print:text-black print:p-0">
      
      {/* ===================== CONTROL TOOLBAR (HIDDEN IN PRINT) ===================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center shadow-sm">
              <Image 
                src="/logo.webp" 
                alt="TOJ-VITAMIN" 
                width={40} 
                height={40} 
                className="object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight tracking-tight flex items-center gap-2">
                TOJ-VITAMIN
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Постраничный PDF
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {filteredProducts.length} товаров • {totalPagesCount} страниц (ровно 4 на страницу)
              </p>
            </div>
          </div>

          {/* Price Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
            <button
              onClick={() => handlePriceTypeChange('retail')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                priceType === 'retail'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Розничные цены
            </button>
            <button
              onClick={() => handlePriceTypeChange('wholesale')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                priceType === 'wholesale'
                  ? 'bg-white text-slate-900 shadow-sm font-bold text-emerald-700'
                  : 'hover:text-slate-900'
              }`}
            >
              Оптовые (B2B)
            </button>
            <button
              onClick={() => handlePriceTypeChange('none')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                priceType === 'none'
                  ? 'bg-white text-slate-900 shadow-sm font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              Без цен
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <a
              href={`https://wa.me/${data.company.whatsapp}?text=${encodeURIComponent('Здравствуйте! Хочу сделать заказ по каталогу TOJ-VITAMIN.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
            >
              <MessageCircle size={15} />
              <span>WhatsApp: {data.company.phoneFormatted}</span>
            </a>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Printer size={15} />
              <span>📄 Сохранить в PDF (Печать)</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 border-t border-slate-100 flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или коду (напр. Магний, D3, #05)..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs text-slate-800 rounded-xl border border-transparent focus:border-slate-300 focus:outline-none transition-all placeholder:text-slate-400"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Все категории ({data.totalCount})
            </button>
            {data.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ===================== PRINT CSS RULES ===================== */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
          }
          .cover-page,
          .catalog-page,
          .back-cover-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            background: #ffffff;
          }
        }
      `}} />

      {/* ===================== PAGES WRAPPER ===================== */}
      <div className="py-8 print:p-0">

        {/* ===================== PAGE 1: COVER ===================== */}
        <section className="cover-page w-[210mm] min-h-[297mm] max-h-[297mm] h-[297mm] mx-auto mb-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-[14mm_16mm] shadow-xl rounded-2xl flex flex-col justify-between overflow-hidden print:rounded-none print:shadow-none print:mb-0">
          <div>
            {/* Top row */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-700/60">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white p-2 flex items-center justify-center shadow-lg">
                  <Image 
                    src="/logo.webp" 
                    alt="TOJ-VITAMIN Logo" 
                    width={56} 
                    height={56} 
                    className="object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-white">
                    TOJ-VITAMIN
                  </h2>
                  <p className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
                    Дистрибьюторский центр здоровья
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-emerald-300 text-xs font-bold">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>Официальный дистрибьютор GLS в РТ</span>
              </div>
            </div>

            {/* Catalog Hero Banner */}
            <div className="py-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-semibold mb-4 backdrop-blur-sm">
                <Sparkles size={14} className="text-amber-400" />
                Официальное издание • Каталог и схемы приема 2026
              </div>
              <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
                Каталог сертифицированных витаминов и схемы приема
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed max-w-xl font-normal">
                Более 100 оригинальных биодоступных комплексов GLS Pharmaceuticals в Таджикистане. Точные схемы приема, дозировки, актуальные цены и доставка до двери.
              </p>
            </div>

            {/* How to Order Guide */}
            <div className="grid grid-cols-2 gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm mb-6">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/30">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Заказ одного товара
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Нажмите <strong className="text-emerald-300">«Заказать»</strong> под любым выбранным товаром — сразу откроется WhatsApp с текстом заказа.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/30">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Заказ нескольких позиций (списком)
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    Отправьте номера товаров (напр. <strong className="text-blue-300">«Хочу #03, #11 и #24»</strong>) в WhatsApp на номер {data.company.phoneFormatted}.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Bar & Warehouses */}
          <div className="pt-6 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Телефон для заказов</span>
                <span className="font-bold text-white text-sm">{data.company.phoneFormatted}</span>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">WhatsApp</span>
                <span className="font-bold text-emerald-400 text-sm">{data.company.whatsappFormatted}</span>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Склады и доставка</span>
                <span className="font-bold text-white text-xs">г. Душанбе • г. Худжанд</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] text-slate-400 uppercase font-semibold block">Официальный сайт</span>
              <span className="text-white font-bold text-xs">www.toj-vitamin.tj</span>
            </div>
          </div>
        </section>

        {/* ===================== PAGES 2..N: 4 PRODUCTS PER PAGE (2x2 GRID) ===================== */}
        {productPages.map((pageItems, pageIdx) => {
          const pageNum = pageIdx + 2;
          const pageCat = pageItems[0]?.category || 'Витамины и минералы';

          return (
            <div 
              key={`page-${pageIdx}`}
              className="catalog-page w-[210mm] min-h-[297mm] max-h-[297mm] h-[297mm] mx-auto mb-8 bg-white p-[10mm_12mm_8mm_12mm] shadow-xl rounded-2xl flex flex-col justify-between overflow-hidden print:rounded-none print:shadow-none print:mb-0"
            >
              {/* Page Running Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 h-[10mm]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md overflow-hidden bg-slate-900 flex items-center justify-center">
                    <Image src="/logo.webp" alt="TOJ" width={20} height={20} className="object-contain" />
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-900 tracking-wider uppercase">
                    TOJ-VITAMIN • Официальный дистрибьютор
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                    {pageCat}
                  </span>
                </div>
              </div>

              {/* 2x2 Fixed Grid Content */}
              <div className="grid grid-cols-2 grid-rows-2 gap-3 h-[250mm] max-h-[250mm] my-auto">
                {pageItems.map((p) => {
                  const catClass = getCategoryColor(p.category);

                  return (
                    <div 
                      key={p.id}
                      className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between h-full overflow-hidden shadow-xs"
                    >
                      {/* Top Bar: Category Pill & Fast Order Code */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${catClass} truncate max-w-[150px]`}>
                          {p.category}
                        </span>

                        <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded tracking-wider shrink-0">
                          {p.code}
                        </span>
                      </div>

                      {/* Product Image */}
                      <div className="h-[95px] max-h-[95px] w-full flex items-center justify-center my-1 relative">
                        <div className="relative w-full h-full flex items-center justify-center">
                          <Image
                            src={p.imageUrl}
                            alt={p.name}
                            width={160}
                            height={95}
                            className="object-contain max-h-[90px] drop-shadow-sm"
                          />
                        </div>
                      </div>

                      {/* Title & bullets */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-[12px] font-extrabold text-slate-900 leading-snug line-clamp-2 mb-1.5 h-[32px]" title={p.name}>
                            {p.name}
                          </h4>

                          <ul className="space-y-0.5 mb-2 h-[34px] overflow-hidden">
                            {p.properties.slice(0, 2).map((prop, i) => (
                              <li key={i} className="text-[10px] text-slate-600 flex items-start gap-1 leading-tight truncate">
                                <span className="text-emerald-500 font-bold shrink-0">•</span>
                                <span className="truncate">{prop}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Dosage & Usage Instruction Box */}
                          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2 mb-2 text-slate-900">
                            <div className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-900 mb-0.5 tracking-wider">
                              <Clock size={11} className="text-emerald-600 shrink-0" />
                              <span>КАК И СКОЛЬКО ПРИНИМАТЬ:</span>
                            </div>
                            
                            <div className="text-[9.5px] space-y-0.5 font-medium leading-tight">
                              <p className="truncate">
                                👉 <strong>Прием:</strong> {p.instructions.usage}
                              </p>
                              <p className="text-[9px] text-emerald-800 truncate">
                                🕒 {p.instructions.timing} &bull; 📅 {p.instructions.course}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Price & Order Action */}
                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                          <div>
                            {priceType !== 'none' ? (
                              <div>
                                <span className="text-[8px] text-slate-400 uppercase font-semibold block leading-none">
                                  {priceType === 'wholesale' ? 'Опт' : 'Цена'}
                                </span>
                                <span className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                                  {p.displayPrice}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500">
                                По запросу
                              </span>
                            )}
                          </div>

                          <a
                            href={p.waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs transition-all shrink-0"
                          >
                            <MessageCircle size={11} />
                            <span>Заказать</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Fill empty cells if last page has < 4 items */}
                {pageItems.length < 4 && Array.from({ length: 4 - pageItems.length }).map((_, emptyIdx) => (
                  <div key={`empty-${emptyIdx}`} className="border border-dashed border-slate-200 rounded-xl bg-slate-50/50" />
                ))}
              </div>

              {/* Page Running Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[9px] text-slate-500 h-[8mm]">
                <div>
                  📞 Заказ в WhatsApp: <strong>{data.company.phoneFormatted}</strong>
                </div>
                <div>www.toj-vitamin.tj</div>
                <div className="font-bold text-slate-700">
                  Стр. {pageNum} из {totalPagesCount}
                </div>
              </div>
            </div>
          );
        })}

        {/* ===================== LAST PAGE: BACK COVER ===================== */}
        <section className="back-cover-page w-[210mm] min-h-[297mm] max-h-[297mm] h-[297mm] mx-auto bg-slate-950 text-white p-[14mm_16mm] shadow-xl rounded-2xl flex flex-col justify-between overflow-hidden print:rounded-none print:shadow-none">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center">
                <Image src="/logo.webp" alt="Logo" width={40} height={40} className="object-contain" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">TOJ-VITAMIN</div>
                <div className="text-[10px] text-slate-400">ООО «Саховати Истаравшан»</div>
              </div>
            </div>
            <div className="text-right text-xs text-emerald-400 font-bold">
              📞 {data.company.phoneFormatted}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 my-auto">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2.5 text-emerald-400 text-sm font-bold mb-2">
                <MessageCircle size={18} />
                <span>Заказ нескольких позиций списком в WhatsApp</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Для оформления заказа на курс или для всей семьи просто отправьте номера препаратов на номер:
              </p>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300">
                «Здравствуйте! Хочу заказать: #02 (2 шт), #07 (1 шт), #19 (1 шт)»
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2.5 text-blue-400 text-sm font-bold mb-2">
                <Truck size={18} />
                <span>Быстрая доставка по Таджикистану</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-blue-400 mt-0.5 shrink-0" />
                  <span><strong>Душанбе и Худжанд:</strong> экспресс-доставка день-в-день курьером прямо в руки.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-blue-400 mt-0.5 shrink-0" />
                  <span><strong>Регионы РТ:</strong> оперативная отправка до 24 часов в любой город республики.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-blue-400 mt-0.5 shrink-0" />
                  <span><strong>Аптекам и оптовикам:</strong> официальный договор, сертификаты соответствия МЗ РТ и безналичный расчет.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 text-center text-[10px] text-slate-500 leading-relaxed">
            <p>
              Биологически активная добавка к пище (БАД). Не является лекарственным средством. Перед применением рекомендуется проконсультироваться со специалистом.
            </p>
            <p className="mt-1 text-slate-600">
              © {new Date().getFullYear()} TOJ-VITAMIN. Все права защищены.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
