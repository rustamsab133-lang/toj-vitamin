"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart } from '@/store/useCart';
import { CartDrawer } from '@/components/CartDrawer';
import { OrderSuccessOverlay } from '@/components/OrderSuccessOverlay';
import { Lang } from '@/lib/types';

interface ProductPageHeaderProps {
  lang: Lang;
}

export function ProductPageHeader({ lang }: ProductPageHeaderProps) {
  const { setIsOpen: setIsCartOpen, totalItems } = useCart();
  const totalCartItems = totalItems();

  return (
    <div className="w-full h-[80px] bg-white/80 backdrop-blur-md border-b border-black/[0.05] sticky top-0 z-50 flex items-center px-6 sm:px-12">
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-[#1D1D1F] font-bold hover:text-[#1E40AF] transition-colors bg-white border border-black/5 px-4 py-2 rounded-full shadow-sm hover:shadow-md"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-outfit">
            {lang === 'ru' ? 'Вернуться в каталог' : 'Бозгашт ба каталог'}
          </span>
        </Link>
        
        {/* Shopping Cart Button */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="h-10 w-10 flex items-center justify-center rounded-full bg-white/40 hover:bg-white/80 transition-all text-[#1D1D1F] border border-white/50 backdrop-blur-sm active:scale-90 relative pointer-events-auto"
          aria-label="Cart"
        >
          <ShoppingBag size={17} />
          {totalCartItems > 0 && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#1E40AF] text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
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
      <OrderSuccessOverlay 
        isVisible={isOrderSuccess} 
        onClose={() => setIsOrderSuccess(false)} 
        lang={lang} 
      />
    </>
  );
}
