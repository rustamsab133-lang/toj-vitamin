"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  Loader2,
  AlertCircle,
  Calendar,
  MessageSquare,
  ShieldAlert,
  LogOut,
  Copy,
  Phone,
  MapPin,
  User,
  Edit3,
  Building2,
  Save,
  RotateCcw,
  Clock,
  PackageCheck,
  Truck,
  CheckCircle2,
  XCircle,
  FileText,
  History,
  LayoutGrid,
  List,
  Filter
} from 'lucide-react';
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
  brand?: string;
  is_hidden?: boolean;
  in_stock?: boolean;
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

interface PharmacyOrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

interface PharmacyOrder {
  id: string;
  pharmacy_id: string;
  items: PharmacyOrderItem[];
  total_amount: number;
  payment_method?: string;
  payment_status: 'unpaid' | 'partial' | 'paid' | string;
  order_status: 'new' | 'confirmed' | 'assembled' | 'shipped' | 'delivered' | 'cancelled' | string;
  notes?: string;
  delivery_date?: string;
  created_at: string;
}

export default function B2BOrderPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pharmacy, setPharmacy] = useState<B2BPharmacy | null>(null);
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('catalog');
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'table'>('table');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [onlySelectedInCart, setOnlySelectedInCart] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Delivery Profile State
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Cart state: Record of productId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [submittedTotal, setSubmittedTotal] = useState(0);
  const [submittedWaMessage, setSubmittedWaMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isCartMobileOpen, setIsCartMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('toj_b2b_view_mode') as 'grid' | 'table';
      if (savedMode === 'grid' || savedMode === 'table') {
        setCatalogViewMode(savedMode);
      }
    }
  }, []);

  const handleToggleViewMode = (mode: 'grid' | 'table') => {
    setCatalogViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('toj_b2b_view_mode', mode);
    }
  };

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
      setOrders(data.orders || []);
      setDeliveryAddress(data.pharmacy.address || '');
      setContactPerson(data.pharmacy.contact_person || '');
      setContactPhone(data.pharmacy.phone || '');

      // Запоминаем авторизованную аптеку навсегда для автоматического входа
      if (typeof window !== 'undefined') {
        localStorage.setItem('toj_b2b_token', token);
        localStorage.setItem('toj_b2b_name', data.pharmacy.name || '');
        document.cookie = `toj_b2b_token=${token}; path=/; max-age=31536000; SameSite=Lax`;
      }
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
      document.cookie = 'toj_b2b_token=; path=/; max-age=0; SameSite=Lax';
      router.replace('/b2b');
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const res = await fetch('/api/b2b/pharmacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          address: deliveryAddress.trim(),
          contact_person: contactPerson.trim(),
          phone: contactPhone.trim(),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка при сохранении реквизитов');
      if (data.pharmacy) {
        setPharmacy(data.pharmacy);
        setDeliveryAddress(data.pharmacy.address || '');
        setContactPerson(data.pharmacy.contact_person || '');
        setContactPhone(data.pharmacy.phone || '');
      }
      setIsEditingProfile(false);
      setProfileMsg('Реквизиты сохранены');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Не удалось сохранить реквизиты');
    } finally {
      setProfileSaving(false);
    }
  };

  const getProductBrand = (p: B2BProduct): string => {
    if (p.brand && p.brand.trim()) return p.brand.trim();
    const text = `${p.name || ''} ${p.full_name || ''}`.toLowerCase();
    if (text.includes('gls')) return 'GLS Pharmaceuticals';
    if (text.includes('now foods') || /\bnow\b/.test(text)) return 'NOW Foods';
    if (text.includes('solgar') || text.includes('солгар')) return 'Solgar';
    if (text.includes('doppelherz') || text.includes('доппельгерц')) return 'Doppelherz';
    if (text.includes('nature') && text.includes('bounty')) return "Nature's Bounty";
    if (text.includes('california gold') || text.includes('cgn')) return 'California Gold Nutrition';
    if (text.includes('swanson')) return 'Swanson';
    if (text.includes('doctor') && text.includes('best')) return "Doctor's Best";
    if (text.includes('evalar') || text.includes('эвалар')) return 'Эвалар';
    if (text.includes('21st century')) return '21st Century';
    return 'TOJ-VITAMIN';
  };

  const availableBrands = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const b = getProductBrand(p);
      counts[b] = (counts[b] || 0) + 1;
    });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const brand = getProductBrand(p);
      if (selectedBrand !== 'all' && brand !== selectedBrand) {
        return false;
      }

      if (onlySelectedInCart && !(cart[p.id] && cart[p.id] > 0)) {
        return false;
      }

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) || 
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q) ||
        brand.toLowerCase().includes(q)
      );
    });
  }, [products, search, selectedBrand, onlySelectedInCart, cart]);

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

  const setCartDirectQty = (productId: string, val: number) => {
    setCart(prev => {
      if (val <= 0 || isNaN(val)) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: Math.min(9999, Math.floor(val)) };
    });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const getOrderItems = (order: any): PharmacyOrderItem[] => {
    if (Array.isArray(order.items)) return order.items;
    if (typeof order.items === 'string') {
      try {
        const parsed = JSON.parse(order.items);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  };

  const handleRepeatOrder = (order: any) => {
    const items = getOrderItems(order);
    if (!items || items.length === 0) {
      alert('В этом заказе нет товаров для повторения');
      return;
    }

    const newCart = { ...cart };
    let addedCount = 0;
    let missingCount = 0;

    items.forEach(item => {
      const prod = products.find(p => String(p.id) === String(item.product_id));
      if (prod && !prod.is_hidden && prod.in_stock !== false) {
        newCart[prod.id] = (newCart[prod.id] || 0) + (Number(item.quantity) || 1);
        addedCount++;
      } else {
        missingCount++;
      }
    });

    setCart(newCart);
    setActiveTab('catalog');

    if (missingCount > 0) {
      showToast(`В корзину добавлено позиций: ${addedCount} (${missingCount} поз. нет в наличии)`);
    } else {
      showToast(`Заказ повторен! В корзину добавлено позиций: ${addedCount}`);
    }

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyOrderCheck = (order: any) => {
    const items = getOrderItems(order);
    const orderIdShort = order.id ? order.id.slice(0, 8).toUpperCase() : '';
    const dateFormatted = order.created_at ? new Date(order.created_at).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '';
    const itemsText = items
      .map((item, idx) => `${idx + 1}. ${item.name} — ${item.quantity} шт. × ${item.price} смн = ${item.price * item.quantity} смн`)
      .join('\n');
    const text = `Оптовый заказ #B2B-${orderIdShort} от ${dateFormatted}\nАптека: ${pharmacy?.name || ''}\nТелефон: ${pharmacy?.phone || ''}\n${order.notes ? `Примечание: ${order.notes}\n` : ''}---\nСостав:\n${itemsText}\n---\nИТОГО: ${order.total_amount} смн`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Состав заказа скопирован в буфер!');
    }
  };

  const getOrderStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { label: 'Подтверждён', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: Check };
      case 'assembled':
        return { label: 'Собран на складе', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: PackageCheck };
      case 'shipped':
        return { label: 'В пути / Курьер', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: Truck };
      case 'delivered':
        return { label: 'Доставлен в аптеку', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
      case 'cancelled':
        return { label: 'Отменён', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle };
      case 'new':
      default:
        return { label: 'Новый (в обработке)', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock };
    }
  };

  const getPaymentStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'Оплачен', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'partial':
        return { label: 'Частично оплачен', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'unpaid':
      default:
        return { label: 'Не оплачен (в долг)', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
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
        address: deliveryAddress.trim(),
        contact_person: contactPerson.trim(),
        phone: contactPhone.trim(),
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

      // Construct WhatsApp message with items list and full delivery details
      const orderIdShort = data.order_id.slice(0, 8).toUpperCase();
      const itemsText = cartItems
        .map((item, idx) => `${idx + 1}. ${item.product.name} — ${item.quantity} шт. (${item.product.price * item.quantity} смн)`)
        .join('\n');
      const addressLine = deliveryAddress.trim() ? `\n📍 Адрес доставки: ${deliveryAddress.trim()}` : '';
      const contactLine = contactPerson.trim() ? `\n👤 Контактное лицо: ${contactPerson.trim()}` : '';
      const phoneLine = contactPhone.trim() ? `\n📞 Телефон: ${contactPhone.trim()}` : (pharmacy?.phone ? `\n📞 Телефон: ${pharmacy.phone}` : '');
      const notesText = notes.trim() ? `\n📝 Примечание: ${notes.trim()}` : '';
      const dateText = deliveryDate ? `\n📅 Желаемая дата: ${deliveryDate}` : '';
      const msg = `Здравствуйте! Аптека "${pharmacy?.name || 'Партнер'}" оформила оптовый B2B заказ на сайте TOJ-VITAMIN:\n---\nСумма: ${totalAmount} смн\nID заказа: #B2B-${orderIdShort}${phoneLine}${contactLine}${addressLine}${dateText}${notesText}\n---\nСостав заказа:\n${itemsText}\n---\nПожалуйста, подтвердите заказ и согласуйте время доставки.`;
      setSubmittedWaMessage(msg);

      // Add to local orders state immediately
      const newOrderObj: PharmacyOrder = {
        id: data.order_id,
        pharmacy_id: pharmacy?.id || '',
        items: cartItems.map(item => ({
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price
        })),
        total_amount: totalAmount,
        payment_method: 'deferred',
        payment_status: 'unpaid',
        order_status: 'new',
        notes: notes.trim(),
        delivery_date: deliveryDate || undefined,
        created_at: new Date().toISOString()
      };
      setOrders(prev => [newOrderObj, ...prev]);

      // Update local pharmacy balance and details
      if (pharmacy) {
        setPharmacy({
          ...pharmacy,
          balance: data.balance,
          address: deliveryAddress.trim() || pharmacy.address,
          contact_person: contactPerson.trim() || pharmacy.contact_person,
          phone: contactPhone.trim() || pharmacy.phone,
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

        {/* Pharmacy details & logout */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex flex-wrap items-center gap-2">
            {pharmacy.discount_percent > 0 && (
              <div className="bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-100 shadow-sm">
                Скидка: {pharmacy.discount_percent}%
              </div>
            )}
            {pharmacy.phone && (
              <div className="bg-slate-100 text-slate-600 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200">
                Тел: {pharmacy.phone}
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

          {/* Pharmacy Profile & Delivery Address Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <Building2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base font-outfit">
                      {pharmacy.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Личный кабинет B2B
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Автоматический вход активен • Ваши заказы привязываются к этому профилю
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all shrink-0 active:scale-95"
              >
                <Edit3 size={13} className="text-slate-500" />
                Изменить адрес и контакты
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-600" /> Адрес доставки
                </span>
                <p className="font-bold text-slate-800 mt-1 line-clamp-2">
                  {deliveryAddress.trim() || <span className="text-amber-600 font-normal italic">Не указан (нажмите изменить)</span>}
                </p>
              </div>

              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Phone size={12} className="text-emerald-600" /> Телефон для связи
                </span>
                <p className="font-bold text-slate-800 mt-1">
                  {contactPhone.trim() || pharmacy.phone || <span className="text-slate-400 font-normal italic">Не указан</span>}
                </p>
              </div>

              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <User size={12} className="text-emerald-600" /> Контактное лицо
                </span>
                <p className="font-bold text-slate-800 mt-1">
                  {contactPerson.trim() || <span className="text-slate-400 font-normal italic">Заведующая / Провизор</span>}
                </p>
              </div>
            </div>

            {profileMsg && (
              <p className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 animate-fade-in">
                ✅ {profileMsg}
              </p>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'catalog'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={16} className={activeTab === 'catalog' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Каталог товаров</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === 'catalog' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'orders'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History size={16} className={activeTab === 'orders' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>История заказов</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === 'orders' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {orders.length}
              </span>
            </button>
          </div>

          {activeTab === 'catalog' ? (
            <>
              {/* Search, Filter & View Switcher Bar */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Быстрый поиск по названию, бренду или коду товара..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all font-medium placeholder:text-slate-400"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold w-5 h-5 rounded-full bg-slate-200/70 flex items-center justify-center"
                        title="Очистить поиск"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* View Mode Toggle: Сетка карточек ↔ Табличный бланк */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-end sm:self-auto border border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => handleToggleViewMode('grid')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                        catalogViewMode === 'grid'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Отображение плиткой с фотографиями"
                    >
                      <LayoutGrid size={14} />
                      <span>Сетка карточек</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleViewMode('table')}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                        catalogViewMode === 'table'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="Табличный матричный бланк для быстрого оптового заказа"
                    >
                      <List size={14} />
                      <span>Табличный бланк</span>
                    </button>
                  </div>
                </div>

                {/* Brand Filter Pills & "Только выбранные" toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                      <Filter size={11} /> Бренд:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBrand('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedBrand === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Все ({products.length})
                    </button>
                    {Object.entries(availableBrands).map(([brand, count]) => (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => setSelectedBrand(brand)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                          selectedBrand === brand
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {brand} ({count})
                      </button>
                    ))}
                  </div>

                  {/* Filter by items in cart */}
                  {totalQty > 0 && (
                    <button
                      type="button"
                      onClick={() => setOnlySelectedInCart(!onlySelectedInCart)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        onlySelectedInCart
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Показать только товары, добавленные в корзину"
                    >
                      <Check size={12} className={onlySelectedInCart ? 'text-emerald-700' : 'text-slate-400'} />
                      <span>Выбрано в заказ: {totalQty} шт</span>
                    </button>
                  )}
                </div>
              </div>

              {/* VIEW MODE: TABLE (MATRIX BULK ORDER) */}
              {catalogViewMode === 'table' ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="py-3.5 px-3 w-10 text-center">№</th>
                          <th className="py-3.5 px-2 w-12 text-center">Фото</th>
                          <th className="py-3.5 px-3 min-w-[120px]">Бренд</th>
                          <th className="py-3.5 px-3 min-w-[220px]">Название товара</th>
                          <th className="py-3.5 px-2 text-center min-w-[90px]">Наличие</th>
                          <th className="py-3.5 px-3 text-right min-w-[100px]">Ваша цена</th>
                          <th className="py-3.5 px-3 text-center min-w-[150px]">Ввод количества</th>
                          <th className="py-3.5 px-3 text-right min-w-[100px]">Сумма</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredProducts.map((p, index) => {
                          const qty = cart[p.id] || 0;
                          const isOutOfStock = Boolean(p.is_hidden || p.in_stock === false);
                          const brandName = getProductBrand(p);
                          const isSelected = qty > 0;
                          const rowTotal = p.price * qty;

                          return (
                            <tr
                              key={p.id}
                              className={`transition-colors group ${
                                isSelected 
                                  ? 'bg-emerald-50/70 hover:bg-emerald-100/60 font-medium' 
                                  : isOutOfStock 
                                    ? 'bg-slate-50/30 opacity-70 hover:bg-slate-50/60' 
                                    : 'hover:bg-slate-50/80'
                              }`}
                            >
                              {/* № */}
                              <td className="py-2.5 px-3 text-center text-slate-400 font-bold text-[11px]">
                                {index + 1}
                              </td>

                              {/* Thumbnail */}
                              <td className="py-2.5 px-2 text-center">
                                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mx-auto">
                                  {p.image_url ? (
                                    <img 
                                      src={p.image_url} 
                                      alt={p.name} 
                                      className="w-full h-full object-contain p-0.5 group-hover:scale-110 transition-transform" 
                                      loading="lazy"
                                    />
                                  ) : (
                                    <ShoppingCart size={14} className="text-slate-300" />
                                  )}
                                </div>
                              </td>

                              {/* Brand */}
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap">
                                  {brandName}
                                </span>
                              </td>

                              {/* Product Name */}
                              <td className="py-2.5 px-3">
                                <div>
                                  <span className={`text-xs leading-snug line-clamp-2 ${isSelected ? 'font-extrabold text-slate-900' : 'font-bold text-slate-800'}`}>
                                    {p.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                    Код: {p.id}
                                  </span>
                                </div>
                              </td>

                              {/* Stock status */}
                              <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                {isOutOfStock ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                    Нет на складе
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    В наличии
                                  </span>
                                )}
                              </td>

                              {/* Pharmacy Price */}
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div>
                                  {!isOutOfStock && pharmacy.discount_percent > 0 && (
                                    <span className="text-[10px] text-slate-400 line-through leading-none block">
                                      {p.retail_price} смн
                                    </span>
                                  )}
                                  <span className={`text-xs sm:text-sm font-extrabold ${isOutOfStock ? 'text-slate-400' : 'text-emerald-700'}`}>
                                    {p.price} <span className="text-[10px] font-bold uppercase text-slate-400">смн</span>
                                  </span>
                                </div>
                              </td>

                              {/* Quantity Input (Matrix input) */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                {isOutOfStock ? (
                                  <div className="text-center text-slate-400 text-xs italic">—</div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => updateCartQty(p.id, -1)}
                                      disabled={qty <= 0}
                                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-25 disabled:hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors active:scale-95"
                                      title="Уменьшить на 1"
                                    >
                                      <Minus size={11} />
                                    </button>
                                    
                                    <input
                                      type="number"
                                      min="0"
                                      max="9999"
                                      value={qty > 0 ? qty : ''}
                                      placeholder="0"
                                      onChange={e => {
                                        const raw = e.target.value;
                                        const val = raw === '' ? 0 : parseInt(raw, 10);
                                        setCartDirectQty(p.id, isNaN(val) ? 0 : val);
                                      }}
                                      className={`w-14 text-center font-extrabold text-xs sm:text-sm py-1 rounded-lg border outline-none transition-all ${
                                        qty > 0 
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm focus:ring-2 focus:ring-emerald-400' 
                                          : 'bg-slate-50 text-slate-700 border-slate-200 focus:bg-white focus:border-slate-400'
                                      }`}
                                    />

                                    <button
                                      type="button"
                                      onClick={() => updateCartQty(p.id, 1)}
                                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors active:scale-95"
                                      title="Увеличить на 1"
                                    >
                                      <Plus size={11} />
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Subtotal */}
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                {qty > 0 ? (
                                  <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                                    {rowTotal.toLocaleString()} <span className="text-[10px] uppercase font-bold text-slate-400">смн</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-bold">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {filteredProducts.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                              Товары не найдены. Попробуйте изменить параметры поиска или фильтр брендов.
                            </td>
                          </tr>
                        )}
                      </tbody>

                      {/* Table Summary Footer */}
                      {filteredProducts.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-50/90 border-t border-slate-200 text-xs font-bold text-slate-700">
                            <td colSpan={4} className="py-3 px-4">
                              Показано товаров: <span className="text-slate-900">{filteredProducts.length}</span> из {products.length}
                            </td>
                            <td colSpan={2} className="py-3 px-3 text-right">
                              Выбрано позиций в чек:
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="text-emerald-700 font-extrabold text-sm">{totalQty} шт</span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className="text-emerald-700 font-extrabold text-sm">{totalAmount.toLocaleString()} смн</span>
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              ) : (
                /* VIEW MODE: GRID (PRODUCT CARDS) */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredProducts.map(p => {
                    const qtyInCart = cart[p.id] || 0;
                    const isOutOfStock = Boolean(p.is_hidden || p.in_stock === false);
                    const brandName = getProductBrand(p);
                    return (
                      <div 
                        key={p.id}
                        className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all group ${
                          isOutOfStock 
                            ? 'border-amber-100 bg-slate-50/40 opacity-80' 
                            : qtyInCart > 0
                              ? 'border-emerald-300 ring-2 ring-emerald-500/10 shadow-md'
                              : 'border-slate-100 hover:border-slate-200 hover:shadow-md'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Image Placeholder */}
                          <div className="aspect-[4/3] rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-50 relative">
                            {isOutOfStock ? (
                              <span className="absolute top-2 left-2 z-10 text-[10px] font-bold text-white bg-amber-500 px-2 py-0.5 rounded-md shadow-sm">
                                Нет в наличии
                              </span>
                            ) : (
                              <span className="absolute top-2 left-2 z-10 text-[10px] font-bold text-slate-700 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md border border-slate-200/80 shadow-xs">
                                {brandName}
                              </span>
                            )}
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <ShoppingCart size={24} className="text-slate-300" />
                            )}
                            {!isOutOfStock && p.discount_percent > 0 && (
                              <span className="absolute top-2 right-2 text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
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
                            {!isOutOfStock && pharmacy.discount_percent > 0 && (
                              <span className="text-xs text-slate-400 line-through leading-none font-bold mb-1">
                                {p.retail_price} смн
                              </span>
                            )}
                            <span className={`text-base font-extrabold leading-none ${isOutOfStock ? 'text-slate-400' : 'text-emerald-600'}`}>
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
                              <input
                                type="number"
                                min="0"
                                max="9999"
                                value={qtyInCart}
                                onChange={e => {
                                  const raw = e.target.value;
                                  const val = raw === '' ? 0 : parseInt(raw, 10);
                                  setCartDirectQty(p.id, isNaN(val) ? 0 : val);
                                }}
                                className="w-8 text-center text-xs font-bold bg-transparent text-white outline-none"
                              />
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
                      Товары не найдены. Попробуйте изменить параметры поиска или фильтр брендов.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Orders History View */
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Всего заказов</span>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">{orders.length} шт</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Текущий баланс / Долг</span>
                  <p className={`text-xl font-extrabold mt-1 ${pharmacy.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {pharmacy.balance > 0 ? `${pharmacy.balance.toLocaleString()} смн` : '0 смн (оплачено)'}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ваша скидка</span>
                  <p className="text-xl font-extrabold text-emerald-600 mt-1">{pharmacy.discount_percent}%</p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mx-auto border border-slate-100">
                    <History size={32} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">История заказов пока пуста</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Вы еще не оформляли оптовые заказы в этом кабинете. Перейдите в каталог и соберите первый заказ!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95"
                  >
                    Перейти в каталог товаров
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => {
                    const orderItems = getOrderItems(order);
                    const statusCfg = getOrderStatusConfig(order.order_status);
                    const paymentCfg = getPaymentStatusConfig(order.payment_status);
                    const StatusIcon = statusCfg.icon;
                    const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : '';
                    const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '';

                    return (
                      <div 
                        key={order.id} 
                        className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden transition-all hover:border-slate-300"
                      >
                        {/* Order Header */}
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm font-outfit">#B2B-{shortId}</span>
                              <span className="text-xs text-slate-400 font-medium">• {dateStr}</span>
                            </div>
                            {order.delivery_date && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
                                <Calendar size={12} className="text-emerald-600" /> Желаемая дата доставки: {order.delivery_date}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${statusCfg.bg}`}>
                              <StatusIcon size={13} /> {statusCfg.label}
                            </span>
                            <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${paymentCfg.bg}`}>
                              {paymentCfg.label}
                            </span>
                          </div>
                        </div>

                        {/* Order Content */}
                        <div className="p-4 sm:p-5 space-y-3">
                          {order.notes && (
                            <div className="bg-amber-50/70 border border-amber-100/80 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                              <FileText size={14} className="shrink-0 text-amber-600 mt-0.5" />
                              <div>
                                <span className="font-bold">Примечание:</span> {order.notes}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            {orderItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-50 last:border-0">
                                <div className="min-w-0 pr-3 flex-1">
                                  <p className="font-bold text-slate-800 line-clamp-1">{item.name}</p>
                                  <p className="text-[11px] text-slate-400 font-medium">{item.price} смн × {item.quantity} шт.</p>
                                </div>
                                <span className="font-extrabold text-slate-800 text-xs shrink-0">
                                  {(item.price * item.quantity).toLocaleString()} смн
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order Footer & Actions */}
                        <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Сумма заказа</span>
                            <span className="text-xl font-extrabold text-slate-900">
                              {order.total_amount.toLocaleString()} <span className="text-xs font-bold text-slate-400">смн</span>
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {/* Repeat order in 1 click */}
                            <button
                              type="button"
                              onClick={() => handleRepeatOrder(order)}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
                              title="Добавить все позиции этого заказа в корзину"
                            >
                              <RotateCcw size={14} />
                              Повторить заказ
                            </button>

                            {/* WhatsApp */}
                            <button
                              type="button"
                              onClick={() => {
                                const orderIdShort = order.id ? order.id.slice(0, 8).toUpperCase() : '';
                                const itemsText = orderItems.map((it, i) => `${i + 1}. ${it.name} — ${it.quantity} шт.`).join('\n');
                                const msg = `Здравствуйте! По поводу заказа #B2B-${orderIdShort} (аптека "${pharmacy.name}") на сумму ${order.total_amount} смн:\n${itemsText}\nУточните, пожалуйста, статус доставки.`;
                                window.open(`https://api.whatsapp.com/send?phone=992176660707&text=${encodeURIComponent(msg)}`, '_blank');
                              }}
                              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 font-bold text-xs border border-[#25D366]/20 transition-all active:scale-95"
                              title="Написать менеджеру по этому заказу"
                            >
                              <MessageSquare size={14} />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            {/* Copy */}
                            <button
                              type="button"
                              onClick={() => handleCopyOrderCheck(order)}
                              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 transition-all active:scale-95"
                              title="Скопировать накладную заказа"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
              {/* Delivery details card */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <MapPin size={12} className="text-emerald-600" /> Адрес доставки
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Изменить
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-snug">
                  {deliveryAddress.trim() || (
                    <span className="text-amber-600 font-medium">⚠️ Адрес не указан (нажмите «Изменить»)</span>
                  )}
                </p>
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-slate-200/50 font-medium">
                  <span>📞 {contactPhone.trim() || pharmacy.phone || 'Без телефона'}</span>
                  {contactPerson.trim() && <span>👤 {contactPerson.trim()}</span>}
                </div>
              </div>

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

              {/* Delivery details in mobile drawer */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <MapPin size={12} className="text-emerald-600" /> Адрес доставки
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartMobileOpen(false);
                      setIsEditingProfile(true);
                    }}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    Изменить
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-800 leading-snug">
                  {deliveryAddress.trim() || (
                    <span className="text-amber-600 font-medium">⚠️ Адрес не указан (нажмите «Изменить»)</span>
                  )}
                </p>
                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 border-t border-slate-200/50 font-medium">
                  <span>📞 {contactPhone.trim() || pharmacy.phone || 'Без телефона'}</span>
                  {contactPerson.trim() && <span>👤 {contactPerson.trim()}</span>}
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-3 mb-4 pt-2 border-t border-slate-100">
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
                  Заявка сохранена под номером <strong className="text-slate-800">#B2B-{submittedOrderId.slice(0, 8).toUpperCase()}</strong> на сумму <strong className="text-emerald-600">{submittedTotal.toLocaleString()} смн</strong>.
                </p>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[11px] text-slate-600 font-medium text-left leading-relaxed space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    Заказ принят в обработку на складе TOJ-VITAMIN
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Баланс аптеки обновлён. Менеджер свяжется с вами для согласования времени доставки.
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

                {/* Go to Order History */}
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedOrderId(null);
                    setIsCopied(false);
                    setActiveTab('orders');
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <History size={14} /> Перейти в историю заказов
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
                  Вернуться в каталог B2B
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">Реквизиты аптеки</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                    Точный адрес доставки <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Например: г. Душанбе, пр. Рудаки 45, ориентир Дом Печати"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                    Номер телефона для связи <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="+992 90 123 45 67"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                    Контактное лицо (зав. аптекой / провизор)
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="Например: Фарида (заведующая)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Сохранить
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-4 sm:right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 text-xs font-bold max-w-sm"
          >
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="leading-snug">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
