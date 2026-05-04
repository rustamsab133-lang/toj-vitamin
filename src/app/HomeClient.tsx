"use client";
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { StoreHero } from '@/components/StoreHero';
import { QuizEngine } from '@/components/QuizEngine';
import { ProductCatalog } from '@/components/ProductCatalog';
import { ScienceGrid } from '@/components/ScienceGrid';
import { CartDrawer } from '@/components/CartDrawer';
import { useCart } from '@/store/useCart';
import { useThemeStore } from '@/store/useTheme';
import { Lang } from '@/lib/types';
import { Globe, ShoppingBag, Search, X, Dna, Instagram, MessageCircle, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SplashScreen } from '@/components/SplashScreen';
import Link from 'next/link';
import { OrderSuccessOverlay } from '@/components/OrderSuccessOverlay';
import { useRouter } from 'next/navigation';
import { ZONE_THEMES } from '@/lib/theme';

import { ComboBanner } from '@/components/ComboBanner';
import { MainBackground } from '@/components/MainBackground';
import { Header } from '@/components/Header';
import { SearchOverlay } from '@/components/SearchOverlay';


interface HomeClientProps {
  initialSettings: Record<string, string>;
}

export default function HomeClient({ initialSettings }: HomeClientProps) {
  const router = useRouter();
  const [lang, setLang] = React.useState<Lang>('ru');
  const [isSplashVisible, setIsSplashVisible] = React.useState(true);
  const { totalItems, setIsOpen, isOpen, totalAmount, cartAnimationKey } = useCart();
  const search = useThemeStore(state => state.search);
  const setSearch = useThemeStore(state => state.setSearch);
  const isSearchOpen = useThemeStore(state => state.isSearchOpen);
  const setIsSearchOpen = useThemeStore(state => state.setIsSearchOpen);
  const [isQuizPassed, setIsQuizPassed] = useState(false);
  
  // Use settings from server, but allow local override if needed
  const [settings] = useState<Record<string, string>>({
    brand_name: "TOJ-VITAMIN",
    whatsapp_phone: "992176660707",
    hero_badge_text: lang === 'ru' ? 'Ваш эксперт по витаминам' : 'Роҳнамои шумо дар олами витаминҳо',
    hero_cta_text: lang === 'ru' ? 'Подобрать мои витамины' : 'Витаминҳои маро интихоб кунед',
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
    
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 2000);

    const quizObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        setIsQuizPassed(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      });
    }, { threshold: 0 });

    const quizEl = document.getElementById('quiz');
    if (quizEl) quizObserver.observe(quizEl);

    // URL search param handling (runs once on mount)
    const params = new URLSearchParams(window.location.search);
    const urlSearch = params.get('search');
    if (urlSearch) {
      setSearch(urlSearch);
      setIsSearchOpen(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    return () => {
      clearTimeout(timer);
      quizObserver.disconnect();
    };
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
        setIsSearchOpen(false);
        setSearch('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen, setSearch]);

  // Global Product Loading — single source of truth
  const setAllProducts = useCart(state => state.setAllProducts);
  useEffect(() => {
    let cancelled = false;
    async function loadGlobalProducts() {
      try {
        // Use static import for enrichment data (already in bundle via ProductCatalog)
        const enrichedData = (await import('@/data/enriched_gls_products.json')).default;
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('id');
        
        if (!error && data && !cancelled) {
          const enrichedMap = enrichedData as Record<string, any>;
          const enriched = data.map(p => ({
            ...p,
            ...(enrichedMap[p.id] || {})
          }));
          setAllProducts(enriched);
        }
      } catch (e) {
        console.error('Failed to load products globally', e);
      }
    }
    loadGlobalProducts();
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

      <AnimatePresence>
        {isSplashVisible && <SplashScreen />}
      </AnimatePresence>

      <CartDrawer 
        lang={lang} 
        whatsappNumber={settings.whatsapp_phone} 
        onOrderSuccess={() => setIsOrderSuccess(true)}
      />

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
 
      {/* FLOATING QUIZ REMINDER (appears when user scrolled past quiz section) */}
      <AnimatePresence>
        {isQuizPassed && !isOpen && !isSearchOpen && !isImmersiveMode && (
          <motion.button
            initial={{ scale: 0, x: -100 }}
            animate={{
              scale: 1,
              x: 0,
              y: isMounted && totalItems() > 0 ? (typeof window !== 'undefined' && window.innerWidth < 640 ? -76 : 0) : 0
            }}
            exit={{ scale: 0, x: -100 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })}
            className="fixed bottom-6 left-6 z-[90] flex items-center gap-3 pl-4 pr-5 py-3 bg-[#1D1D1F] text-white rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-white/10 transition-transform duration-500"
          >
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <Dna size={16} />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-0.5">{lang === 'ru' ? 'Умный подбор' : 'Интихоби зиракона'}</span>
              <span className="font-outfit font-bold text-[13px]">{lang === 'ru' ? 'Пройти диагностику' : 'Ташхисро гузаред'}</span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
 
      {/* FLOATING CART SUMMARY */}
      {/* Floating Cart Summary removed as per user request */}

 
      <div className="relative z-10 flex flex-col pt-16">
        <StoreHero lang={lang} whatsappNumber={settings.whatsapp_phone} settings={settings} />
        <ComboBanner 
          lang={lang} 
          whatsappNumber={settings.whatsapp_phone} 
          onOrderSuccess={() => setIsOrderSuccess(true)}
        />
        <ScienceGrid lang={lang} />
 
        <div id="quiz" className={`${isImmersiveMode ? 'min-h-[90vh] flex items-center pt-0' : 'pb-24 pt-10'}`}>
          <QuizEngine 
            whatsappNumber={settings.whatsapp_phone} 
            lang={lang} 
            onImmersiveChange={setIsImmersiveMode} 
          />
        </div>

        {/* CATALOG CONTENT */}
        <AnimatePresence mode="wait">
          {!isImmersiveMode && (
            <motion.div
              key="catalog-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <ProductCatalog lang={lang} whatsappNumber={settings.whatsapp_phone} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="w-full bg-[#1D1D1F] text-white/60 relative z-20">
          <div className="max-w-5xl mx-auto px-8 py-20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-16">
              {/* Brand */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-0 overflow-hidden shadow-sm">
                    <img src="/logo.webp" alt={settings.brand_name} className="w-full h-full object-contain scale-[3.0]" />
                  </div>
                  <span className="font-bold text-[16px] text-white font-outfit tracking-[0.1em] uppercase">{settings.brand_name}</span>
                </div>
                <p className="text-[14px] leading-relaxed">
                  {lang === 'ru'
                    ? 'Официальный интернет-магазин качественных витаминов и инновационных решений для здоровья.'
                    : 'Мағозаи расмии интернетии витаминҳои босифат ва қарорҳои инноватсионӣ барои саломатӣ.'}
                </p>
              </div>
 
              {/* Contact */}
              <div className="space-y-6">
                <h4 className="text-[12px] font-bold text-white uppercase tracking-[0.2em] font-outfit opacity-50">
                  {lang === 'ru' ? 'Контакты и соцсети' : 'Тамос ва шабакаҳо'}
                </h4>
 
                <div className="flex flex-col gap-3">
                  {/* WhatsApp Card */}
                  <a
                    href={`https://wa.me/${settings.whatsapp_phone}`}
                    className="group relative flex items-center justify-between p-4 rounded-2xl bg-[#25D366]/5 border border-[#25D366]/10 hover:bg-[#25D366] transition-all duration-500 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-lg group-hover:bg-white group-hover:text-[#25D366] transition-colors">
                        <MessageCircle size={20} fill="currentColor" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-white group-hover:text-white transition-colors">WhatsApp</span>
                        <span className="text-[11px] text-[#25D366] font-bold group-hover:text-white/80">+{settings.whatsapp_phone}</span>
                      </div>
                    </div>
                    <ArrowUpRight size={18} className="text-[#25D366] group-hover:text-white transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 underline-none" />
                  </a>
 
                  {/* Instagram Card */}
                  <a
                    href="https://www.instagram.com/toj_vitamin?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                    target="_blank"
                    className="group relative flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-transparent transition-all duration-500 overflow-hidden"
                  >
                    {/* Brand Gradient Overlay */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_bottom_left,_#f9ce34_0%,_#ee2a7b_50%,_#6228d7_100%)]" />
 
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white flex items-center justify-center shadow-lg group-hover:bg-white group-hover:from-white group-hover:to-white group-hover:text-[#ee2a7b] transition-all duration-500">
                        <Instagram size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-white transition-colors">Instagram</span>
                        <span className="text-[11px] text-white/50 font-bold group-hover:text-white/80">@toj_vitamin</span>
                      </div>
                    </div>
                    <ArrowUpRight size={18} className="text-white/30 group-hover:text-white transition-all group-hover:translate-x-1 group-hover:-translate-y-1 relative z-10" />
                  </a>
 
                </div>
              </div>
 
              {/* Links */}
              <div className="space-y-4">
                <h4 className="text-[12px] font-bold text-white uppercase tracking-[0.2em] font-outfit">{lang === 'ru' ? 'Навигация' : 'Навигатсия'}</h4>
                <div className="space-y-3">
                  <button onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })} className="block text-[14px] hover:text-white transition-colors text-left">
                    {lang === 'ru' ? '🧬 Персональный подбор' : '🧬 Интихоби инфиродӣ'}
                  </button>
                  <button onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })} className="block text-[14px] hover:text-white transition-colors text-left">
                    {lang === 'ru' ? '💊 Каталог витаминов' : '💊 Каталоги витаминҳо'}
                  </button>
                  <Link href="/journal" className="block text-[14px] hover:text-white transition-colors text-left">
                    {lang === 'ru' ? '🧪 Научный журнал (SEO)' : '🧪 Журнали илмӣ'}
                  </Link>
                </div>
              </div>
            </div>
 
            {/* Brand Aliases for SEO / Склейка бренда */}
            <div className="border-t border-white/5 pt-8 pb-4">
               <p className="text-[9px] text-white/10 text-center leading-relaxed">
                 {lang === 'ru' ? 'Поиск бренда:' : 'Ҷустуҷӯи бренд:'} tojvitamin, тожвитамин, тож-витамин, тоджвитамин, точвитамин, точ-витамин, тачвитамин, таджвитамин, тадж-витамин, тодж-витамин, taj-vitamin, tajvitamin, vitamin tj, vitamin.tj, витамин тч
               </p>
            </div>

            <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
               <p className="text-[12px] text-white/30">
                 © {new Date().getFullYear()} {settings.brand_name}. {lang === 'ru' ? 'Все права защищены.' : 'Ҳамаи ҳуқуқҳо ҳифз шудаанд.'}
               </p>
               <p className="text-[11px] text-white/20 max-w-md text-center sm:text-right">
                 {lang === 'ru'
                   ? 'Продукция не является лекарственным средством. Перед применением проконсультируйтесь с врачом.'
                   : 'Маҳсулот доруворӣ нест. Пеш аз истифода бо духтур маслиҳат намоед.'}
               </p>
            </div>
          </div>
        </footer>
  
      <SearchOverlay lang={lang} whatsappNumber={settings.whatsapp_phone} />
    </main>
  );
}
