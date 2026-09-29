"use client";
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ProductCatalog } from '@/components/ProductCatalog';
import { ScienceGrid } from '@/components/ScienceGrid';
import { useCart } from '@/store/useCart';
import { useThemeStore } from '@/store/useTheme';
import { Lang } from '@/lib/types';
import { Globe, ShoppingBag, Search, X, Instagram, MessageCircle, ArrowUpRight, Building2, Store } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ZONE_THEMES } from '@/lib/theme';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const QuizEngine = dynamic(() => import('@/components/QuizEngine').then(m => m.QuizEngine), { ssr: false });
const CartDrawer = dynamic(() => import('@/components/CartDrawer').then(m => m.CartDrawer), { ssr: false });
const OrderSuccessOverlay = dynamic(() => import('@/components/OrderSuccessOverlay').then(m => m.OrderSuccessOverlay), { ssr: false });
const SearchOverlay = dynamic(() => import('@/components/SearchOverlay').then(m => m.SearchOverlay), { ssr: false });
const ChatWidget = dynamic(() => import('@/components/ChatWidget').then(m => m.ChatWidget), { ssr: false });
const QuizOverlay = dynamic(() => import('@/components/QuizOverlay').then(m => m.QuizOverlay), { ssr: false });

import { ComboBanner } from '@/components/ComboBanner';
import { MainBackground } from '@/components/MainBackground';
import { Header } from '@/components/Header';
import { CartToast } from '@/components/CartToast';


interface HomeClientProps {
  initialSettings: Record<string, string>;
}

