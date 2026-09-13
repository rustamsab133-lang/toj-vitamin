"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Lang, Product } from '@/lib/types';
import { useCart } from '@/store/useCart';

interface ComboBannerConfig {
  id: string;
  is_active: boolean;
  sort_order: number;
  preset_theme: string;
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

/* ─────────────────────────────────────────────────────────
   Light marketplace-inspired palettes.
   Every theme is intentionally warm, bright & clean — 
   no dark backgrounds, no neon, no heavy shadows.
───────────────────────────────────────────────────────── */
const THEME_PRESETS: Record<string, {
  cardBg: string;
  accentColor: string;
  accentLight: string;
  titleColor: string;
  subtitleColor: string;
  descColor: string;
  badgeBg: string;
  badgeText: string;
  btnBg: string;
  btnText: string;
  btnHover: string;
  priceColor: string;
  dotActive: string;
}> = {
  'slate': {
    cardBg: 'linear-gradient(135deg, #FAFBFF 0%, #F0F4FF 50%, #E8EEFF 100%)',
    accentColor: '#4F6AE8',
    accentLight: '#EEF1FF',
    titleColor: '#1E293B',
    subtitleColor: '#4F6AE8',
    descColor: '#64748B',
    badgeBg: '#EEF1FF',
    badgeText: '#4F6AE8',
    btnBg: '#4F6AE8',
    btnText: '#FFFFFF',
    btnHover: '#4059D0',
    priceColor: '#1E293B',
    dotActive: '#4F6AE8',
  },
  'mystic-dark': {
    cardBg: 'linear-gradient(135deg, #FFFBF5 0%, #FFF3E0 50%, #FFE8CC 100%)',
    accentColor: '#E67E22',
    accentLight: '#FFF3E0',
    titleColor: '#2D1B0E',
    subtitleColor: '#E67E22',
    descColor: '#8D6E4A',
    badgeBg: '#FFF3E0',
    badgeText: '#D35400',
    btnBg: '#E67E22',
    btnText: '#FFFFFF',
    btnHover: '#D35400',
    priceColor: '#2D1B0E',
    dotActive: '#E67E22',
  },
  'emerald-green': {
    cardBg: 'linear-gradient(135deg, #F0FFF4 0%, #E6FFED 50%, #DCFFE4 100%)',
    accentColor: '#16A34A',
    accentLight: '#E6FFED',
    titleColor: '#14532D',
    subtitleColor: '#16A34A',
    descColor: '#4D7C5A',
    badgeBg: '#DCFCE7',
    badgeText: '#15803D',
    btnBg: '#16A34A',
    btnText: '#FFFFFF',
    btnHover: '#15803D',
    priceColor: '#14532D',
    dotActive: '#16A34A',
  },
  'sunset-orange': {
    cardBg: 'linear-gradient(135deg, #FFFAF5 0%, #FFF0E8 50%, #FFE4D6 100%)',
    accentColor: '#EA580C',
    accentLight: '#FFF0E8',
    titleColor: '#431407',
    subtitleColor: '#EA580C',
    descColor: '#9A6849',
    badgeBg: '#FFEDD5',
    badgeText: '#C2410C',
    btnBg: '#EA580C',
    btnText: '#FFFFFF',
    btnHover: '#C2410C',
    priceColor: '#431407',
    dotActive: '#EA580C',
  }
};

export const ComboBanner: React.FC<ComboBannerProps> = ({ lang, settings, onOrderSuccess }) => {
  const { allProducts, addMultiple, triggerAnimation, triggerToast } = useCart();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoveredBtn, setHoveredBtn] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

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

