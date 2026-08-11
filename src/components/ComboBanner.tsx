"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Lang, Product } from '@/lib/types';
import { useCart } from '@/store/useCart';

interface ComboBannerConfig {
  id: string;
  is_active: boolean;
  sort_order: number;
  preset_theme: 'slate' | 'mystic-dark' | 'emerald-green' | 'sunset-orange';
  price: number;
  product_ids: string[];
  badge_ru: string;
  badge_tg: string;
  title_ru: string;
  title_tg: string;
  subtitle_ru: string;
  subtitle_tg: string;
  desc_ru: string;
  desc_tg: string;
}

interface ComboBannerProps {
  lang: Lang;
  settings?: Record<string, string>;
  onOrderSuccess?: () => void;
}

const THEME_PRESETS = {
  'slate': {
    bg: 'from-[#F8FAFC] to-[#F1F5F9]',
    border: 'border-[#2563EB]/10',
    shadow: 'shadow-[0_20px_40px_-15px_rgba(37,99,235,0.08)]',
    text: 'text-[#1D1D1F]',
    subtitle: 'text-[#2563EB]',
    desc: 'text-[#64748B]',
    badge: 'bg-[#2563EB]/10 text-[#2563EB]',
    button: 'bg-[#1D1D1F] text-white hover:bg-[#2563EB] shadow-[#1D1D1F]/20',
  },
  'mystic-dark': {
    bg: 'from-[#0F172A] to-[#1E293B]',
    border: 'border-amber-500/20',
    shadow: 'shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)]',
    text: 'text-[#F8FAFC]',
    subtitle: 'text-amber-400',
    desc: 'text-[#94A3B8]',
    badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    button: 'bg-amber-500 text-[#0F172A] hover:bg-amber-600 shadow-amber-500/30 font-bold',
  },
  'emerald-green': {
    bg: 'from-[#F0FDF4] to-[#DCFCE7]',
    border: 'border-emerald-600/10',
    shadow: 'shadow-[0_20px_40px_-15px_rgba(16,185,129,0.1)]',
    text: 'text-[#166534]',
    subtitle: 'text-emerald-700',
    desc: 'text-[#166534]/70',
    badge: 'bg-emerald-600/10 text-emerald-700',
    button: 'bg-emerald-800 text-white hover:bg-emerald-700 shadow-[#166534]/20',
  },
  'sunset-orange': {
    bg: 'from-[#FFF7ED] to-[#FFEDD5]',
    border: 'border-orange-500/10',
    shadow: 'shadow-[0_20px_40px_-15px_rgba(249,115,22,0.1)]',
    text: 'text-[#9A3412]',
    subtitle: 'text-orange-600',
    desc: 'text-[#9A3412]/70',
    badge: 'bg-orange-500/10 text-orange-600',
    button: 'bg-orange-600 text-white hover:bg-orange-700 shadow-orange-600/20',
  }
};

