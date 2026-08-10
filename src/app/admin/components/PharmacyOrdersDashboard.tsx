"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { adminDbQuery } from '@/lib/admin-api';
import { Pharmacy, PharmacyOrder } from '@/lib/types';
import { 
  ChevronLeft, Building2, TrendingUp, BarChart3, Search, 
  UserPlus, Phone, Calendar, ClipboardList, Trash2, X, Plus, Minus,
  Edit, Copy, Check, ShoppingCart, Clock, ShieldAlert, Award, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type SubTab = 'dashboard' | 'pharmacies' | 'new-order' | 'prices';

interface PharmacyOrdersDashboardProps {
  onBack: () => void;
}

const ORDER_STATUS_MAP: Record<string, { label: string; color: string; next?: string }> = {
  new: { label: 'Новый (B2B)', color: 'bg-blue-50 text-blue-600', next: 'confirmed' },
  confirmed: { label: 'Подтвержден', color: 'bg-indigo-50 text-indigo-600', next: 'assembled' },
  assembled: { label: 'Собран', color: 'bg-amber-50 text-amber-600', next: 'shipped' },
  shipped: { label: 'Отправлен', color: 'bg-sky-50 text-sky-600', next: 'delivered' },
  delivered: { label: 'Доставлен', color: 'bg-emerald-50 text-emerald-600' },
  cancelled: { label: 'Отменен', color: 'bg-rose-50 text-rose-500' }
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string; next?: string }> = {
  unpaid: { label: 'Не оплачен', color: 'bg-red-50 text-red-600', next: 'paid' },
  partial: { label: 'Частично', color: 'bg-orange-50 text-orange-600', next: 'paid' },
  paid: { label: 'Оплачен', color: 'bg-emerald-50 text-emerald-600' }
};

export const PharmacyOrdersDashboard: React.FC<PharmacyOrdersDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<SubTab>('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Data lists
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Analytics
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalDebt: 0,
    activePharmacies: 0,
    newOrdersCount: 0
  });

  // Registry form/modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [pharmacyForm, setPharmacyForm] = useState({
    name: '',
    phone: '',
    address: '',
    contact_person: '',
    discount_percent: 0,
    credit_limit: 0
  });

  // Manual Order states
  const [selectedPharmacyForOrder, setSelectedPharmacyForOrder] = useState<string>('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderCart, setOrderCart] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState('');
  const [orderDeliveryDate, setOrderDeliveryDate] = useState('');
  const [isSubmittingManualOrder, setIsSubmittingManualOrder] = useState(false);

  // B2B Pricing states
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [priceEdits, setPriceEdits] = useState<Record<string, number>>({});
  const [savingProductIds, setSavingProductIds] = useState<Record<string, boolean>>({});
  const [savedProductIds, setSavedProductIds] = useState<Record<string, boolean>>({});
  const [markupSettings, setMarkupSettings] = useState({ percent: 0, flat: 0 });

  // Price adjustment helper states for modal (Discount vs Markup)
  const [adjustmentType, setAdjustmentType] = useState<'discount' | 'markup'>('discount');
  const [adjustmentVal, setAdjustmentVal] = useState<number>(0);

  // General utility states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Lock body scroll when pharmacy modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Pharmacies
      const { data: pharmData } = await adminDbQuery({
        action: 'select',
        table: 'pharmacies',
        data: { order: { column: 'name', ascending: true } }
      });
      if (pharmData) setPharmacies(pharmData);

      // 2. Fetch Orders with pharmacy relation
      const { data: ordData } = await adminDbQuery({
        action: 'select',
        table: 'pharmacy_orders',
        data: { 
          columns: '*,pharmacies:pharmacies(name,discount_percent,phone)',
          order: { column: 'created_at', ascending: false } 
        }
      });
      if (ordData) setOrders(ordData);

      // 3. Fetch site markup settings
      const { data: settingsData } = await adminDbQuery({
        action: 'select',
        table: 'site_settings',
      });
      const percentSetting = settingsData?.find((s: any) => s.key === 'price_markup_percent');
      const flatSetting = settingsData?.find((s: any) => s.key === 'price_markup_flat');
      const newMarkupSettings = {
        percent: parseFloat(percentSetting?.value || '0') || 0,
        flat: parseFloat(flatSetting?.value || '0') || 0
      };
      setMarkupSettings(newMarkupSettings);

      // 4. Fetch Products
      const { data: prodData } = await adminDbQuery({
        action: 'select',
        table: 'products',
        data: { order: { column: 'name', ascending: true } }
      });
      if (prodData) {
        // Apply retail markup
        const markedUp = prodData.map((p: any) => {
          let retail = Number(p.price) || 0;
          if (newMarkupSettings.percent > 0) retail = retail * (1 + newMarkupSettings.percent / 100);
          retail = retail + newMarkupSettings.flat;
          return {
            ...p,
            retail_price: Math.round(retail)
          };
        });
        setProducts(markedUp);
      }

      // Calculate stats (filter out leads from active pharmacy stats)
      if (pharmData && ordData) {
        const activePharmList = pharmData.filter((p: any) => p.status !== 'lead');
        const totalRevenue = ordData
          .filter((o: any) => o.order_status !== 'cancelled')
          .reduce((acc: number, o: any) => acc + Number(o.total_amount || 0), 0);
        const totalDebt = activePharmList.reduce((acc: number, p: any) => acc + Number(p.balance || 0), 0);
        const activeCount = activePharmList.length;
        const newOrdersCount = ordData.filter((o: any) => o.order_status === 'new').length;

        setStats({
          totalRevenue,
          totalDebt,
          activePharmacies: activeCount,
          newOrdersCount
        });
      }

    } catch (err) {
      console.error('B2B dashboard loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Copy B2B Link
  const copyB2BLink = (token: string, pharmacyId: string) => {
    if (typeof window === 'undefined') return;
    const link = `${window.location.origin}/b2b/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(pharmacyId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Open Add/Edit Modal
  const openPharmacyModal = (mode: 'create' | 'edit', p?: Pharmacy) => {
    setModalMode(mode);
    if (mode === 'edit' && p) {
      setSelectedPharmacyId(p.id);
      setPharmacyForm({
        name: p.name,
        phone: p.phone || '',
        address: p.address || '',
        contact_person: p.contact_person || '',
        discount_percent: p.discount_percent,
        credit_limit: p.credit_limit
      });
      // Sync markup/discount adjustment fields
      if (p.discount_percent < 0) {
        setAdjustmentType('markup');
        setAdjustmentVal(Math.abs(p.discount_percent));
      } else {
        setAdjustmentType('discount');
        setAdjustmentVal(p.discount_percent);
      }
    } else {
      setSelectedPharmacyId(null);
      setPharmacyForm({
        name: '',
        phone: '',
        address: '',
        contact_person: '',
        discount_percent: 0,
        credit_limit: 0
      });
      setAdjustmentType('discount');
      setAdjustmentVal(0);
    }
    setIsModalOpen(true);
  };

  // Save Pharmacy
  const handleSavePharmacy = async () => {
    if (!pharmacyForm.name.trim()) return alert('Имя аптеки обязательно');
    
    // Calculate signed discount_percent (markup is represented as a negative discount)
    const finalDiscountPercent = adjustmentType === 'markup' ? -adjustmentVal : adjustmentVal;

    try {
      if (modalMode === 'create') {
        await adminDbQuery({
          action: 'insert',
          table: 'pharmacies',
          data: {
            name: pharmacyForm.name.trim(),
            phone: pharmacyForm.phone.trim(),
            address: pharmacyForm.address.trim(),
            contact_person: pharmacyForm.contact_person.trim(),
            discount_percent: finalDiscountPercent,
            credit_limit: Number(pharmacyForm.credit_limit) || 0,
            balance: 0,
            status: 'active' // Создаваемые вручную сразу активны
          }
        });
      } else if (modalMode === 'edit' && selectedPharmacyId) {
        await adminDbQuery({
          action: 'update',
          table: 'pharmacies',
          id: selectedPharmacyId,
          data: {
            name: pharmacyForm.name.trim(),
            phone: pharmacyForm.phone.trim(),
            address: pharmacyForm.address.trim(),
            contact_person: pharmacyForm.contact_person.trim(),
            discount_percent: finalDiscountPercent,
            credit_limit: Number(pharmacyForm.credit_limit) || 0,
            status: 'active' // При редактировании (или одобрении) переводим в активные
          }
        });
      }
      setIsModalOpen(false);
      loadAllData();
    } catch (e) {
      alert('Ошибка при сохранении: ' + e);
    }
  };

  // Delete Pharmacy
  const handleDeletePharmacy = async (id: string) => {
    if (!confirm('Вы действительно хотите удалить эту аптеку? Связанные заказы могут вызвать ошибку целостности данных.')) return;
    try {
      await adminDbQuery({
        action: 'delete',
        table: 'pharmacies',
        id
      });
      loadAllData();
    } catch (e) {
      alert('Ошибка при удалении: ' + e);
    }
  };

  // Change order status
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await adminDbQuery({
        action: 'update',
        table: 'pharmacy_orders',
        id: orderId,
        data: { order_status: status }
      });
      loadAllData();
    } catch (e) {
      alert('Ошибка обновления статуса: ' + e);
    }
  };

  // Change payment status
  const handleUpdatePaymentStatus = async (order: PharmacyOrder, status: 'unpaid' | 'partial' | 'paid') => {
    try {
      // 1. Update status
      await adminDbQuery({
        action: 'update',
        table: 'pharmacy_orders',
        id: order.id,
        data: { payment_status: status }
      });

      // 2. If transitioning from unpaid/partial to PAID, decrease the pharmacy's balance
      if (status === 'paid' && order.payment_status !== 'paid') {
        const ph = pharmacies.find(p => p.id === order.pharmacy_id);
        if (ph) {
          const newBalance = Math.max(Number(ph.balance || 0) - Number(order.total_amount), 0);
          await adminDbQuery({
            action: 'update',
            table: 'pharmacies',
            id: ph.id,
            data: { balance: newBalance }
          });
        }
      }

      loadAllData();
    } catch (e) {
      alert('Ошибка при изменении оплаты: ' + e);
    }
  };

  // Cancel Order (adjust balance back!)
  const handleCancelOrder = async (order: PharmacyOrder) => {
    if (!confirm('Отменить заказ? При этом сумма заказа спишется с долга аптеки.')) return;
    try {
      // 1. Update order status
      await adminDbQuery({
        action: 'update',
        table: 'pharmacy_orders',
        id: order.id,
        data: { order_status: 'cancelled' }
      });

      // 2. Subtract from pharmacy balance if it wasn't paid yet
      if (order.payment_status !== 'paid') {
        const ph = pharmacies.find(p => p.id === order.pharmacy_id);
        if (ph) {
          const newBalance = Math.max(Number(ph.balance || 0) - Number(order.total_amount), 0);
          await adminDbQuery({
            action: 'update',
            table: 'pharmacies',
            id: ph.id,
            data: { balance: newBalance }
          });
        }
      }

      loadAllData();
    } catch (e) {
      alert('Ошибка отмены заказа: ' + e);
    }
  };

  // Manual Order Management
  const selectedPharmObj = useMemo(() => {
    return pharmacies.find(p => p.id === selectedPharmacyForOrder) || null;
  }, [selectedPharmacyForOrder, pharmacies]);

  const filteredCatalogForOrder = useMemo(() => {
    if (!orderSearchQuery.trim()) return products.slice(0, 10);
    const q = orderSearchQuery.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || p.id.includes(q));
  }, [products, orderSearchQuery]);

  const manualOrderItems = useMemo(() => {
    return Object.entries(orderCart).map(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      const discount = selectedPharmObj ? selectedPharmObj.discount_percent : 0;
      const baseWholesale = p ? Number(p.price) || 0 : 0;
      const b2bPrice = Math.round(baseWholesale * (1 - discount / 100));

      return p ? { product: p, quantity: qty, b2bPrice } : null;
    }).filter(Boolean) as { product: any; quantity: number; b2bPrice: number }[];
  }, [orderCart, products, selectedPharmObj]);

  const manualOrderTotal = useMemo(() => {
    return manualOrderItems.reduce((acc, item) => acc + item.b2bPrice * item.quantity, 0);
  }, [manualOrderItems]);

  const updateManualCartQty = (productId: string, delta: number) => {
    setOrderCart(prev => {
      const next = (prev[productId] || 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleCreateManualOrder = async () => {
    if (!selectedPharmacyForOrder) return alert('Выберите аптеку');
    if (manualOrderItems.length === 0) return alert('Добавьте товары в заказ');
    setIsSubmittingManualOrder(true);

    try {
      const dbItems = manualOrderItems.map(item => ({
        product_id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.b2bPrice
      }));

      // Insert Order
      const res = await adminDbQuery({
        action: 'insert',
        table: 'pharmacy_orders',
        data: {
          pharmacy_id: selectedPharmacyForOrder,
          items: dbItems,
          total_amount: manualOrderTotal,
          payment_method: 'deferred',
          payment_status: 'unpaid',
          order_status: 'new',
          notes: orderNotes.trim(),
          delivery_date: orderDeliveryDate || null
        }
      });

      // Update Balance
      if (selectedPharmObj) {
        const newBalance = (Number(selectedPharmObj.balance) || 0) + manualOrderTotal;
        await adminDbQuery({
          action: 'update',
          table: 'pharmacies',
          id: selectedPharmacyForOrder,
          data: { balance: newBalance }
        });
      }

      alert('Оптовый заказ успешно создан!');
      setOrderCart({});
      setOrderNotes('');
      setOrderDeliveryDate('');
      setSelectedPharmacyForOrder('');
      setActiveTab('dashboard');
    } catch (e) {
      alert('Ошибка при создании заказа: ' + e);
    } finally {
      setIsSubmittingManualOrder(false);
    }
  };

  // B2B Pricing Handlers & Memos
  const filteredProductsForPrices = useMemo(() => {
    if (!priceSearchQuery.trim()) return products;
    const q = priceSearchQuery.toLowerCase();
    return products.filter((p: any) => 
      p.name.toLowerCase().includes(q) || 
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      String(p.id).includes(q)
    );
  }, [products, priceSearchQuery]);

  const handleSaveProductPrice = async (productId: string, newPrice: number) => {
    setSavingProductIds(prev => ({ ...prev, [productId]: true }));
    try {
      await adminDbQuery({
        action: 'update',
        table: 'products',
        id: productId,
        data: { price: newPrice }
      });
      
      // Обновляем локальный стейт товаров
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { 
              ...p, 
              price: newPrice, 
              retail_price: Math.round(newPrice * (1 + markupSettings.percent / 100) + markupSettings.flat) 
            } 
          : p
      ));
      
      // Показываем статус "Сохранено" на время
      setSavedProductIds(prev => ({ ...prev, [productId]: true }));
      setPriceEdits(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      setTimeout(() => {
        setSavedProductIds(prev => ({ ...prev, [productId]: false }));
      }, 2000);
    } catch (e) {
      alert('Ошибка при сохранении цены: ' + e);
    } finally {
      setSavingProductIds(prev => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={20} className="text-slate-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Building2 size={24} className="text-emerald-600" /> Закупки аптек
            </h2>
            <p className="text-xs text-slate-400 font-medium">B2B оптовые закупки, ссылки аптек и аналитика</p>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-slate-100">
          {[
            { id: 'dashboard', label: 'Заказы', icon: <ClipboardList size={16} /> },
            { id: 'pharmacies', label: 'Аптеки', icon: <Building2 size={16} /> },
            { id: 'prices', label: 'Цены B2B', icon: <TrendingUp size={16} /> },
            { id: 'new-order', label: 'Новый заказ', icon: <Plus size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SubTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.icon} <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center text-slate-400 text-sm">
          Загрузка модуля закупок B2B...
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: DASHBOARD / ORDERS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Analytics row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-emerald-500 bg-emerald-50 rounded-bl-2xl">
                    <TrendingUp size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Выручка B2B</p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-2">{stats.totalRevenue.toLocaleString()} смн</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-orange-500 bg-orange-50 rounded-bl-2xl">
                    <ShieldAlert size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Долг аптек (Баланс)</p>
                  <p className="text-2xl font-extrabold text-orange-600 mt-2">{stats.totalDebt.toLocaleString()} смн</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-blue-500 bg-blue-50 rounded-bl-2xl">
                    <Building2 size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Всего аптек</p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-2">{stats.activePharmacies} точек</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-indigo-500 bg-indigo-50 rounded-bl-2xl">
                    <Clock size={16} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Новые заявки</p>
                  <p className="text-2xl font-extrabold text-indigo-600 mt-2">{stats.newOrdersCount} шт</p>
                </div>
              </div>

              {/* Orders List */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-800 font-outfit">Лента оптовых заказов</h3>

                {orders.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">
                    Оптовых заказов от аптек пока не поступало.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map(order => {
                      const statusInfo = ORDER_STATUS_MAP[order.order_status] || ORDER_STATUS_MAP.new;
                      const paymentInfo = PAYMENT_STATUS_MAP[order.payment_status] || PAYMENT_STATUS_MAP.unpaid;
                      const isExpanded = expandedOrderId === order.id;

                      const formattedDate = order.created_at 
                        ? new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                        : '';
                      const deliveryDate = order.delivery_date 
                        ? new Date(order.delivery_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) 
                        : 'Не указана';

                      return (
                        <div 
                          key={order.id}
                          className={`border rounded-2xl p-4 transition-all cursor-pointer ${
                            isExpanded ? 'border-slate-800 bg-slate-50/20 shadow-md' : 'border-slate-100 hover:border-slate-200 bg-white'
                          }`}
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          {/* Row Header */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="font-extrabold text-sm text-slate-800">#{order.id.slice(0, 8).toUpperCase()}</span>
                              <span className="font-bold text-sm text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                                {order.pharmacies?.name || 'Удаленная аптека'}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${paymentInfo.color}`}>
                                Оплата: {paymentInfo.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-bold">{formattedDate}</span>
                          </div>

                          {/* Row Body */}
                          <div className="flex justify-between items-center text-xs">
                            <p className="text-slate-500 truncate max-w-lg">
                              {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                            </p>
                            <span className="font-extrabold text-slate-800 text-sm shrink-0 ml-4">{order.total_amount.toLocaleString()} смн</span>
                          </div>

                          {/* Expanded content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-slate-100 space-y-4 cursor-default"
                                onClick={e => e.stopPropagation()}
                              >
                                {/* Items Table */}
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Состав заказа:</p>
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                      <span className="text-slate-600 font-medium">{item.name} <strong className="text-slate-400">×{item.quantity}</strong></span>
                                      <span className="font-bold text-slate-800">{item.price * item.quantity} смн <span className="text-[10px] font-medium text-slate-400">({item.price} смн/шт)</span></span>
                                    </div>
                                  ))}
                                </div>

                                {/* Order details */}
                                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                                  <div>
                                    <p className="text-slate-400 font-medium">Желаемая дата доставки:</p>
                                    <p className="font-bold text-slate-700 mt-0.5">{deliveryDate}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400 font-medium">Комментарий аптеки:</p>
                                    <p className="font-bold text-slate-700 mt-0.5">{order.notes || '—'}</p>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2 pt-2">
                                  {statusInfo.next && (
                                    <button 
                                      onClick={() => handleUpdateOrderStatus(order.id, statusInfo.next!)}
                                      className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                                    >
                                      Перевести в: {ORDER_STATUS_MAP[statusInfo.next!].label}
                                    </button>
                                  )}
                                  
                                  {order.payment_status !== 'paid' && (
                                    <button 
                                      onClick={() => handleUpdatePaymentStatus(order, 'paid')}
                                      className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-50"
                                    >
                                      Отметить оплату ✅
                                    </button>
                                  )}

                                  {order.order_status !== 'cancelled' && (
                                    <button 
                                      onClick={() => handleCancelOrder(order)}
                                      className="border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-bold transition-all ml-auto"
                                    >
                                      Отменить заказ
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PHARMACY REGISTRY */}
          {activeTab === 'pharmacies' && (() => {
            const activePartners = pharmacies.filter(p => p.status !== 'lead');
            const leadPartners = pharmacies.filter(p => p.status === 'lead');

            return (
              <div className="space-y-6">
                {/* Section 1: Leads/Requests from Website */}
                {leadPartners.length > 0 && (
                  <div className="bg-amber-50/40 rounded-3xl border border-amber-200/60 p-6 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-amber-900 font-outfit flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        Заявки на партнерство с сайта
                      </h3>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        {leadPartners.length} новых
                      </span>
                    </div>

                    <div className="overflow-x-auto bg-white rounded-2xl border border-amber-100">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                            <th className="p-4 rounded-l-xl">Аптека</th>
                            <th className="p-4">Контактное лицо</th>
                            <th className="p-4">Телефон (WhatsApp)</th>
                            <th className="p-4">Адрес / Регион</th>
                            <th className="p-4">Дата заявки</th>
                            <th className="p-4 rounded-r-xl text-right">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {leadPartners.map(p => {
                            const date = p.created_at 
                              ? new Date(p.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                              : '—';
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 font-bold text-slate-800">{p.name}</td>
                                <td className="p-4 text-slate-600 font-semibold">{p.contact_person || '—'}</td>
                                <td className="p-4 font-semibold text-slate-700">{p.phone || '—'}</td>
                                <td className="p-4 text-slate-500">{p.address || '—'}</td>
                                <td className="p-4 text-slate-400 font-bold">{date}</td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                  <button 
                                    onClick={() => openPharmacyModal('edit', p)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all"
                                  >
                                    Одобрить
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePharmacy(p.id)}
                                    className="border border-red-200 text-red-500 hover:bg-red-50 font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all"
                                  >
                                    Отклонить
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Section 2: Active B2B Partners */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold text-slate-800 font-outfit">Реестр аптек-партнеров</h3>
                    <button 
                      onClick={() => openPharmacyModal('create')}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-50"
                    >
                      <UserPlus size={14} /> Добавить аптеку
                    </button>
                  </div>

                  {activePartners.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Действующие аптеки не зарегистрированы. Одобрите заявку или добавьте партнера вручную!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                            <th className="p-4 rounded-l-xl">Аптека</th>
                            <th className="p-4">Скидка</th>
                            <th className="p-4">Баланс долга</th>
                            <th className="p-4">Контакты</th>
                            <th className="p-4">Ссылка для заказа</th>
                            <th className="p-4 rounded-r-xl">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {activePartners.map(p => {
                            const usedCreditPercent = Math.min((p.balance / p.credit_limit) * 100, 100);
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4">
                                  <p className="font-extrabold text-slate-800">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{p.address || 'Адрес не указан'}</p>
                                </td>
                                <td className="p-4">
                                  {p.discount_percent < 0 ? (
                                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-bold border border-amber-100">
                                      +{Math.abs(p.discount_percent)}% наценка
                                    </span>
                                  ) : p.discount_percent > 0 ? (
                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold border border-emerald-100">
                                      -{p.discount_percent}% скидка
                                    </span>
                                  ) : (
                                    <span className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-md font-bold border border-slate-100">
                                      Опт
                                    </span>
                                  )}
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center justify-between max-w-[120px] mb-1 font-bold text-slate-700">
                                    <span>{p.balance} смн</span>
                                    <span className="text-[10px] text-slate-400">/ {p.credit_limit}</span>
                                  </div>
                                  <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${usedCreditPercent > 85 ? 'bg-red-500' : usedCreditPercent > 50 ? 'bg-amber-400' : 'bg-blue-500'}`}
                                      style={{ width: `${usedCreditPercent}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="p-4">
                                  <p className="font-bold text-slate-700">{p.contact_person || '—'}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{p.phone || '—'}</p>
                                </td>
                                <td className="p-4">
                                  <button 
                                    onClick={() => copyB2BLink(p.token, p.id)}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 border ${
                                      copiedId === p.id 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {copiedId === p.id ? (
                                      <>
                                        <Check size={10} /> Ссылка скопирована
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={10} /> Копировать ссылку
                                      </>
                                    )}
                                  </button>
                                </td>
                                <td className="p-4 flex gap-1.5">
                                  <button 
                                    onClick={() => openPharmacyModal('edit', p)}
                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePharmacy(p.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: MANUAL ORDER CREATION */}
          {activeTab === 'new-order' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Form Input Side */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 p-6 space-y-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 font-outfit border-b border-slate-50 pb-3">
                  Новый ручной оптовый заказ
                </h3>

                <div className="space-y-4">
                  {/* Select Pharmacy */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Выберите аптеку-партнера</label>
                    <select
                      value={selectedPharmacyForOrder}
                      onChange={e => { setSelectedPharmacyForOrder(e.target.value); setOrderCart({}); }}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                    >
                      <option value="">-- Выбрать аптеку --</option>
                      {pharmacies.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.discount_percent < 0 ? `(наценка +${Math.abs(p.discount_percent)}%)` : p.discount_percent > 0 ? `(скидка -${p.discount_percent}%)` : '(базовый опт)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPharmacyForOrder ? (
                    <div className="space-y-4">
                      {/* Search items */}
                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Быстрый поиск товаров</label>
                        <div className="relative">
                          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                          <input 
                            type="text" 
                            placeholder="Наберите первые буквы для фильтрации..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                            value={orderSearchQuery}
                            onChange={e => setOrderSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Products Grid selector */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredCatalogForOrder.map(p => {
                          const cartQty = orderCart[p.id] || 0;
                          const discount = selectedPharmObj ? selectedPharmObj.discount_percent : 0;
                          const baseWholesale = Number(p.price) || 0;
                          const b2bPrice = Math.round(baseWholesale * (1 - discount / 100));

                          return (
                            <div key={p.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
                              <div className="min-w-0 pr-2">
                                <p className="font-extrabold text-xs text-slate-800 truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                  Опт: <strong className="text-emerald-600">{b2bPrice} смн</strong> <span className="line-through">({p.retail_price})</span>
                                </p>
                              </div>

                              {cartQty > 0 ? (
                                <div className="flex items-center bg-slate-900 text-white rounded-lg p-0.5">
                                  <button onClick={() => updateManualCartQty(p.id, -1)} className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded"><Minus size={10}/></button>
                                  <span className="w-6 text-center text-xs font-bold">{cartQty}</span>
                                  <button onClick={() => updateManualCartQty(p.id, 1)} className="w-5 h-5 flex items-center justify-center hover:bg-white/10 rounded"><Plus size={10}/></button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => updateManualCartQty(p.id, 1)}
                                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95"
                                >
                                  Добавить
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Details inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Желаемая дата доставки</label>
                          <input 
                            type="date"
                            className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300"
                            value={orderDeliveryDate}
                            onChange={e => setOrderDeliveryDate(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Комментарий</label>
                          <input 
                            type="text"
                            placeholder="Особые пожелания к отгрузке..."
                            className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300"
                            value={orderNotes}
                            onChange={e => setOrderNotes(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                      Пожалуйста, выберите аптеку для начала подбора товаров.
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Summary Side */}
              <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 lg:sticky lg:top-24 flex flex-col">
                <h3 className="font-bold text-slate-800 text-base border-b border-slate-50 pb-3 font-outfit flex items-center gap-2">
                  <ShoppingCart size={18} className="text-emerald-600" /> Накладная заказа
                </h3>

                <div className="flex-1 space-y-2 overflow-y-auto max-h-[220px]">
                  {manualOrderItems.map(item => (
                    <div key={item.product.id} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="min-w-0 pr-2 flex-1">
                        <p className="font-bold text-slate-700 truncate">{item.product.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.b2bPrice} смн × {item.quantity}</p>
                      </div>
                      <span className="font-extrabold text-slate-850 shrink-0">{item.b2bPrice * item.quantity} смн</span>
                    </div>
                  ))}

                  {manualOrderItems.length === 0 && (
                    <p className="py-12 text-center text-slate-400 text-xs font-medium">Товары не выбраны.</p>
                  )}
                </div>

                {manualOrderItems.length > 0 && (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <div className="flex justify-between items-end">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Итого к оплате:</span>
                      <span className="text-2xl font-extrabold text-slate-800 leading-none">
                        {manualOrderTotal.toLocaleString()} <span className="text-xs font-bold text-slate-400">смн</span>
                      </span>
                    </div>

                    <button
                      onClick={handleCreateManualOrder}
                      disabled={isSubmittingManualOrder}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {isSubmittingManualOrder ? 'Оформление...' : 'Создать накладную заказа'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: B2B PRODUCT PRICING */}
          {activeTab === 'prices' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800 font-outfit">Цены B2B каталога</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Здесь вы можете изменить базовые оптовые цены товаров. Розничные цены рассчитываются автоматически на основе наценки сайта.
                  </p>
                </div>
                <div className="bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-100 text-slate-650">
                  Текущая наценка розницы: <span className="font-extrabold text-slate-800">+{markupSettings.percent}%</span> + <span className="font-extrabold text-slate-800">{markupSettings.flat} смн</span>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Поиск товара по названию или ID..."
                  value={priceSearchQuery}
                  onChange={e => setPriceSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                      <th className="p-4 rounded-l-xl">Товар</th>
                      <th className="p-4">Базовая B2B цена</th>
                      <th className="p-4">Расчетная розница</th>
                      <th className="p-4 rounded-r-xl text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProductsForPrices.map(p => {
                      const currentEditVal = priceEdits[p.id] !== undefined ? priceEdits[p.id] : p.price;
                      
                      // Calculate dynamic retail preview
                      let retailPreview = currentEditVal;
                      if (markupSettings.percent > 0) retailPreview = retailPreview * (1 + markupSettings.percent / 100);
                      retailPreview = retailPreview + markupSettings.flat;
                      const retailPreviewRounded = Math.round(retailPreview);

                      const isSaving = savingProductIds[p.id];
                      const isSaved = savedProductIds[p.id];
                      const isChanged = priceEdits[p.id] !== undefined && priceEdits[p.id] !== p.price;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover border border-slate-100" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400">
                                <Package size={14} />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-800">{p.name}</p>
                              <p className="text-[10px] text-slate-400">ID: {p.id}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 max-w-[120px]">
                              <input
                                type="number"
                                value={currentEditVal}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  setPriceEdits(prev => ({
                                    ...prev,
                                    [p.id]: isNaN(val) ? 0 : val
                                  }));
                                }}
                                className="w-20 h-9 px-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:bg-white focus:border-slate-400 transition-all text-center"
                              />
                              <span className="text-slate-400 font-medium">смн</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-700">{retailPreviewRounded} смн</span>
                              <span className="text-[9px] text-slate-400 mt-0.5">наценка розницы</span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleSaveProductPrice(p.id, currentEditVal)}
                              disabled={isSaving || (!isChanged && !isSaved)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                isSaved
                                  ? 'bg-emerald-50 border border-emerald-250 text-emerald-600'
                                  : isChanged
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed'
                              }`}
                            >
                              {isSaving ? '...' : isSaved ? 'Сохранено ✓' : 'Сохранить'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProductsForPrices.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400">
                          Товары не найдены.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Slide-over Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Slide-over panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl z-10 p-6 flex flex-col justify-between border-l border-slate-100"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <h3 className="text-lg font-bold text-slate-800 font-outfit">
                    {modalMode === 'create' ? 'Регистрация аптеки' : 'Редактировать аптеку'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Название аптеки</label>
                    <input 
                      type="text" 
                      placeholder="Например: Аптека Шифо №12"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-350"
                      value={pharmacyForm.name}
                      onChange={e => setPharmacyForm({ ...pharmacyForm, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Контактное лицо</label>
                    <input 
                      type="text" 
                      placeholder="ФИО закупщика..."
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-350"
                      value={pharmacyForm.contact_person}
                      onChange={e => setPharmacyForm({ ...pharmacyForm, contact_person: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Номер телефона</label>
                    <input 
                      type="text" 
                      placeholder="+992 901 234 567"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-350"
                      value={pharmacyForm.phone}
                      onChange={e => setPharmacyForm({ ...pharmacyForm, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Адрес доставки</label>
                    <input 
                      type="text" 
                      placeholder="Улица, дом, город..."
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-350"
                      value={pharmacyForm.address}
                      onChange={e => setPharmacyForm({ ...pharmacyForm, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-4 pt-2 border-t border-slate-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Тип цены B2B</label>
                        <select
                          value={adjustmentType}
                          onChange={e => setAdjustmentType(e.target.value as 'discount' | 'markup')}
                          className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                        >
                          <option value="discount">Скидка (%)</option>
                          <option value="markup">Наценка опта (%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Размер коррекции (%)</label>
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                          value={adjustmentVal}
                          onChange={e => setAdjustmentVal(Math.max(0, parseInt(e.target.value) || 0))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 block">Лимит долга (смн)</label>
                      <input 
                        type="number" 
                        className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300 transition-colors"
                        value={pharmacyForm.credit_limit}
                        onChange={e => setPharmacyForm({ ...pharmacyForm, credit_limit: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSavePharmacy}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                Сохранить партнера
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
