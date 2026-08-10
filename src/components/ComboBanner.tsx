import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Sparkles, ArrowRight } from 'lucide-react';
import { Lang } from '@/lib/types';
import { useCart } from '@/store/useCart';

interface ComboBannerProps {
  lang: Lang;
  onOrderSuccess?: () => void;
}

export const ComboBanner: React.FC<ComboBannerProps> = ({ lang, onOrderSuccess }) => {
  const comboPrice = 254;
  
  const { allProducts, addMultiple, setIsOpen } = useCart();

  const handleOrder = () => {
    const magnesium = allProducts.find(p => p.name.toLowerCase().includes('магний') && p.name.toLowerCase().includes('хелат'));
    const inositol = allProducts.find(p => p.name.toLowerCase().includes('инозитол'));
    
    const itemsToAdd = [];
    if (magnesium) itemsToAdd.push(magnesium);
    if (inositol) itemsToAdd.push(inositol);
    
    if (itemsToAdd.length > 0) {
      addMultiple(itemsToAdd);
    }
    setIsOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-4 relative">
      {/* Premium Floating Glow */}
      <div 
        className="absolute inset-0 pointer-events-none -z-10" 
        style={{ background: 'radial-gradient(circle at center, rgba(37,99,235,0.06) 0%, transparent 60%)' }}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-[24px] md:rounded-[32px] bg-white border border-[#2563EB]/10 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.08)] group"
      >
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#F8FAFC_0%,_#FFFFFF_100%)] opacity-100" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center">
          
          {/* LEFT: Image Section (Optimized for Harmony & Compactness) */}
          <div className="w-full sm:w-[35%] p-4 sm:p-6 flex justify-center items-center bg-[#F8FAFC]/50 relative overflow-hidden">
            <div className="relative flex items-center justify-center -space-x-8 sm:-space-x-10 my-2 sm:my-0">
              
              {/* Product 1: Magnesium */}
              <div className="relative group/img z-10">
                {/* Soft Halo Effect around the product */}
                <div className="absolute inset-0 bg-blue-400/10 blur-xl rounded-full scale-110 opacity-0 group-hover/img:opacity-100 transition-opacity duration-700" />
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  src="/magnesium_source.jpg" 
                  alt="Магний Хелат"
                  className="w-[90px] h-[105px] sm:w-[110px] sm:h-[130px] object-contain relative z-10"
                  style={{ 
                    WebkitMaskImage: 'radial-gradient(circle at center, black 50%, transparent 95%)',
                    maskImage: 'radial-gradient(circle at center, black 50%, transparent 95%)'
                  }}
                />
              </div>

              {/* Product 2: Inositol */}
              <div className="relative group/img z-0">
                <div className="absolute inset-0 bg-blue-400/10 blur-xl rounded-full scale-110 opacity-0 group-hover/img:opacity-100 transition-opacity duration-700" />
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  src="/inositol_source.jpg" 
                  alt="Инозитол"
                  className="w-[90px] h-[105px] sm:w-[110px] sm:h-[130px] object-contain relative z-10"
                  style={{ 
                    WebkitMaskImage: 'radial-gradient(circle at center, black 50%, transparent 95%)',
                    maskImage: 'radial-gradient(circle at center, black 50%, transparent 95%)'
                  }}
                />
              </div>

            </div>
            {/* Soft border for the image section */}
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-black/[0.03] to-transparent hidden sm:block" />
          </div>

          {/* RIGHT: Content Section */}
          <div className="w-full sm:w-[65%] p-5 sm:p-6 flex flex-col items-center sm:items-start text-center sm:text-left gap-4">
            
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] font-bold text-[9px] uppercase tracking-[0.2em]">
                <Sparkles size={10} />
                <span>{lang === 'ru' ? 'Бестселлер GLS' : 'Бестселлери GLS'}</span>
              </div>
              
              <h2 className="text-[20px] sm:text-[24px] font-bold text-[#1D1D1F] leading-[1.2] font-outfit tracking-tight">
                {lang === 'ru' ? 'Жизнь без ПМС' : 'Ҳаёт бидуни ПМС'}{' '}
                <span className="text-[#2563EB]">& {lang === 'ru' ? 'Абсолютный Дзен' : 'Дзени Мутлақ'}</span>
              </h2>
              
              <p className="text-[13px] text-[#64748B] font-medium max-w-md leading-relaxed">
                {lang === 'ru' 
                  ? 'Восстановите баланс и спокойствие с нашим самым популярным дуэтом.' 
                  : 'Мувозинат ва оромиро бо дуэти маъмултарини мо барқарор кунед.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 w-full pt-1">
              {/* Price Tag */}
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider">Комбо-цена</span>
                <div className="flex items-baseline gap-0.5 text-[#1D1D1F]">
                  <span className="text-[28px] sm:text-[32px] font-bold font-outfit tracking-tighter leading-none">{comboPrice}</span>
                  <span className="text-[14px] font-bold text-[#94A3B8] uppercase">смн</span>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleOrder}
                className="flex-1 sm:flex-none h-11 sm:h-12 px-6 bg-[#1D1D1F] text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all duration-300 shadow-md active:scale-95 group/btn min-w-[150px] sm:min-w-0"
              >
                <ShoppingBag size={16} fill="currentColor" className="group-hover/btn:scale-110 transition-transform" />
                <span>{lang === 'ru' ? 'Купить комбо' : 'Харидани маҷмӯа'}</span>
                <ArrowRight size={14} className="opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

        </div>

        {/* Decorative thin accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#2563EB]/10 to-transparent" />
      </motion.div>
    </div>
  );
};
