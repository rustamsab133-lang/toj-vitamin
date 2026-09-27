"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, Plus, Minus, Check, Loader2, Calendar, MessageSquare, Phone, Info, Copy, Building2, LogIn, MapPin, User, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface B2BProduct {
  id: string;
  name: string;
  full_name: string;
  description: string;
  image_url: string | null;
  icon_type: string;
  price: number; // базовая оптовая цена из products.price
  is_hidden?: boolean;
  in_stock?: boolean;
}

export default function B2BStorefrontPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAutoRedirecting, setIsAutoRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [search, setSearch] = useState('');
  
  // Cart state: productId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [submittedTotal, setSubmittedTotal] = useState(0);
  const [submittedCustomerPhone, setSubmittedCustomerPhone] = useState('');
  const [submittedWaMessage, setSubmittedWaMessage] = useState('');
  const [isCartMobileOpen, setIsCartMobileOpen] = useState(false);

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем сохраненную сессию аптеки для автоматического входа
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('toj_b2b_token');
      if (savedToken) {
        setIsAutoRedirecting(true);
        router.replace(`/b2b/${savedToken}`);
        return;
      }
    }
    loadB2BData();
  }, [router]);

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    let digits = loginPhone.replace(/\D/g, '');
    if (digits.startsWith('992') && digits.length > 9) {
      digits = digits.slice(3);
    }
    if (digits.length < 7) {
      setLoginError('Введите корректный номер телефона (минимум 7-9 цифр)');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/b2b/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Аптека не найдена');
      }

      if (data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('toj_b2b_token', data.token);
          if (data.pharmacy_name) {
            localStorage.setItem('toj_b2b_name', data.pharmacy_name);
          }
          document.cookie = `toj_b2b_token=${data.token}; path=/; max-age=31536000; SameSite=Lax`;
        }
        router.push(`/b2b/${data.token}`);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Ошибка авторизации. Проверьте номер или оставьте заявку.');
    } finally {
      setLoginLoading(false);
    }
  };

  const loadB2BData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/b2b/pharmacy');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка загрузки данных');
      }

      setProducts(data.products || []);
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить каталог товаров');
    } finally {
      setLoading(false);
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

  const handlePhoneChange = (val: string) => {
    setPhoneError(null);
    let digits = val.replace(/\D/g, '');
    if (digits.startsWith('992') && digits.length > 9) {
      digits = digits.slice(3);
    }
    setCustomerPhone(digits.slice(0, 9));
  };

  const handleDirectCheckout = async () => {
    if (cartItems.length === 0 || isSubmitting) return;

    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setPhoneError('Укажите номер телефона (9 цифр)');
      return;
    }
    setPhoneError(null);

    setIsSubmitting(true);
    try {
      const fullPhone = `+992${cleanPhone}`;
      const customerDisplayName = customerName.trim() || 'Оптовый покупатель';

      const payload = {
        phone: fullPhone,
        pharmacy_name: customerDisplayName,
        address: customerAddress.trim(),
        contact_person: contactPerson.trim(),
        notes: '',
        delivery_date: null,
        items: cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      };

      const res = await fetch('/api/b2b/pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при оформлении заказа');
      }

      setSubmittedOrderId(data.order_id);
      setSubmittedTotal(totalAmount);
      setSubmittedCustomerPhone(fullPhone);
      
      // Construct the WhatsApp message with items list and contact details
      const orderIdShort = data.order_id.slice(0, 8).toUpperCase();
      const clientLine = customerName.trim()
        ? `Аптека: ${customerName.trim()} (${fullPhone})`
        : `Телефон: ${fullPhone}`;
      const contactLine = contactPerson.trim() ? `\n👤 Контакт: ${contactPerson.trim()}` : '';
      const addressLine = customerAddress.trim() ? `\n📍 Адрес доставки: ${customerAddress.trim()}` : '';
      const itemsText = cartItems
        .map((item, idx) => `${idx + 1}. ${item.product.name} — ${item.quantity} шт. (${item.product.price * item.quantity} смн)`)
        .join('\n');
      const msg = `Здравствуйте! Оформил оптовый заказ #B2B-${orderIdShort} на сумму ${totalAmount} смн.\n${clientLine}${contactLine}${addressLine}\n\nСостав заказа:\n${itemsText}\n\nПожалуйста, подтвердите наличие и согласуйте доставку.`;
      setSubmittedWaMessage(msg);

      // Reset cart without forced redirect
      setCart({});
      setIsCartMobileOpen(false);
    } catch (err: any) {
      alert(err.message || 'Не удалось оформить заказ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAutoRedirecting) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-500 font-sans">
        <Loader2 className="animate-spin text-emerald-600 mb-4" size={36} />
        <p className="font-bold text-base text-slate-800">Переход в личный кабинет аптеки...</p>
        <p className="text-xs text-slate-400 mt-1 font-medium">Загружаем ваши специальные условия и скидки</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-500 font-sans">
        <Loader2 className="animate-spin text-emerald-600 mb-4" size={36} />
        <p className="font-bold text-sm">Загрузка оптового каталога...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-600/10">
            TV
          </div>
          <div>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg leading-none block">TojVitamin</span>
            <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-wider">Оптовые закупки B2B</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <LogIn size={14} className="text-emerald-400" />
            Вход для аптек
          </button>
          <Link 
            href="/opt" 
            className="text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-350 px-3.5 py-2 rounded-xl transition-all hidden sm:inline-block"
          >
            Условия работы
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Catalog Section */}
        <main className="lg:col-span-8 space-y-6">
          
          {/* Custom B2B Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
            <div className="relative z-10 max-w-lg space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Базовый опт</span>
                <span className="text-[10px] font-bold text-slate-400">Прямые поставки со склада</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight font-outfit">Быстрый оптовый заказ для аптек</h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Выберите необходимые витамины и БАДы ниже. Быстрое оформление в 1 клик: соберите заказ и отправьте готовый чек напрямую менеджеру в WhatsApp.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/20 active:scale-95"
                >
                  <LogIn size={13} /> Войти в свой кабинет аптеки
                </button>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  (для цен с вашей персональной скидкой)
                </span>
              </div>
            </div>
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
              const isOutOfStock = Boolean(p.is_hidden || p.in_stock === false);
              return (
                <div 
                  key={p.id}
                  className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all group ${
                    isOutOfStock 
                      ? 'border-amber-100 bg-slate-50/40 opacity-80' 
                      : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Image */}
                    <div className="aspect-[4/3] rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-50 relative">
                      {isOutOfStock && (
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-bold shadow-sm">
                          Нет в наличии
                        </div>
                      )}
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <ShoppingCart size={24} className="text-slate-300" />
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
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Цена опт:</span>
                      <span className={`text-base font-extrabold leading-none mt-1 ${isOutOfStock ? 'text-slate-400' : 'text-emerald-600'}`}>
                        {p.price} <span className="text-[10px] font-bold uppercase text-slate-400">смн</span>
                      </span>
                    </div>

                    {isOutOfStock ? (
                      <button
                        disabled
                        className="bg-slate-100 text-slate-400 px-3 py-2 rounded-xl text-xs font-semibold cursor-not-allowed border border-slate-200"
                        title="Товар временно отсутствует на складе"
                      >
                        Нет в наличии
                      </button>
                    ) : qtyInCart > 0 ? (
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
                Коробка пуста. Добавьте товары из каталога.
              </div>
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-50">
              
              {/* Total calculations */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Выбрано позиций:</span>
                  <span className="font-bold text-slate-700">{totalQty} шт</span>
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-slate-200/50">
                  <span className="text-slate-500 font-bold text-xs">Итого к оплате:</span>
                  <span className="text-2xl font-extrabold text-slate-800 leading-none">
                    {totalAmount.toLocaleString()} <span className="text-xs uppercase text-slate-400">смн</span>
                  </span>
                </div>
              </div>

              {/* Contact info inputs */}
              <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} className="text-emerald-600" />
                      Номер телефона <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">WhatsApp / Звонок</span>
                  </label>
                  <div className={`flex items-center gap-2 rounded-xl border p-1 bg-white transition-all ${
                    phoneError ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10'
                  }`}>
                    <div className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700 select-none">
                      +992
                    </div>
                    <input
                      type="tel"
                      placeholder="90 123 45 67"
                      maxLength={9}
                      value={customerPhone}
                      onChange={e => handlePhoneChange(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-normal font-sans"
                    />
                  </div>
                  {phoneError && (
                    <p className="text-[11px] text-red-500 font-semibold mt-1 pl-1">
                      {phoneError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                    Аптека или ваше имя <span className="text-slate-400 font-normal">(необязательно)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Аптека «Шифо»"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                    Адрес доставки <span className="text-slate-400 font-normal">(город, улица, ориентир)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Например: г. Душанбе, ул. Рудаки 45"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                    Контактное лицо <span className="text-slate-400 font-normal">(провизор / зав. аптекой)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Фарида"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                onClick={handleDirectCheckout}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Оформление заказа...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Оформить оптовый заказ
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
            <span className="text-lg font-extrabold text-slate-850">
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

      {/* Mobile Cart Sheet */}
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
                <button onClick={() => setIsCartMobileOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm">✕</button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[220px]">
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

              {/* Total calculations */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Товаров в корзине:</span>
                  <span className="font-bold text-slate-700">{totalQty} шт</span>
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-slate-200/50">
                  <span className="text-slate-500 font-bold text-xs">Итого к оплате:</span>
                  <span className="text-xl font-extrabold text-slate-800 leading-none">
                    {totalAmount.toLocaleString()} смн
                  </span>
                </div>
              </div>

              {/* Mobile Contact info inputs */}
              <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 mb-4">
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Phone size={12} className="text-emerald-600" />
                      Номер телефона <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">WhatsApp / Звонок</span>
                  </label>
                  <div className={`flex items-center gap-2 rounded-xl border p-1 bg-white transition-all ${
                    phoneError ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'
                  }`}>
                    <div className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700 select-none">
                      +992
                    </div>
                    <input
                      type="tel"
                      placeholder="90 123 45 67"
                      maxLength={9}
                      value={customerPhone}
                      onChange={e => handlePhoneChange(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-normal font-sans"
                    />
                  </div>
                  {phoneError && (
                    <p className="text-[11px] text-red-500 font-semibold mt-1 pl-1">
                      {phoneError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                    Аптека или ваше имя <span className="text-slate-400 font-normal">(необязательно)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Аптека «Шифо»"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                    Адрес доставки <span className="text-slate-400 font-normal">(город, улица)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Например: г. Душанбе, ул. Рудаки 45"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                    Контактное лицо <span className="text-slate-400 font-normal">(зав. аптекой)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Фарида"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <button
                onClick={handleDirectCheckout}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Оформление заказа...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Оформить оптовый заказ
                  </>
                )}
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
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <Check size={32} />
              </div>

              <div className="space-y-2">
                <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                  Заказ успешно принят
                </span>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight font-outfit pt-1">Оптовый заказ зарегистрирован!</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Номер заявки: <strong className="text-slate-800">#B2B-{submittedOrderId.slice(0, 8).toUpperCase()}</strong> на сумму <strong className="text-emerald-600">{submittedTotal.toLocaleString()} смн</strong>.
                </p>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[11px] text-slate-600 font-medium text-left leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    Заказ сохранён в системе TOJ-VITAMIN
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Менеджер свяжется с вами {submittedCustomerPhone ? <>по номеру <strong className="text-slate-700">{submittedCustomerPhone}</strong></> : null} для подтверждения наличия и согласования отгрузки.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {/* WhatsApp Link (Optional) */}
                <a
                  href={`https://api.whatsapp.com/send?phone=992176660707&text=${encodeURIComponent(submittedWaMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-[#25D366]/20 transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  <MessageSquare size={18} />
                  Открыть чек в WhatsApp
                </a>

                {/* Direct Call to Manager */}
                <a
                  href="tel:+992176660707"
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-2 active:scale-98"
                >
                  <Phone size={14} className="text-emerald-600" />
                  Позвонить менеджеру (+992 17 666 07 07)
                </a>

                {/* Copy Text Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (submittedWaMessage) {
                      navigator.clipboard.writeText(submittedWaMessage);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2500);
                    }
                  }}
                  className="w-full bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {isCopied ? (
                    <>
                      <Check size={14} className="text-emerald-600" /> Чек скопирован в буфер!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Скопировать чек заказа
                    </>
                  )}
                </button>

                {/* Close modal */}
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedOrderId(null);
                    setIsCopied(false);
                  }}
                  className="w-full text-slate-400 hover:text-slate-600 py-2 text-xs font-semibold transition-colors"
                >
                  Вернуться в каталог
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Modal for Pharmacies */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base font-outfit">Вход для аптек</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Персональный кабинет B2B</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginModalOpen(false);
                    setLoginError(null);
                  }}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                Введите номер телефона аптеки. Пароль не нужен: сайт сразу откроет ваш личный кабинет и запомнит устройство для будущих заказов.
              </div>

              <form onSubmit={handlePhoneLogin} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                    Номер телефона аптеки
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-1 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                    <div className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-700 select-none">
                      +992
                    </div>
                    <input
                      type="tel"
                      placeholder="90 123 45 67"
                      value={loginPhone}
                      onChange={e => {
                        setLoginError(null);
                        setLoginPhone(e.target.value);
                      }}
                      autoFocus
                      required
                      className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>
                  {loginError && (
                    <p className="text-[11px] text-red-500 font-semibold mt-1.5 pl-1">
                      {loginError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Проверка аптеки...
                    </>
                  ) : (
                    <>
                      <LogIn size={16} /> Войти в личный кабинет
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-400">
                  Еще не зарегистрированы как партнер?{' '}
                  <Link 
                    href="/opt" 
                    onClick={() => setIsLoginModalOpen(false)}
                    className="text-emerald-600 font-bold hover:underline"
                  >
                    Подать заявку
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
