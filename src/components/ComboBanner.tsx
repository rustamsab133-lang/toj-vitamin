import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Lang } from '@/lib/types';

interface ComboBannerProps {
  lang: Lang;
  whatsappNumber: string;
  onOrderSuccess?: () => void;
}

export const ComboBanner: React.FC<ComboBannerProps> = ({ lang, whatsappNumber, onOrderSuccess }) => {
  const comboPrice = 254;
  
  const handleOrder = () => {
    const message = lang === 'ru'
      ? `Здравствуйте! Хочу заказать комбо: Инозитол + Магний Хелат. Цена: ${comboPrice} смн.`
      : `Салом! Ман мехоҳам маҷмӯаро фармоиш диҳам: Инозитол + Магний Хелат. Нарх: ${comboPrice} смн.`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    
    if (onOrderSuccess) onOrderSuccess();
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 relative">
      {/* Premium Floating Glow */}
      <div className="absolute inset-0 bg-[#2563EB]/5 blur-[80px] rounded-[40px] pointer-events-none -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden rounded-[32px] md:rounded-[40px] bg-white border border-[#2563EB]/10 shadow-[0_30px_60px_-15px_rgba(37,99,235,0.1)] group"
      >
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#F8FAFC_0%,_#FFFFFF_100%)] opacity-100" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center">
          
          {/* LEFT: Image Section (Optimized for Harmony) */}
          <div className="w-full md:w-[45%] p-8 md:p-10 flex justify-center items-center bg-[#F8FAFC]/50 relative overflow-hidden">
            <div className="relative flex items-center justify-center gap-2 md:gap-4">
              
              {/* Product 1: Magnesium */}
              <div className="relative group/img">
                {/* Soft Halo Effect around the product */}
                <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full scale-110 opacity-0 group-hover/img:opacity-100 transition-opacity duration-700" />
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  src="/magnesium_source.jpg" 
                  alt="Магний Хелат"
                  className="w-[140px] h-[160px] md:w-[180px] md:h-[210px] object-contain relative z-10"
                  style={{ 
                    WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 95%)',
                    maskImage: 'radial-gradient(circle at center, black 40%, transparent 95%)'
                  }}
                />
              </div>

              {/* Product 2: Inositol */}
              <div className="relative group/img">
                <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full scale-110 opacity-0 group-hover/img:opacity-100 transition-opacity duration-700" />
                <motion.img
                  whileHover={{ scale: 1.05 }}
                  src="/inositol_source.jpg" 
                  alt="Инозитол"
                  className="w-[140px] h-[160px] md:w-[180px] md:h-[210px] object-contain relative z-10"
                  style={{ 
                    WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 95%)',
                    maskImage: 'radial-gradient(circle at center, black 40%, transparent 95%)'
                  }}
                />
              </div>

            </div>
            {/* Soft border for the image section */}
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-black/[0.03] to-transparent hidden md:block" />
          </div>

          {/* RIGHT: Content Section */}
          <div className="w-full md:w-[55%] p-8 md:p-10 flex flex-col items-center md:items-start text-center md:text-left gap-6">
            
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#2563EB]/10 text-[#2563EB] font-bold text-[10px] uppercase tracking-[0.2em]">
                <Sparkles size={12} />
                <span>{lang === 'ru' ? 'Бестселлер GLS' : 'Бестселлери GLS'}</span>
              </div>
              
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#1D1D1F] leading-[1.1] font-outfit tracking-tight">
                {lang === 'ru' ? 'Жизнь без ПМС' : 'Ҳаёт бидуни ПМС'} <br className="hidden md:block" />
                <span className="text-[#2563EB]">& {lang === 'ru' ? 'Абсолютный Дзен' : 'Дзени Мутлақ'}</span>
              </h2>
              
              <p className="text-[14px] md:text-[16px] text-[#64748B] font-medium max-w-sm">
                {lang === 'ru' 
                  ? 'Восстановите баланс и спокойствие с нашим самым популярным дуэтом.' 
                  : 'Мувозинат ва оромиро бо дуэти маъмултарини мо барқарор кунед.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 w-full">
              {/* Price Tag */}
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Комбо-цена</span>
                <div className="flex items-baseline gap-1 text-[#1D1D1F]">
                  <span className="text-[42px] md:text-[48px] font-bold font-outfit tracking-tighter leading-none">{comboPrice}</span>
                  <span className="text-[18px] font-bold text-[#94A3B8] uppercase">смн</span>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleOrder}
                className="flex-1 md:flex-none h-14 md:h-16 px-8 bg-[#1D1D1F] text-white rounded-2xl text-[15px] font-bold flex items-center justify-center gap-3 hover:bg-[#25D366] transition-all duration-500 shadow-lg active:scale-95 group/btn min-w-[200px]"
              >
                <MessageCircle size={20} fill="currentColor" className="group-hover/btn:scale-110 transition-transform" />
                <span>{lang === 'ru' ? 'Купить в WhatsApp' : 'Бо WhatsApp харед'}</span>
                <ArrowRight size={16} className="opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
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
