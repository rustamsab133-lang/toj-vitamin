"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { QuizSynergy, Lang, Product } from '@/lib/types';
import { Check, ArrowRight, Clock, ShieldCheck, ShoppingBag, Dna, Sparkles, Zap } from 'lucide-react';
import { useCart } from '@/store/useCart';

interface SynergyCardProps {
  synergy: QuizSynergy;
  whatsappNumber: string;
  lang: Lang;
}

export const SynergyCard: React.FC<SynergyCardProps> = ({ synergy, whatsappNumber, lang }) => {
  const total = synergy.total_price || 0;
  const { addMultiple, setIsOpen } = useCart();
  
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const handleAddToCart = () => {
    if (synergy.products) {
      const productsToAdd = synergy.products.map(p => ({
        id: p.id || `sync-${p.name}`,
        name: p.name,
        full_name: p.name,
        description: p.expert_description || p.properties?.join(', ') || '',
        price: p.price || 0,
        icon_type: 'vitamins',
        image_url: p.image_url || null,
        tags: p.tags || [],
        marketing_hooks: p.marketing_hooks || [],
      } as Product));
      
      addMultiple(productsToAdd);
      setIsOpen(true);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="group relative flex flex-col overflow-hidden rounded-[48px] border border-white/20 bg-white/40 p-8 sm:p-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] backdrop-blur-[40px] transition-all duration-700 hover:shadow-[0_60px_120px_-20px_rgba(0,0,0,0.15)]"
    >
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#1E40AF]/5 blur-[120px]" />
         <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/5 blur-[100px]" />
      </div>

      {/* HEADER: Expert Badge & Title */}
      <div className="relative z-10 mb-10">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.05] bg-white/50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#1D1D1F] backdrop-blur-md shadow-sm">
            <Dna size={13} className="text-[#1E40AF]" />
            {lang === 'ru' ? 'Клиническая синергия' : 'Синергияи клиникӣ'}
          </span>
          {total > 1500 && (
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.03] bg-black text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg">
              <ShieldCheck size={13} className="text-blue-400" />
              {lang === 'ru' ? 'Премиум выбор' : 'Интихоби олӣ'}
            </span>
          )}
        </div>
        
        <h3 className="font-outfit text-[36px] sm:text-[48px] font-bold leading-[1.05] tracking-tight text-[#1D1D1F]">
          {synergy.type}
        </h3>
      </div>

      {/* PRODUCTS: The Synergy Grid (Styled like Cart items) */}
      <div className="relative z-10 mb-10 space-y-4">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Sparkles size={14} className="text-[#1E40AF]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#94A3B8]">
            {lang === 'ru' ? 'Компоненты комплекса' : 'Таркиби маҷмӯа'}
          </p>
        </div>

        {synergy.products?.map((p, idx) => {
          const isExpanded = expandedId === (p.id || String(idx));
          const currentId = p.id || String(idx);
          
          return (
            <div 
              key={currentId} 
              className={`group/item relative flex flex-col rounded-[32px] border transition-all duration-700 overflow-hidden ${
                isExpanded 
                  ? 'border-[#1E40AF]/20 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.06)]' 
                  : 'border-white/40 bg-white/60 hover:bg-white hover:shadow-[0_15px_40px_rgba(0,0,0,0.04)]'
              }`}
            >
              <button 
                onClick={() => toggleExpand(currentId)}
                className="flex items-center gap-5 p-4 text-left w-full outline-none"
              >
                {/* Image Container */}
                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-white p-3 shadow-sm border border-black/[0.03] group-hover/item:scale-105 transition-transform duration-500">
                  {p.image_url ? (
                    <img 
                      src={p.image_url} 
                      alt={p.name} 
                      loading="lazy"
                      className="h-full w-full object-contain mix-blend-multiply" 
                    />
                  ) : (
                    <ShoppingBag size={20} className="text-slate-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-4">
                    <h4 className="font-outfit text-[17px] font-bold text-[#1D1D1F] line-clamp-1">
                      {p.name}
                    </h4>
                    <span className="font-outfit text-[15px] font-bold text-[#1D1D1F]">
                      {p.price} <small className="text-[10px] text-[#94A3B8] font-bold uppercase">смн</small>
                    </span>
                  </div>
                  <p className="text-[12px] font-bold text-[#1E40AF] uppercase tracking-wider opacity-60 line-clamp-1">
                    {p.marketing_hooks?.[0] || 'expert formula'}
                  </p>
                </div>
                
                <div className={`mt-1 h-9 w-9 rounded-full border border-black/[0.05] flex items-center justify-center text-[#1D1D1F] transition-all duration-500 ${isExpanded ? 'bg-[#1D1D1F] text-white rotate-180' : 'bg-white/50 group-hover/item:bg-black group-hover/item:text-white'}`}>
                   <ArrowRight size={16} className="rotate-90" />
                </div>
              </button>

              {/* EXPANDABLE DETAILS */}
              <motion.div
                initial={false}
                animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-8 pt-2 space-y-6 border-t border-black/[0.03]">
                  {/* Expert Reason */}
                  {p.expert_description && (
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                         {lang === 'ru' ? 'Роль в синергии' : 'Нақш дар синергия'}
                       </p>
                       <p className="text-[15px] leading-relaxed text-[#1D1D1F]/70 font-medium">
                         {p.expert_description}
                       </p>
                    </div>
                  )}

                  {/* Hooks Grid */}
                  {p.marketing_hooks && p.marketing_hooks.length > 0 && (
                    <div className="space-y-3">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                         {lang === 'ru' ? 'Клинические свойства' : 'Хусусиятҳои клиникӣ'}
                       </p>
                       <div className="flex flex-col gap-2.5">
                         {p.marketing_hooks.map((hook: string, hidx: number) => (
                           <div key={hidx} className="flex items-start gap-3 text-[14px] text-[#1D1D1F]/80 font-medium leading-snug">
                             <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#1E40AF] shrink-0" />
                             {hook}
                           </div>
                         ))}
                       </div>
                    </div>
                  )}
                  
                  {/* Full Tags */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {p.tags?.map((tag: string, tidx: number) => (
                      <span key={tidx} className="rounded-lg bg-black/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#1D1D1F]/60 border border-black/[0.02]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* RITUAL PROTOCOL: Timeline & Dosage (Premium Glass contrast) */}
      <div className="relative z-10 mb-10 overflow-hidden rounded-[36px] bg-[#1D1D1F]/[0.03] border border-black/[0.03] p-8 shadow-inner backdrop-blur-md">
        <div className="relative z-10 flex items-start gap-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#1D1D1F] shadow-lg border border-black/[0.02]">
            <Clock size={20} strokeWidth={2.5} />
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">
                {lang === 'ru' ? 'Клинический регламент' : 'Тартиби клиникӣ'}
              </p>
              <div className="font-outfit text-[18px] sm:text-[20px] font-bold leading-relaxed text-[#1D1D1F] whitespace-pre-line">
                {synergy.dosage}
              </div>
            </div>
            <div className="h-px w-full bg-black/[0.05]" />
            <p className="text-[14px] font-bold italic text-[#1E40AF] opacity-60 px-0.5">
              {synergy.rule}
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER: Price & CTA (Matching Cart Footer) */}
      <div className="relative z-10 mt-auto flex flex-col items-stretch gap-8 pt-6">
        <div className="flex items-center justify-between px-2">
           <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">
                {lang === 'ru' ? 'Стоимость набора' : 'Нархи маҷмӯа'}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-outfit text-[44px] sm:text-[56px] font-bold leading-none text-[#1D1D1F]">
                  {total}
                </span>
                <span className="text-[16px] font-bold text-[#94A3B8] uppercase tracking-widest">смн</span>
              </div>
           </div>
           
           <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-[#94A3B8] opacity-50 uppercase tracking-widest leading-none mb-1">Expert Certified</span>
              <ShieldCheck size={22} className="text-[#1E40AF]" />
           </div>
        </div>

        <button 
          onClick={handleAddToCart}
          className="group/btn relative flex w-full items-center justify-center gap-4 h-[72px] overflow-hidden rounded-[28px] bg-[#1D1D1F] text-white text-[18px] font-bold shadow-[0_30px_60px_rgba(0,0,0,0.2)] hover:bg-[#1E40AF] active:scale-[0.98] transition-all duration-500"
        >
          <motion.div 
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
          />
          <Zap size={22} fill="currentColor" />
          <span className="relative z-10">
            {lang === 'ru' ? 'Добавить комплекс' : 'Маҷмӯаро илова кардан'}
          </span>
          <ArrowRight size={22} className="group-hover/btn:translate-x-1 transition-transform relative z-10" />
        </button>
      </div>

    </motion.div>
  );
};
