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

  // Strict 4 products per physical A4 sheet (2x2 grid)
  const ITEMS_PER_PAGE = 4;
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
                {filteredProducts.length} позиций • 4 товара на лист (каталог со схемами приема)
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
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .catalog-page-container {
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }
          .cover-page,
          .back-cover-page {
            width: 100% !important;
            height: 250mm !important;
            max-height: 255mm !important;
            margin: 0 auto !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
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
          .catalog-page {
            width: 100% !important;
            height: 250mm !important;
            max-height: 252mm !important;
            min-height: 245mm !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
            box-shadow: none !important;
            border: none !important;
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
          .cards-grid-4 {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: repeat(2, 114mm) !important;
            gap: 2.5mm !important;
            margin: 1.5mm 0 0 0 !important;
            flex: 1 !important;
            height: 232mm !important;
            max-height: 232mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .product-card-2x2 {
            height: 114mm !important;
            max-height: 114mm !important;
            min-height: 114mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 2mm 2.5mm !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 6px !important;
          }
          .card-content-top {
            display: flex !important;
            flex-direction: column !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .product-card-footer {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding-top: 1.5mm !important;
            margin-top: auto !important;
            border-top: 1px solid #f1f5f9 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
            height: 8mm !important;
          }
          .product-card-footer a {
            padding: 1.5mm 3.5mm !important;
            font-size: 9.5px !important;
          }
          .product-photo-box {
            height: 26mm !important;
            max-height: 26mm !important;
            margin-bottom: 1mm !important;
          }
          .product-photo-box img {
            max-height: 24mm !important;
            max-width: 100% !important;
            object-fit: contain !important;
          }
          .dosage-box {
            padding: 1.5mm 2mm !important;
            margin-bottom: 1mm !important;
          }
        }
      `}} />

      {/* ===================== CATALOG CONTAINER ===================== */}
      <div className="catalog-page-container max-w-4xl mx-auto px-3 sm:px-4 py-6 print:p-0 print:max-w-none">

        {/* ===================== PAGE 1: COVER (CLEAN LUXURY LIGHT) ===================== */}
        <section className="cover-page w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-lg flex flex-col justify-between mb-8 overflow-hidden print:rounded-none print:shadow-none print:border-none print:mb-0">
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

        {/* ===================== PAGES 2..N: 4 PRODUCTS PER PAGE (2x2 GRID) ===================== */}
        {productPages.map((pageItems, pageIdx) => {
          const pageNum = pageIdx + 2;
          const pageCat = pageItems[0]?.category || 'Витамины и минералы';

          return (
            <div 
              key={`page-${pageIdx}`}
              className="catalog-page w-full bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col justify-between mb-8 overflow-hidden print:rounded-none print:shadow-none print:border-none print:mb-0"
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

              {/* 4 Cards Container (2x2 Grid) */}
              <div className="cards-grid-4 grid grid-cols-2 gap-2.5 sm:gap-3 flex-1 my-2">
                {pageItems.map((p) => {
                  const catClass = getCategoryColor(p.category);

                  return (
                    <div 
                      key={p.id}
                      className="product-card-2x2 bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="card-content-top">
                        {/* Category Badge & Fast Code */}
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${catClass} truncate max-w-[120px]`}>
                            {p.category}
                          </span>
                          <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded tracking-wider shrink-0">
                            {p.code}
                          </span>
                        </div>

                        {/* Product Image: Centered, prominent photo without wasted margins */}
                        <div className="product-photo-box w-full h-28 sm:h-32 flex items-center justify-center bg-slate-50/80 rounded-xl p-1.5 mb-1 relative shrink-0">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            loading="eager"
                            decoding="sync"
                            className="max-h-full max-w-full object-contain drop-shadow-sm"
                          />
                        </div>

                        {/* Product Name */}
                        <h3 className="text-xs sm:text-[13px] font-extrabold text-slate-900 leading-snug line-clamp-2 mb-1" title={p.name}>
                          {p.name}
                        </h3>

                        {/* Key benefits (2 bullet points) */}
                        <ul className="space-y-0.5 mb-1.5">
                          {p.properties.slice(0, 2).map((prop, i) => (
                            <li key={i} className="text-[10px] text-slate-600 flex items-start gap-1 leading-tight">
                              <span className="text-emerald-500 font-bold shrink-0">•</span>
                              <span className="line-clamp-1">{prop}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Dosage & Usage Instruction Box - Full text without clipping */}
                        <div className="dosage-box bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-2 mb-1.5 text-slate-900">
                          <div className="flex items-center gap-1 text-[9.5px] font-extrabold text-emerald-950 mb-1 tracking-wider uppercase">
                            <Clock size={12} className="text-emerald-600 shrink-0" />
                            <span>Как и сколько принимать:</span>
                          </div>
                          
                          <div className="text-[10px] sm:text-[10.5px] space-y-1 font-medium leading-snug">
                            <p className="text-slate-800 line-clamp-2">
                              👉 <strong>Схема:</strong> {p.instructions.usage}
                            </p>
                            <div className="text-[9.5px] text-emerald-900 flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 border-t border-emerald-200/60 font-semibold">
                              <span>🕒 <strong>Время:</strong> {p.instructions.timing}</span>
                              <span>&bull;</span>
                              <span>📅 <strong>Курс:</strong> {p.instructions.course}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Price & Order Action */}
                      <div className="product-card-footer pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 mt-auto">
                        <div>
                          <span className="text-[8px] text-slate-400 uppercase font-semibold block leading-none">
                            Цена
                          </span>
                          <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                            {p.retailPrice} смн
                          </span>
                        </div>

                        <a
                          href={p.waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition-all shrink-0"
                        >
                          <MessageCircle size={13} />
                          <span>Заказать</span>
                        </a>
                      </div>
                    </div>
                  );
                })}

                {/* If page has fewer than 4 items, elegant placeholder slots */}
                {pageItems.length < 4 && Array.from({ length: 4 - pageItems.length }).map((_, idx) => (
                  <div 
                    key={`placeholder-${idx}`}
                    className="border border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 text-slate-400"
                  >
                    <ShieldCheck size={26} className="text-emerald-500/60 mb-2" />
                    <span className="text-xs font-bold text-slate-700">TOJ-VITAMIN</span>
                    <span className="text-[10px] text-slate-500 max-w-[150px] mt-1">
                      Официальный дистрибьютор GLS Pharmaceuticals
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* ===================== LAST PAGE: BACK COVER ===================== */}
        <section className="back-cover-page w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-lg flex flex-col justify-between overflow-hidden print:rounded-none print:shadow-none print:border-none">
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
