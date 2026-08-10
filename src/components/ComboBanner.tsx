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
    <div className="max-w-4xl mx-auto px-6 py-6 md:py-10 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative rounded-[24px] md:rounded-[32px] bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border border-[#2563EB]/10 shadow-[0_20px_40px_-15px_rgba(37,99,235,0.08)] group overflow-visible"
      >
        {/* Subtle Background Pattern & Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.8)_0%,_transparent_100%)] rounded-[24px] md:rounded-[32px] pointer-events-none" />
        
        {/* Container for content, ensuring it doesn't clip the breakout images on desktop */}
        <div className="relative z-10 flex flex-col md:flex-row items-center md:min-h-[160px] p-6 md:p-8">
          
          {/* LEFT: Content Section */}
          <div className="w-full md:w-[55%] flex flex-col items-center md:items-start text-center md:text-left gap-4 md:pr-4 z-20">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] font-bold text-[10px] uppercase tracking-[0.2em] shadow-sm backdrop-blur-sm">
                <Sparkles size={12} />
                <span>{lang === 'ru' ? 'Бестселлер GLS' : 'Бестселлери GLS'}</span>
              </div>
              
              <h2 className="text-[22px] md:text-[28px] font-bold text-[#1D1D1F] leading-[1.1] font-outfit tracking-tight">
                {lang === 'ru' ? 'Жизнь без ПМС' : 'Ҳаёт бидуни ПМС'}{' '}
                <span className="text-[#2563EB]">& {lang === 'ru' ? 'Абсолютный Дзен' : 'Дзени Мутлақ'}</span>
              </h2>
              
              <p className="text-[13px] md:text-[14px] text-[#64748B] font-medium leading-relaxed max-w-sm hidden md:block">
                {lang === 'ru' 
                  ? 'Восстановите баланс и спокойствие с нашим дуэтом.' 
                  : 'Мувозинат ва оромиро бо дуэти мо барқарор кунед.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 md:gap-6 w-full pt-2">
              {/* Price Tag */}
              <div className="flex flex-col items-center md:items-start">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Комбо-цена</span>
                <div className="flex items-baseline gap-1 text-[#1D1D1F]">
                  <span className="text-[32px] md:text-[36px] font-bold font-outfit tracking-tighter leading-none">{comboPrice}</span>
                  <span className="text-[14px] font-bold text-[#94A3B8] uppercase">смн</span>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleOrder}
                className="w-full sm:w-auto h-12 px-6 bg-[#1D1D1F] text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all duration-300 shadow-xl shadow-[#1D1D1F]/20 active:scale-95 group/btn"
              >
                <ShoppingBag size={18} fill="currentColor" className="group-hover/btn:scale-110 transition-transform" />
                <span>{lang === 'ru' ? 'Купить комбо' : 'Харидани маҷмӯа'}</span>
                <ArrowRight size={16} className="opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

          {/* RIGHT: Floating Breakout Images Section */}
          <div className="w-full md:w-[45%] mt-6 md:mt-0 relative flex justify-center items-center md:absolute md:right-4 md:top-1/2 md:-translate-y-1/2 z-10 md:h-[220px]">
            
            {/* Breakout container — side by side, no overlap */}
            <div className="relative flex items-center justify-center gap-2 md:gap-4">
              
              {/* Product 1: Magnesium */}
              <div className="relative group/img md:-translate-y-4">
                <motion.img
                  whileHover={{ scale: 1.06, y: -4 }}
                  src="/magnesium_source.jpg" 
                  alt="Магний Хелат"
                  className="w-[120px] h-[140px] md:w-[155px] md:h-[185px] object-contain drop-shadow-lg transition-transform duration-500 rounded-lg"
                />
              </div>

              {/* Product 2: Inositol */}
              <div className="relative group/img md:translate-y-4">
                <motion.img
                  whileHover={{ scale: 1.06, y: -4 }}
                  src="/inositol_source.jpg" 
                  alt="Инозитол"
                  className="w-[120px] h-[140px] md:w-[155px] md:h-[185px] object-contain drop-shadow-lg transition-transform duration-500 rounded-lg"
                />
              </div>

            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
