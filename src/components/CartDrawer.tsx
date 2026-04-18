"use client";
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Minus, Plus, Trash2, Zap, ShieldCheck, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useCart } from '@/store/useCart';
import { Lang, Product } from '@/lib/types';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

interface CartItem extends Product {
  quantity: number;
}

interface CartDrawerProps {
  lang: Lang;
  whatsappNumber: string;
  onOrderSuccess?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ lang, whatsappNumber, onOrderSuccess }) => {
  const {
    items,
    allProducts,
    isOpen,
    setIsOpen,
    totalAmount,
    totalItems,
    addItem,
    updateQuantity,
    removeItem,
    clearCart
  } = useCart();

  const FREE_DELIVERY_LIMIT = 300;
  const currentTotal = totalAmount();
  const progressToFree = Math.min((currentTotal / FREE_DELIVERY_LIMIT) * 100, 100);
  const remainingForFree = Math.max(FREE_DELIVERY_LIMIT - currentTotal, 0);

  // Fallback trending - products that are NOT in cart and not already suggested
  const trendingSuggestions = useMemo(() => {
    if (allProducts.length === 0) return [];
    const cartIds = new Set(items.map(i => i.id));
    return allProducts
      .filter(p => !cartIds.has(p.id))
      .slice(0, 3);
  }, [items, allProducts]);

  const [isVerifying, setIsVerifying] = useState(false);

  const handleCheckout = async () => {
    setIsVerifying(true);
    try {
      // 🛡️ SECURITY: Verify cart prices against Supabase database
      const itemIds = items.map(i => i.id);
      const { data: realProducts, error } = await supabase
        .from('products')
        .select('id, name, price')
        .in('id', itemIds);

      let verifiedTotal = 0;
      let finalItemsList = '';

      if (!error && realProducts) {
        finalItemsList = items.map((item, index) => {
          const realProduct = realProducts.find(p => p.id === item.id);
          const realPrice = realProduct ? realProduct.price : item.price;
          verifiedTotal += realPrice * item.quantity;
          return `${index + 1}. ${item.name} (${realPrice} смн) x ${item.quantity}`;
        }).join('\n');
      } else {
        // Fallback to local if DB fails momentarily
        verifiedTotal = currentTotal;
        finalItemsList = items.map((item, index) =>
          `${index + 1}. ${item.name} (${item.price} смн) x ${item.quantity}`
        ).join('\n');
      }

      const msg = lang === 'ru'
        ? `Здравствуйте! Я собрал заказ на сайте TOJ-VITAMIN:\n---\n${finalItemsList}\n---\nИтоговая сумма: ${verifiedTotal} смн\nЖду звонка для подтверждения.`
        : `Салом! Ман дар сайт фармоиш ҷамъ кардам:\n---\n${finalItemsList}\n---\nМаблағи умумӣ: ${verifiedTotal} смн\nЗанги шуморо барои тасдиқ интизорам.`;

      onOrderSuccess?.();
      setIsOpen(false);
      clearCart();

      setTimeout(() => {
        window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
      }, 800);
      
    } catch (err) {
      console.error("Validation failed", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSingleItemCheckout = (item: CartItem) => {
    const msg = lang === 'ru'
      ? `Здравствуйте! Хочу заказать:\n---\n1. ${item.name} (${item.price} смн) x ${item.quantity}\n---\nИтого: ${item.price * item.quantity} смн\nЖду звонка для подтверждения.`
      : `Салом! Мехоҳам маҳсулоти зеринро фармоиш диҳам:\n---\n1. ${item.name} (${item.price} смн) x ${item.quantity}\n---\nМаблағ: ${item.price * item.quantity} смн\nЗанги шуморо барои тасдиқ интизорам.`;

    window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end overflow-hidden">
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[8px]"
          />

          {/* PREMIUM DRAWER */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 40, stiffness: 300, mass: 1 }}
            className="w-full sm:w-[500px] h-full bg-white/60 backdrop-blur-[12px] shadow-[-20px_0_60px_rgba(0,0,0,0.2)] flex flex-col relative z-10 border-l border-white/20"
          >

            {/* HEADER */}
            <div className="shrink-0 p-8 flex items-center justify-between relative z-10">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center shadow-lg">
                    <ShoppingBag size={18} />
                  </div>
                  <h2 className="text-[26px] font-bold text-[#1D1D1F] tracking-tight font-outfit">
                    {lang === 'ru' ? 'Ваш выбор' : 'Интихоби шумо'}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-12 h-12 rounded-full bg-white/60 border border-black/[0.05] hover:bg-black hover:text-white transition-all flex items-center justify-center active:scale-90 shadow-sm"
              >
                <X size={22} />
              </button>
            </div>

            {/* DELIVERY PROGRESS BAR */}
            {items.length > 0 && (
              <div className="px-8 pb-4 shrink-0 relative z-10">
                <div className="bg-white/50 backdrop-blur-md rounded-[24px] p-4 border border-white/40 shadow-sm overflow-hidden group">
                  <div className="flex justify-between items-center mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${currentTotal >= FREE_DELIVERY_LIMIT ? 'bg-green-500/10 text-green-600' : 'bg-[#1E40AF]/10 text-[#1E40AF]'}`}>
                        {currentTotal >= FREE_DELIVERY_LIMIT ? <ShieldCheck size={14} /> : <Zap size={14} />}
                      </div>
                      <span className="text-[13px] font-bold text-[#1D1D1F] font-outfit">
                        {currentTotal >= FREE_DELIVERY_LIMIT 
                          ? (lang === 'ru' ? 'Бесплатная VIP-доставка!' : 'Расонидани ройгони VIP!')
                          : (lang === 'ru' ? `До бесплатной доставки: ${remainingForFree} смн` : `То расонидани ройгон: ${remainingForFree} смн`)
                        }
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{Math.round(progressToFree)}%</span>
                  </div>
                  <div className="h-2 w-full bg-black/[0.05] rounded-full overflow-hidden relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToFree}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full relative overflow-hidden ${currentTotal >= FREE_DELIVERY_LIMIT ? 'bg-green-500' : 'bg-[#1E40AF]'}`}
                    >
                      <motion.div 
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      />
                    </motion.div>
                  </div>
                </div>
              </div>
            )}

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto px-6 pb-44 apple-shelf-scroll relative z-10 overscroll-contain translate-z-0">
              {items.length === 0 ? (
                <div className="h-full flex flex-col pt-12 items-center text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 rounded-full bg-white/60 border border-black/[0.03] flex items-center justify-center mb-6 shadow-sm"
                  >
                    <ShoppingBag size={40} strokeWidth={1} className="text-[#86868B]" />
                  </motion.div>
                  <h3 className="text-[24px] font-bold text-[#1D1D1F] mb-3 font-outfit">
                    {lang === 'ru' ? 'Корзина пуста' : 'Сабад холӣ'}
                  </h3>
                  <p className="text-[15px] text-[#86868B] mb-12 max-w-xs font-medium px-4">
                    {lang === 'ru'
                      ? 'Посмотрите наши бестселлеры для вашего здоровья:'
                      : 'Беҳтарин маҳсулоти мо барои саломатии шумо:'}
                  </p>

                  <div className="w-full space-y-3">
                    {trendingSuggestions.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addItem(p)}
                        className="w-full p-4 rounded-[24px] bg-white/40 border border-black/[0.02] hover:bg-white hover:border-[#1E40AF]/20 transition-all flex items-center gap-4 group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-[#FBFBFB] flex items-center justify-center p-2 shadow-sm border border-black/[0.02] relative overflow-hidden">
                          <Image src={p.image_url || ''} fill sizes="48px" className="object-contain" alt="" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-bold text-[14px] text-[#1D1D1F] font-outfit line-clamp-1">{p.name}</p>
                          <p className="text-[12px] font-bold text-[#1E40AF]">{p.price} смн</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-black/[0.05] group-hover:bg-black group-hover:text-white transition-all flex items-center justify-center">
                          <Plus size={16} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => {
                    const synergyProduct = item.synergy_product_id 
                      ? allProducts.find(p => p.id === item.synergy_product_id) 
                      : null;
                    const isInCart = synergyProduct ? items.some(i => i.id === synergyProduct.id) : false;

                    return (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={item.id}
                        className="p-5 rounded-[32px] bg-white/60 border border-white/40 shadow-sm hover:shadow-md transition-all duration-500 overflow-hidden group"
                      >
                        <div className="flex gap-5">
                          <div className="w-20 h-20 rounded-[20px] bg-[#FBFBFB] border border-black/[0.03] flex-shrink-0 p-3 shadow-sm group-hover:scale-105 transition-transform duration-700 relative overflow-hidden">
                            {item.image_url ? (
                              <Image src={item.image_url} alt={item.name} fill sizes="80px" className="object-contain" />
                            ) : (
                              <ShoppingBag size={24} strokeWidth={1} className="text-[#E2E8F0] mx-auto" />
                            )}
                          </div>

                          <div className="flex-1 flex flex-col justify-between">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-[16px] font-bold text-[#1D1D1F] leading-[1.3] line-clamp-2 font-outfit">
                                {item.name}
                              </h4>
                              <p className="text-[17px] font-bold text-[#1D1D1F] font-outfit whitespace-nowrap">
                                {item.price} <span className="text-[10px] text-[#94A3B8]">смн</span>
                              </p>
                            </div>

                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-1 bg-white/60 rounded-xl p-0.5 border border-black/[0.03]">
                                <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-lg hover:bg-black hover:text-white transition-all flex items-center justify-center"><Minus size={14} /></button>
                                <span className="w-8 text-center text-[15px] font-bold font-outfit">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-lg hover:bg-black hover:text-white transition-all flex items-center justify-center"><Plus size={14} /></button>
                              </div>
                              <button onClick={() => removeItem(item.id)} className="text-[#94A3B8]/40 hover:text-[#FF3B30] transition-colors p-2"><Trash2 size={18} /></button>
                            </div>
                          </div>
                        </div>

                        {/* NESTED SYNERGY OFFER */}
                        {synergyProduct && !isInCart && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 pt-4 border-t border-black/[0.05]"
                          >
                            <div className="bg-[#1E40AF]/5 rounded-[24px] p-4 border border-[#1E40AF]/10">
                              <div className="flex items-center gap-2 mb-3">
                                <Zap size={14} className="text-[#1E40AF]" fill="currentColor" />
                                <p className="text-[11px] font-bold text-[#1E40AF] uppercase tracking-widest">Идеальная пара (Синергия)</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1 border border-black/[0.02] relative overflow-hidden shadow-sm">
                                  <Image src={synergyProduct.image_url || ''} fill sizes="48px" className="object-contain" alt="" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-bold text-[#1D1D1F] line-clamp-1 font-outfit">{synergyProduct.name}</p>
                                  <p className="text-[12px] font-bold text-[#1E40AF]">{synergyProduct.price} смн</p>
                                </div>
                                <button 
                                  onClick={() => addItem(synergyProduct)}
                                  className="h-9 px-4 bg-[#1E40AF] text-white rounded-full text-[12px] font-bold hover:bg-[#1D1D1F] transition-all flex items-center gap-1 active:scale-95"
                                >
                                  <Plus size={14} />
                                  {lang === 'ru' ? 'Добавить' : 'Илова'}
                                </button>
                              </div>
                              {item.synergy_reason && (
                                <p className="mt-2 text-[11px] text-[#64748B] italic leading-relaxed">
                                  "{item.synergy_reason}"
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* BOTTOM TRENDING RECS */}
                  <div className="pt-4">
                    <h4 className="text-[12px] font-bold text-[#1D1D1F] uppercase tracking-[0.2em] mb-4 px-2">Популярно сейчас</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {trendingSuggestions.map(p => (
                        <button
                          key={p.id}
                          onClick={() => addItem(p)}
                          className="p-4 rounded-[24px] bg-white/40 border border-black/[0.02] hover:bg-white transition-all flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-[#FBFBFB] flex items-center justify-center p-2 shadow-sm border border-black/[0.02] relative overflow-hidden">
                            <Image src={p.image_url || ''} fill sizes="48px" className="object-contain" alt="" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-bold text-[14px] text-[#1D1D1F] font-outfit line-clamp-1">{p.name}</p>
                            <p className="text-[12px] font-bold text-[#1E40AF]">{p.price} смн</p>
                          </div>
                          <Plus size={16} className="text-[#94A3B8] group-hover:text-black" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACTION PILL */}
            {items.length > 0 && (
              <div className="absolute bottom-6 left-0 w-full px-6 pointer-events-none z-50">
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="pointer-events-auto max-w-md mx-auto bg-white/60 backdrop-blur-[60px] border border-white/40 shadow-[0_30px_70px_rgba(0,0,0,0.2)] rounded-[40px] p-5 flex items-center justify-between gap-6"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.2em]">Итого</span>
                    <h3 className="text-[26px] font-bold text-[#1D1D1F] font-outfit leading-none">
                      {currentTotal} <span className="text-[12px] text-[#94A3B8] uppercase">смн</span>
                    </h3>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isVerifying}
                    className="flex-1 h-[64px] bg-[#1D1D1F] text-white rounded-[24px] font-bold text-[16px] shadow-xl hover:bg-[#1E40AF] active:scale-[0.97] transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn disabled:opacity-70 disabled:scale-100"
                  >
                    <Zap size={18} fill="currentColor" className={isVerifying ? 'animate-pulse' : ''} />
                    <span>{isVerifying ? (lang === 'ru' ? 'Проверка...' : 'Санҷиш...') : (lang === 'ru' ? 'Оформить заказ' : 'Фармоиш')}</span>
                    {!isVerifying && <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />}
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