export const ComboBanner: React.FC<ComboBannerProps> = ({ lang, settings, onOrderSuccess }) => {
  const { allProducts, addMultiple, setIsOpen } = useCart();
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. Parse active combos from settings
  const rawBanners = settings?.combo_banners;
  let activeCombos: ComboBannerConfig[] = [];
  if (rawBanners) {
    try {
      activeCombos = JSON.parse(rawBanners).filter((c: any) => c.is_active);
    } catch (e) {
      console.error("Failed to parse combo_banners in ComboBanner", e);
    }
  }

  // 2. Fallback to default PMS combo if empty
  if (activeCombos.length === 0) {
    activeCombos = [{
      id: 'default-pms',
      is_active: true,
      sort_order: 0,
      preset_theme: 'slate',
      price: 254,
      product_ids: [], // empty means find dynamically
      badge_ru: 'Бестселлер GLS',
      badge_tg: 'Бестселлери GLS',
      title_ru: 'Жизнь без ПМС',
      title_tg: 'Ҳаёт бидуни ПМС',
      subtitle_ru: '& Абсолютный Дзен',
      subtitle_tg: '& Дзени Мутлақ',
      desc_ru: 'Восстановите баланс и спокойствие с нашим дуэтом.',
      desc_tg: 'Мувозинат ва оромиро бо дуэти мо барқарор кунед.'
    }];
  }

  const currentCombo = activeCombos[currentIndex] || activeCombos[0];

  // 3. Resolve products for the current active combo
  const getComboProducts = (combo: ComboBannerConfig) => {
    if (combo.id === 'default-pms' || combo.product_ids.length === 0) {
      const magnesium = allProducts.find(p => p.name.toLowerCase().includes('магний') && p.name.toLowerCase().includes('хелат'));
      const inositol = allProducts.find(p => p.name.toLowerCase().includes('инозитол'));
      return [magnesium, inositol].filter((p): p is Product => !!p);
    }
    return combo.product_ids
      .map(id => allProducts.find(p => String(p.id) === String(id)))
      .filter((p): p is Product => !!p);
  };

  const currentProducts = getComboProducts(currentCombo);

  const handleOrder = () => {
    if (currentProducts.length > 0) {
      addMultiple(currentProducts);
      setIsOpen(true);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    if (activeCombos.length <= 1) return;
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      // swipe left -> next slide
      setCurrentIndex((currentIndex + 1) % activeCombos.length);
    } else if (info.offset.x > swipeThreshold) {
      // swipe right -> prev slide
      setCurrentIndex((currentIndex - 1 + activeCombos.length) % activeCombos.length);
    }
  };

  const currentTheme = THEME_PRESETS[currentCombo.preset_theme] || THEME_PRESETS.slate;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-28 md:pt-32 pb-6 relative overflow-visible w-full">
      <div className="relative group overflow-visible">
        {/* CAROUSEL CONTROLS (Only if > 1 combo) */}
        {activeCombos.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((currentIndex - 1 + activeCombos.length) % activeCombos.length)}
              className="absolute left-[-16px] md:left-[-24px] top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 text-slate-800 shadow-md flex items-center justify-center hover:bg-slate-100 hover:scale-105 transition-all active:scale-95 border border-slate-150"
              aria-label="Previous slide"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentIndex((currentIndex + 1) % activeCombos.length)}
              className="absolute right-[-16px] md:right-[-24px] top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/95 text-slate-800 shadow-md flex items-center justify-center hover:bg-slate-100 hover:scale-105 transition-all active:scale-95 border border-slate-150"
              aria-label="Next slide"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentCombo.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            drag={activeCombos.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            className={`relative rounded-[28px] md:rounded-[36px] bg-gradient-to-r ${currentTheme.bg} border ${currentTheme.border} ${currentTheme.shadow} overflow-visible select-none cursor-grab active:cursor-grabbing`}
          >
            {/* Subtle glow & texture */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.4)_0%,_transparent_100%)] rounded-[28px] md:rounded-[36px] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center md:min-h-[170px] p-6 md:p-8 gap-6 md:gap-0">
              {/* LEFT: Content */}
              <div className="w-full md:w-[60%] flex flex-col items-center md:items-start text-center md:text-left gap-3.5 z-20">
                <div className="space-y-2">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-[0.2em] shadow-sm backdrop-blur-sm ${currentTheme.badge}`}>
                    <Sparkles size={11} />
                    <span>{lang === 'ru' ? currentCombo.badge_ru : currentCombo.badge_tg}</span>
                  </div>

                  <h2 className={`text-[22px] md:text-[28px] font-bold leading-[1.1] font-outfit tracking-tight ${currentTheme.text}`}>
                    {lang === 'ru' ? currentCombo.title_ru : currentCombo.title_tg}{' '}
                    <span className={currentTheme.subtitle}>
                      {lang === 'ru' ? currentCombo.subtitle_ru : currentCombo.subtitle_tg}
                    </span>
                  </h2>

                  <p className={`text-[13px] leading-relaxed max-w-sm hidden md:block ${currentTheme.desc}`}>
                    {lang === 'ru' ? currentCombo.desc_ru : currentCombo.desc_tg}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 md:gap-6 w-full pt-1">
                  {/* Price */}
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">Комбо-цена</span>
                    <div className={`flex items-baseline gap-0.5 ${currentTheme.text}`}>
                      <span className="text-[32px] md:text-[36px] font-bold font-outfit tracking-tighter leading-none">
                        {currentCombo.price}
                      </span>
                      <span className="text-[14px] font-bold opacity-60 uppercase">смн</span>
                    </div>
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={handleOrder}
                    disabled={currentProducts.length === 0}
                    className={`w-full sm:w-auto h-12 px-6 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg active:scale-95 group/btn ${currentTheme.button} disabled:opacity-50`}
                  >
                    <ShoppingBag size={18} fill="currentColor" className="group-hover/btn:scale-110 transition-transform" />
                    <span>{lang === 'ru' ? 'Купить комбо' : 'Харидани маҷмӯа'}</span>
                    <ArrowRight size={15} className="opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>

              {/* RIGHT: Floating Overlapping Product Images */}
              <div className="w-full md:w-[40%] relative flex justify-center items-center md:absolute md:right-6 md:top-1/2 md:-translate-y-1/2 z-10 md:h-[220px]">
                {currentProducts.length === 0 ? (
                  <span className={`text-[12px] font-semibold italic ${currentTheme.desc}`}>Загрузка продуктов...</span>
                ) : (
                  <div className="relative flex items-center justify-center gap-1 md:gap-3 px-4">
                    {currentProducts.map((p, pIdx) => {
                      const isEven = pIdx % 2 === 0;
                      // Offset alternating images up/down
                      const translateY = isEven ? '-translate-y-2 md:-translate-y-4' : 'translate-y-2 md:translate-y-4';
                      
                      return (
                        <div
                          key={p.id}
                          className={`relative group/img transition-all duration-500 ${translateY} -ml-4 sm:-ml-6 md:-ml-8 first:ml-0`}
                          style={{ zIndex: pIdx + 10 }}
                        >
                          <motion.img
                            whileHover={{ scale: 1.1, y: isEven ? -8 : 6, zIndex: 60 }}
                            src={p.image_url || '/placeholder.jpg'}
                            alt={p.name}
                            className="w-[85px] h-[105px] sm:w-[100px] sm:h-[125px] md:w-[135px] md:h-[165px] object-contain drop-shadow-xl transition-transform duration-500 rounded-lg"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Indicator dots (Only if > 1 combo) */}
        {activeCombos.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {activeCombos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'w-5 bg-slate-800' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
