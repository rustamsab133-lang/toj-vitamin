"use client";
import React from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { Product, Lang } from '@/lib/types';
import { useCart } from '@/store/useCart';
import { motion, AnimatePresence } from 'framer-motion';

export const ProductBuyButton = ({ product, lang }: { product: Product, lang: Lang }) => {
  const { addItem, items, setIsOpen } = useCart();
  const [isAdded, setIsAdded] = React.useState(false);

  // Check if item is in cart
  const cartItem = items.find(item => item.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  const handleBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    setIsAdded(true);
    setIsOpen(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleBuy}
      className={`h-[68px] px-12 rounded-[24px] font-bold text-[18px] shadow-2xl transition-colors flex items-center justify-center gap-3 w-full sm:w-auto overflow-hidden relative ${
        isAdded || quantity > 0 ? 'bg-[#15803D] text-white' : 'bg-[#1D1D1F] text-white hover:bg-[#1E40AF]'
      }`}
    >
      <AnimatePresence mode="wait">
        {isAdded || quantity > 0 ? (
          <motion.div
            key="added"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="flex items-center gap-3"
          >
            <Check size={24} />
            <span className="font-outfit">
              {lang === 'ru' ? `В корзине (${quantity})` : `Дар сабад (${quantity})`}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="buy"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="flex items-center gap-3"
          >
            <ShoppingBag size={24} />
            <span className="font-outfit">
              {lang === 'ru' ? 'В корзину' : 'Ба сабад'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Subtle shine effect */}
      <motion.div 
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
      />
    </motion.button>
  );
};
