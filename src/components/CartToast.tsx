"use client";

import React, { useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, X, Check } from 'lucide-react';
import { useCart } from '@/store/useCart';
import { Lang } from '@/lib/types';
import { getLocalizedProductName } from '@/lib/productLocalization';

interface CartToastProps {
  lang: Lang;
}

export const CartToast: React.FC<CartToastProps> = ({ lang }) => {
  const { showToast, toastItem, hideToast, setIsOpen: setIsCartOpen } = useCart();
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [toastItem?.product?.id]);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => {
      hideToast();
    }, 3500);

    return () => clearTimeout(timer);
  }, [showToast, toastItem, hideToast]);

  const handleOpenCart = () => {
    hideToast();
    setIsCartOpen(true);
  };

  return (
    <AnimatePresence>
      {showToast && toastItem && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[92%] sm:w-auto min-w-[320px] max-w-md bg-[#1D1D1F]/95 backdrop-blur-xl text-white rounded-2xl p-2.5 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/10 flex items-center justify-between gap-3 pointer-events-auto"
          style={{ transform: 'translate3d(-50%,0,0)' }}
        >
          {/* Thumbnail & Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-11 h-11 rounded-xl bg-white border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-0.5">
              {toastItem.product.image_url && !imageError ? (
                <Image
                  src={toastItem.product.image_url}
                  alt={getLocalizedProductName(toastItem.product.name, lang)}
                  fill
                  unoptimized
                  sizes="44px"
                  onError={() => setImageError(true)}
                  className="object-contain p-0.5"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-500/20 text-emerald-400">
                  <Check size={18} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold tracking-wide">
                <Check size={13} className="shrink-0 stroke-[3]" />
                <span className="truncate">
                  {toastItem.title || (lang === 'en' ? 'Added to cart' : (lang === 'ru' ? 'Добавлено в корзину' : 'Ба сабад илова шуд'))}
                </span>
              </div>
              <p className="text-[13px] font-bold text-white truncate font-outfit mt-0.5">
                {getLocalizedProductName(toastItem.product.name, lang)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenCart}
              className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[12px] font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/30"
            >
              <ShoppingBag size={14} />
              <span>{lang === 'en' ? 'To Cart' : (lang === 'ru' ? 'В корзину' : 'Ба сабад')}</span>
              <ArrowRight size={13} />
            </button>

            <button
              type="button"
              onClick={hideToast}
              className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
