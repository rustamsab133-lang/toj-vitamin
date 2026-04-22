"use client";
import React from 'react';
import { ShoppingBag, Check, MessageCircle } from 'lucide-react';
import { Product, Lang } from '@/lib/types';
import { useCart } from '@/store/useCart';
import { motion, AnimatePresence } from 'framer-motion';

export const ProductBuyButton = ({ product, lang, whatsappNumber = "992176660707" }: { product: Product, lang: Lang, whatsappNumber?: string }) => {
  const handleBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // ─── GA4 Tracking ───────────────────────────────────────────────────
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'whatsapp_order_click', {
        product_id: product.id,
        product_name: product.name,
        price: product.price
      });
    }

    const message = lang === 'ru' 
      ? `Здравствуйте! Хочу заказать: ${product.name}. Цена: ${product.price} смн.`
      : `Салом! Ман мехоҳам фармоиш диҳам: ${product.name}. Нарх: ${product.price} смн.`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleBuy}
      className="h-[68px] px-12 rounded-[24px] font-bold text-[18px] shadow-2xl transition-colors flex items-center justify-center gap-3 w-full sm:w-auto overflow-hidden relative bg-[#1D1D1F] text-white hover:bg-[#25D366]"
    >
      <div className="flex items-center gap-3">
        <MessageCircle size={24} fill="currentColor" />
        <span className="font-outfit">
          {lang === 'ru' ? 'Заказать в WhatsApp' : 'Фармоиш дар WhatsApp'}
        </span>
      </div>
      
      {/* Subtle shine effect */}
      <motion.div 
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
      />
    </motion.button>
  );
};
