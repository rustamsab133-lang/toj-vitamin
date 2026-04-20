"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { QuizSynergy, Lang, Product } from '@/lib/types';
import { ChevronDown, Clock, ShieldCheck, ShoppingBag, Dna, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { useCart } from '@/store/useCart';
import Image from 'next/image';

interface SynergyCardProps {
  synergy: QuizSynergy;
  whatsappNumber: string;
  lang: Lang;
}

export const SynergyCard: React.FC<SynergyCardProps> = ({ synergy, whatsappNumber, lang }) => {
  const total = synergy.total_price || 0;
  const { addMultiple, triggerAnimation } = useCart();
  
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
      triggerAnimation();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative flex flex-col rounded-[48px] bg-white border border-black/[0.05] p-8 sm:p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] overflow-hidden"
    >
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#1E40AF]/[0.02] blur-[100px] -mr-32 -mt-32" />
      
      {/* 1. HEADER: Authority & Title */}
      <div className="relative z-10 mb-12">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-[#1E40AF]/5 px-4 py-2 rounded-full border border-[#1E40AF]/10">
            <Dna size={14} className="text-[#1E40AF]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1E40AF]">
              {lang === 'ru' ? 'Клиническая синергия' : 'Синергияи клиникӣ'}
            </span>
          </div>
          {total > 1500 && (
            <div className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full shadow-lg">
              <ShieldCheck size={14} className="text-blue-400" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">
                {lang === 'ru' ? 'Премиум' : 'Олӣ'}
              </span>
            </div>
          )}
        </div>
        
        <h3 className="text-[42px] md:text-[52px] font-bold text-[#1D1D1F] leading-[1.05] tracking-tight font-outfit">
          {synergy.type}
        </h3>
      </div>

      {/* 2. PRODUCT LIST: Clean & Full visibility */}
      <div className="relative z-10 space-y-4 mb-12">
        <div className="flex items-center gap-2 mb-6 px-1">
          <Sparkles size={14} className="text-[#1E40AF]" />
          <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#94A3B8]">
            {lang === 'ru' ? 'Состав комплекса' : 'Таркиби маҷмӯа'}
          </p>
        </div>

        <div className="space-y-3">
          {synergy.products?.map((p, idx) => {
            const isExpanded = expandedId === (p.id || String(idx));
            const currentId = p.id || String(idx);
            
            return (
              <div 
                key={currentId} 
                className={`group/item border transition-all duration-500 rounded-[32px] ${
                  isExpanded ? 'bg-[#F8FAFC] border-[#1E40AF]/20 shadow-sm' : 'bg-white border-black/[0.05] hover:border-black/10'
                }`}
              >
                <button 
                  onClick={() => toggleExpand(currentId)}
                  className="w-full flex items-center gap-6 p-5 text-left"
                >
                  <div className="relative w-16 h-16 shrink-0 bg-white rounded-2xl border border-black/[0.03] p-1 overflow-hidden shadow-sm group-hover/item:scale-105 transition-transform flex items-center justify-center">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill className="object-contain p-2" />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] flex items-center justify-center">
                        <span className="text-[24px] font-bold text-[#4F46E5] uppercase">
                          {p.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[17px] font-bold text-[#1D1D1F] leading-snug">
                      {p.name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-[14px] font-bold text-[#1E40AF]">{p.price} смн</span>
                       <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest bg-black/[0.03] px-2 py-0.5 rounded">
                         {p.marketing_hooks?.[0] || 'expert'}
                       </span>
                    </div>
                  </div>

                  <div className={`w-10 h-10 rounded-full border border-black/5 flex items-center justify-center transition-all duration-500 ${isExpanded ? 'bg-black text-white' : 'bg-white text-black group-hover/item:bg-black group-hover/item:text-white'}`}>
                    <ChevronDown size={18} className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <motion.div
                  initial={false}
                  animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-8 pb-8 pt-2 space-y-6">
                    <div className="h-px bg-black/[0.05]" />
                    {p.expert_description && (
                      <div className="space-y-2">
                         <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Роль в синергии</p>
                         <p className="text-[15px] text-[#475569] leading-relaxed font-medium">{p.expert_description}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                       {p.tags?.slice(0, 3).map((tag, tIdx) => (
                         <span key={tIdx} className="text-[10px] font-bold text-black/40 uppercase tracking-widest px-3 py-1 bg-black/[0.03] rounded-lg">
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
      </div>

      {/* 3. EXPERT PROTOCOL: Combined Dosage & Rules */}
      <div className="relative z-10 mb-12 p-8 rounded-[40px] bg-[#1D1D1F] text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] -mr-16 -mt-16" />
        <div className="flex items-start gap-6 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <Clock size={22} className="text-white" />
          </div>
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3">Протокол приема</p>
              <h4 className="text-[20px] font-bold leading-relaxed font-outfit">
                {synergy.dosage}
              </h4>
            </div>
            {synergy.rule && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-[14px] text-white/60 italic font-medium">
                   {lang === 'ru' ? 'Важное условие:' : 'Шарт:'} {synergy.rule}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. FOOTER: Final CTA */}
      <div className="relative z-10 flex items-center justify-between pt-6 border-t border-black/[0.05]">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#94A3B8] mb-1">К покупке</span>
          <div className="flex items-baseline gap-1">
            <span className="text-[44px] font-bold text-[#1D1D1F] font-outfit tracking-tighter">{total}</span>
            <span className="text-[16px] font-bold text-[#94A3B8] uppercase tracking-widest">смн</span>
          </div>
        </div>

        <button 
          onClick={handleAddToCart}
          className="group relative h-[72px] px-10 bg-[#1D1D1F] text-white rounded-[28px] text-[18px] font-bold flex items-center gap-4 hover:bg-[#1E40AF] hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 shadow-xl shadow-black/10 overflow-hidden"
        >
          <Zap size={20} fill="currentColor" />
          <span>{lang === 'ru' ? 'Добавить всё' : 'Илова кардан'}</span>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          
          <motion.div 
            animate={{ x: ['-200%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
          />
        </button>
      </div>
    </motion.div>
  );
};
