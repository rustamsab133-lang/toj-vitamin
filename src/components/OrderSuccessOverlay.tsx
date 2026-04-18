"use client";
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShoppingBag, Sparkles } from 'lucide-react';

interface OrderSuccessOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  lang: 'ru' | 'tj';
}

export const OrderSuccessOverlay: React.FC<OrderSuccessOverlayProps> = ({ isVisible, onClose, lang }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4500); // 4.5 seconds of glory
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#000000]/60 backdrop-blur-xl"
        >
          {/* Particles removed for stability */}

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative z-10 w-[90%] max-w-sm bg-white/10 border border-white/20 backdrop-blur-2xl rounded-[48px] p-10 flex flex-col items-center text-center shadow-[0_50px_100px_rgba(0,0,0,0.3)]"
          >
            {/* Animated Checkmark Circle */}
            <div className="relative mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-[#1D1D1F] shadow-[0_0_50px_rgba(255,255,255,0.3)]"
              >
                <CheckCircle2 size={48} strokeWidth={1.5} />
              </motion.div>
              
              <motion.div 
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-white pointer-events-none"
              />
            </div>

            <div className="space-y-4">
              <motion.h4 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-[28px] font-bold text-white font-outfit tracking-tight leading-tight"
              >
                {lang === 'ru' ? 'Заказ оформлен!' : 'Фармоиш қабул шуд!'}
              </motion.h4>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-white/60 text-[15px] leading-relaxed"
              >
                {lang === 'ru' 
                  ? 'Мы уже перенаправляем вас в WhatsApp для подтверждения деталей.' 
                  : 'Мо аллакай шуморо ба WhatsApp барои тасдиқи тафсилот мефиристем.'}
              </motion.p>
            </div>

            {/* Interaction Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-10 flex items-center gap-3 py-3 px-6 rounded-2xl bg-white text-black text-[13px] font-bold uppercase tracking-widest shadow-xl"
            >
              <ShoppingBag size={16} />
              <span>TOJ-VITAMIN</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
