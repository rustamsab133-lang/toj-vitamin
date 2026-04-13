"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Product, Lang } from '@/lib/types';
import { X, ShoppingBag, ArrowRight, ShieldCheck, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  allProducts: Product[];
  lang: Lang;
  onBuy: (product: Product, synergyProduct?: Product) => void;
}

interface SynergyLink {
  synergy_product_id: string;
  reason: string;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  allProducts,
  lang,
  onBuy
}) => {
  const [synergies, setSynergies] = useState<SynergyLink[]>([]);
  const [loadingSynergies, setLoadingSynergies] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchSynergies() {
      if (!product || !isOpen) return;
      setLoadingSynergies(true);
      
      const { data, error } = await supabase
        .from('product_synergies')
        .select('synergy_product_id, reason')
        .eq('product_id', product.id);
      
      if (!error && data) {
        setSynergies(data);
      } else {
        if (product.synergy_product_id) {
           setSynergies([{ 
             synergy_product_id: product.synergy_product_id, 
             reason: product.synergy_reason || '' 
           }]);
        } else {
           setSynergies([]);
        }
      }
      setLoadingSynergies(false);
    }
    fetchSynergies();
  }, [product, isOpen]);

  const onCloseRef = React.useRef(onClose);
  
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handlePopState = () => {
      if (isOpen) {
        onCloseRef.current();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Push history state exactly once when opened
      window.history.pushState({ isProductModalOpen: true }, '');
      window.addEventListener('popstate', handlePopState);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen]);

  const handleSmartClose = () => {
    if (window.history.state?.isProductModalOpen) {
      window.history.back();
    } else {
      onCloseRef.current();
    }
  };

  if (!product || !mounted) return null;

  const descriptionLines = product.description
    ? product.description.split('\n').filter(line => line.trim().length > 0)
    : [];

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* OVERLAY - Deep & Minimal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSmartClose}
            className="absolute inset-0 bg-[#000000]/30 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="w-full sm:w-[580px] max-h-screen sm:max-h-[92vh] bg-white rounded-t-[32px] sm:rounded-[44px] shadow-[0_40px_100px_rgba(0,0,0,0.15)] relative flex flex-col overflow-hidden will-change-transform"
          >
            {/* STABLE CLOSE ACTION - LOWERED INTO SAFE ZONE */}
            <button 
              onClick={handleSmartClose}
              className="absolute top-6 right-6 sm:top-8 sm:right-8 w-12 h-12 bg-white/90 backdrop-blur-md border border-black/10 text-[#1D1D1F] rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 shadow-[0_8px_16px_rgba(0,0,0,0.1)]"
            >
              <X size={24} />
            </button>

            {/* PURE IMAGE STUDIO */}
            <div className="shrink-0 w-full h-[360px] bg-white flex items-center justify-center p-12 relative overflow-hidden">
               {/* Background Studio Glow */}
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#F8FAFC_0%,_#FFFFFF_70%)] opacity-50" />
               
               <div className="relative w-full h-full">
                 {product.image_url ? (
                   <Image 
                     src={product.image_url} 
                     alt={product.name} 
                     fill
                     sizes="(max-width: 640px) 100vw, 500px"
                     className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.08)]" 
                   />
                 ) : (
                    <ShoppingBag size={100} strokeWidth={0.5} className="text-[#E2E8F0] mx-auto h-full" />
                 )}
               </div>
            </div>

            {/* SCROLLABLE CONTENT BODY (Stabilized) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden apple-shelf-scroll overscroll-contain px-8 sm:px-12 pb-12 will-change-scroll">
              
              <div className="space-y-12">
                
                {/* 1. Main Info: Title & Price */}
                <div className="space-y-6 pt-2">
                   <div className="space-y-2">
                      <p className="text-[#94A3B8] text-[12px] font-bold uppercase tracking-[0.25em] font-outfit">
                        {lang === 'ru' ? 'Эксклюзивная коллекция' : 'Коллексияи эксклюзивӣ'}
                      </p>
                      <h2 className="text-[34px] md:text-[40px] font-bold text-[#1D1D1F] leading-tight font-outfit tracking-tight">
                        {product.name}
                      </h2>
                   </div>
                   
                   <div className="flex items-baseline gap-2">
                      <span className="text-[38px] font-bold text-[#1D1D1F] font-outfit tracking-tighter">
                        {product.price}
                      </span>
                      <span className="text-[16px] text-[#94A3B8] font-bold tracking-widest uppercase">{'смн'}</span>
                   </div>

                   {product.tags && product.tags.length > 0 && (
                     <div className="flex flex-wrap gap-2">
                       {product.tags.map((tag, idx) => (
                         <span key={idx} className="px-4 py-1.5 rounded-full bg-black/[0.04] text-[10px] font-bold text-[#1D1D1F] uppercase tracking-widest">
                           {tag}
                         </span>
                       ))}
                     </div>
                   )}
                </div>

                <div className="h-px bg-black/[0.05]" />

                {/* 2. Marketing Strategy: Benefits List */}
                {product.marketing_hooks && product.marketing_hooks.length > 0 && (
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] font-outfit">
                      {lang === 'ru' ? 'Преимущества' : 'Бартариятҳо'}
                    </h4>
                    <div className="grid gap-5">
                      {product.marketing_hooks.map((hook, idx) => (
                        <div key={idx} className="flex items-start gap-4 group">
                          <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 mt-0.5 shadow-lg group-hover:scale-110 transition-transform">
                            <CheckCircle2 size={13} />
                          </div>
                          <p className="text-[16px] text-[#334155] font-medium leading-relaxed">{hook}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px bg-black/[0.05]" />

                {/* 3. Scientific Description: Pure Content */}
                <div className="space-y-6">
                  <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] font-outfit">
                    {lang === 'ru' ? 'Описание и действие' : 'Хусусиятҳо ва Таъсир'}
                  </h4>
                  <div className="space-y-5">
                    {descriptionLines.map((line, idx) => (
                      <div key={idx} className="flex items-start gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-black/[0.1] shrink-0 mt-2.5" />
                        <p className="text-[15px] sm:text-[17px] text-[#475569] leading-[1.6]">
                          {line.replace(/^[•\-\*]\s*/, '')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Compatibility (Clean Row Style) */}
                {product.med_interactions && product.med_interactions.length > 0 && (
                   <div className="pt-4">
                      <div className="bg-[#FAFAFA] rounded-[32px] p-8 border border-black/[0.03]">
                        <div className="flex items-center gap-3 mb-4 text-[#1D1D1F]">
                          <AlertCircle size={18} />
                          <h4 className="text-[12px] font-bold uppercase tracking-[0.15em] font-outfit">
                            {lang === 'ru' ? 'Инструкции и безопасность' : 'Дастур ва бехатарӣ'}
                          </h4>
                        </div>
                        <div className="space-y-4">
                          {product.med_interactions.map((interaction, idx) => (
                             <p key={idx} className="text-[14px] text-[#64748B] leading-relaxed italic border-l-2 border-black/10 pl-4">{'\u2014'} {interaction}</p>
                          ))}
                        </div>
                      </div>
                   </div>
                )}

                {/* 5. Smart Synergies (Clean Recommendations) */}
                {synergies.length > 0 && (
                   <div className="space-y-8 pt-4">
                      <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] font-outfit text-center">
                        {lang === 'ru' ? 'Идеальное дополнение' : 'Иловаи комил'}
                      </h4>
                      <div className="space-y-4">
                        {synergies.map((link, idx) => {
                          const synProd = allProducts.find(p => p.id === link.synergy_product_id);
                          if (!synProd) return null;
                          return (
                            <div key={idx} className="relative bg-white border border-black/[0.06] rounded-[32px] p-6 hover:shadow-xl hover:shadow-black/[0.02] transition-all group overflow-hidden">
                               <div className="flex items-center gap-5">
                                  <div className="w-20 h-20 bg-[#FBFBFB] rounded-[24px] flex items-center justify-center p-3 group-hover:scale-110 transition-transform duration-700 shrink-0 border border-black/[0.02] relative overflow-hidden">
                                    <Image src={synProd.image_url || ''} alt={synProd.name} fill sizes="80px" className="object-contain" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 text-[#1E40AF]">
                                       <ShieldCheck size={14} className="opacity-50" />
                                       <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                                         {lang === 'ru' ? 'Клиническая пара' : 'Ҷуфти клиникӣ'}
                                       </span>
                                    </div>
                                    <h5 className="font-bold text-[#1D1D1F] text-[17px] mb-1 truncate">{synProd.name}</h5>
                                    <p className="text-[12px] text-[#64748B] mb-4 line-clamp-1">{link.reason}</p>
                                    <div className="flex items-center justify-between">
                                      <p className="font-bold text-[#1D1D1F] text-[16px]">{synProd.price} {'смн'}</p>
                                      <button 
                                        onClick={() => onBuy(product, synProd)}
                                        className="h-10 bg-black text-white px-5 rounded-full text-[12px] font-bold flex items-center gap-2 hover:bg-[#1E40AF] transition-all shadow-md active:scale-95"
                                      >
                                        {lang === 'ru' ? 'Добавить набор' : 'Илова кардан'}
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  </div>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                   </div>
                )}

                {/* BOTTOM SAFETY ZONE */}
                <div className="h-44" />
              </div>
            </div>

            {/* PREMIUM STICKY FOOTER: Glassmorphism */}
            <div className="shrink-0 p-6 sm:p-10 bg-white/80 backdrop-blur-2xl border-t border-black/[0.05] z-40 relative">
              <button 
                onClick={() => onBuy(product)}
                className="w-full h-[68px] bg-[#1D1D1F] text-white rounded-[28px] text-[18px] font-bold flex items-center justify-center gap-3 hover:bg-[#1E40AF] hover:scale-[1.01] active:scale-[0.98] transition-all duration-500 shadow-[0_30px_60px_rgba(0,0,0,0.25)] group"
              >
                <span>{lang === 'ru' ? 'Добавить в корзину' : 'Ба сабад илова кардан'}</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
