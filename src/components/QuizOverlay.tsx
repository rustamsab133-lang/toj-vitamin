"use client";
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag } from 'lucide-react';
import { Lang } from '@/lib/types';
import { useThemeStore } from '@/store/useTheme';
import { useCart } from '@/store/useCart';
import { QuizEngine } from './QuizEngine';
import Image from 'next/image';

interface QuizOverlayProps {
  lang: Lang;
}

export const QuizOverlay: React.FC<QuizOverlayProps> = ({ lang }) => {
  const isQuizOpen = useThemeStore(state => state.isQuizOpen);
  const setIsQuizOpen = useThemeStore(state => state.setIsQuizOpen);
  const totalCartItems = useCart(state => state.totalItems());
  const setIsCartOpen = useCart(state => state.setIsOpen);

  const handleClose = () => {
    setIsQuizOpen(false);
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#quiz' || window.location.hash === '#synergy') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  };

  // Lock body scroll when open
  useEffect(() => {
    if (isQuizOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isQuizOpen]);

  return (
    <AnimatePresence>
      {isQuizOpen && (
        <motion.div
          key="quiz-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[150] bg-[#FAF8F5] overflow-y-auto flex flex-col selection:bg-[#1E40AF] selection:text-white"
        >
          {/* STICKY TOP BAR */}
          <div className="sticky top-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-xl border-b border-black/[0.06] px-4 md:px-8 py-3.5 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            {/* Left: Brand info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-black/[0.04] p-0.5 overflow-hidden flex items-center justify-center">
                <Image
                  src="/logo-square.webp"
                  alt="TOJ-VITAMIN"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[14px] text-[#1D1D1F] font-outfit uppercase tracking-wider">
                    TOJ-VITAMIN
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-700 tracking-wider">
                    {lang === 'en' ? 'Synergy Lab' : (lang === 'ru' ? 'Подбор синергии' : 'Лабораторияи синергия')}
                  </span>
                </div>
                <span className="text-[10px] text-[#1D1D1F]/50 font-medium">
                  {lang === 'en' ? 'Clinical Assessment Algorithm' : (lang === 'ru' ? 'Клинический алгоритм связок 1+1=3' : 'Алгоритми ташхиси клиникӣ')}
                </span>
              </div>
            </div>

            {/* Right: Cart & Close button */}
            <div className="flex items-center gap-3">
              {totalCartItems > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="h-10 px-3.5 rounded-full bg-white border border-black/10 text-[#1D1D1F] flex items-center gap-2 shadow-sm hover:scale-105 active:scale-95 transition-all"
                >
                  <ShoppingBag size={16} className="text-blue-600" />
                  <span className="text-xs font-bold">{totalCartItems}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="h-10 px-4 sm:px-5 rounded-full bg-[#1D1D1F] hover:bg-[#1E40AF] text-white flex items-center gap-2 text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all font-outfit"
              >
                <X size={16} />
                <span>{lang === 'en' ? 'Close & Return to Catalog' : (lang === 'ru' ? '✕ Закрыть и в каталог' : '✕ Пӯшидан ва ба каталог')}</span>
              </button>
            </div>
          </div>

          {/* MAIN QUIZ CONTAINER */}
          <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:py-12">
            <QuizEngine lang={lang} onImmersiveChange={() => {}} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