export default function HomeClient({ initialSettings }: HomeClientProps) {
  const router = useRouter();
  const [lang, setLang] = React.useState<Lang>('ru');

  const totalItemsCount = useCart(state => state.totalItems());
  const setIsOpen = useCart(state => state.setIsOpen);
  const search = useThemeStore(state => state.search);
  const setSearch = useThemeStore(state => state.setSearch);
  const isSearchOpen = useThemeStore(state => state.isSearchOpen);
  const setIsSearchOpen = useThemeStore(state => state.setIsSearchOpen);
  const setIsQuizOpen = useThemeStore(state => state.setIsQuizOpen);

  
  // Use settings from server, but allow local override if needed
  const [settings, setSettings] = useState<Record<string, string>>({
    brand_name: "TOJ-VITAMIN",
    whatsapp_phone: "992176660707",
    hero_badge_text: lang === 'en' ? 'Your Health & Vitamin Expert' : (lang === 'ru' ? 'Ваш эксперт по витаминам' : 'Роҳнамои шумо дар олами витаминҳо'),
    hero_cta_text: lang === 'en' ? 'Find My Vitamins' : (lang === 'ru' ? 'Подобрать мои витамины' : 'Витаминҳои маро интихоб кунед'),
    price_markup_percent: "0",
    price_markup_flat: "0",
    ...initialSettings
  });

  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const isSearchActive = search.trim().length > 0;
  const searchInputRef = useRef<HTMLInputElement>(null);


  // Splash screen timer + quiz scroll observer (stable, runs once)
  useEffect(() => {
    setIsMounted(true);

    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#quiz' || hash === '#synergy') {
        setIsQuizOpen(true);
      } else if (hash === '#combos' || hash === '#combo') {
        setTimeout(() => document.getElementById('combos')?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else if (hash === '#science') {
        setTimeout(() => document.getElementById('science')?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else if (hash === '#catalog') {
        setTimeout(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);


    // URL search param handling (runs once on mount)
    const params = new URLSearchParams(window.location.search);
    const urlSearch = params.get('search');
    if (urlSearch) {
      setSearch(urlSearch);
      setIsSearchOpen(true);
    }

    // Capture UTM and referral parameters
    const utmSource = params.get('utm_source') || params.get('ref');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');

    if (utmSource) {
      sessionStorage.setItem('utm_source', utmSource);
      if (utmMedium) sessionStorage.setItem('utm_medium', utmMedium);
      if (utmCampaign) sessionStorage.setItem('utm_campaign', utmCampaign);

      // Track campaign visit
      import('@/lib/analytics').then(({ trackEvent }) => {
        trackEvent({
          event_name: 'campaign_visit',
          data: {
            utm_source: utmSource,
            utm_medium: utmMedium || 'none',
            utm_campaign: utmCampaign || 'none',
          }
        });
      }).catch(err => console.error("Failed to track campaign visit:", err));
    }

    // Clean URL query parameters to keep it clean
    if (urlSearch || utmSource) {
      const newUrl = window.location.pathname + (urlSearch ? `?search=${encodeURIComponent(urlSearch)}` : '');
      const currentHistoryState = typeof window !== 'undefined' ? window.history.state : null;
      window.history.replaceState({ ...currentHistoryState }, '', newUrl);
    }

    return () => {};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — one-time setup

  // Keyboard shortcuts (separate effect to properly track isSearchOpen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchOpen && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        if (search) {
          setSearch('');
        } else {
          setIsSearchOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen, setSearch, search]);

  // Global Product Loading — single source of truth
  const setAllProducts = useCart(state => state.setAllProducts);
  useEffect(() => {
    let cancelled = false;
    async function loadGlobalProductsAndSettings() {
      try {
        // 1. Fetch fresh settings on client-side to bypass stale ISR cache instantly
        const { data: settingsData } = await supabase
          .from('site_settings')
          .select('key, value');

        if (settingsData && settingsData.length > 0 && !cancelled) {
          const updatedSettings = { ...settings };
          settingsData.forEach(s => {
            updatedSettings[s.key] = s.value;
          });
          setSettings(updatedSettings);
        }

        // 2. Load pre-enriched products from server API
        const res = await fetch('/api/products');
        if (res.ok) {
          const enriched = await res.json();
          if (!cancelled) {
            setAllProducts(enriched);
          }
        }
      } catch (e) {
        console.error('Failed to load products and settings globally', e);
      }
    }
    loadGlobalProductsAndSettings();
    return () => { cancelled = true; };
  }, [setAllProducts]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearch('');
  };

  return (
    <main 
      className="flex-1 flex flex-col relative text-[#1D1D1F] selection:bg-[#1E40AF] selection:text-white font-sans antialiased"
    >
      <MainBackground />



      <CartDrawer 
        lang={lang} 
        onOrderSuccess={() => setIsOrderSuccess(true)}
      />

      <CartToast lang={lang} />

      <OrderSuccessOverlay 
        isVisible={isOrderSuccess} 
        onClose={() => setIsOrderSuccess(false)} 
        lang={lang} 
      />

      <Header 
        lang={lang} 
        setLang={setLang} 
        settings={settings} 
        isImmersiveMode={isImmersiveMode} 
      />
 


 
      <div className="relative z-10 flex flex-col">
        {/* Mobile & Tablet Quick Bar */}
        <div className="flex lg:hidden items-center justify-center gap-2 px-3 pt-20 pb-2 max-w-lg mx-auto w-full">
          <button
            onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-full bg-white/90 text-slate-800 border border-black/10 text-xs font-bold shadow-sm active:scale-95 transition-all text-center"
          >
            <span>💊 {lang === 'en' ? 'Catalog' : (lang === 'ru' ? 'Каталог' : 'Каталог')}</span>
          </button>
          <button
            onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold shadow-sm active:scale-95 transition-all text-center"
          >
            <span>🧬 {lang === 'en' ? 'Synergy' : (lang === 'ru' ? 'Синергия' : 'Синергия')}</span>
          </button>
          <Link
            href="/about"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-full bg-white/90 text-slate-800 border border-black/10 text-xs font-bold shadow-sm active:scale-95 transition-all text-center"
          >
            <Building2 size={12} className="text-blue-600 shrink-0" />
            <span>{lang === 'en' ? 'About' : (lang === 'ru' ? 'О нас' : 'О нас')}</span>
          </Link>
          <Link
            href="/opt"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 active:scale-95 transition-all text-center"
          >
            <Store size={12} className="text-white shrink-0" />
            <span>{lang === 'en' ? 'B2B' : (lang === 'ru' ? 'Опт' : 'Опт')}</span>
          </Link>
        </div>

        {/* 1. COMBO PROMO BANNER */}
        <div id="combos" className="scroll-mt-24">
          <ComboBanner 
            lang={lang} 
            settings={settings}
            onOrderSuccess={() => setIsOrderSuccess(true)}
          />
        </div>

        {/* 2. CATALOG CONTENT */}
        <div id="catalog" className="scroll-mt-24">
          <ProductCatalog lang={lang} />
        </div>

        {/* 3. SYNERGY ASSESSMENT */}
        {/* 3. SYNERGY LAB PROMO CARD */}
        <section id="quiz" className="scroll-mt-24 px-4 py-8 max-w-5xl mx-auto w-full">
          <div className="relative rounded-[40px] bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E40AF] text-white p-8 md:p-14 overflow-hidden shadow-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="relative z-10 space-y-4 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                <span>{lang === 'en' ? 'Synergy Lab 1+1=3' : (lang === 'ru' ? 'Лаборатория синергии 1+1=3' : 'Лабораторияи синергия')}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-outfit leading-tight">
                {lang === 'en' ? 'Personalized Clinical Vitamin Match' : (lang === 'ru' ? 'Персональный подбор синергии витаминов' : 'Интихоби инфиродии витаминҳо')}
              </h2>
              <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                {lang === 'en'
                  ? 'Answer 3 quick questions. Our clinical algorithm calculates exact nutrient synergies that amplify each other in your body.'
                  : (lang === 'ru'
                    ? 'Ответьте на 3 коротких вопроса. Клинический алгоритм рассчитает связки препаратов, которые взаимно усиливают эффект друг друга.'
                    : 'Ба 3 саволи кӯтоҳ ҷавоб диҳед. Алгоритм маҷмӯаи витаминҳоро таҳлил мекунад.')}
              </p>
            </div>
            <div className="relative z-10 shrink-0">
              <button
                type="button"
                onClick={() => setIsQuizOpen(true)}
                className="h-14 px-8 rounded-full bg-white text-[#0F172A] hover:bg-blue-50 text-base font-bold shadow-xl hover:scale-105 active:scale-95 transition-all font-outfit flex items-center gap-3"
              >
                <span>🧬</span>
                <span>{lang === 'en' ? 'Start Assessment' : (lang === 'ru' ? 'Подобрать синергию' : 'Оғози интихоб')}</span>
              </button>
            </div>
            {/* Background ambient glow */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          </div>
        </section>

        {/* 4. SCIENCE GRID */}
        <div id="science" className="scroll-mt-24">
          <ScienceGrid lang={lang} />
        </div>
      </div>

      <footer className="w-full bg-[#FDFBF7] text-[#1D1D1F]/70 border-t border-black/[0.06] relative z-20">
          <div className="max-w-5xl mx-auto px-8 py-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-16">
              {/* Brand */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-0.5 overflow-hidden shadow-xs border border-black/[0.06]">
                    <Image 
                      src="/logo-square.webp" 
                      alt={settings.brand_name} 
                      width={80} 
                      height={80} 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                    <span className="font-bold text-[16px] text-[#1D1D1F] font-outfit tracking-[0.1em] uppercase">{settings.brand_name}</span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[14px] leading-relaxed text-[#1D1D1F]/80">
                      {lang === 'en'
                        ? 'Toj-Vitamin is the specialized nutraceutical division and digital platform of the Sakhovati Istaravshan pharmaceutical holding (established in 2003). Direct supply of certified vitamins and supplements across Tajikistan.'
                        : (lang === 'ru'
                          ? 'Toj-Vitamin — специализированное подразделение и цифровая платформа фармацевтического холдинга ООО «Саховати Истаравшан» (на рынке с 2003 года). Прямые поставки сертифицированных витаминов и нутрицевтиков в Таджикистане.'
                          : 'Toj-Vitamin — бахши тахассусӣ ва платформаи рақамии холдинги фарматсевтии ҶДММ «Саховати Истаравшан» (дар бозор аз соли 2003). Интиқоли мустақими витаминҳо ва иловаҳои сертисификатсияшуда дар Тоҷикистон.')}
                    </p>
                    <div className="text-[12px] text-[#1D1D1F]/60 space-y-1 pt-1 border-t border-black/[0.06]">
                      <p className="font-semibold text-[#1D1D1F]/80">
                        {lang === 'en' ? 'LLC "Sakhovati Istaravshan" / Toj-Vitamin Distribution' : (lang === 'ru' ? 'ООО «Саховати Истаравшан» / LLC "Sakhovati Istaravshan"' : 'ҶДММ «Саховати Истаравшан»')}
                      </p>
                      <p>
                        {lang === 'en' ? 'Headquarters: 63/3 K. Khujandi St., Khujand, Republic of Tajikistan' : (lang === 'ru' ? 'Головной офис: РТ, г. Худжанд, ул. К. Худжанди 63/3' : 'Дафтари асосӣ: ҶТ, ш. Хуҷанд, кӯч. К. Хуҷандӣ 63/3')}
                      </p>
                      <p>
                        {lang === 'en' ? 'Warehouses: Khujand | Dushanbe' : (lang === 'ru' ? 'Склады: г. Худжанд | г. Душанбе' : 'Анборҳо: ш. Хуҷанд | ш. Душанбе')}
                      </p>
                      <p>
                        Email: <a href="mailto:ceo@toj-vitamin.tj" className="text-blue-600 hover:underline">ceo@toj-vitamin.tj</a> | {lang === 'en' ? 'Tel:' : 'Тел:'} <a href="tel:+992176660707" className="text-[#1D1D1F] font-semibold hover:underline">+992 176660707</a>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ecosystem & Partners */}
                <div className="space-y-4">
                  <h4 className="text-[12px] font-bold text-[#1D1D1F] uppercase tracking-[0.2em] font-outfit">
                    {lang === 'en' ? 'Holding Ecosystem' : (lang === 'ru' ? 'Экосистема холдинга' : 'Экосистемаи холдинг')}
                  </h4>
                  <div className="space-y-2.5">
                    <a
                      href="https://sakhovatapteka.tj"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-white border border-black/[0.06] hover:border-black/20 hover:shadow-xs transition-all shadow-xs"
                    >
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-[#1D1D1F]">
                          {lang === 'en' ? 'Sakhovat Pharmacy' : 'Саховат Аптека'}
                        </span>
                        <span className="text-[11px] text-[#1D1D1F]/50">{lang === 'en' ? 'Retail pharmacy chain' : (lang === 'ru' ? 'Розничная аптечная сеть' : 'Шабакаи дорухонаҳои чакана')}</span>
                      </div>
                      <ArrowUpRight size={15} className="text-[#1D1D1F]/40 group-hover:text-blue-600 transition-colors" />
                    </a>
                    <a
                      href="https://aslpharm.tj"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-white border border-black/[0.06] hover:border-black/20 hover:shadow-xs transition-all shadow-xs"
                    >
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-[#1D1D1F]">ASLPHARM</span>
                        <span className="text-[11px] text-[#1D1D1F]/50">{lang === 'en' ? 'Pharmaceutical ecosystem' : (lang === 'ru' ? 'Фармацевтическая экосистема' : 'Экосистемаи фарматсевтӣ')}</span>
                      </div>
                      <ArrowUpRight size={15} className="text-[#1D1D1F]/40 group-hover:text-blue-600 transition-colors" />
                    </a>
                  </div>

                  <h4 className="text-[12px] font-bold text-[#1D1D1F] uppercase tracking-[0.2em] font-outfit pt-2">
                    {lang === 'en' ? 'Contacts' : (lang === 'ru' ? 'Контакты' : 'Тамос')}
                  </h4>
                  <div className="flex flex-col gap-2">
                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/${settings.whatsapp_phone}`}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/25 hover:bg-[#25D366]/20 transition-colors"
                    >
                      <MessageCircle size={16} className="text-[#16a34a]" />
                      <span className="text-[12px] font-semibold text-emerald-950">WhatsApp: +{settings.whatsapp_phone}</span>
                    </a>
                    {/* Instagram */}
                    <a
                      href="https://www.instagram.com/toj_vitamin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-pink-50 border border-pink-200/80 hover:bg-pink-100/80 transition-colors"
                    >
                      <Instagram size={16} className="text-pink-600" />
                      <span className="text-[12px] font-semibold text-pink-950">Instagram: @toj_vitamin</span>
                    </a>
                  </div>
                </div>

                {/* Links */}
                <div className="space-y-4">
                  <h4 className="text-[12px] font-bold text-[#1D1D1F] uppercase tracking-[0.2em] font-outfit">{lang === 'en' ? 'Navigation' : (lang === 'ru' ? 'Навигация' : 'Навигатсия')}</h4>
                  <div className="space-y-2.5">
                    <Link href="/about" className="block text-[14px] text-blue-600 hover:text-blue-700 font-semibold transition-colors text-left">
                      {lang === 'en' ? '🏢 About Company (Sakhovati Istaravshan Holding)' : (lang === 'ru' ? '🏢 О компании (Холдинг «Саховати Истаравшан»)' : '🏢 Дар бораи ширкат (Холдинг)')}
                    </Link>
                    <Link href="/opt" className="block text-[14px] text-emerald-700 hover:text-emerald-800 font-semibold transition-colors text-left">
                      {lang === 'en' ? '🤝 Become a Partner (Wholesale B2B)' : (lang === 'ru' ? '🤝 Стать партнером (Опт B2B)' : '🤝 Шарик шудан (B2B Яклухт)')}
                    </Link>
                    <button onClick={() => setIsQuizOpen(true)} className="block text-[14px] text-[#1D1D1F]/80 hover:text-blue-600 transition-colors text-left">
                      {lang === 'en' ? '🧬 Vitamin Assessment' : (lang === 'ru' ? '🧬 Персональный подбор' : '🧬 Интихоби инфиродӣ')}
                    </button>
                    <button onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })} className="block text-[14px] text-[#1D1D1F]/80 hover:text-blue-600 transition-colors text-left">
                      {lang === 'en' ? '💊 Vitamin Catalog' : (lang === 'ru' ? '💊 Каталог витаминов' : '💊 Каталоги витаминҳо')}
                    </button>
                    <button onClick={() => document.getElementById('combos')?.scrollIntoView({ behavior: 'smooth' })} className="block text-[14px] text-[#1D1D1F]/80 hover:text-blue-600 transition-colors text-left">
                      {lang === 'en' ? '🎁 Ready Sets (Combos)' : (lang === 'ru' ? '🎁 Готовые сеты' : '🎁 Маҷмӯаҳои тайёр')}
                    </button>
                    <button onClick={() => document.getElementById('science')?.scrollIntoView({ behavior: 'smooth' })} className="block text-[14px] text-[#1D1D1F]/80 hover:text-blue-600 transition-colors text-left">
                      {lang === 'en' ? '🔬 Science & Quality' : (lang === 'ru' ? '🔬 Наука и стандарты' : '🔬 Илм ва стандартҳо')}
                    </button>
                    <Link href="/journal" className="block text-[14px] text-[#1D1D1F]/80 hover:text-blue-600 transition-colors text-left">
                      {lang === 'en' ? '🧪 Science Journal' : (lang === 'ru' ? '🧪 Научный журнал' : '🧪 Журнали илмӣ')}
                    </Link>
                  </div>
                </div>
              </div>

              <div className="border-t border-black/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <p className="text-[12px] text-[#1D1D1F]/50">
                   © {new Date().getFullYear()} {settings.brand_name} / ООО «Саховати Истаравшан» (2003–{new Date().getFullYear()}). {lang === 'en' ? 'All rights reserved.' : (lang === 'ru' ? 'Все права защищены.' : 'Ҳамаи ҳуқуқҳо ҳифз шудаанд.')}
                 </p>
                 <p className="text-[11px] text-[#1D1D1F]/40 max-w-md text-center sm:text-right">
                   {lang === 'en'
                     ? 'Products are certified dietary supplements, not medicinal drugs. Please consult a healthcare professional before use.'
                     : (lang === 'ru'
                       ? 'Продукция сертифицирована. Не является лекарственным средством. Перед применением проконсультируйтесь со специалистом.'
                       : 'Маҳсулот сертисификатсия шудааст. Доруворӣ нест. Пеш аз истифода бо мутахассис маслиҳат намоед.')}
                 </p>
              </div>
          </div>
        </footer>
  
      {/* Floating Mobile Cart Button */}
      <AnimatePresence>
        {isMounted && totalItemsCount > 0 && (
          <motion.button
            key="mobile-cart-btn"
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
            onClick={() => setIsOpen(true)}
            className="md:hidden fixed bottom-24 left-6 z-[90] w-14 h-14 rounded-full bg-[#1D1D1F] text-white flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.3)] border border-white/10 active:scale-95 transition-transform"
            aria-label="Open Cart"
            style={{ transform: 'translate3d(0,0,0)' }}
          >
            <ShoppingBag size={22} />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center">
              {totalItemsCount}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <QuizOverlay lang={lang} />
      <SearchOverlay lang={lang} />
      <ChatWidget lang={lang} />
    </main>
  );
}
