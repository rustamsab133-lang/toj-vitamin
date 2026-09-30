"use client";

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { 
  Printer, 
  Search, 
  Phone, 
  MessageCircle, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Truck, 
  Building2, 
  Sparkles,
  Check,
  CheckCircle2,
  Filter,
  Loader2
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
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

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

  // Strict 2 products per physical A4 sheet (Horizontal large cards)
  const ITEMS_PER_PAGE = 2;
  const productPages = useMemo(() => {
    return chunkArray(filteredProducts, ITEMS_PER_PAGE);
  }, [filteredProducts]);

  const totalPagesCount = productPages.length + 2; // Cover + Product Pages + Back Cover

  // Reliable print handler that waits for all images to be loaded into memory
  const handlePrint = async () => {
    setIsPreparingPrint(true);
    try {
      if (typeof window !== 'undefined') {
        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.catalog-page-container img'));
        await Promise.all(
          imgs.map(img => {
            if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
            return new Promise(resolve => {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
              // Timeout fallback after 3 seconds
              setTimeout(resolve, 3000);
            });
          })
        );
        window.print();
      }
    } finally {
      setIsPreparingPrint(false);
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
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans print:bg-white print:text-black print:p-0">
      
      {/* ===================== CONTROL TOOLBAR (HIDDEN IN PRINT) ===================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-xs">
              <img 
                src="/logo.webp" 
                alt="TOJ-VITAMIN" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight tracking-tight flex items-center gap-2">
                TOJ-VITAMIN
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Каталог PDF
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {filteredProducts.length} позиций • 2 товара на лист (крупные фото)
              </p>
            </div>
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
              disabled={isPreparingPrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isPreparingPrint ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
              <span>{isPreparingPrint ? 'Подготовка...' : '📄 Сохранить в PDF'}</span>
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

      {/* ===================== STRICT PRINT & RESPONSIVE STYLES ===================== */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm !important;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .cover-page,
          .catalog-page,
          .back-cover-page {
            width: 100% !important;
            height: 281mm !important;
            max-height: 281mm !important;
            min-height: 281mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .product-card-row {
            height: 122mm !important;
            max-height: 122mm !important;
            min-height: 122mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />

      {/* ===================== CATALOG CONTAINER ===================== */}
      <div className="catalog-page-container max-w-4xl mx-auto px-3 sm:px-4 py-6 print:p-0 print:max-w-none">

        {/* ===================== PAGE 1: COVER (CLEAN LUXURY LIGHT) ===================== */}
        <section className="cover-page w-full min-h-[281mm] max-h-[281mm] bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-lg flex flex-col justify-between mb-8 overflow-hidden print:rounded-none print:shadow-none print:border-none print:mb-0">
          <div>
            {/* Top row: Brand & Distributor badge */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-xs">
                  <img 
                    src="/logo.webp" 
                    alt="TOJ-VITAMIN Logo" 
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                    TOJ-VITAMIN
                  </h2>
                  <p className="text-xs font-bold text-emerald-600 tracking-wider uppercase">
                    Дистрибьюторский центр здоровья
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-emerald-800 text-xs font-bold">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Официальный дистрибьютор GLS в РТ</span>
              </div>
            </div>

            {/* Catalog Hero Banner */}
            <div className="py-8 sm:py-12 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mb-4">
                <Sparkles size={14} className="text-amber-500" />
                Официальное издание • Каталог и схемы приема 2026
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight mb-4">
                Каталог сертифицированных витаминов и схемы приема
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl font-normal">
                Более 100 оригинальных биодоступных комплексов GLS Pharmaceuticals в Таджикистане. Точные схемы приема, дозировки, актуальные цены и доставка до двери.
              </p>
            </div>

            {/* How to Order Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/80 p-5 rounded-2xl mb-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    Заказ одного товара
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Нажмите <strong className="text-emerald-700">«Заказать»</strong> под выбранным товаром — сразу откроется WhatsApp с готовым текстом заказа.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">
                    Заказ нескольких позиций (списком)
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Отправьте номера товаров (напр. <strong className="text-blue-700">«Хочу #03, #11 и #24»</strong>) в WhatsApp на номер {data.company.phoneFormatted}.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Bar & Warehouses */}
          <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Телефон для заказов</span>
                <span className="font-bold text-slate-900 text-sm">{data.company.phoneFormatted}</span>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">WhatsApp</span>
                <span className="font-bold text-emerald-600 text-sm">{data.company.whatsappFormatted}</span>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Склады и доставка</span>
                <span className="font-bold text-slate-800 text-xs">г. Душанбе • г. Худжанд</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] text-slate-400 uppercase font-semibold block">Официальный сайт</span>
              <span className="text-emerald-700 font-bold text-xs">www.toj-vitamin.tj</span>
            </div>
          </div>
        </section>

        {/* ===================== PAGES 2..N: 2 LARGE PRODUCTS PER PAGE ===================== */}
        {productPages.map((pageItems, pageIdx) => {
          const pageNum = pageIdx + 2;
          const pageCat = pageItems[0]?.category || 'Витамины и минералы';

          return (
            <div 
              key={`page-${pageIdx}`}
              className="catalog-page w-full min-h-[281mm] max-h-[281mm] bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-lg flex flex-col justify-between mb-8 overflow-hidden print:rounded-none print:shadow-none print:border-none print:mb-0"
            >
              {/* Page Running Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 h-[10mm]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md overflow-hidden bg-white border border-slate-200 flex items-center justify-center">
                    <img src="/logo.webp" alt="TOJ" className="w-4 h-4 object-contain" />
                  </div>
                  <span className="text-[11px] font-extrabold text-slate-800 tracking-wider uppercase">
                    TOJ-VITAMIN • Официальный дистрибьютор
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                    {pageCat}
                  </span>
                </div>
              </div>

              {/* 2 Big Cards Container */}
              <div className="flex flex-col justify-between flex-1 my-3 gap-3">
                {pageItems.map((p) => {
                  const catClass = getCategoryColor(p.category);

                  return (
                    <div 
                      key={p.id}
                      className="product-card-row bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-4 overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
                    >
                      {/* Left: Prominent Product Image (Height 150-170px) */}
                      <div className="w-full sm:w-44 md:w-48 h-36 sm:h-full flex items-center justify-center shrink-0 bg-slate-50/70 rounded-xl p-2 relative">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          loading="eager"
                          decoding="sync"
                          className="max-h-full max-w-full object-contain drop-shadow-md"
                        />
                      </div>

                      {/* Right: Full Product Details */}
                      <div className="flex-1 flex flex-col justify-between h-full w-full">
                        <div>
                          {/* Category Badge & Fast Code */}
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catClass} truncate max-w-[200px]`}>
                              {p.category}
                            </span>
                            <span className="text-[11px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-md tracking-wider shrink-0">
                              {p.code}
                            </span>
                          </div>

                          {/* Product Name */}
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug line-clamp-2 mb-1.5" title={p.name}>
                            {p.name}
                          </h3>

                          {/* Key benefits */}
                          <ul className="space-y-0.5 mb-2.5">
                            {p.properties.slice(0, 2).map((prop, i) => (
                              <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-tight">
                                <span className="text-emerald-500 font-bold shrink-0">•</span>
                                <span className="line-clamp-1">{prop}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Dosage & Usage Instruction Box */}
                          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-2.5 mb-2 text-slate-900">
                            <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-900 mb-0.5 tracking-wider">
                              <Clock size={12} className="text-emerald-600 shrink-0" />
                              <span>КАК И СКОЛЬКО ПРИНИМАТЬ:</span>
                            </div>
                            
                            <div className="text-[10.5px] space-y-0.5 font-medium leading-tight">
                              <p className="line-clamp-1">
                                👉 <strong>Прием:</strong> {p.instructions.usage}
                              </p>
                              <p className="text-[10px] text-emerald-800 line-clamp-1">
                                🕒 {p.instructions.timing} &bull; 📅 {p.instructions.course}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Price & Order Action */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
                          <div>
                            <span className="text-[8px] text-slate-400 uppercase font-semibold block leading-none">
                              Цена
                            </span>
                            <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                              {p.retailPrice} смн
                            </span>
                          </div>

                          <a
                            href={p.waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all shrink-0"
                          >
                            <MessageCircle size={13} />
                            <span>Заказать в WhatsApp</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* If page has only 1 item, clean empty slot */}
                {pageItems.length === 1 && (
                  <div className="product-card-row border border-dashed border-slate-200 rounded-2xl bg-slate-50/40 flex items-center justify-center text-xs text-slate-400">
                    TOJ-VITAMIN • Доставка по Таджикистану
                  </div>
                )}
              </div>

              {/* Page Running Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500 h-[8mm]">
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
        <section className="back-cover-page w-full min-h-[281mm] max-h-[281mm] bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-lg flex flex-col justify-between overflow-hidden print:rounded-none print:shadow-none print:border-none">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center">
                <img src="/logo.webp" alt="Logo" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">TOJ-VITAMIN</div>
                <div className="text-xs text-slate-500">ООО «Саховати Истаравшан»</div>
              </div>
            </div>
            <div className="text-right text-xs text-emerald-700 font-bold">
              📞 {data.company.phoneFormatted}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 my-auto">
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-6">
              <div className="flex items-center gap-2.5 text-emerald-900 text-sm font-bold mb-2">
                <MessageCircle size={18} className="text-emerald-600" />
                <span>Заказ нескольких позиций списком в WhatsApp</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed mb-3">
                Для оформления заказа на курс или для всей семьи просто отправьте номера препаратов на номер:
              </p>
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 font-mono text-xs text-emerald-900 font-bold">
                «Здравствуйте! Хочу заказать: #02 (2 шт), #07 (1 шт), #19 (1 шт)»
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2.5 text-slate-900 text-sm font-bold mb-2">
                <Truck size={18} className="text-blue-600" />
                <span>Быстрая доставка по Таджикистану</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span><strong>Душанбе и Худжанд:</strong> экспресс-доставка день-в-день курьером прямо в руки.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span><strong>Регионы РТ:</strong> оперативная отправка до 24 часов в любой город республики.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span><strong>Аптекам и оптовикам:</strong> официальный договор, сертификаты соответствия МЗ РТ и безналичный расчет.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 text-center text-[10px] text-slate-500 leading-relaxed">
            <p>
              Биологически активная добавка к пище (БАД). Не является лекарственным средством. Перед применением рекомендуется проконсультироваться со специалистом.
            </p>
            <p className="mt-1 text-slate-400">
              © {new Date().getFullYear()} TOJ-VITAMIN. Все права защищены.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
