"use client";
import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Lang } from '@/lib/types';
import { ArrowRight, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface StoreHeroProps {
  lang: Lang;
  whatsappNumber: string;
  settings: Record<string, string>;
}

const MotionImage = motion.create(Image);

export const StoreHero: React.FC<StoreHeroProps> = ({ lang, whatsappNumber, settings }) => {
  const sectionRef = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });

  const opacityFade = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section 
      ref={sectionRef}
      className="relative w-full flex flex-col items-center pt-24 pb-0 overflow-hidden bg-[#FDFBF7]"
    >
      {/* GLOBAL BACKGROUND ELEMENTS - MORE SUBTLE */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-24 -right-24 w-64 h-64 pointer-events-none" 
          style={{ background: 'radial-gradient(circle at center, rgba(30,64,175,0.08) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute top-1/2 -left-20 w-48 h-48 pointer-events-none" 
          style={{ background: 'radial-gradient(circle at center, rgba(56,189,248,0.08) 0%, transparent 70%)' }}
        />
      </div>

      <div className="w-full relative z-10 flex flex-col items-center">
        {/* TEXT CONTENT CONTAINER */}
        <motion.div 
          style={{ opacity: opacityFade }}
          className="flex flex-col items-center text-center px-6 max-w-[480px]"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1D1D1F]/5 border border-[#1D1D1F]/10 mb-6 backdrop-blur-md"
          >
            <Sparkles size={12} className="text-[#1D1D1F]/60" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#1D1D1F] uppercase">
              {settings.hero_badge_text || (lang === 'ru' ? 'Ваш эксперт по витаминам' : 'Роҳнамои шумо дар олами витаминҳо')}
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6"
          >
            <span className="text-[30px] font-bold tracking-tighter text-[#1D1D1F] leading-[1.1] text-balance font-outfit">
              {settings.hero_title || (lang === 'ru' ? 'Здоровье и энергия каждый день' : 'Витаминҳо ва БАД-ҳо барои тамоми оила.')}
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[15px] text-[#0f172a]/60 font-medium leading-relaxed mb-8 max-w-[340px]"
          >
            {settings.hero_subtitle || (lang === 'ru' 
              ? 'Простые решения для восстановления сил. Только проверенные составы, созданные природой и подтвержденные наукой.'
              : 'Ҳама витаминҳо ва иловаҳои лозима дар як ҷо. Барои интихоби маҷмӯи мувофиқ кӯмак мекунем ва зуд мерасонем!')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
          >
             <button 
                onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })}
                className="group relative flex items-center gap-5 bg-[#1D1D1F] px-10 py-4.5 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:shadow-[0_25px_50px_rgba(0,0,0,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 overflow-hidden border border-white/5"
             >
                {/* ADVANCED GLASS GLOW EFFECT */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-tr from-white/0 via-white/5 to-white/10" />
                
                {/* INTERNAL GLOW - TOP EDGE */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* PREMIUM GLOSSY BLICK (THE 'SMART GLASS' HIGHLIGHT) */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-[1200ms] ease-in-out" />
                
                <span className="text-[14px] font-bold text-white tracking-widest relative z-10 uppercase font-outfit">
                  {lang === 'ru' ? 'Начать диагностику' : 'Начать диагностику'}
                </span>
                
                <div className="relative z-10 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#1E40AF] transition-colors duration-500">
                  <ArrowRight size={14} className="text-white transform group-hover:translate-x-0.5 transition-transform duration-500" />
                </div>
             </button>
          </motion.div>
        </motion.div>

        {/* VISUAL CENTERPIECE with PARALLAX */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative w-full mt-12 flex flex-col items-center"
        >
          {/* CINEMATIC PANORAMA CONTAINER with PARALLAX */}
          <div 
            className="relative w-full max-w-[1000px] px-4"
          >
            {/* ADVANCED GRADIENT MASKS - SMARTER BLENDING */}
            <div className="absolute inset-x-0 -top-2 h-24 bg-gradient-to-b from-[#FDFBF7] via-[#FDFBF7]/60 to-transparent z-20 pointer-events-none" />
            <div className="absolute inset-x-0 -bottom-2 h-24 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7]/60 to-transparent z-20 pointer-events-none" />
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#FDFBF7] to-transparent z-20 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#FDFBF7] to-transparent z-20 pointer-events-none" />
            
            <div className="relative aspect-[21/9] md:aspect-[2.4/1] w-full overflow-hidden rounded-[20px] shadow-[0_30px_60px_-15px_rgba(30,64,175,0.15)] border border-white/40">
              <MotionImage 
                src="/hero-gls.webp" 
                alt="GLS Премиальное Качество" 
                fill
                priority
                className="object-cover"
              />
              
              {/* SOFT OVERLAY FOR DEPTH */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
