"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Minus, Plus, Trash2, Zap, ShieldCheck, ArrowRight, Ticket, Gift, Phone, Trash } from 'lucide-react';
import { useCart } from '@/store/useCart';
import { useClient } from '@/store/useClient';
import { Lang, Product } from '@/lib/types';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { getMarkupSettings, applyMarkupToPrice } from '@/lib/markup';

interface CartItem extends Product {
  quantity: number;
}

interface CartDrawerProps {
  lang: Lang;
  onOrderSuccess?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ lang, onOrderSuccess }) => {
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

  const { client, isAuth } = useClient();

  // New states
  const [clientPhone, setClientPhone] = useState('');
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [shakePromo, setShakePromo] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);

  // Lock body scroll when cart drawer is open to prevent background scroll chaining
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Sync phone number when client registers/logs in or drawer opens
  useEffect(() => {
    if (isOpen) {
      if (client && client.phone) {
        // Strip +992 if present to show only 9 digits
        const clean = client.phone.replace('+992', '');
        setClientPhone(clean);
      } else {
        setClientPhone('');
      }
      // Reset errors
      setPromoError('');
      setShakePromo(false);
    }
  }, [isOpen, client]);

  // Auto-apply promo code from UTM/Referral blogger session
  useEffect(() => {
    if (isOpen && !appliedPromo && typeof window !== 'undefined') {
      const utmSource = sessionStorage.getItem('utm_source');
      if (utmSource) {
        const autoApplyBloggerPromo = async () => {
          try {
            const response = await fetch('/api/promo', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get_by_blogger', username: utmSource.trim() })
            });
            const result = await response.json();
            if (response.ok && result.found && result.promocode) {
              setAppliedPromo(result.promocode);
              setIsPromoOpen(true);
            }
          } catch (err) {
            console.error('Failed to auto-apply blogger promocode:', err);
          }
        };
        autoApplyBloggerPromo();
      }
    }
  }, [isOpen, appliedPromo]);

  const FREE_DELIVERY_LIMIT = 300;
  const currentTotal = totalAmount();

  // Promocode Calculations
  const discountAmount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.discount_type === 'percentage') {
      return Math.round((currentTotal * Number(appliedPromo.discount_value)) / 100);
    } else {
      return Math.min(Number(appliedPromo.discount_value), currentTotal);
    }
  }, [appliedPromo, currentTotal]);

  const discountedTotal = Math.max(currentTotal - discountAmount, 0);

  const progressToFree = Math.min((discountedTotal / FREE_DELIVERY_LIMIT) * 100, 100);
  const remainingForFree = Math.max(FREE_DELIVERY_LIMIT - discountedTotal, 0);

  // Fallback trending - products that are NOT in cart and not already suggested
  const trendingSuggestions = useMemo(() => {
    if (allProducts.length === 0) return [];
    const cartIds = new Set(items.map(i => i.id));
    return allProducts
      .filter(p => !cartIds.has(p.id))
      .slice(0, 3);
  }, [items, allProducts]);

  // Apply Promocode
  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setIsCheckingPromo(true);
    setPromoError('');
    setShakePromo(false);

    try {
      const codeUpper = promoInput.trim().toUpperCase();
      const response = await fetch('/api/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code: codeUpper })
      });
      const result = await response.json();

      if (!response.ok || !result.found) {
        setPromoError(lang === 'ru' ? 'Неверный или неактивный промокод' : 'Промокод нодуруст аст');
        setShakePromo(true);
        return;
      }

      const data = result.promocode;

      // Expiry check
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError(lang === 'ru' ? 'Срок действия промокода истек' : 'Мӯҳлати промокод гузаштааст');
        setShakePromo(true);
        return;
      }

      // Limit check
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        setPromoError(lang === 'ru' ? 'Этот промокод больше недоступен' : 'Ин промокод дигар дастрас нест');
        setShakePromo(true);
        return;
      }

      // Min amount check
      if (currentTotal < Number(data.min_order_amount)) {
        setPromoError(lang === 'ru'
          ? `Минимальная сумма заказа для этого промокода: ${data.min_order_amount} смн`
          : `Маблағи ҳадди ақал барои ин промокод: ${data.min_order_amount} смн`
        );
        setShakePromo(true);
        return;
      }

      setAppliedPromo(data);
      setPromoInput('');

      // Calculate discount amount for analytics
      let discountAmount = 0;
      if (data.discount_type === 'percentage') {
        discountAmount = Math.round((currentTotal * Number(data.discount_value)) / 100);
      } else {
        discountAmount = Math.min(Number(data.discount_value), currentTotal);
      }

      // Track applied promocode
      const { trackEvent } = await import('@/lib/analytics');
      trackEvent({
        event_name: 'promocode_applied',
        data: {
          code: data.code,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          discount_amount: discountAmount,
          cart_total: currentTotal
        }
      });

    } catch (err) {
      console.error("Failed to check promo", err);
      setPromoError(lang === 'ru' ? 'Ошибка проверки промокода' : 'Хатои санҷиши промокод');
      setShakePromo(true);
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError('');
  };

  // Secure checkout
  const handleCheckout = async () => {
    setIsVerifying(true);

    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      alert(lang === 'ru' ? 'Введите корректный номер телефона (9 цифр)' : 'Рақами телефони дурустро ворид кунед (9 рақам)');
      setIsVerifying(false);
      return;
    }
    const fullPhone = '+992' + cleanPhone;

    try {
      // 🛡️ SECURITY: Verify cart prices against Supabase database with pricing markup applied
      const itemIds = items.map(i => i.id);
      const { data: realProducts, error } = await supabase
        .from('products')
        .select('id, name, price')
        .in('id', itemIds);

      let verifiedTotal = 0;
      let finalItemsList = '';

      if (!error && realProducts) {
        const markupSettings = await getMarkupSettings();
        finalItemsList = items.map((item, index) => {
          const realProduct = realProducts.find(p => p.id === item.id);
          const basePrice = realProduct ? realProduct.price : item.price;
          const realPrice = applyMarkupToPrice(basePrice, markupSettings);
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

      // Re-verify promo code on database via secure API
      let verifiedDiscount = 0;
      if (appliedPromo) {
        const promoRes = await fetch('/api/promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', code: appliedPromo.code })
        });
        
        if (promoRes.ok) {
          const promoResult = await promoRes.json();
          if (promoResult.found && promoResult.promocode) {
            const dbPromo = promoResult.promocode;
            if (dbPromo.discount_type === 'percentage') {
              verifiedDiscount = Math.round((verifiedTotal * Number(dbPromo.discount_value)) / 100);
            } else {
              verifiedDiscount = Math.min(Number(dbPromo.discount_value), verifiedTotal);
            }
          }
        }
      }

      const verifiedDiscountedTotal = Math.max(verifiedTotal - verifiedDiscount, 0);

      // Get UTM tags from sessionStorage
      const utmSource = typeof window !== 'undefined' ? sessionStorage.getItem('utm_source') : null;
      const utmMedium = typeof window !== 'undefined' ? sessionStorage.getItem('utm_medium') : null;
      const utmCampaign = typeof window !== 'undefined' ? sessionStorage.getItem('utm_campaign') : null;
      
      let utmNotes = '';
      if (utmSource) {
        utmNotes = `[UTM: source=${utmSource}${utmMedium ? `, medium=${utmMedium}` : ''}${utmCampaign ? `, campaign=${utmCampaign}` : ''}]`;
      }

      // Save order in database!
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          items: items.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
          total: verifiedDiscountedTotal,
          status: 'new',
          phone: fullPhone,
          promocode: appliedPromo?.code || null,
          discount: verifiedDiscount,
          original_total: verifiedTotal,
          client_id: client?.id || null,
          operator_notes: utmNotes || null
        })
        .select('id')
        .single();

      if (orderErr) {
        console.error("Failed to insert order in DB:", orderErr);
      }

      // Increment promocode usage count in Supabase via secure API
      if (appliedPromo) {
        await fetch('/api/promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'increment', code: appliedPromo.code })
        }).catch(err => console.error("Failed to increment promo code usage:", err));
      }

      onOrderSuccess?.();
      setIsOpen(false);
      clearCart();
      setAppliedPromo(null);

    } catch (err) {
      console.error("Validation failed", err);
    } finally {
      setIsVerifying(false);
    }
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
            className="absolute inset-0 bg-black/60 md:backdrop-blur-[12px]"
          />

          {/* PREMIUM DRAWER — solid warm white with subtle depth */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 40, stiffness: 300, mass: 1 }}
            className="w-full sm:w-[480px] h-full flex flex-col relative z-10 shadow-[-20px_0_60px_rgba(0,0,0,0.15)]"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F9FB 40%, #F3F4F8 100%)'
            }}
          >

            {/* HEADER */}
            <div className="shrink-0 px-6 pt-6 pb-4 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center shadow-lg shadow-black/20">
                  <ShoppingBag size={18} />
                </div>
                <div>
                  <h2 className="text-[22px] font-bold text-[#1D1D1F] tracking-tight font-outfit leading-none">
                    {lang === 'ru' ? 'Корзина' : 'Сабад'}
                  </h2>
                  {items.length > 0 && (
                    <p className="text-[11px] font-bold text-[#94A3B8] mt-0.5">
                      {totalItems()} {lang === 'ru' ? 'товаров' : 'маҳсулот'}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full bg-[#F0F0F5] hover:bg-[#1D1D1F] hover:text-white text-[#86868B] transition-all flex items-center justify-center active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* DELIVERY PROGRESS BAR */}
            {items.length > 0 && (
              <div className="px-6 pb-4 shrink-0 relative z-10">
                <div className="bg-white rounded-2xl p-4 border border-[#E8E8ED] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${discountedTotal >= FREE_DELIVERY_LIMIT ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        {discountedTotal >= FREE_DELIVERY_LIMIT ? <ShieldCheck size={14} /> : <Zap size={14} />}
                      </div>
                      <span className="text-[12px] font-bold text-[#1D1D1F] font-outfit">
                        {discountedTotal >= FREE_DELIVERY_LIMIT 
                          ? (lang === 'ru' ? '🎉 Бесплатная доставка!' : '🎉 Расонидани ройгон!')
                          : (lang === 'ru' ? `Ещё ${remainingForFree} смн до бесплатной доставки` : `${remainingForFree} смн то расонидани ройгон`)
                        }
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-[#F0F0F5] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToFree}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={`h-full rounded-full ${discountedTotal >= FREE_DELIVERY_LIMIT ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 relative z-10 overscroll-contain">
              {items.length === 0 ? (
                <div className="h-full flex flex-col pt-12 items-center text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 rounded-full bg-[#F0F0F5] flex items-center justify-center mb-6"
                  >
                    <ShoppingBag size={40} strokeWidth={1} className="text-[#86868B]" />
                  </motion.div>
                  <h3 className="text-[22px] font-bold text-[#1D1D1F] mb-2 font-outfit">
                    {lang === 'ru' ? 'Корзина пуста' : 'Сабад холӣ'}
                  </h3>
                  <p className="text-[14px] text-[#86868B] mb-10 max-w-xs font-medium px-4">
                    {lang === 'ru'
                      ? 'Посмотрите наши бестселлеры:'
                      : 'Беҳтарин маҳсулоти мо:'}
                  </p>

                  <div className="w-full space-y-2.5">
                    {trendingSuggestions.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addItem(p)}
                        className="w-full p-3.5 rounded-2xl bg-white border border-[#E8E8ED] hover:border-blue-200 hover:shadow-md transition-all flex items-center gap-3.5 group"
                      >
                        <div className="w-11 h-11 rounded-xl bg-[#FAFAFA] flex items-center justify-center p-1.5 border border-[#F0F0F5] relative overflow-hidden">
                          <Image src={p.image_url || ''} fill sizes="44px" className="object-contain" alt="" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-bold text-[13px] text-[#1D1D1F] font-outfit line-clamp-1">{p.name}</p>
                          <p className="text-[12px] font-bold text-blue-600">{p.price} смн</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#F0F0F5] group-hover:bg-[#1D1D1F] group-hover:text-white transition-all flex items-center justify-center text-[#86868B]">
                          <Plus size={14} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* CART ITEMS */}
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
                        className="p-4 rounded-2xl bg-white border border-[#E8E8ED] shadow-sm hover:shadow-md transition-all duration-300 group"
                      >
                        <div className="flex gap-4">
                          <div className="w-[72px] h-[72px] rounded-xl bg-[#FAFAFA] border border-[#F0F0F5] flex-shrink-0 p-2 group-hover:scale-[1.03] transition-transform duration-500 relative overflow-hidden">
                            {item.image_url ? (
                              <Image src={item.image_url} alt={item.name} fill sizes="72px" className="object-contain" />
                            ) : (
                              <ShoppingBag size={24} strokeWidth={1} className="text-[#E2E8F0] mx-auto" />
                            )}
                          </div>

                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-[14px] font-bold text-[#1D1D1F] leading-[1.3] line-clamp-2 font-outfit">
                                {item.name}
                              </h4>
                              {/* DELETE BUTTON — always red */}
                              <button 
                                onClick={() => removeItem(item.id)} 
                                className="text-red-400 bg-red-50 hover:text-red-600 hover:bg-red-100 transition-all p-1.5 rounded-lg active:scale-90 shrink-0"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            <div className="flex items-center justify-between mt-2.5">
                              <div className="flex items-center gap-0.5 bg-[#F5F5F7] rounded-xl p-0.5 border border-[#E8E8ED]">
                                <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-lg hover:bg-[#1D1D1F] hover:text-white transition-all flex items-center justify-center text-[#86868B]"><Minus size={13} /></button>
                                <span className="w-7 text-center text-[14px] font-bold font-outfit text-[#1D1D1F]">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg hover:bg-[#1D1D1F] hover:text-white transition-all flex items-center justify-center text-[#86868B]"><Plus size={13} /></button>
                              </div>
                              <p className="text-[16px] font-bold text-[#1D1D1F] font-outfit">
                                {item.price * item.quantity} <span className="text-[10px] text-[#94A3B8]">смн</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* NESTED SYNERGY OFFER */}
                        {synergyProduct && !isInCart && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 pt-3 border-t border-[#F0F0F5]"
                          >
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Zap size={12} className="text-blue-600" fill="currentColor" />
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Синергия</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 border border-blue-100 relative overflow-hidden">
                                  <Image src={synergyProduct.image_url || ''} fill sizes="40px" className="object-contain" alt="" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-bold text-[#1D1D1F] line-clamp-1 font-outfit">{synergyProduct.name}</p>
                                  <p className="text-[11px] font-bold text-blue-600">{synergyProduct.price} смн</p>
                                </div>
                                <button 
                                  onClick={() => addItem(synergyProduct)}
                                  className="h-8 px-3 bg-blue-600 text-white rounded-lg text-[11px] font-bold hover:bg-[#1D1D1F] transition-all flex items-center gap-1 active:scale-95 shrink-0"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              {item.synergy_reason && (
                                <p className="mt-2 text-[10px] text-[#64748B] italic leading-relaxed">
                                  &quot;{item.synergy_reason}&quot;
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}


                </div>
              )}
            </div>

            {/* ═══════════════ STICKY FOOTER ═══════════════ */}
            {items.length > 0 && (
              <div className="shrink-0 relative z-20">
                {/* Top edge fade */}
                <div className="absolute -top-6 left-0 w-full h-6 bg-gradient-to-t from-[#F3F4F8] to-transparent pointer-events-none" />
                
                <div 
                  className="border-t border-[#E0E0E8] px-6 pt-5 pb-6 space-y-4"
                  style={{
                    background: 'linear-gradient(180deg, #F3F4F8 0%, #EDEEF3 100%)'
                  }}
                >
                  {/* PHONE INPUT */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#555] font-outfit px-0.5">
                      <Phone size={13} className="text-blue-500" />
                      {lang === 'ru' ? 'Телефон для подтверждения' : 'Телефон барои тасдиқ'}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="shrink-0 h-11 px-3.5 bg-[#E8E8ED] rounded-xl flex items-center justify-center">
                        <span className="font-extrabold text-[14px] text-[#1D1D1F] font-outfit">+992</span>
                      </div>
                      <input
                        type="tel"
                        placeholder="90 123 45 67"
                        maxLength={9}
                        value={clientPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                          setClientPhone(val);
                        }}
                        className="flex-1 h-11 px-4 rounded-xl bg-white border border-[#D8D8E0] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold text-[15px] outline-none transition-all font-outfit tracking-wider text-[#1D1D1F] placeholder:text-[#C4C4C9] placeholder:tracking-widest"
                      />
                    </div>
                  </div>

                  {/* PROMO + APPLIED PILL */}
                  <div className="space-y-2">
                    {/* Applied Promo pill */}
                    {appliedPromo && (
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 text-[12px] font-bold text-emerald-700 font-outfit">
                          <Gift size={14} className="text-emerald-500" />
                          <span>
                            {appliedPromo.code} ({appliedPromo.discount_type === 'percentage' ? `-${appliedPromo.discount_value}%` : `-${appliedPromo.discount_value} смн`})
                          </span>
                        </div>
                        <button
                          onClick={handleRemovePromo}
                          className="w-6 h-6 rounded-lg bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center active:scale-90"
                        >
                          <X size={12} />
                        </button>
                      </motion.div>
                    )}

                    {/* Promo input - always visible for maximum visibility */}
                    {!appliedPromo && (
                      <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#555] font-outfit px-0.5">
                          <Ticket size={13} className="text-indigo-600" />
                          <span>{lang === 'ru' ? 'Есть промокод?' : 'Промокод доред?'}</span>
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              placeholder={lang === 'ru' ? 'Введите промокод' : 'Ворид кардани промокод'}
                              value={promoInput}
                              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                              className="w-full h-11 px-4 rounded-xl bg-white border border-[#D8D8E0] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 font-bold text-[13px] uppercase tracking-wider outline-none transition-all font-outfit text-[#1D1D1F] placeholder:text-[#C4C4C9] placeholder:normal-case"
                            />
                          </div>
                          <button
                            onClick={handleApplyPromo}
                            disabled={isCheckingPromo || !promoInput.trim()}
                            className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[12px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center disabled:opacity-30 disabled:scale-100 shrink-0 shadow-sm shadow-indigo-600/20 font-outfit"
                          >
                            {isCheckingPromo ? (
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              'OK'
                            )}
                          </button>
                        </div>
                        {promoError && (
                          <p className="text-[10px] font-bold text-red-500 pl-1 font-outfit mt-1">
                            {promoError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Discount details between promocode block and checkout button */}
                  {appliedPromo && (
                    <div className="flex items-center justify-between text-[13px] font-bold font-outfit px-1 text-[#64748B] pt-1">
                      <span>{lang === 'ru' ? 'Скидка по промокоду:' : 'Тахфиф бо промокод:'}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="line-through text-slate-400 font-medium">{currentTotal} смн</span>
                        <span className="text-emerald-600">−{discountAmount} смн</span>
                      </div>
                    </div>
                  )}

                  {/* CHECKOUT BUTTON */}
                  <button
                    onClick={handleCheckout}
                    disabled={isVerifying}
                    className="w-full h-14 bg-[#1D1D1F] hover:bg-indigo-600 disabled:opacity-70 disabled:hover:bg-[#1D1D1F] text-white rounded-2xl font-bold text-[15px] shadow-lg shadow-black/15 transition-all flex items-center justify-center gap-3 group/btn active:scale-[0.98] disabled:scale-100 relative overflow-hidden"
                  >
                    {/* shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent animate-[shimmer_3s_linear_infinite]" style={{ backgroundSize: '200% 100%' }} />
                    
                    <div className="relative flex items-center gap-3">
                      <Zap size={16} fill="currentColor" className={isVerifying ? 'animate-pulse' : ''} />
                      <span>{isVerifying ? (lang === 'ru' ? 'Оформление...' : 'Фармоиш...') : (lang === 'ru' ? 'Оформить заказ' : 'Фармоиш додан')}</span>
                      <span className="text-white/50">•</span>
                      {appliedPromo ? (
                        <span className="font-extrabold">{discountedTotal} смн</span>
                      ) : (
                        <span className="font-extrabold">{currentTotal} смн</span>
                      )}
                      {!isVerifying && <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
