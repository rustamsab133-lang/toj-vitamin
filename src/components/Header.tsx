"use client";
import React, { useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Dna, Globe, Instagram, MessageCircle, ArrowUpRight } from 'lucide-react';
import { useThemeStore } from '@/store/useTheme';
import { ZONE_THEMES } from '@/lib/theme';
import { Lang } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  lang: Lang;
  setLang: (lang: Lang) => void;
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
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentTheme = useMemo(() => ZONE_THEMES[activeZone] || ZONE_THEMES.default, [activeZone]);

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
    <div className={`fixed top-0 left-0 w-full z-[100] flex justify-center px-3 pt-3 sm:px-4 sm:pt-4 pointer-events-none transition-all duration-1000 ${isImmersiveMode ? 'opacity-0 -translate-y-12' : 'opacity-100 translate-y-0'}`}>
      <motion.header
        animate={{
          backgroundColor: currentTheme.glow,
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="pointer-events-auto h-14 md:h-16 w-full max-w-5xl rounded-[28px] backdrop-blur-3xl border border-white/20 shadow-[0_15px_40px_rgba(0,0,0,0.05)] flex items-center justify-between px-4 sm:px-6 transition-all duration-700"
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
              className="flex items-center gap-3 w-full"
            >
              <Search size={20} className="text-[#1D1D1F]/40 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={lang === 'ru' ? 'Поиск витаминов...' : 'Ҷустуҷӯи витаминҳо...'}
                className="flex-1 bg-transparent text-[16px] sm:text-[18px] font-bold text-[#1D1D1F] outline-none font-outfit placeholder:text-[#1D1D1F]/20 min-w-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <span className="shrink-0 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider hidden sm:block">
                  {lang === 'ru' ? 'Результаты ниже ↓' : 'Натиҷа дар поён ↓'}
                </span>
              )}
              <button
                onClick={handleCloseSearch}
                className="shrink-0 w-9 h-9 rounded-full bg-black/[0.06] hover:bg-black hover:text-white text-[#1D1D1F] flex items-center justify-center transition-all active:scale-90"
              >
                <X size={16} />
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
                 onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
               >
                  <div className="w-12 h-12 md:w-13 md:h-13 rounded-2xl bg-white shadow-sm border border-black/[0.03] flex items-center justify-center p-0 transition-all group-hover:scale-110 group-active:scale-95 duration-500 overflow-hidden shrink-0">
                    <img src="/logo.webp" alt={`${settings.brand_name} Logo`} className="w-full h-full object-contain scale-[3.4]" />
                  </div>
                 <div className="flex flex-col gap-0">
                   <span className="text-[18px] md:text-[20px] font-bold tracking-tight text-[#1D1D1F] font-outfit leading-tight">
                     {settings.brand_name}
                   </span>
                    <span className="text-[8px] md:text-[9px] font-bold tracking-[0.2em] text-[#1D1D1F]/30 uppercase leading-tight font-outfit">
                      ЗДОРОВЬЕ И ЭНЕРГИЯ
                    </span>
                 </div>
               </div>

              {/* KILLER FEATURE CTA: Quiz Link */}
              <button
                onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })}
                className="hidden md:flex items-center gap-2 h-10 px-5 rounded-full bg-[#1D1D1F] text-white hover:bg-[#1E40AF] transition-all text-[11px] font-bold uppercase tracking-[0.15em] shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.97]"
              >
                <Dna size={14} />
                <span>{settings.hero_cta_text || (lang === 'ru' ? 'Подбор витаминов' : 'Интихоби витамин')}</span>
              </button>

              {/* Action Area */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-white/40 hover:bg-white/80 transition-all text-[#1D1D1F] border border-white/50 backdrop-blur-sm group active:scale-90"
                >
                  <Search size={18} className="group-hover:scale-110 transition-transform" />
                </button>

                <button
                  onClick={() => setLang(lang === 'ru' ? 'tj' : 'ru')}
                  className="flex h-10 px-3 rounded-full bg-white/40 hover:bg-white/60 transition-colors text-[10px] font-bold text-[#1D1D1F] items-center gap-1.5 border border-white/50 backdrop-blur-sm"
                >
                  <Globe size={13} className="text-[#86868B]" />
                  {lang === 'ru' ? 'RU' : 'TJ'}
                </button>

                {/* Cart Icon removed as per user request for direct WhatsApp flow */}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </div>
  );
};
