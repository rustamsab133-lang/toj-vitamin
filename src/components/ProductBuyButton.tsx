"use client";
import React, { useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { Product, Lang } from '@/lib/types';
import { useCart } from '@/store/useCart';
import { motion } from 'framer-motion';

import { trackEvent } from '@/lib/analytics';

export const ProductBuyButton = ({ product, lang }: { product: Product, lang: Lang }) => {
  const { addItem, triggerAnimation, triggerToast } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  const handleBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // ─── Unified Tracking (GA4 + Meta CAPI + DB) ────────────────────────
    trackEvent({
      event_name: 'add_to_cart',
      data: {
        product_id: product.id,
        product_name: product.name,
        price: product.price
      }
    });

    addItem(product);
    triggerAnimation();
    triggerToast(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2500);
  };
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleBuy}
      className={`h-[68px] px-12 rounded-[24px] font-bold text-[18px] shadow-2xl transition-all flex items-center justify-center gap-3 w-full sm:w-auto overflow-hidden relative group ${
        isAdded
          ? 'bg-emerald-600 text-white shadow-emerald-600/30'
          : 'bg-[#1D1D1F] text-white hover:bg-indigo-600'
      }`}
    >
      <div className="flex items-center gap-3">
        {isAdded ? (
          <>
            <Check size={24} className="stroke-[3]" />
            <span className="font-outfit">
              {lang === 'en' ? 'Added to Cart' : (lang === 'ru' ? 'Добавлено в корзину' : 'Ба сабад илова шуд')}
            </span>
          </>
        ) : (
          <>
            <ShoppingBag size={24} fill="currentColor" />
            <span className="font-outfit">
              {lang === 'en' ? 'Add to Cart' : (lang === 'ru' ? 'Добавить в корзину' : 'Илова ба сабад')}
            </span>
          </>
        )}
      </div>
      
      {/* Subtle shine effect — runs only on hover */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:animate-[shimmer_2.5s_linear_infinite] transition-opacity duration-300"
      />
    </motion.button>
  );
};
