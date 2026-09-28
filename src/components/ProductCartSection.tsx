"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCart } from '@/store/useCart';
import { CartDrawer } from '@/components/CartDrawer';
import { CartToast } from '@/components/CartToast';
import { OrderSuccessOverlay } from '@/components/OrderSuccessOverlay';
import { Lang } from '@/lib/types';

interface ProductPageHeaderProps {
  lang: Lang;
}

export function ProductPageHeader({ lang }: ProductPageHeaderProps) {
  const { setIsOpen: setIsCartOpen, totalItems } = useCart();
  const totalCartItems = totalItems();

  return (
    <div className="w-full h-[80px] bg-white/80 backdrop-blur-md border-b border-black/[0.05] sticky top-0 z-50 flex items-center px-4 sm:px-12">
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-[#1D1D1F] font-bold hover:text-emerald-700 transition-colors bg-white border border-black/5 px-3.5 py-2 rounded-full shadow-sm hover:shadow-md text-xs sm:text-sm"
          >
            <ArrowLeft size={16} />
            <span className="font-outfit hidden sm:inline">
              {lang === 'en' ? 'Back to Catalog' : (lang === 'ru' ? 'Вернуться в каталог' : 'Бозгашт ба каталог')}
            </span>
          </Link>
          
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-slate-200/80 p-0.5 shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
              <Image 
                src="/logo-square.webp" 
                alt="TOJ-VITAMIN" 
                width={32} 
                height={32} 
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 hidden xs:inline">
              TOJ-VITAMIN
            </span>
          </Link>
        </div>
        
        {/* Shopping Cart Button */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/75 hover:bg-white/85 transition-all text-[#1D1D1F] border border-white/50 backdrop-blur-sm active:scale-90 relative pointer-events-auto"
          aria-label="Cart"
        >
          <ShoppingBag size={17} />
          {totalCartItems > 0 && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#1E40AF] text-[9px] font-bold text-white flex items-center justify-center">
              {totalCartItems}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

interface ProductCartSectionProps {
  lang: Lang;
  product?: any;
}

export function ProductCartSection({ lang, product }: ProductCartSectionProps) {
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  const { addItem, setIsOpen } = useCart();

  React.useEffect(() => {
    if (typeof window !== 'undefined' && product) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('buy') === '1') {
        // 1. Добавить продукт в корзину
        addItem(product);
        // 2. Открыть корзину
        setIsOpen(true);
        // 3. Удалить параметр buy из URL, чтобы при перезагрузке товар не добавлялся снова
        const url = new URL(window.location.href);
        url.searchParams.delete('buy');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  }, [product, addItem, setIsOpen]);

  return (
    <>
      <CartDrawer 
        lang={lang} 
        onOrderSuccess={() => setIsOrderSuccess(true)}
      />
      <CartToast lang={lang} />
      <OrderSuccessOverlay 
        isVisible={isOrderSuccess} 
        onClose={() => setIsOrderSuccess(false)} 
        lang={lang} 
      />
    </>
  );
}
