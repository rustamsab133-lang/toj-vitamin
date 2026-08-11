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
    bg: 'from-slate-50 via-white to-slate-100/90',
    border: 'border-slate-200/80',
    shadow: 'shadow-[0_25px_60px_-15px_rgba(15,23,42,0.06)]',
    text: 'text-slate-900',
    subtitle: 'text-indigo-600',
    desc: 'text-slate-500',
    badge: 'bg-indigo-50/80 text-indigo-600 border border-indigo-100/50',
    button: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20 hover:shadow-indigo-600/30',
    glow: 'rgba(99,102,241,0.05)',
  },
  'mystic-dark': {
    bg: 'from-[#0B0F19] via-[#111827] to-[#1F2937]',
    border: 'border-amber-500/20',
    shadow: 'shadow-[0_25px_60px_-15px_rgba(245,158,11,0.15)]',
    text: 'text-slate-100',
    subtitle: 'text-amber-400',
    desc: 'text-slate-400',
    badge: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
    button: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20 hover:shadow-amber-500/30 font-extrabold',
    glow: 'rgba(245,158,11,0.06)',
  },
  'emerald-green': {
    bg: 'from-[#064E3B] via-[#022C22] to-[#047857]',
    border: 'border-emerald-500/20',
    shadow: 'shadow-[0_25px_60px_-15px_rgba(16,185,129,0.12)]',
    text: 'text-[#ECFDF5]',
    subtitle: 'text-emerald-300',
    desc: 'text-emerald-100/70',
    badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
    button: 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300 shadow-emerald-400/20 hover:shadow-emerald-400/30 font-bold',
    glow: 'rgba(52,211,153,0.04)',
  },
  'sunset-orange': {
    bg: 'from-[#FFF7ED] via-[#FFEDD5] to-[#FED7AA]',
    border: 'border-orange-300/40',
    shadow: 'shadow-[0_25px_60px_-15px_rgba(249,115,22,0.12)]',
    text: 'text-orange-950',
    subtitle: 'text-orange-600',
    desc: 'text-orange-900/70',
    badge: 'bg-orange-100/80 text-orange-600 border border-orange-200/50',
    button: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-orange-500/20 hover:shadow-orange-500/30 font-bold',
    glow: 'rgba(249,115,22,0.04)',
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
            className={`relative rounded-[28px] md:rounded-[36px] bg-gradient-to-br ${currentTheme.bg} border ${currentTheme.border} ${currentTheme.shadow} overflow-hidden select-none cursor-grab active:cursor-grabbing hover:translate-y-[-2px] transition-transform duration-300`}
          >
            {/* Ambient Background Glow */}
            <div 
              className="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-500" 
              style={{ background: currentTheme.glow || 'rgba(99,102,241,0.05)' }} 
            />

            {/* Subtle glow & texture */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.45)_0%,_transparent_100%)] rounded-[28px] md:rounded-[36px] pointer-events-none opacity-80" />

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

              {/* RIGHT: Floating Overlapping Product Images (Aligned & Grounded) */}
              <div className="w-full md:w-[40%] relative flex justify-center items-end md:absolute md:right-6 md:bottom-6 md:top-auto md:translate-y-0 z-10 md:h-[190px]">
                {currentProducts.length === 0 ? (
                  <span className={`text-[12px] font-semibold italic ${currentTheme.desc} pb-10`}>Загрузка продуктов...</span>
                ) : (
                  <div className="relative flex items-end justify-center px-4 pt-4 pb-2 w-full">
                    {/* Shadow pedestal to ground the products */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[85%] h-2.5 bg-black/15 blur-[6px] rounded-full pointer-events-none" />

                    <div className="relative flex items-end justify-center -space-x-4 sm:-space-x-6 md:-space-x-8">
                      {currentProducts.map((p, pIdx) => {
                        const isEven = pIdx % 2 === 0;
                        return (
                          <motion.div
                            key={p.id}
                            whileHover={{ 
                              scale: 1.14, 
                              y: -10, 
                              rotate: isEven ? -2 : 2,
                              zIndex: 50 
                            }}
                            transition={{ type: "spring", stiffness: 350, damping: 18 }}
                            className="relative drop-shadow-[0_15px_30px_rgba(0,0,0,0.25)] transition-all duration-300 shrink-0"
                            style={{ zIndex: pIdx + 10 }}
                          >
                            <img
                              src={p.image_url || '/placeholder.jpg'}
                              alt={p.name}
                              className="w-[90px] h-[115px] sm:w-[110px] sm:h-[135px] md:w-[145px] md:h-[175px] object-contain select-none"
                            />
                          </motion.div>
                        );
                      })}
                    </div>
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
