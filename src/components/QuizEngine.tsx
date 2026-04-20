"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QuizCategory, QuizOption, QuizSynergy, Lang } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { EmpatheticLoader } from './EmpatheticLoader';
import { SynergyCard } from './SynergyCard';
import { 
  ArrowLeft,
  ArrowRight, 
  ChevronRight, 
  HeartPulse, 
  ShieldCheck, 
  Brain, 
  Zap, 
  Activity, 
  Wind, 
  Baby, 
  Sparkles,
  Scale,
  Dna
} from 'lucide-react';
import { MedicalDisclaimer } from './MedicalDisclaimer';

interface QuizEngineProps {
  whatsappNumber: string;
  lang: Lang;
  onImmersiveChange?: (isActive: boolean) => void;
}

type Step = 'category' | 'option' | 'loading' | 'result';

const CATEGORY_CODES: Record<string, string> = {
  'cat_women': 'SYNC_W01',
  'cat_men': 'SYNC_M01',
  'cat_weight': 'MET_W02',
  'cat_joints': 'OST_J03',
  'cat_sleep': 'NEU_S04',
  'cat_sport': 'ATP_S05',
  'cat_brain': 'COG_B06',
  'cat_detox': 'HEP_D07',
  'cat_mom': 'MAT_M08',
  'cat_kids': 'PED_K09'
};

const CATEGORY_ICONS: Record<string, any> = {
  'cat_women': HeartPulse,
  'cat_men': ShieldCheck,
  'cat_weight': Scale,
  'cat_joints': Activity,
  'cat_sleep': Brain,
  'cat_sport': Zap,
  'cat_brain': Brain,
  'cat_detox': Wind,
  'cat_mom': HeartPulse,
  'cat_kids': Baby
};

// Progress step index
const STEP_ORDER: Step[] = ['category', 'option', 'loading', 'result'];
const STEP_DISPLAY_LABELS = [
  { ru: 'Категория', tj: 'Категория' },
  { ru: 'Вопрос', tj: 'Савол' },
  { ru: 'Результат', tj: 'Натиҷа' },
];

// ─── GA4 Analytics Helper ───────────────────────────────────────────────────
const trackEvent = (event: string, params?: Record<string, string | number>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, params || {});
  }
};

