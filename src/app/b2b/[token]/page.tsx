"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, Plus, Minus, Check, Loader2, AlertCircle, Calendar, MessageSquare, ShieldAlert, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface B2BProduct {
  id: string;
  name: string;
  full_name: string;
  description: string;
  image_url: string | null;
  icon_type: string;
  retail_price: number;
  price: number; // специальная B2B цена со скидкой
  discount_percent: number;
}

interface B2BPharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  contact_person: string;
  discount_percent: number;
  credit_limit: number;
  balance: number;
}

export default function B2BOrderPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pharmacy, setPharmacy] = useState<B2BPharmacy | null>(null);
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [search, setSearch] = useState('');
  
  // Cart state: Record of productId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [submittedTotal, setSubmittedTotal] = useState(0);
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isCartMobileOpen, setIsCartMobileOpen] = useState(false);

  useEffect(() => {
    loadB2BData();
  }, [token]);

  const loadB2BData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/b2b/pharmacy?token=${token}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка загрузки данных');
      }

      setPharmacy(data.pharmacy);
      setProducts(data.products);
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить страницу заказа');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('toj_b2b_token');
      localStorage.removeItem('toj_b2b_name');
      router.replace('/b2b');
    }
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      p.id.includes(q)
    );
  }, [products, search]);

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const prod = products.find(p => p.id === id);
        return prod ? { product: prod, quantity: qty } : null;
      })
      .filter((item): item is { product: B2BProduct; quantity: number } => item !== null);
  }, [cart, products]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cartItems]);

  const totalQty = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0 || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        token,
        items: cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        notes,
        delivery_date: deliveryDate || null
      };

      const res = await fetch('/api/b2b/pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при отправке заказа');
      }

      setSubmittedOrderId(data.order_id);
      setSubmittedTotal(totalAmount);
      
      // Update local pharmacy balance
      if (pharmacy) {
        setPharmacy({
          ...pharmacy,
          balance: data.balance
        });
      }

      setCart({});
      setIsCartMobileOpen(false);
      setNotes('');
      setDeliveryDate('');
    } catch (err: any) {
      alert(err.message || 'Не удалось оформить заказ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsAppNotification = () => {
    if (!pharmacy || !submittedOrderId) return;
    const itemsText = cartItems.length > 0 
      ? cartItems.map((item, idx) => `${idx + 1}. ${item.product.name} (${item.product.price} смн) x ${item.quantity}`).join('\n')
      : 'Товары';
    
    const msg = `Здравствуйте! Аптека "${pharmacy.name}" оформила B2B заказ на сайте TOJ-VITAMIN:\n---\nСумма: ${submittedTotal} смн\nID заказа: #${submittedOrderId.slice(0, 8)}\n---\nОжидаем подтверждения и доставки.`;
    const waUrl = `https://wa.me/992176660707?text=${encodeURIComponent(msg)}`;
    window.location.href = waUrl;
  };

  // UI States
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-500 font-sans">
        <Loader2 className="animate-spin text-slate-800 mb-4" size={36} />
        <p className="font-bold text-sm">Загрузка кабинета партнера...</p>
      </div>
    );
  }

  if (error || !pharmacy) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto font-sans">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4 border border-red-100 shadow-sm">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Ссылка недействительна</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          {error || 'Указанная ссылка устарела, была аннулирована администратором или содержит ошибку.'}
        </p>
        <div className="w-full text-xs text-slate-400 border-t border-slate-200 pt-4 font-medium">
          Пожалуйста, свяжитесь с TOJ-VITAMIN для получения новой персональной ссылки.
        </div>
      </div>
    );
  }

  // Check if credit limit is exceeded
  const availableCredit = Math.max(pharmacy.credit_limit - pharmacy.balance, 0);
  const isCreditExceeded = totalAmount > availableCredit;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 lg:pb-0">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg overflow-hidden shadow-sm">
            <img src="/logo.webp" alt="TOJ-VITAMIN" className="w-full h-full object-contain scale-[2.8]" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
          </div>
          <div>
            <h1 className="font-extrabold text-base text-slate-900 tracking-tight leading-none">Кабинет B2B</h1>
            <p className="text-xs text-slate-400 font-bold mt-1">Партнер: {pharmacy.name}</p>
          </div>
        </div>

        {/* Pharmacy credit/discount details & logout */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex flex-wrap items-center gap-2">
            {pharmacy.discount_percent > 0 && (
              <div className="bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-100 shadow-sm">
                Скидка: {pharmacy.discount_percent}%
              </div>
            )}
            <div className="bg-blue-50 text-blue-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-100 shadow-sm">
              Лимит долга: {pharmacy.balance.toLocaleString()} / {pharmacy.credit_limit.toLocaleString()} смн
            </div>
            {availableCredit > 0 && (
              <div className="bg-slate-100 text-slate-600 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200">
                Доступно: {availableCredit.toLocaleString()} смн
              </div>
            )}
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 font-bold text-xs border border-transparent hover:border-slate-100 transition-all active:scale-95"
            title="Выйти из личного кабинета"
          >
            <LogOut size={14} /> Выйти
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Catalog Section */}
        <main className="lg:col-span-8 space-y-6">
          
          {/* Custom B2B Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
            <div className="relative z-10 max-w-lg">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-white/10 px-2.5 py-1 rounded-full">Оптовый портал</span>
              <h2 className="text-2xl font-bold tracking-tight mt-3 mb-2 font-outfit">Заказывайте напрямую по оптовым ценам</h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {pharmacy.discount_percent > 0 ? (
                  `Все цены на товары в каталоге ниже пересчитаны с учетом вашей партнерской скидки ${pharmacy.discount_percent}%. Складывайте нужные позиции и отправляйте заказ в один клик.`
                ) : (
                  `Все цены на товары в каталоге ниже пересчитаны по вашему партнерскому прайсу. Складывайте нужные позиции и отправляйте заказ в один клик.`
                )}
              </p>
            </div>
            <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient from-emerald-500/20 to-transparent opacity-50 pointer-events-none" />
          </div>

          {/* Search Row */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Быстрый поиск товаров по названию или коду..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Product Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map(p => {
              const qtyInCart = cart[p.id] || 0;
              return (
                <div 
                  key={p.id}
                  className="bg-white border border-slate-100 hover:border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group"
                >
                  <div className="space-y-3">
                    {/* Image Placeholder */}
                    <div className="aspect-[4/3] rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-50 relative">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <ShoppingCart size={24} className="text-slate-300" />
                      )}
                      {p.discount_percent > 0 && (
                        <span className="absolute top-2 left-2 text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          -{p.discount_percent}%
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 min-h-[40px] font-outfit">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">ID: {p.id}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      {pharmacy.discount_percent > 0 && (
                        <span className="text-xs text-slate-400 line-through leading-none font-bold mb-1">
                          {p.retail_price} смн
                        </span>
                      )}
                      <span className="text-base font-extrabold text-emerald-600 leading-none">
                        {p.price} <span className="text-[10px] font-bold uppercase text-emerald-500">смн</span>
                      </span>
                    </div>

                    {qtyInCart > 0 ? (
                      <div className="flex items-center bg-slate-900 text-white rounded-xl p-0.5 shadow-sm border border-slate-800">
                        <button 
                          onClick={() => updateCartQty(p.id, -1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 text-center text-xs font-bold">{qtyInCart}</span>
                        <button 
                          onClick={() => updateCartQty(p.id, 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => updateCartQty(p.id, 1)}
                        className="bg-slate-950 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <Plus size={12} /> Заказать
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 text-sm">
                Товары не найдены. Попробуйте изменить запрос.
              </div>
            )}
          </div>
        </main>

        {/* Sidebar Cart panel (Sticky on desktop) */}
        <aside className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 lg:sticky lg:top-24 hidden lg:flex flex-col max-h-[calc(100vh-120px)] overflow-y-auto">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 border-b border-slate-50 pb-3 font-outfit">
            <ShoppingCart size={20} className="text-emerald-600" /> Чек закупки
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-1">
            {cartItems.map(item => (
              <div key={item.product.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="min-w-0 pr-2 flex-1">
                  <p className="font-bold text-xs text-slate-700 truncate">{item.product.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.product.price} смн × {item.quantity}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-extrabold text-slate-800 text-xs">{item.product.price * item.quantity} смн</span>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                    <button onClick={() => updateCartQty(item.product.id, -1)} className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-[10px]"><Minus size={10}/></button>
                    <span className="w-5 text-center text-[11px] font-bold">{item.quantity}</span>
                    <button onClick={() => updateCartQty(item.product.id, 1)} className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-[10px]"><Plus size={10}/></button>
                  </div>
                </div>
              </div>
            ))}

            {cartItems.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                Корзина пуста. Добавьте товары из каталога.
              </div>
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-50">
              {/* Optional info */}
              <div className="space-y-3">
                {/* Notes */}
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1 block">Комментарий к доставке</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Например: Вход со двора, привезти в коробках..."
                    rows={2}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none bg-slate-50/50 resize-none focus:bg-white focus:border-slate-400 transition-all placeholder:text-slate-300"
                  />
                </div>

                {/* Delivery Date */}
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1 block">Желаемая дата доставки</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={e => setDeliveryDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none bg-slate-50/50 focus:bg-white focus:border-slate-400 transition-all font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Total calculations */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Товаров в корзине:</span>
                  <span className="font-bold text-slate-700">{totalQty} шт</span>
                </div>
                
                {isCreditExceeded && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-semibold leading-relaxed">
                    <AlertCircle size={12} className="shrink-0 text-amber-500" />
                    <span>Внимание: Сумма заказа превышает доступный лимит кредита ({availableCredit} смн). Заказ пойдет на одобрение.</span>
                  </div>
                )}

                <div className="flex justify-between items-end pt-2 border-t border-slate-200/50">
                  <span className="text-slate-500 font-bold text-xs">Итого к оплате:</span>
                  <span className="text-2xl font-extrabold text-slate-800 leading-none">
                    {totalAmount.toLocaleString()} <span className="text-xs uppercase text-slate-400">смн</span>
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Оформление заказа...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Подтвердить B2B заказ
                  </>
                )}
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Floating cart bar for mobile */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 p-4 shadow-2xl flex items-center justify-between lg:hidden">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Сумма заказа</span>
            <span className="text-lg font-extrabold text-slate-800">
              {totalAmount.toLocaleString()} смн
            </span>
          </div>
          <button
            onClick={() => setIsCartMobileOpen(true)}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
          >
            <ShoppingCart size={14} /> Корзина ({totalQty})
          </button>
        </div>
      )}

      {/* Mobile Cart Slider Overlay */}
      <AnimatePresence>
        {isCartMobileOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsCartMobileOpen(false)}
            />

            {/* Slider Sheet */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-white rounded-t-3xl shadow-2xl z-10 p-6 flex flex-col max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <ShoppingCart size={18} className="text-emerald-600" /> Ваша корзина
                </h3>
                <button 
                  onClick={() => setIsCartMobileOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[250px]">
                {cartItems.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="min-w-0 pr-2 flex-1">
                      <p className="font-bold text-xs text-slate-700 truncate">{item.product.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.product.price} смн × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-extrabold text-slate-800 text-xs">{item.product.price * item.quantity} смн</span>
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                        <button onClick={() => updateCartQty(item.product.id, -1)} className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-[10px]"><Minus size={10}/></button>
                        <span className="w-5 text-center text-[11px] font-bold">{item.quantity}</span>
                        <button onClick={() => updateCartQty(item.product.id, 1)} className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-[10px]"><Plus size={10}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Inputs */}
              <div className="space-y-3 mb-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1 block">Комментарий к доставке</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Например: Вход со двора..."
                    rows={2}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs outline-none bg-slate-50/50 resize-none focus:bg-white focus:border-slate-400 transition-all placeholder:text-slate-300"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1 block">Желаемая дата доставки</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none bg-slate-50/50 focus:bg-white focus:border-slate-400 transition-all font-semibold"
                  />
                </div>
              </div>

              {/* Total calculations */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Товаров в корзине:</span>
                  <span className="font-bold text-slate-700">{totalQty} шт</span>
                </div>
                
                {isCreditExceeded && (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-semibold leading-relaxed flex items-center gap-1.5">
                    <AlertCircle size={12} className="shrink-0 text-amber-500" />
                    <span>Сумма заказа превышает доступный лимит кредита ({availableCredit} смн).</span>
                  </div>
                )}

                <div className="flex justify-between items-end pt-2 border-t border-slate-200/50">
                  <span className="text-slate-500 font-bold text-xs">Итого к оплате:</span>
                  <span className="text-xl font-extrabold text-slate-800 leading-none">
                    {totalAmount.toLocaleString()} смн
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Оформление...' : 'Подтвердить B2B заказ'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Success Modal */}
      <AnimatePresence>
        {submittedOrderId && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <Check size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 tracking-tight font-outfit">Заказ успешно оформлен!</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Благодарим за заказ. Заявка зарегистрирована под номером <strong className="text-slate-700">#B2B-{submittedOrderId.slice(0, 8).toUpperCase()}</strong> на сумму {submittedTotal} смн и отправлена менеджеру на подтверждение.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {/* Whatsapp redirection */}
                <button
                  onClick={handleSendWhatsAppNotification}
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-3 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <MessageSquare size={16} fill="currentColor" /> Отправить чек в WhatsApp 💬
                </button>
                
                <button
                  onClick={() => setSubmittedOrderId(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-xs font-bold transition-all"
                >
                  Вернуться в каталог B2B
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
