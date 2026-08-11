"use client";
import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { Product, Lang } from '@/lib/types';
import { useCart } from '@/store/useCart';
import { motion } from 'framer-motion';

export const ProductBuyButton = ({ product, lang }: { product: Product, lang: Lang }) => {
  const { addItem, setIsOpen, triggerAnimation } = useCart();
  const handleBuy = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // ─── Unified Tracking (GA4 + Meta CAPI + DB) ────────────────────────
    const { trackEvent } = await import('@/lib/analytics');
    await trackEvent({
      event_name: 'add_to_cart',
      data: {
        product_id: product.id,
        product_name: product.name,
        price: product.price
      }
    });

    addItem(product);
    triggerAnimation();
    setIsOpen(true);
  };
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleBuy}
      className="h-[68px] px-12 rounded-[24px] font-bold text-[18px] shadow-2xl transition-colors flex items-center justify-center gap-3 w-full sm:w-auto overflow-hidden relative bg-[#1D1D1F] text-white hover:bg-indigo-600 group"
    >
      <div className="flex items-center gap-3">
        <ShoppingBag size={24} fill="currentColor" />
        <span className="font-outfit">
          {lang === 'ru' ? 'Добавить в корзину' : 'Илова ба сабад'}
        </span>
      </div>
      
      {/* Subtle shine effect — runs only on hover */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:animate-[shimmer_2.5s_linear_infinite] transition-opacity duration-300"
      />
    </motion.button>
  );
};
