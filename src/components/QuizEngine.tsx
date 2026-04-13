"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QuizCategory, QuizOption, QuizSynergy, Lang } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { EmpatheticLoader } from './EmpatheticLoader';
import { SynergyCard } from './SynergyCard';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { MedicalDisclaimer } from './MedicalDisclaimer';

interface QuizEngineProps {
  whatsappNumber: string;
  lang: Lang;
  onImmersiveChange?: (isActive: boolean) => void;
}

type Step = 'category' | 'option' | 'loading' | 'result';

const CATEGORY_PHOTOS: Record<string, string> = {
  'cat_women': '/cat-women.webp',
  'cat_men': '/cat-men.webp',
  'cat_weight': '/cat-weight.webp',
  'cat_joints': '/cat-joints.webp',
  'cat_sleep': '/cat-sleep.webp',
  'cat_sport': '/cat-sport.webp',
  'cat_brain': '/cat-brain.webp',
  'cat_detox': '/cat-detox.webp',
  'cat_mom': '/cat-mom.webp',
  'cat_kids': '/cat-kids.webp'
};

export const QuizEngine: React.FC<QuizEngineProps> = ({ whatsappNumber, lang, onImmersiveChange }) => {
  const [step, setStep] = useState<Step>('category');
  
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [options, setOptions] = useState<QuizOption[]>([]);
  const [synergies, setSynergies] = useState<QuizSynergy[]>([]);
  
  const [selectedCat, setSelectedCat] = useState<QuizCategory | null>(null);

  useEffect(() => {
    loadCategories();
  }, [lang]);

  useEffect(() => {
    // Notify parent about immersive state
    // We are "immersive" when answering questions or loading
    const isImmersive = step === 'option' || step === 'loading';
    onImmersiveChange?.(isImmersive);

    // Scroll to the quiz section when step changes to focus on questions
    // But EXCLUDE 'result' to prevent jumping past the synergy cards
    const element = document.getElementById('quiz');
    if (element && step !== 'category' && step !== 'result' && step !== 'loading') {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [step, onImmersiveChange]);

  const loadCategories = async () => {
    const { data: catData } = await supabase
      .from('quiz_categories')
      .select('*')
      .order('sort_order');

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
    }

    setTimeout(() => {
      setStep('result');
    }, 1500);
  };

  const handleBack = () => {
    if (step === 'option') setStep('category');
    if (step === 'result') setStep('option');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      
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
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        
        {step === 'category' && (
          <motion.div 
            key="cat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="space-y-12 px-4 md:px-0"
          >
            <div className="text-center space-y-4 mb-2">
               <h1 className="text-[36px] md:text-[52px] leading-[1.05] font-bold text-[#0F172A] tracking-tight font-outfit">
                 {lang === 'ru' ? 'Персональный подбор' : 'Интихоби инфиродӣ'}
               </h1>
               <p className="text-[#1E40AF]/60 text-[18px] md:text-[20px] max-w-sm mx-auto font-medium leading-relaxed">
                 {lang === 'ru' 
                   ? 'Алгоритм сформирует умный комплекс на основе клинических данных.' 
                   : 'Алгоритм дар асоси маълумоти клиникӣ маҷмӯи интеллектуалиро таҳия мекунад.'}
               </p>
            </div>
            
            <div className="apple-shelf-scroll px-6 pb-16 w-full -mx-4 md:mx-0 snap-x snap-mandatory overflow-x-auto">
              {categories.map((c) => (
                <button 
                  key={c.id} 
                  onClick={() => handleSelectCategory(c)}
                  className="apple-shelf-item w-[280px] h-[440px] snap-center apple-card-hover group flex flex-col justify-end p-8 rounded-[48px] shadow-sm relative overflow-hidden text-left bg-[#0F172A] active:scale-[0.96] transition-all duration-300"
                >
                  <div className="absolute inset-0 z-0 bg-[#E2E8F0]">
                    <img 
                      src={CATEGORY_PHOTOS[c.id] || c.image_url} 
                      alt={c.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]" 
                    />
                  </div>
                  
                  {/* Subtle permanent hint icon for better clickability recognition */}
                  <div className="absolute top-8 right-8 z-30 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500">
                    <ArrowRight size={18} className="-rotate-45" />
                  </div>
                  
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity duration-700" />
                  
                  <div className="relative z-20 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
                    <p className="text-[10px] font-bold text-white/60 tracking-[0.25em] uppercase mb-4 px-1">
                      {lang === 'ru' ? 'Умный комплекс' : 'Маҷмӯи интеллектуалӣ'}
                    </p>
                    <h3 className="text-[28px] md:text-[32px] font-bold text-white tracking-tight leading-[1.1] font-outfit mb-6">
                      {c.title}
                    </h3>

                    <div className="overflow-hidden mt-6">
                       <div 
                         className="flex items-center gap-2 text-white font-bold text-[13px] uppercase tracking-wider group/btn bg-white/20 backdrop-blur-md px-5 py-3 rounded-full border border-white/30 w-fit md:opacity-0 md:translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out"
                       >
                         {lang === 'ru' ? 'Подобрать' : 'Интихоб кардан'}
                         <ArrowRight size={16} className="transform group-hover/btn:translate-x-1 transition-transform" />
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
            initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
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
          <EmpatheticLoader key="loading" lang={lang} />
        )}

        {step === 'result' && (
          <motion.div 
            key="res"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
            className="space-y-16 px-4 md:px-0"
          >
            <div className="text-center space-y-6">
               <h2 className="text-[40px] md:text-[56px] font-bold text-[#0F172A] tracking-tight font-outfit leading-none">
                 {lang === 'ru' ? 'Умные комплексы' : 'Маҷмӯаҳои интеллектуалӣ'}
               </h2>
               <p className="text-[#1E40AF]/60 text-[18px] md:text-[20px] max-w-xl mx-auto font-medium leading-relaxed">
                 {lang === 'ru'
                   ? 'Биологическая синергия препаратов, усиливающих действие друг друга по принципу "1+1=3".'
                   : 'Синергияи биологии доруҳое, ки таъсири якдигарро аз ҷиҳати биологӣ тақвият медиҳанд.'}
               </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              {synergies.map((syn, idx) => (
                <SynergyCard key={syn.id || idx} synergy={syn} whatsappNumber={whatsappNumber} lang={lang} />
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};
