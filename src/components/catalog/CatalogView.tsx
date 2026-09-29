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
  Layers
} from 'lucide-react';
import { CatalogProduct, CatalogDataResult } from '@/lib/catalogData';

interface CatalogViewProps {
  initialData: CatalogDataResult;
}

export default function CatalogView({ initialData }: CatalogViewProps) {
  const [data, setData] = useState<CatalogDataResult>(initialData);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceType, setPriceType] = useState<'retail' | 'wholesale' | 'none'>('retail');
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Handle switching price mode
  const handlePriceTypeChange = async (newType: 'retail' | 'wholesale' | 'none') => {
    if (newType === priceType) return;
    setPriceType(newType);
    setLoadingPrice(true);
    try {
      const res = await fetch(`/api/catalog/data?priceType=${newType}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to change price mode:', e);
    } finally {
      setLoadingPrice(false);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans print:bg-white print:text-black">
      {/* ===================== CONTROL TOOLBAR (HIDDEN IN PRINT) ===================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-sm p-1">
              <Image 
                src="/logo-square.webp" 
                alt="TOJ-VITAMIN" 
                width={40} 
                height={40} 
                className="object-contain" 
                onError={(e) => {
                  // fallback if image fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight tracking-tight flex items-center gap-2">
                TOJ-VITAMIN
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  PDF Каталог
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {data.totalCount} позиций с официальными схемами приема
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
              <span>Сохранить в PDF / Печать</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 border-t border-slate-100 flex flex-wrap items-center gap-3">
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
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
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

      {/* ===================== PRINT STYLES ===================== */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 8mm 8mm 8mm 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #ffffff !important;
          }
          .page-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }
          .card-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />

      {/* ===================== CATALOG CONTAINER ===================== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 print:p-0 print:max-w-none">
        
        {/* ===================== COVER PAGE ===================== */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 sm:p-12 mb-10 shadow-xl border border-slate-700/50 page-break-after print:rounded-none print:shadow-none print:mb-0 print:min-h-[280mm] print:flex print:flex-col print:justify-between">
          <div>
            {/* Top row with Logo and Distributor badge */}
            <div className="flex flex-wrap items-center justify-between gap-6 pb-8 border-b border-slate-700/60">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shadow-lg">
                  <Image 
                    src="/logo.webp" 
                    alt="TOJ-VITAMIN Logo" 
                    width={64} 
                    height={64} 
                    className="object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                    TOJ-VITAMIN
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-400 tracking-wide uppercase">
                    Дистрибьюторский центр здоровья
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-2xl text-emerald-300 text-xs sm:text-sm font-bold">
                <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                <span>Официальный дистрибьютор GLS Pharmaceuticals в РТ</span>
              </div>
            </div>

            {/* Catalog Title Banner */}
            <div className="py-10 sm:py-14 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-semibold mb-4 backdrop-blur-sm">
                <Sparkles size={14} className="text-amber-400" />
                Официальный каталог продукции и схемы приема • 2026
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4 text-balance">
                Премиальные витамины и нутрицевтики с доказанной эффективностью
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
                Более 80 сертифицированных позиций: витамины высокой биодоступности, хелатные минералы, комплексы для иммунитета, энергии, сна и активного долголетия. Прямые поставки с завода, свежие сроки годности и контроль температурного режима.
              </p>
            </div>

            {/* How to Order Guide */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm mb-8">
              <div className="flex gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-500/30">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Как заказать один товар
                  </h4>
                  <p className="text-xs text-slate-300 leading-normal">
                    Нажмите зеленую кнопку <strong className="text-emerald-300">«Заказать в WhatsApp»</strong> под любым выбранным товаром — откроется диалог с уже заполненным текстом заказа.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-500/30">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Как заказать несколько товаров
                  </h4>
                  <p className="text-xs text-slate-300 leading-normal">
                    Просто отправьте список номеров товаров (например: <strong className="text-blue-300">«Хочу заказать #04, #12 и #25»</strong>) на наш номер в WhatsApp. Консультант рассчитает заказ и оформит доставку!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Bar & Warehouses */}
          <div className="pt-6 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-6 text-xs text-slate-300">
            <div className="flex flex-wrap items-center gap-6">
              <a 
                href={`tel:+${data.company.phone}`}
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone size={14} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Телефон</div>
                  <div className="font-bold text-white text-sm">{data.company.phoneFormatted}</div>
                </div>
              </a>

              <a 
                href={`https://wa.me/${data.company.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <MessageCircle size={14} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">WhatsApp</div>
                  <div className="font-bold text-emerald-400 text-sm">{data.company.whatsappFormatted}</div>
                </div>
              </a>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Building2 size={14} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Склады и доставка</div>
                  <div className="font-bold text-white text-xs">г. Душанбе • г. Худжанд</div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Официальный сайт</span>
              <a 
                href={data.company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-emerald-400 font-bold text-sm underline"
              >
                www.toj-vitamin.tj
              </a>
            </div>
          </div>
        </section>

        {/* ===================== PRODUCTS SECTION ===================== */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6 print:hidden">
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                {selectedCategory === 'all' ? 'Все товары каталога' : selectedCategory}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Показано {filteredProducts.length} из {data.totalCount} наименований
              </p>
            </div>

            <div className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-medium">
              Тип цен: <strong className="text-slate-800 font-bold">
                {priceType === 'retail' ? 'Розничные' : priceType === 'wholesale' ? 'Оптовые (B2B)' : 'Скрыты'}
              </strong>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
            {filteredProducts.map((p) => {
              const catClass = getCategoryColor(p.category);

              return (
                <div
                  key={p.id}
                  className="card-avoid-break bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden print:border-slate-300 print:shadow-none"
                >
                  {/* Top Bar: Category Pill & Fast Order Code */}
                  <div className="p-4 pb-0 flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${catClass} truncate`}>
                      {p.category}
                    </span>

                    <span className="text-xs font-extrabold bg-slate-900 text-white px-2.5 py-0.5 rounded-lg tracking-wider shrink-0 shadow-xs">
                      {p.code}
                    </span>
                  </div>

                  {/* Product Image on soft subtle podium */}
                  <div className="relative h-44 sm:h-48 w-full px-4 pt-3 flex items-center justify-center">
                    <div className="absolute inset-x-8 bottom-3 h-14 bg-radial from-slate-100 to-transparent rounded-full opacity-70 pointer-events-none" />
                    <div className="relative w-full h-full max-h-40 flex items-center justify-center">
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        width={200}
                        height={200}
                        className="object-contain max-h-full drop-shadow-md hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 pt-1 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Product Name */}
                      <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mb-2" title={p.name}>
                        {p.name}
                      </h4>

                      {/* Benefits bullets */}
                      <ul className="space-y-1 mb-3">
                        {p.properties.map((prop, i) => (
                          <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-tight">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                            <span className="line-clamp-1">{prop}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Dosage & Usage Instruction Box */}
                      <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5 mb-3.5 text-slate-800">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 mb-1">
                          <Clock size={13} className="text-emerald-600 shrink-0" />
                          <span>КАК И СКОЛЬКО ПРИНИМАТЬ:</span>
                        </div>
                        
                        <div className="text-[11px] space-y-0.5 font-medium">
                          <p className="text-slate-800 leading-tight">
                            👉 <strong>Прием:</strong> {p.instructions.usage}
                          </p>
                          <p className="text-slate-600 leading-tight flex items-center gap-2">
                            <span>🕒 <strong>Время:</strong> {p.instructions.timing}</span>
                            <span>•</span>
                            <span>📅 <strong>Курс:</strong> {p.instructions.course}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Price & Order Action */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        {priceType !== 'none' ? (
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-none">
                              {priceType === 'wholesale' ? 'Оптовая цена' : 'Цена'}
                            </span>
                            <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                              {p.displayPrice}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-600">
                            По запросу
                          </span>
                        )}
                      </div>

                      <a
                        href={p.waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all shrink-0"
                      >
                        <MessageCircle size={13} />
                        <span>Заказать</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-6">
              <p className="text-slate-500 font-medium text-sm">
                По вашему запросу товаров не найдено. Попробуйте сбросить фильтры.
              </p>
            </div>
          )}
        </section>

        {/* ===================== FOOTER / BACK COVER ===================== */}
        <footer className="card-avoid-break bg-slate-900 text-white rounded-3xl p-8 sm:p-10 border border-slate-800 print:rounded-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800">
            {/* Column 1: Order instructions */}
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold mb-3">
                <MessageCircle size={18} />
                <span>Заказ списком через WhatsApp</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Если вы хотите заказать сразу несколько позиций для всей семьи или для аптеки, отправьте их коды на номер:
              </p>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 font-mono text-xs text-emerald-300">
                «Здравствуйте! Хочу заказать: #02 (2 шт), #07 (1 шт), #19 (1 шт)»
              </div>
            </div>

            {/* Column 2: Logistics */}
            <div>
              <div className="flex items-center gap-2 text-blue-400 text-sm font-bold mb-3">
                <Truck size={18} />
                <span>Условия доставки по Таджикистану</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-blue-400 mt-0.5 shrink-0" />
                  <span><strong>Душанбе и Худжанд:</strong> курьерская доставка день-в-день прямо в руки.</span>
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

            {/* Column 3: Direct Contacts */}
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-sm font-bold mb-3">
                <Building2 size={18} />
                <span>Прямые контакты TOJ-VITAMIN</span>
              </div>
              <div className="space-y-2.5 text-xs text-slate-300">
                <p>
                  <span className="text-slate-400 block text-[11px]">Телефон и WhatsApp:</span>
                  <a href={`tel:+${data.company.phone}`} className="text-white font-bold text-sm hover:underline">
                    {data.company.phoneFormatted}
                  </a>
                </p>
                <p>
                  <span className="text-slate-400 block text-[11px]">Официальный сайт:</span>
                  <a href={data.company.website} target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-bold hover:underline">
                    www.toj-vitamin.tj
                  </a>
                </p>
                <p>
                  <span className="text-slate-400 block text-[11px]">Юр. лицо:</span>
                  <span className="text-slate-300">ООО «Саховати Истаравшан»</span>
                </p>
              </div>
            </div>
          </div>

          {/* Legal Supplement Disclaimer */}
          <div className="pt-6 text-center text-[10px] text-slate-400 leading-normal max-w-4xl mx-auto">
            <p>
              Биологически активная добавка к пище (БАД). Не является лекарственным средством. Перед применением рекомендуется проконсультироваться с врачом или фармацевтом. Противопоказания: индивидуальная непереносимость компонентов, беременность и период лактации (если не указано иное).
            </p>
            <p className="mt-2 text-slate-500">
              © {new Date().getFullYear()} TOJ-VITAMIN. Все права защищены.
            </p>
          </div>
        </footer>

      </main>
    </div>
  );
}
