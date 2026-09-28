"use client";
import React, { useMemo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Dna, Globe, User, ShoppingBag, Building2, Store } from 'lucide-react';
import { useThemeStore } from '@/store/useTheme';
import { ZONE_THEMES } from '@/lib/theme';
import { Lang } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useClient } from '@/store/useClient';
import { useCart } from '@/store/useCart';
import { ClientCabinetModal } from './ClientCabinetModal';
import Image from 'next/image';

interface HeaderProps {
  lang: Lang;
  setLang?: (lang: Lang) => void;
  settings: Record<string, string>;
  isImmersiveMode: boolean;
}

export const Header: React.FC<HeaderProps> = ({ lang, setLang, settings, isImmersiveMode }) => {
  const router = useRouter();
  const activeZone = useThemeStore(state => state.activeZone);
  const search = useThemeStore(state => state.search);
  const setSearch = useThemeStore(state => state.setSearch);
  const isSearchOpen = useThemeStore(state => state.isSearchOpen);
  const setIsSearchOpen = useThemeStore(state => state.setIsSearchOpen);
  const activeBlock = useThemeStore(state => state.activeBlock);
  const setActiveBlock = useThemeStore(state => state.setActiveBlock);
  
  const { client, isAuth } = useClient();
  const { totalItems, setIsOpen: setIsCartOpen } = useCart();
  
  const [isCabinetOpen, setIsCabinetOpen] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentTheme = useMemo(() => ZONE_THEMES[activeZone] || ZONE_THEMES.default, [activeZone]);

  const [lastQuizResult, setLastQuizResult] = React.useState<{ catTitle: string; catId: string } | null>(null);

  const totalCartItems = totalItems();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    setIsMobile(media.matches);
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    const checkLastQuiz = () => {
      try {
        const saved = localStorage.getItem('toj_quiz_last');
        if (saved) {
          setLastQuizResult(JSON.parse(saved));
        }
      } catch {}
    };

    checkLastQuiz();
    window.addEventListener('toj_quiz_completed', checkLastQuiz);
    return () => window.removeEventListener('toj_quiz_completed', checkLastQuiz);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearch('');
  };

  const handleClearSearch = () => {
    setSearch('');
    searchInputRef.current?.focus();
  };

  return (
    <div className={`fixed top-0 left-0 w-full z-[100] flex justify-center px-3 pt-3 sm:px-4 sm:pt-4 pointer-events-none transition-all duration-1000 ${isImmersiveMode ? 'opacity-0 -translate-y-12' : 'opacity-100 translate-y-0'}`}>
      <motion.header
        animate={{
          backgroundColor: isMobile ? currentTheme.bg : currentTheme.glow,
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="pointer-events-auto h-14 md:h-16 w-full max-w-5xl rounded-[28px] md:backdrop-blur-3xl border border-white/20 shadow-[0_15px_40px_rgba(0,0,0,0.05)] flex items-center justify-between px-4 sm:px-6 transition-all duration-700"
      >
        <AnimatePresence mode="wait">
          {isSearchOpen ? (
            /* INLINE SEARCH MODE */
            <motion.div
              key="search-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 sm:gap-3 w-full"
            >
              <Search size={20} className="text-[#1D1D1F]/40 shrink-0" />
              <div className="flex-1 relative flex items-center min-w-0">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={lang === 'en' ? 'Search vitamins (e.g. D3, Omega-3)...' : (lang === 'ru' ? 'Поиск витаминов...' : 'Ҷустуҷӯи витаминҳо...')}
                  className="w-full bg-transparent text-[16px] sm:text-[18px] font-bold text-[#1D1D1F] outline-none font-outfit placeholder:text-[#1D1D1F]/20 pr-8 min-w-0"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-0 w-7 h-7 rounded-full bg-black/[0.07] hover:bg-black/[0.14] text-[#1D1D1F]/60 hover:text-[#1D1D1F] flex items-center justify-center transition-all active:scale-90"
                    title={lang === 'en' ? 'Clear' : (lang === 'ru' ? 'Очистить' : 'Тоза кардан')}
                    aria-label={lang === 'en' ? 'Clear search field' : (lang === 'ru' ? 'Очистить поле' : 'Тоза кардани майдон')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {search && (
                <span className="shrink-0 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider hidden sm:block">
                  {lang === 'en' ? 'Results below ↓' : (lang === 'ru' ? 'Результаты ниже ↓' : 'Натиҷа дар поён ↓')}
                </span>
              )}
              <button
                type="button"
                onClick={handleCloseSearch}
                className="shrink-0 h-9 px-3.5 rounded-full bg-black/[0.06] hover:bg-black hover:text-white text-[#1D1D1F] text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all active:scale-90 font-outfit select-none"
                title={lang === 'en' ? 'Close search' : (lang === 'ru' ? 'Закрыть поиск' : 'Пӯшидани ҷустуҷӯ')}
                aria-label={lang === 'en' ? 'Close search' : (lang === 'ru' ? 'Закрыть поиск' : 'Пӯшидани ҷустуҷӯ')}
              >
                <span>{lang === 'en' ? 'Close' : (lang === 'ru' ? 'Закрыть' : 'Пӯшидан')}</span>
              </button>
            </motion.div>
          ) : (
            /* NORMAL NAVIGATION MODE */
            <motion.div
              key="nav-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between w-full"
            >
               {/* Logo & Brand Section */}
               <div
                 className="flex items-center gap-4 cursor-pointer group shrink-0"
                 onClick={() => {
                    setActiveBlock('catalog');
                    if (typeof window !== 'undefined') {
                      window.history.replaceState(null, '', '#catalog');
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
               >
                  <div className="w-12 h-12 md:w-13 md:h-13 rounded-2xl bg-white shadow-sm border border-black/[0.03] flex items-center justify-center p-0 transition-all group-hover:scale-110 group-active:scale-95 duration-500 overflow-hidden shrink-0">
                    <Image 
                      src="/logo-square.webp" 
                      alt={`${settings.brand_name} Logo`} 
                      width={96} 
                      height={96} 
                      className="w-full h-full object-contain p-0.5" 
                      priority
                    />
                  </div>
                 <div className="flex flex-col gap-0">
                   <span className="text-[18px] md:text-[20px] font-bold tracking-tight text-[#1D1D1F] font-outfit leading-tight">
                     {settings.brand_name}
                   </span>
                    <span className="text-[8px] md:text-[9px] font-bold tracking-[0.2em] text-[#1D1D1F]/30 uppercase leading-tight font-outfit">
                      {lang === 'en' ? 'HEALTH & VITALITY' : (lang === 'ru' ? 'ЗДОРОВЬЕ И ЭНЕРГИЯ' : 'САЛОМАТӢ ВА ҚУВВАТ')}
                    </span>
                 </div>
               </div>

               {/* Main Navigation Links: "О нас" & "Стать партнером" */}
               <div className="hidden lg:flex items-center gap-2">
                 <Link
                   href="/about"
                   className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/80 hover:bg-white text-[#1D1D1F] border border-black/10 text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-sm"
                 >
                   <Building2 size={13} className="text-blue-600" />
                   <span>{lang === 'en' ? 'About Us' : (lang === 'ru' ? 'О нас' : 'Дар бораи мо')}</span>
                 </Link>
                 <Link
                   href="/opt"
                   className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 shadow-sm"
                 >
                   <Store size={13} className="text-emerald-600" />
                   <span>{lang === 'en' ? 'Wholesale B2B' : (lang === 'ru' ? 'Стать партнером' : 'Шарик шудан')}</span>
                 </Link>
               </div>

               {/* KILLER FEATURE CTA: Quiz Link */}
               <button
                 onClick={() => {
                    if (activeBlock === 'synergy') {
                      setActiveBlock('catalog');
                      if (typeof window !== 'undefined') {
                        window.history.replaceState(null, '', '#catalog');
                      }
                    } else {
                      setActiveBlock('synergy');
                      if (typeof window !== 'undefined') {
                        window.history.replaceState(null, '', '#quiz');
                      }
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                 className={`hidden md:flex items-center gap-2 h-10 px-5 rounded-full transition-all text-[11px] font-bold uppercase tracking-[0.15em] shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] group ${
                   lastQuizResult 
                     ? 'bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] text-white shadow-[0_0_15px_rgba(30,64,175,0.3)]' 
                     : 'bg-[#1D1D1F] text-white hover:bg-[#1E40AF]'
                 }`}
               >
                 <Dna size={14} className={(activeBlock === 'synergy' || lastQuizResult) ? 'group-hover:animate-[spin_2s_linear_infinite] transition-transform duration-500' : ''} />
                 <span>
                   {lastQuizResult 
                     ? (lang === 'en'
                         ? `My Stack: ${lastQuizResult.catTitle.length > 18 ? lastQuizResult.catTitle.slice(0, 18) + '...' : lastQuizResult.catTitle}`
                         : (lang === 'ru' 
                           ? `Мой рецепт: ${lastQuizResult.catTitle.length > 18 ? lastQuizResult.catTitle.slice(0, 18) + '...' : lastQuizResult.catTitle}`
                           : `Нусхаи ман: ${lastQuizResult.catTitle.length > 18 ? lastQuizResult.catTitle.slice(0, 18) + '...' : lastQuizResult.catTitle}`))
                     : (activeBlock === 'synergy' ? (lang === 'en' ? '💊 To Catalog' : (lang === 'ru' ? '💊 В каталог' : '💊 Ба каталог')) : (lang === 'en' ? 'Find My Vitamins' : (lang === 'tj' ? 'Витаминҳои маро интихоб кунед' : (settings.hero_cta_text || 'Подобрать мои витамины'))))
                   }
                 </span>
               </button>

              {/* Action Area */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-white/75 hover:bg-white/85 transition-all text-[#1D1D1F] border border-white/50 md:backdrop-blur-sm group active:scale-90"
                >
                  <Search size={18} className="group-hover:scale-110 transition-transform" />
                </button>

                <div className="flex items-center p-0.5 rounded-full bg-white/75 border border-white/50 md:backdrop-blur-sm">
                  {(['ru', 'tj', 'en'] as Lang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang && setLang(l)}
                      className={`h-7 px-2 rounded-full text-[10px] font-bold uppercase transition-all ${
                        lang === l 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'text-[#1D1D1F]/70 hover:text-[#1D1D1F]'
                      }`}
                      aria-label={`Switch language to ${l.toUpperCase()}`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Profile Cabinet Button */}
                <button
                  onClick={() => setIsCabinetOpen(true)}
                  className="h-10 px-3 flex items-center justify-center rounded-full bg-white/75 hover:bg-white/85 transition-all text-[#1D1D1F] border border-white/50 md:backdrop-blur-sm gap-1.5 active:scale-90"
                >
                  <User size={15} className="text-[#86868B]" />
                  {isAuth && client ? (
                    <span className="text-[10px] font-bold max-w-[80px] truncate hidden sm:inline">{client.name}</span>
                  ) : (
                    <span className="text-[10px] font-bold hidden sm:inline">{lang === 'en' ? 'Log in' : (lang === 'ru' ? 'Войти' : 'Ворид')}</span>
                  )}
                </button>

                {/* Shopping Cart Button */}
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="h-10 w-10 hidden md:flex items-center justify-center rounded-full bg-white/75 hover:bg-white/85 transition-all text-[#1D1D1F] border border-white/50 md:backdrop-blur-sm active:scale-90 relative"
                  aria-label={lang === 'en' ? 'Cart' : (lang === 'ru' ? 'Корзина' : 'Сабад')}
                >
                  <ShoppingBag size={17} />
                  {totalCartItems > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-[9px] font-bold text-white flex items-center justify-center">
                      {totalCartItems}
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Client Cabinet Modal */}
      <ClientCabinetModal
        isOpen={isCabinetOpen}
        onClose={() => setIsCabinetOpen(false)}
        lang={lang}
      />
    </div>
  );
};