export const QuizEngine: React.FC<QuizEngineProps> = ({ whatsappNumber, lang, onImmersiveChange }) => {
  const [step, setStep] = useState<Step>('category');
  const [error, setError] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [options, setOptions] = useState<QuizOption[]>([]);
  const [synergies, setSynergies] = useState<QuizSynergy[]>([]);
  
  const [selectedCat, setSelectedCat] = useState<QuizCategory | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<QuizOption | null>(null);

  // Quick Start — last result from localStorage
  const [lastResult, setLastResult] = useState<{ catTitle: string; catId: string } | null>(null);

  useEffect(() => {
    loadCategories();
    // Load last result for Quick Start
    try {
      const saved = localStorage.getItem('toj_quiz_last');
      if (saved) setLastResult(JSON.parse(saved));
    } catch {}
  }, [lang]);

  useEffect(() => {
    // Notify parent about immersive state
    // We are "immersive" when answering questions or loading
    const isImmersive = step === 'option' || step === 'loading';
    onImmersiveChange?.(isImmersive);

    // Scroll to the quiz section when step changes to focus on questions
    const element = document.getElementById('quiz');
    if (element && step === 'option') {
      const offset = 80; // Adjust for header
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  }, [step, onImmersiveChange]);

  const loadCategories = async () => {
    setError(null);
    const { data: catData, error: catError } = await supabase
      .from('quiz_categories')
      .select('*')
      .order('sort_order');

    if (catError) {
      setError(lang === 'ru' ? 'Не удалось загрузить данные. Попробуйте снова.' : 'Маълумотро бор кардан нашуд.');
      return;
    }

    if (catData) {
      const localizedCats = catData.map(c => ({
        ...c,
        title: c.title_lang?.[lang] || c.title,
        question: c.question_lang?.[lang] || c.question
      }));
      setCategories(localizedCats);
    }
  };

  const handleSelectCategory = async (cat: QuizCategory) => {
    setSelectedCat(cat);
    trackEvent('quiz_category_selected', { category_id: cat.id, category_title: cat.title });
    // Haptic feedback
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
    
    const { data: optData } = await supabase
      .from('quiz_options')
      .select('*')
      .eq('category_id', cat.id)
      .order('sort_order');

    if (optData) {
      const localizedOpts = optData.map(o => ({
        ...o,
        text: o.text_lang?.[lang] || o.text
      }));
      setOptions(localizedOpts);
    }
    setStep('option');
  };

  const handleSelectOption = async (opt: QuizOption) => {
    setSelectedOpt(opt);
    trackEvent('quiz_option_selected', { option_id: opt.id, category_id: selectedCat?.id || '' });
    setStep('loading');
    // Haptic feedback
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }

    const { data: synData } = await supabase
      .from('quiz_synergies')
      .select('*')
      .eq('option_id', opt.id)
      .order('sort_order');
    
    if (synData) {
      // 1. Собираем все ID продуктов из всех синергий этого вопроса
      const allProductIds = synData.flatMap(syn => (syn.products_data || []).map((p: any) => p.id)).filter(Boolean);
      
      // 2. Делаем ОДИН запрос к таблице products по всем ID (максимальная скорость)
      const { data: dbProducts } = await supabase
        .from('products')
        .select('*')
        .in('id', allProductIds);
      
      const fullSynergies = synData.map((syn: any) => {
        const localizedProducts = (syn.products_data || []).map((p: any) => {
          // Ищем продукт в базе по ID или по имени (для обратной совместимости)
          const dbProd = dbProducts?.find(dp => dp.id === p.id) || 
                         dbProducts?.find(dp => dp.name.toLowerCase().includes(p.name?.toLowerCase()));
          
          if (!dbProd) return p; // Если не нашли, оставляем как есть (заглушка)

          return { 
            ...p, 
            id: dbProd.id,
            name: dbProd.name,
            price: Number(dbProd.price) || 0, 
            image_url: dbProd.image_url,
            marketing_hooks: dbProd.marketing_hooks || [],
            tags: dbProd.tags || [],
            expert_description: dbProd.description || '',
            properties: dbProd.tags || [] // Используем теги как свойства для краткости
          };
        });

        const totalPrice = localizedProducts.reduce((acc: number, p: any) => acc + (p.price || 0), 0);
        
        return { 
          ...syn, 
          type: syn.type_lang?.[lang] || syn.type,
          dosage: syn.dosage_lang?.[lang] || syn.dosage,
          rule: syn.rule_lang?.[lang] || syn.rule,
          products: localizedProducts, 
          total_price: totalPrice 
        };
      });
      setSynergies(fullSynergies);
      // Save for Quick Start
      try {
        localStorage.setItem('toj_quiz_last', JSON.stringify({ catTitle: selectedCat?.title, catId: selectedCat?.id }));
      } catch {}
      trackEvent('quiz_result_shown', { category_id: selectedCat?.id || '', synergy_count: fullSynergies.length });
    }

    setTimeout(() => {
      setStep('result');
    }, 1500);
  };

  const handleBack = () => {
    if (step === 'option') {
      setSelectedCat(null);
      setStep('category');
    }
    if (step === 'result') {
      setStep('option');
    }
  };

  // Progress bar step (0=category, 1=option, 2=result)
  const progressStep = step === 'category' ? 0 : step === 'option' ? 1 : 2;

  return (
    <div className="w-full max-w-4xl mx-auto min-h-[500px]">
      
      {/* ERROR STATE */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-[16px] font-medium text-[#64748B]">{error}</p>
          <button
            onClick={loadCategories}
            className="px-6 py-3 bg-[#1D1D1F] text-white rounded-full text-[14px] font-bold hover:bg-[#1E40AF] transition-all"
          >
            {lang === 'ru' ? 'Попробовать снова' : 'Дубора кӯшиш кунед'}
          </button>
        </div>
      )}

      {!error && (
      <>
      {/* HEADER: Progress + Back */}
      <div className="flex items-center justify-between mb-10 h-10 px-4 md:px-0">
        <AnimatePresence>
          {step !== 'category' && step !== 'loading' && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={handleBack}
              className="group flex items-center gap-2 text-[14px] font-bold text-[#1E40AF] uppercase tracking-widest hover:opacity-70 transition-all"
            >
              <div className="w-8 h-8 rounded-full border border-[#1E40AF]/20 flex items-center justify-center group-hover:bg-[#1E40AF]/5 transition-colors">
                <ArrowLeft size={16} />
              </div>
              {lang === 'ru' ? 'Назад' : 'Бозгашт'}
            </motion.button>
          )}
          {(step === 'category' || step === 'loading') && <div />}
        </AnimatePresence>

        {/* PROGRESS DOTS */}
        {step !== 'loading' && (
          <div className="flex items-center gap-3">
            {STEP_DISPLAY_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <motion.div
                  animate={{
                    backgroundColor: i < progressStep ? '#1E40AF' : i === progressStep ? '#1D1D1F' : '#E2E8F0',
                    scale: i === progressStep ? 1.2 : 1,
                  }}
                  className="w-2.5 h-2.5 rounded-full"
                />
                {i < STEP_DISPLAY_LABELS.length - 1 && (
                  <div className={`w-8 h-px ${i < progressStep ? 'bg-[#1E40AF]' : 'bg-[#E2E8F0]'} transition-colors duration-500`} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {!error && (
      <AnimatePresence mode="wait">
        
        {step === 'category' && (
          <motion.div 
            key="cat"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-12 px-4 md:px-0"
          >
            <div className="text-center space-y-4 mb-2">
               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 border border-black/5 mb-6">
                 <Dna size={14} className="text-[#1E40AF]" />
                 <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#1D1D1F]">
                   {lang === 'ru' ? 'Персональный подбор' : 'Интихоби инфиродӣ'}
                 </span>
               </div>
               <h1 className="text-[42px] md:text-[64px] leading-[1.05] font-bold text-[#0F172A] tracking-tight font-outfit">
                 {lang === 'ru' ? 'Диагностика здоровья' : 'Ташхиси саломатӣ'}
               </h1>
               <p className="text-[#1E40AF]/60 text-[18px] md:text-[20px] max-w-sm mx-auto font-medium leading-relaxed">
                {lang === 'ru' 
                   ? 'Алгоритм сформирует умный комплекс на основе клинических данных.' 
                   : 'Алгоритм дар асоси маълумоти клиникӣ маҷмӯи интеллектуалиро таҳия мекунад.'}
               </p>
            </div>

            {/* QUICK START — shown to returning users */}
            {lastResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4 md:mx-0 p-5 rounded-[24px] bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#6366F1] mb-1">
                    {lang === 'ru' ? '🕐 Ваш последний результат' : 'Натиҷаи охирини шумо'}
                  </p>
                  <p className="text-[15px] font-semibold text-[#1D1D1F]">{lastResult.catTitle}</p>
                </div>
                <button
                  onClick={() => {
                    const cat = categories.find(c => c.id === lastResult.catId);
                    if (cat) handleSelectCategory(cat);
                  }}
                  className="shrink-0 h-10 px-5 bg-[#4F46E5] text-white rounded-full text-[13px] font-bold hover:bg-[#3730A3] transition-all"
                >
                  {lang === 'ru' ? 'Повторить' : 'Такрор'}
                </button>
              </motion.div>
            )}
            
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4 md:px-0 pb-16 w-full">
          {categories.map((c) => (
            <button 
              key={c.id} 
              onClick={() => handleSelectCategory(c)}
              className="w-full h-[480px] group relative rounded-[40px] overflow-hidden bg-[#020617] shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] text-left border border-white/5"
            >
              {/* 1. BACKGROUND GLOW & HUD */}
              <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* Radial Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(30,64,175,0.15)_0%,transparent_70%)] group-hover:bg-[radial-gradient(circle_at_50%_40%,rgba(30,64,175,0.25)_0%,transparent_70%)] transition-colors duration-700" />
                
                {/* CLINICAL GRID OVERLAY */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.1] mix-blend-overlay" />
                
                {/* SCANNING LINE ANIMATION */}
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-x-0 h-px bg-[#1E40AF]/50 shadow-[0_0_15px_rgba(30,64,175,0.8)] z-10"
                />
                
                {/* Crosshairs HUD */}
                <div className="absolute top-6 left-6 w-4 h-4 border-t border-l border-[#1E40AF]/40" />
                <div className="absolute top-6 right-6 w-4 h-4 border-t border-r border-[#1E40AF]/40" />
                <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-[#1E40AF]/40" />
                <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-[#1E40AF]/40" />
              </div>

              {/* 2. HOLOGRAM CENTERPIECE (Placeholder for 3D WebP) */}
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none mb-32">
                <motion.div
                  animate={{ y: [-8, 8, -8] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative flex items-center justify-center w-40 h-40"
                >
                  {/* Outer glowing rings */}
                  <div className="absolute inset-0 rounded-full border border-[#1E40AF]/20 animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border border-[#1E40AF]/10 animate-[spin_15s_linear_infinite_reverse]" />
                  
                  {/* Hologram Subject */}
                  <div className="relative text-[#3B82F6] opacity-90 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:drop-shadow-[0_0_25px_rgba(59,130,246,0.8)] transition-all duration-500 group-hover:scale-110">
                    <img 
                      src={`/${c.id}_3d.png`} 
                      alt={c.title} 
                      className="w-40 h-40 object-contain mix-blend-screen opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                      onError={(e) => {
                        // Fallback icon logic if image is missing
                        (e.target as HTMLImageElement).style.display = 'none';
                        const fallbackIcon = e.currentTarget.nextElementSibling;
                        if (fallbackIcon) (fallbackIcon as HTMLElement).style.display = 'block';
                      }}
                    />
                    <div style={{ display: 'none' }}>
                      {CATEGORY_ICONS[c.id] ? (
                        (() => {
                          const Icon = CATEGORY_ICONS[c.id];
                          return <Icon size={80} strokeWidth={1} />;
                        })()
                      ) : (
                        <Sparkles size={80} strokeWidth={1} />
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* 3. TOP DATA BAR: Clinical Code */}
              <div className="absolute top-8 left-8 right-8 z-20 flex justify-between items-center">
                <div className="px-3 py-1 rounded-md bg-white/5 backdrop-blur-md border border-white/10">
                  <span className="text-[10px] font-mono font-bold text-[#94A3B8] tracking-tighter">
                    {CATEGORY_CODES[c.id] || 'SYNC_X00'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 group-hover:bg-[#1E40AF] group-hover:text-white transition-all duration-500 shadow-lg">
                  <ArrowRight size={14} className="-rotate-45" />
                </div>
              </div>

              {/* 4. CONTENT PLATE: Glassmorphism */}
              <div className="absolute bottom-8 left-8 right-8 z-20">
                <div className="p-6 rounded-[28px] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl transform group-hover:translate-y-[-5px] transition-transform duration-500">
                  <p className="text-[9px] font-bold text-[#3B82F6] tracking-[0.2em] uppercase mb-2">
                    {lang === 'ru' ? 'Клинический модуль' : 'Модули клиникӣ'}
                  </p>
                  <h3 className="text-[22px] font-bold text-white tracking-tight leading-tight font-outfit">
                    {c.title}
                  </h3>
                  
                  <div className="mt-8 flex items-center justify-between group/cta relative">
                    {/* Shimmer Text */}
                    <div className="relative">
                       <span className="text-[12px] font-bold text-white/30 uppercase tracking-[0.25em]">
                         {lang === 'ru' ? 'Пройти анализ' : 'Гузаштан аз таҳлил'}
                       </span>
                       <motion.div 
                         animate={{ x: ['-100%', '300%'] }}
                         transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                         className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent opacity-80"
                         style={{ width: '40%' }}
                       />
                       <span className="absolute inset-0 text-[12px] font-bold text-white uppercase tracking-[0.25em] pointer-events-none">
                         {lang === 'ru' ? 'Пройти анализ' : 'Гузаштан аз таҳлил'}
                       </span>
                    </div>

                    {/* Sonar Pulsing Arrow */}
                    <div className="relative">
                      {/* Ripples */}
                      <motion.div 
                        animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full border-2 border-[#3B82F6]/50 z-0"
                      />
                      <motion.div 
                        animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
                        className="absolute inset-0 rounded-full border border-[#3B82F6]/30 z-0"
                      />
                      
                      <div className="relative z-10 w-11 h-11 rounded-full bg-[#3B82F6] flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.6)] group-hover/cta:scale-110 group-hover/cta:shadow-[0_0_35px_rgba(59,130,246,0.9)] transition-all duration-300">
                        <ArrowRight size={20} className="group-hover/cta:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
          </motion.div>
        )}

        {step === 'option' && selectedCat && (
          <motion.div 
            key="opt"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-12 max-w-2xl mx-auto px-4 md:px-0"
          >
            <div className="text-center space-y-4 mb-2">
               <div className="inline-block px-4 py-1.5 rounded-full bg-[#1E40AF]/5 border border-[#1E40AF]/10 mb-4">
                 <span className="text-[11px] font-bold tracking-[0.2em] text-[#1E40AF] uppercase">
                   {selectedCat.title}
                 </span>
               </div>
               <h2 className="text-[34px] md:text-[44px] leading-tight font-bold text-[#0F172A] tracking-tight text-balance font-outfit">
                 {selectedCat.question}
               </h2>
            </div>
            
            <div className="space-y-4">
              {options.map((o) => (
                <button 
                  key={o.id} 
                  onClick={() => handleSelectOption(o)}
                  className="w-full bg-white p-6 md:p-8 rounded-[32px] border border-[#E2E8F0]/60 shadow-sm hover:shadow-[0_20px_40px_rgba(140,120,81,0.08)] hover:border-[#1E40AF]/30 active:scale-[0.99] transition-all duration-500 text-left flex items-center justify-between group"
                >
                  <span className="text-[18px] md:text-[20px] font-medium text-[#0F172A] pr-4 leading-snug">
                    {o.text}
                  </span>
                  <div className="w-10 h-10 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#E2E8F0] group-hover:border-[#1E40AF] group-hover:bg-[#1E40AF] group-hover:text-white transition-all duration-500 transform group-hover:rotate-45">
                    <ChevronRight size={20} />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'loading' && (
          <EmpatheticLoader key="loading" lang={lang} categoryId={selectedCat?.id} />
        )}

        {step === 'result' && (
          <motion.div 
            key="res"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-10 px-4 md:px-0"
          >
            {/* HEADER + SOCIAL PROOF */}
            <div className="text-center space-y-4">
               <h2 className="text-[40px] md:text-[56px] font-bold text-[#0F172A] tracking-tight font-outfit leading-none">
                 {lang === 'ru' ? 'Умные комплексы' : 'Маблаги интеллект'}
               </h2>
               <p className="text-[#1E40AF]/60 text-[17px] max-w-xl mx-auto font-medium leading-relaxed">
                 {lang === 'ru'
                   ? 'Биологическая синергия препаратов, усиливающих действие друг друга по принципу «1+1=3».'
                   : 'Синергияи биологии доруе, ки таъсири якдигарро тақвият медиханд.'}
               </p>
               </p>
            </div>

            {/* HEALTH PROFILE SCORE BARS */}
            <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="text-[#1E40AF]" size={20} />
                <h4 className="text-[16px] font-bold text-[#1D1D1F] uppercase tracking-widest">
                  {lang === 'ru' ? 'Ваш профиль здоровья' : 'Профили саломатии шумо'}
                </h4>
              </div>
              <div className="space-y-4">
                {[
                  { label: lang === 'ru' ? 'Иммунитет' : 'Иммунитет', score: 85 },
                  { label: lang === 'ru' ? 'Энергия' : 'Энергия', score: 60 },
                  { label: lang === 'ru' ? 'Дефицит (устраняем)' : 'Норасоӣ (барқарор мекунем)', score: 35, alert: true }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-[13px] font-bold">
                      <span className={item.alert ? 'text-red-500' : 'text-[#475569]'}>{item.label}</span>
                      <span className={item.alert ? 'text-red-500' : 'text-[#1D1D1F]'}>{item.score}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.score}%` }}
                        transition={{ duration: 1.5, delay: 0.5 + i * 0.2, ease: "easeOut" }}
                        className={`h-full rounded-full ${item.alert ? 'bg-red-500' : 'bg-[#1E40AF]'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[#64748B] mt-6 text-center font-medium">
                {lang === 'ru' 
                  ? 'Рекомендованный ниже комплекс компенсирует дефицит за 30 дней курса.'
                  : 'Маҷмӯаи тавсияшуда норасоиро дар 30 рӯз барқарор мекунад.'}
              </p>
            </div>
            
            {/* SYNERGY CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              {synergies.map((syn, idx) => (
                <SynergyCard key={syn.id || idx} synergy={syn} whatsappNumber={whatsappNumber} lang={lang} />
              ))}
            </div>

            {/* WHATSAPP SHARE + RESTART */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
              <button
                onClick={() => {
                  const catTitle = selectedCat?.title || '';
                  const productList = synergies[0]?.products?.map((p: any) => p.name).join(', ') || '';
                  const text = lang === 'ru'
                    ? `Здравствуйте! Я прошёл тест на toj-vitamin.tj. Моя категория: ${catTitle}. Подобрано: ${productList}. Пройдите тест: https://toj-vitamin.tj/#quiz`
                    : `Салом! Ман тестро дар toj-vitamin.tj гузаштам. Категория: ${catTitle}. Тавсия: ${productList}.`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex items-center gap-3 h-14 px-8 bg-[#25D366] text-white rounded-full text-[15px] font-bold hover:bg-[#1fad52] transition-all shadow-lg hover:scale-[1.03] active:scale-[0.97]"
              >
                <span>📲</span>
                <span>{lang === 'ru' ? 'Поделиться результатом' : 'Натиҷаро фиристодан'}</span>
              </button>
              <button
                onClick={() => { setSynergies([]); setSelectedCat(null); setSelectedOpt(null); setStep('category'); }}
                className="flex items-center gap-2 h-14 px-8 bg-white border border-[#E2E8F0] text-[#1D1D1F] rounded-full text-[15px] font-bold hover:border-[#1D1D1F] transition-all"
              >
                <span>🔁</span>
                <span>{lang === 'ru' ? 'Пройти заново' : 'Дубора'}</span>
              </button>
            </div>

            {/* MEDICAL DISCLAIMER */}
            <MedicalDisclaimer lang={lang} className="mt-2" />
          </motion.div>
        )}

      </AnimatePresence>
      )}
    </div>
  );
};