  // Auto-rotate effect (slides every 6 seconds)
  useEffect(() => {
    if (activeCombos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeCombos.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [currentIndex, activeCombos.length]);

  // 2. Fallback to default PMS combo if empty
  if (activeCombos.length === 0) {
    activeCombos = [{
      id: 'default-pms',
      is_active: true,
      sort_order: 0,
      preset_theme: 'slate',
      price: 254,
      product_ids: [],
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
      triggerAnimation();
      triggerToast(currentProducts[0], lang === 'ru' ? 'Набор добавлен в корзину' : 'Маҷмӯа ба сабад илова шуд');
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2500);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    if (activeCombos.length <= 1) return;
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      setCurrentIndex((currentIndex + 1) % activeCombos.length);
    } else if (info.offset.x > swipeThreshold) {
      setCurrentIndex((currentIndex - 1 + activeCombos.length) % activeCombos.length);
    }
  };

  const theme = THEME_PRESETS[currentCombo.preset_theme] || THEME_PRESETS.slate;

  const badge = lang === 'ru' ? currentCombo.badge_ru : currentCombo.badge_tg;
  const title = lang === 'ru' ? currentCombo.title_ru : currentCombo.title_tg;
  const subtitle = lang === 'ru' ? currentCombo.subtitle_ru : currentCombo.subtitle_tg;
  const desc = lang === 'ru' ? currentCombo.desc_ru : currentCombo.desc_tg;
  const btnLabel = lang === 'ru' ? 'В корзину' : 'Ба сабад';

  return (
    <div className="max-w-5xl mx-auto px-4 pt-28 md:pt-32 pb-6 relative overflow-visible w-full">
      <div className="relative group overflow-visible">
        {/* CAROUSEL CONTROLS */}
        {activeCombos.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((currentIndex - 1 + activeCombos.length) % activeCombos.length)}
              className="absolute left-[-14px] md:left-[-20px] top-1/2 -translate-y-1/2 z-30 w-9 h-9 md:w-10 md:h-10 rounded-full bg-white text-slate-700 shadow-lg flex items-center justify-center hover:bg-slate-50 hover:scale-105 transition-all active:scale-95 border border-slate-200"
              aria-label="Previous slide"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrentIndex((currentIndex + 1) % activeCombos.length)}
              className="absolute right-[-14px] md:right-[-20px] top-1/2 -translate-y-1/2 z-30 w-9 h-9 md:w-10 md:h-10 rounded-full bg-white text-slate-700 shadow-lg flex items-center justify-center hover:bg-slate-50 hover:scale-105 transition-all active:scale-95 border border-slate-200"
              aria-label="Next slide"
            >
              <ChevronRight size={18} />
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
            className="relative rounded-2xl md:rounded-3xl overflow-hidden select-none cursor-grab active:cursor-grabbing shadow-[0_8px_40px_-10px_rgba(0,0,0,0.08)] border border-white/60"
            style={{ background: theme.cardBg }}
          >
            {/* ─── CONTENT LAYOUT ─── */}
            <div className="relative z-10 flex flex-col md:flex-row items-stretch min-h-[200px] md:min-h-[230px]">
              
              {/* LEFT SIDE: Text + CTA */}
              <div className="flex-1 flex flex-col justify-center gap-3 md:gap-4 p-6 md:p-8 md:pr-4 z-20">
                
                {/* Badge */}
                <div className="flex">
                  <span 
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{ background: theme.badgeBg, color: theme.badgeText }}
                  >
                    <Sparkles size={11} />
                    {badge}
                  </span>
                </div>

                {/* Title + Subtitle */}
                <div>
                  <h2 
                    className="text-[24px] md:text-[30px] lg:text-[34px] font-bold leading-[1.1] font-outfit tracking-tight"
                    style={{ color: theme.titleColor }}
                  >
                    {title}{' '}
                    <span style={{ color: theme.subtitleColor }}>
                      {subtitle}
                    </span>
                  </h2>
                </div>

                {/* Description (desktop only) */}
                <p 
                  className="text-[13px] md:text-[14px] leading-relaxed max-w-md hidden md:block"
                  style={{ color: theme.descColor }}
                >
                  {desc}
                </p>

                {/* Price + CTA Row */}
                <div className="flex flex-wrap items-center gap-4 md:gap-5 pt-1">
                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span 
                      className="text-[34px] md:text-[40px] font-extrabold font-outfit tracking-tighter leading-none"
                      style={{ color: theme.priceColor }}
                    >
                      {currentCombo.price}
                    </span>
                    <span 
                      className="text-[14px] font-semibold uppercase opacity-50"
                      style={{ color: theme.priceColor }}
                    >
                      смн
                    </span>
                  </div>

                  {/* CTA Button — clean, no cart icon */}
                  <button
                    onClick={handleOrder}
                    disabled={currentProducts.length === 0}
                    onMouseEnter={() => setHoveredBtn(true)}
                    onMouseLeave={() => setHoveredBtn(false)}
                    className="h-12 md:h-[52px] px-7 md:px-9 rounded-xl text-[15px] md:text-[16px] font-bold transition-all duration-300 shadow-lg active:scale-[0.96] disabled:opacity-50 interactive-child flex items-center justify-center gap-2"
                    style={{ 
                      background: isAdded ? '#10B981' : (hoveredBtn ? theme.btnHover : theme.btnBg), 
                      color: isAdded ? '#FFFFFF' : theme.btnText,
                      boxShadow: isAdded ? '0 8px 24px -6px rgba(16, 185, 129, 0.5)' : `0 8px 24px -6px ${theme.btnBg}44`
                    }}
                  >
                    {isAdded ? (
                      <>
                        <Check size={18} className="stroke-[3]" />
                        <span>{lang === 'ru' ? 'Добавлено' : 'Илова шуд'}</span>
                      </>
                    ) : (
                      btnLabel
                    )}
                  </button>
                </div>
              </div>

              {/* RIGHT SIDE: Large Product Images */}
              <div className="w-full md:w-[44%] relative flex items-center justify-center z-10 pb-4 md:pb-0">
                {currentProducts.length === 0 ? (
                  <span className="text-[12px] font-semibold italic" style={{ color: theme.descColor }}>
                    Загрузка продуктов...
                  </span>
                ) : (
                  <div className="relative flex items-end justify-center px-4 py-4 md:py-6 w-full">
                    {/* Soft ground shadow */}
                    <div 
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[70%] h-3 rounded-full blur-[8px] pointer-events-none" 
                      style={{ background: `${theme.accentColor}18` }}
                    />

                    <div className="relative flex items-end justify-center -space-x-3 sm:-space-x-4 md:-space-x-6">
                      {currentProducts.map((p, pIdx) => {
                        const isFirst = pIdx === 0;
                        return (
                          <motion.div
                            key={p.id}
                            whileHover={{ 
                              scale: 1.1, 
                              y: -8, 
                              rotate: isFirst ? -3 : 3,
                              zIndex: 50 
                            }}
                            transition={{ type: "spring", stiffness: 350, damping: 18 }}
                            className="relative shrink-0"
                            style={{ 
                              zIndex: pIdx + 10,
                              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.18))'
                            }}
                          >
                            <img
                              src={p.image_url || '/placeholder.jpg'}
                              alt={p.name}
                              className="w-[120px] h-[155px] sm:w-[140px] sm:h-[180px] md:w-[180px] md:h-[220px] lg:w-[200px] lg:h-[245px] object-contain select-none"
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

        {/* Indicator dots */}
        {activeCombos.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4">
            {activeCombos.map((combo, idx) => {
              const dotTheme = THEME_PRESETS[combo.preset_theme] || THEME_PRESETS.slate;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className="h-[6px] rounded-full transition-all duration-300"
                  style={{
                    width: currentIndex === idx ? '22px' : '6px',
                    background: currentIndex === idx ? dotTheme.dotActive : '#CBD5E1',
                  }}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
