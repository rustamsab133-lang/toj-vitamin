"use client";
import React, { useMemo, useEffect, useState, useRef } from 'react';
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



interface HomeClientProps {
  initialSettings: Record<string, string>;
}

export default function HomeClient({ initialSettings }: HomeClientProps) {
  const router = useRouter();
  const [lang, setLang] = React.useState<Lang>('ru');
  const [isSplashVisible, setIsSplashVisible] = React.useState(true);
  const { totalItems, setIsOpen, isOpen, totalAmount, cartAnimationKey } = useCart();
  const { activeZone, search, setSearch, isSearchOpen, setIsSearchOpen } = useThemeStore();
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

  const currentTheme = useMemo(() => ZONE_THEMES[activeZone] || ZONE_THEMES.default, [activeZone]);

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
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      quizObserver.disconnect();
    };
  }, [isSearchOpen, setIsSearchOpen, setSearch, lang]);

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
      style={{ 
        backgroundColor: currentTheme.bg,
        transition: 'background-color 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}
    >

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

      {/* AMBIENT FLOATING HEADER (The Living Island V2) */}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && search.trim()) {
                      router.push(`/search?q=${encodeURIComponent(search.trim())}`);
                    }
                  }}
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
        <AnimatePresence mode="wait">
          {!isImmersiveMode && !isSearchActive && (
            <motion.div
              key="primary-content"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StoreHero lang={lang} whatsappNumber={settings.whatsapp_phone} settings={settings} />
              <ComboBanner 
                lang={lang} 
                whatsappNumber={settings.whatsapp_phone} 
                onOrderSuccess={() => setIsOrderSuccess(true)}
              />
              <ScienceGrid lang={lang} />
            </motion.div>
          )}
        </AnimatePresence>
 
        <AnimatePresence mode="wait">
          <motion.div 
            key="quiz-section"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div id="quiz" className={`${isImmersiveMode ? 'min-h-[90vh] flex items-center pt-0' : 'pb-24 pt-10'}`}>
              <QuizEngine 
                whatsappNumber={settings.whatsapp_phone} 
                lang={lang} 
                onImmersiveChange={setIsImmersiveMode} 
              />
            </div>
          </motion.div>
        </AnimatePresence>
 
        <AnimatePresence mode="wait">
          {!isImmersiveMode && (
            <motion.div
              key="catalog-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
            >
              <ProductCatalog lang={lang} whatsappNumber={settings.whatsapp_phone} />
              
              {/* SITE FOOTER */}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
 
    </main>
  );
}
