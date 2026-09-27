"use client";
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ProductCatalog } from '@/components/ProductCatalog';
import { ScienceGrid } from '@/components/ScienceGrid';
import { useCart } from '@/store/useCart';
import { useThemeStore } from '@/store/useTheme';
import { Lang } from '@/lib/types';
import { Globe, ShoppingBag, Search, X, Instagram, MessageCircle, ArrowUpRight } from 'lucide-react';
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

  
  // Use settings from server, but allow local override if needed
  const [settings, setSettings] = useState<Record<string, string>>({
    brand_name: "TOJ-VITAMIN",
    whatsapp_phone: "992176660707",
    hero_badge_text: lang === 'ru' ? 'Ваш эксперт по витаминам' : 'Роҳнамои шумо дар олами витаминҳо',
    hero_cta_text: lang === 'ru' ? 'Подобрать мои витамины' : 'Витаминҳои маро интихоб кунед',
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
        <ComboBanner 
          lang={lang} 
          settings={settings}
          onOrderSuccess={() => setIsOrderSuccess(true)}
        />

        {/* CATALOG CONTENT */}
        <div id="catalog">
          <ProductCatalog lang={lang} />
        </div>

        <div id="quiz" className={`${isImmersiveMode ? 'min-h-[90vh] flex items-center pt-0' : 'pb-24 pt-10'}`}>
          <QuizEngine 
            lang={lang} 
            onImmersiveChange={setIsImmersiveMode} 
          />
        </div>

        <ScienceGrid lang={lang} />
      </div>

      <footer className="w-full bg-[#1D1D1F] text-white/60 relative z-20">
          <div className="max-w-5xl mx-auto px-8 py-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-16">
              {/* Brand */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-0 overflow-hidden shadow-sm">
                    <Image 
                    src="/logo.webp" 
                    alt={settings.brand_name} 
                    width={40} 
                    height={40} 
                    className="w-full h-full object-contain scale-[3.0]" 
                  />
                  </div>
                    <span className="font-bold text-[16px] text-white font-outfit tracking-[0.1em] uppercase">{settings.brand_name}</span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[14px] leading-relaxed text-white/90">
                      {lang === 'ru'
                        ? 'Toj-Vitamin — специализированное подразделение и цифровая платформа фармацевтического холдинга ООО «Саховати Истаравшан» (на рынке с 2003 года). Прямые поставки сертифицированных витаминов и нутрицевтиков в Таджикистане.'
                        : 'Toj-Vitamin — бахши тахассусӣ ва платформаи рақамии холдинги фарматсевтии ҶДММ «Саховати Истаравшан» (дар бозор аз соли 2003). Интиқоли мустақими витаминҳо ва иловаҳои сертисификатсияшуда дар Тоҷикистон.'}
                    </p>
                    <div className="text-[12px] text-white/60 space-y-1 pt-1 border-t border-white/10">
                      <p className="font-semibold text-white/80">
                        {lang === 'ru' ? 'ООО «Саховати Истаравшан» / LLC "Sakhovati Istaravshan"' : 'ҶДММ «Саховати Истаравшан»'}
                      </p>
                      <p>
                        {lang === 'ru' ? 'Головной офис: РТ, г. Худжанд, ул. К. Худжанди 63/3' : 'Дафтари асосӣ: ҶТ, ш. Хуҷанд, кӯч. К. Хуҷандӣ 63/3'}
                      </p>
                      <p>
                        {lang === 'ru' ? 'Склады GDP/GSP: г. Худжанд | г. Душанбе' : 'Анборҳои GDP/GSP: ш. Хуҷанд | ш. Душанбе'}
                      </p>
                      <p>
                        Email: <a href="mailto:ceo@toj-vitamin.tj" className="text-blue-400 hover:underline">ceo@toj-vitamin.tj</a> | Тел: <a href="tel:+992176660707" className="text-white hover:underline">+992 176660707</a>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ecosystem & Partners */}
                <div className="space-y-4">
                  <h4 className="text-[12px] font-bold text-white uppercase tracking-[0.2em] font-outfit opacity-60">
                    {lang === 'ru' ? 'Экосистема холдинга' : 'Экосистемаи холдинг'}
                  </h4>
                  <div className="space-y-2.5">
                    <a
                      href="https://sakhovatapteka.tj"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-white">Саховат Аптека</span>
                        <span className="text-[11px] text-white/40">Розничная аптечная сеть</span>
                      </div>
                      <ArrowUpRight size={15} className="text-white/40 group-hover:text-white transition-colors" />
                    </a>
                    <a
                      href="https://aslpharm.tj"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-white">ASLPHARM</span>
                        <span className="text-[11px] text-white/40">Фармацевтическая экосистема</span>
                      </div>
                      <ArrowUpRight size={15} className="text-white/40 group-hover:text-white transition-colors" />
                    </a>
                  </div>

                  <h4 className="text-[12px] font-bold text-white uppercase tracking-[0.2em] font-outfit opacity-60 pt-2">
                    {lang === 'ru' ? 'Контакты' : 'Тамос'}
                  </h4>
                  <div className="flex flex-col gap-2">
                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/${settings.whatsapp_phone}`}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-colors"
                    >
                      <MessageCircle size={16} className="text-[#25D366]" />
                      <span className="text-[12px] font-semibold text-white">WhatsApp: +{settings.whatsapp_phone}</span>
                    </a>
                    {/* Instagram */}
                    <a
                      href="https://www.instagram.com/toj_vitamin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 transition-colors"
                    >
                      <Instagram size={16} className="text-pink-400" />
                      <span className="text-[12px] font-semibold text-white">Instagram: @toj_vitamin</span>
                    </a>
                  </div>
                </div>

                {/* Links */}
                <div className="space-y-4">
                  <h4 className="text-[12px] font-bold text-white uppercase tracking-[0.2em] font-outfit">{lang === 'ru' ? 'Навигация' : 'Навигатсия'}</h4>
                  <div className="space-y-2.5">
                    <Link href="/about" className="block text-[14px] text-blue-400 hover:text-blue-300 font-semibold transition-colors text-left">
                      {lang === 'ru' ? '🏢 О холдинге и дистрибуции' : '🏢 Дар бораи ширкат ва дистрибутсия'}
                    </Link>
                    <Link href="/opt" className="block text-[14px] hover:text-white transition-colors text-left">
                      {lang === 'ru' ? '💼 B2B / Оптовым партнерам' : '💼 Ба шарикони яклухт (B2B)'}
                    </Link>
                    <button onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })} className="block text-[14px] hover:text-white transition-colors text-left">
                      {lang === 'ru' ? '🧬 Персональный подбор' : '🧬 Интихоби инфиродӣ'}
                    </button>
                    <button onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })} className="block text-[14px] hover:text-white transition-colors text-left">
                      {lang === 'ru' ? '💊 Каталог витаминов' : '💊 Каталоги витаминҳо'}
                    </button>
                    <Link href="/journal" className="block text-[14px] hover:text-white transition-colors text-left">
                      {lang === 'ru' ? '🧪 Научный журнал' : '🧪 Журнали илмӣ'}
                    </Link>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <p className="text-[12px] text-white/40">
                   © {new Date().getFullYear()} {settings.brand_name} / ООО «Саховати Истаравшан» (2003–{new Date().getFullYear()}). {lang === 'ru' ? 'Все права защищены.' : 'Ҳамаи ҳуқуқҳо ҳифз шудаанд.'}
                 </p>
                 <p className="text-[11px] text-white/30 max-w-md text-center sm:text-right">
                   {lang === 'ru'
                     ? 'Продукция сертифицирована. Не является лекарственным средством. Перед применением проконсультируйтесь со специалистом.'
                     : 'Маҳсулот сертисификатсия шудааст. Доруворӣ нест. Пеш аз истифода бо мутахассис маслиҳат намоед.'}
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

      <SearchOverlay lang={lang} />
      <ChatWidget lang={lang} />
    </main>
  );
}
