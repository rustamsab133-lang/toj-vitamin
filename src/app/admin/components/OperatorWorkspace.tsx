"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { adminDbQuery, getCorrectNow } from '@/lib/admin-api';
import { Order, OrderItem, Product, OfflineCustomer } from '@/lib/types';
import { getMarkupSettings, applyMarkupToProduct } from '@/lib/markup';
import { 
  Phone, MessageCircle, Send, Instagram, Globe, Store, 
  Search, Plus, Package, Truck, CheckCircle, XCircle, 
  ChevronRight, Clock, UserPlus, Save, AlertCircle, Eye, X, User, MapPin, CreditCard, Calendar, Edit3, RefreshCw 
} from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new: { label: 'Новый / В работе', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: <Clock size={14} /> },
  delivering: { label: 'В доставке', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: <Truck size={14} /> },
  paid: { label: 'Оплата получена', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: <CheckCircle size={14} /> },
  cancelled: { label: 'Отменен', color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={14} /> },
};

const CHANNEL_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  phone: { label: 'Звонок', icon: <Phone size={14} />, color: 'text-indigo-600 bg-indigo-50' },
  whatsapp: { label: 'WhatsApp', icon: <MessageCircle size={14} />, color: 'text-green-600 bg-green-50' },
  telegram: { label: 'Telegram', icon: <Send size={14} />, color: 'text-sky-600 bg-sky-50' },
  instagram: { label: 'Instagram', icon: <Instagram size={14} />, color: 'text-pink-600 bg-pink-50' },
  website: { label: 'Сайт', icon: <Globe size={14} />, color: 'text-slate-600 bg-slate-100' },
  offline: { label: 'Офлайн', icon: <Store size={14} />, color: 'text-orange-600 bg-orange-50' },
};

export const OperatorWorkspace: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create order state
  const [isCreating, setIsCreating] = useState(false);
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    channel: 'phone',
    status: 'new',
    items: [],
    payment_method: 'cash',
    payment_status: 'unpaid'
  });
  
  // Customer lookup
  const [customerPhone, setCustomerPhone] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<OfflineCustomer | null>(null);
  
  // Product lookup
  const [productSearch, setProductSearch] = useState('');
  
  // Order Details Modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editableCourier, setEditableCourier] = useState('');
  const [editableNotes, setEditableNotes] = useState('');
  const [editableAddress, setEditableAddress] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Lock body scroll when order detail modal is open
  useEffect(() => {
    if (selectedOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedOrder]);

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order);
    setEditableCourier(order.courier_name || '');
    setEditableNotes(order.operator_notes || '');
    setEditableAddress(order.delivery_address || '');
  };

  const saveOrderDetails = async () => {
    if (!selectedOrder) return;
    setIsSavingDetails(true);
    try {
      await adminDbQuery({
        action: 'update',
        table: 'orders',
        data: {
          courier_name: editableCourier,
          operator_notes: editableNotes,
          delivery_address: editableAddress
        },
        id: selectedOrder.id
      });
      const updated = {
        ...selectedOrder,
        courier_name: editableCourier,
        operator_notes: editableNotes,
        delivery_address: editableAddress
      };
      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
    } catch (e) {
      console.error("Failed to save order details", e);
      alert("Не удалось сохранить данные заказа");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    // Auto-refresh orders every 15 seconds to sync dynamically in background!
    const timer = setInterval(() => {
      loadData(true);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);
    try {
      const [ordersRes, productsRes, markupSettings] = await Promise.all([
        adminDbQuery({ action: 'select', table: 'orders', data: { order: { column: 'created_at', ascending: false } } }),
        adminDbQuery({ action: 'select', table: 'products' }),
        getMarkupSettings()
      ]);
      if (ordersRes.data) setOrders(ordersRes.data);
      if (productsRes.data) {
        const retailProducts = productsRes.data.map((p: Product) => 
          applyMarkupToProduct(p, markupSettings)
        );
        setProducts(retailProducts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isBackground) setLoading(false);
      else setIsRefreshing(false);
    }
  };

  const handleCustomerSearch = async () => {
    if (customerPhone.length <= 4) return;
    try {
      const { data } = await adminDbQuery({
        action: 'select',
        table: 'offline_customers',
        data: { search: { column: 'phone', query: customerPhone } }
      });
      if (data && data.length > 0) {
        setFoundCustomer(data[0]);
        setNewOrder(prev => ({ 
          ...prev, 
          customer_id: data[0].id, 
          phone: data[0].phone || customerPhone 
        }));
      } else {
        setFoundCustomer(null);
        setNewOrder(prev => ({ ...prev, phone: customerPhone }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addToCart = (prod: Product) => {
    const existing = newOrder.items?.find(i => i.id === prod.id);
    if (existing) {
      setNewOrder(prev => ({
        ...prev,
        items: prev.items?.map(i => i.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i)
      }));
    } else {
      setNewOrder(prev => ({
        ...prev,
        items: [...(prev.items || []), { id: prod.id, name: prod.name, price: prod.price, quantity: 1 }]
      }));
    }
  };

  const removeFromCart = (id: string) => {
    setNewOrder(prev => ({
      ...prev,
      items: prev.items?.filter(i => i.id !== id)
    }));
  };

  const cartTotal = (newOrder.items || []).reduce((acc, i) => acc + (i.price * i.quantity), 0);

  const saveOrder = async () => {
    const finalPhone = newOrder.phone || customerPhone;
    if (!newOrder.items?.length || !finalPhone) return alert("Добавьте товары и номер телефона");
    
    // Auto-create customer if doesn't exist
    let cid = newOrder.customer_id;
    if (!foundCustomer) {
      try {
        const { data: newCustData } = await adminDbQuery({
          action: 'insert',
          table: 'offline_customers',
          data: [{ phone: finalPhone, name: 'Новый клиент (заказ)' }]
        });
        if (newCustData && newCustData[0]) cid = newCustData[0].id;
      } catch (e) { console.error("Customer create failed", e); }
    }
    
    const fullPayload = {
      ...newOrder,
      phone: finalPhone,
      customer_id: cid,
      total: cartTotal,
      created_at: getCorrectNow().toISOString()
    };

    try {
      // First try inserting full payload
      try {
        await adminDbQuery({
          action: 'insert',
          table: 'orders',
          data: [fullPayload]
        });
      } catch (e: any) {
        console.warn("Full payload insert failed, falling back to base columns:", e);
        // Fallback: strip extra columns if Supabase Postgres table doesn't have them yet
        const basePayload = {
          phone: finalPhone,
          total: cartTotal,
          status: newOrder.status || 'new',
          items: newOrder.items || [],
          created_at: getCorrectNow().toISOString()
        };
        await adminDbQuery({
          action: 'insert',
          table: 'orders',
          data: [basePayload]
        });
      }

      // If the created order is paid, deduct stock immediately
      const isInitialPaid = (newOrder.status || 'new') === 'paid';
      if (isInitialPaid && newOrder.items) {
        for (const item of newOrder.items) {
          try {
            await adminDbQuery({
              action: 'rpc',
              name: 'adjust_product_stock',
              data: {
                p_product_id: String(item.id),
                p_type: 'sale_online',
                p_quantity_change: -item.quantity,
                p_notes: `Списание по онлайн-заказу (создан как Оплачен)`
              }
            });
          } catch (stockErr) {
            console.error("Failed to deduct stock for new paid order", item.id, stockErr);
          }
        }
      }

      setIsCreating(false);
      setNewOrder({ channel: 'phone', status: 'new', items: [], payment_method: 'cash', payment_status: 'unpaid' });
      setCustomerPhone('');
      setFoundCustomer(null);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении");
    }
  };

  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  const updateOrderStatus = async (id: number, newStatus: string) => {
    if (updatingOrderId === id) return; // Prevent double-click
    setUpdatingOrderId(id);

    try {
      const order = orders.find(o => o.id === id);
      const oldStatus = order ? order.status : 'new';

      // Try full payload first (with payment_status), fallback to status-only
      try {
        const updatePayload: Record<string, any> = { status: newStatus };
        if (newStatus === 'paid') {
          updatePayload.payment_status = 'paid';
        }
        await adminDbQuery({
          action: 'update',
          table: 'orders',
          data: updatePayload,
          id
        });
      } catch (e: any) {
        // Fallback: payment_status column may not exist in Supabase
        console.warn("Full update failed, retrying with status only:", e);
        await adminDbQuery({
          action: 'update',
          table: 'orders',
          data: { status: newStatus },
          id
        });
      }
      
      // Update LTV in CRM if paid
      if (newStatus === 'paid' && order && order.customer_id && order.status !== 'paid') {
        try {
          const { data: custData } = await adminDbQuery({
            action: 'select',
            table: 'offline_customers',
            filters: { id: order.customer_id }
          });
          
          if (custData && custData[0]) {
            const newSpent = (custData[0].total_spent || 0) + Number(order.total);
            await adminDbQuery({
              action: 'update',
              table: 'offline_customers',
              data: { total_spent: newSpent },
              id: order.customer_id
            });
          }
        } catch (ltvErr) {
          console.warn("LTV update failed (non-critical):", ltvErr);
        }
      }

      // Deduct stock if transitions to 'paid'
      if (newStatus === 'paid' && oldStatus !== 'paid' && order?.items) {
        for (const item of order.items) {
          try {
            await adminDbQuery({
              action: 'rpc',
              name: 'adjust_product_stock',
              data: {
                p_product_id: String(item.id),
                p_type: 'sale_online',
                p_quantity_change: -item.quantity,
                p_notes: `Списание по онлайн-заказу #${id}`
              }
            });
          } catch (stockErr) {
            console.error("Failed to deduct stock for product", item.id, stockErr);
          }
        }
      }

      // Restore stock if transitions from 'paid' to 'cancelled'
      if (oldStatus === 'paid' && newStatus === 'cancelled' && order?.items) {
        for (const item of order.items) {
          try {
            await adminDbQuery({
              action: 'rpc',
              name: 'adjust_product_stock',
              data: {
                p_product_id: String(item.id),
                p_type: 'correction',
                p_quantity_change: item.quantity,
                p_notes: `Возврат при отмене заказа #${id}`
              }
            });
          } catch (stockErr) {
            console.error("Failed to restore stock for product", item.id, stockErr);
          }
        }
      }

      // Only update UI AFTER server confirms success
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    } catch (e) {
      console.error("Failed to update status:", e);
      alert("Не удалось обновить статус заказа. Попробуйте ещё раз.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Helper to format date in Asia/Dushanbe timezone (GMT+5) as YYYY-MM-DD
  const getGmt5DateString = (date: Date) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dushanbe',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch (err) {
      return date.toISOString().split('T')[0];
    }
  };

  // Filters & Search state
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Stats Period state
  const [statsPeriod, setStatsPeriod] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(getGmt5DateString(getCorrectNow()));

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filterStatus !== 'all' && o.status !== filterStatus) return false;
      if (filterChannel !== 'all' && (o.channel || 'website') !== filterChannel) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const phoneMatch = (o.phone || '').toLowerCase().includes(q);
        const idMatch = String(o.id).includes(q);
        const addressMatch = (o.delivery_address || '').toLowerCase().includes(q);
        const itemsMatch = Array.isArray(o.items) && o.items.some((i: OrderItem) => i.name.toLowerCase().includes(q));
        if (!phoneMatch && !idMatch && !addressMatch && !itemsMatch) return false;
      }
      return true;
    });
  }, [orders, filterStatus, filterChannel, searchQuery]);

  // Period Stats summary calculation
  const periodStats = useMemo(() => {
    const now = getCorrectNow();
    const todayGmt5 = getGmt5DateString(now);
    
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    const yesterdayGmt5 = getGmt5DateString(yesterday);

    const selectedOrders = orders.filter(o => {
      const orderDate = new Date(o.created_at);
      const orderGmt5 = getGmt5DateString(orderDate);

      if (statsPeriod === 'today') {
        return orderGmt5 === todayGmt5;
      }
      if (statsPeriod === 'yesterday') {
        return orderGmt5 === yesterdayGmt5;
      }
      if (statsPeriod === '7days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (statsPeriod === '30days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      if (statsPeriod === 'custom' && customDate) {
        return orderGmt5 === customDate;
      }
      return true;
    });

    const totalRevenue = selectedOrders.filter(o => o.status === 'paid').reduce((sum, o) => sum + Number(o.total || 0), 0);
    const inDelivery = selectedOrders.filter(o => o.status === 'delivering').length;
    const newCount = selectedOrders.filter(o => o.status === 'new').length;
    const paidCount = selectedOrders.filter(o => o.status === 'paid').length;

    let periodLabel = 'За сегодня';
    if (statsPeriod === 'yesterday') periodLabel = 'За вчера';
    if (statsPeriod === '7days') periodLabel = 'За 7 дней';
    if (statsPeriod === '30days') periodLabel = 'За 30 дней';
    if (statsPeriod === 'custom') periodLabel = `За ${new Date(customDate).toLocaleDateString('ru-RU')}`;

    return {
      count: selectedOrders.length,
      revenue: totalRevenue,
      inDelivery,
      newCount,
      paidCount,
      periodLabel
    };
  }, [orders, statsPeriod, customDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronRight size={18} className="text-slate-400 rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">АРМ Оператора</h1>
            <p className="text-slate-500 text-sm">Прием заказов и управление доставкой</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0"
            title="Обновить данные с базы"
          >
            <RefreshCw size={16} className={`text-slate-500 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-sm flex-1 md:flex-initial justify-center"
          >
            <Plus size={18} /> Создать заказ (Экспресс)
          </button>
        </div>
      </div>

      {isCreating ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Новый заказ</h2>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
              <XCircle size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Client & Info */}
            <div className="space-y-5 lg:col-span-1">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Канал поступления</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CHANNEL_MAP).map(([k, v]) => (
                    <button 
                      key={k}
                      onClick={() => setNewOrder(prev => ({ ...prev, channel: k as any }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        newOrder.channel === k ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {v.icon} {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Телефон клиента</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="+992..."
                    className="flex-1 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  />
                  <button onClick={handleCustomerSearch} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 rounded-xl flex items-center justify-center">
                    <Search size={16} />
                  </button>
                </div>
                {foundCustomer && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm flex items-start gap-2">
                    <UserPlus size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{foundCustomer.name || 'Без имени'}</p>
                      <p className="text-emerald-600 text-xs">Постоянный клиент. Потрачено: {foundCustomer.total_spent || 0} смн</p>
                    </div>
                  </div>
                )}
                {!foundCustomer && customerPhone.length > 5 && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><AlertCircle size={12}/> Новый клиент (будет создан)</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Адрес доставки</label>
                <textarea 
                  value={newOrder.delivery_address || ''}
                  onChange={e => setNewOrder(prev => ({ ...prev, delivery_address: e.target.value }))}
                  placeholder="Район, Улица, Дом..."
                  rows={2}
                  className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>

            {/* Middle: Products */}
            <div className="space-y-5 lg:col-span-1">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Поиск товаров</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Название или код..."
                    className="w-full pl-9 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
              <div className="h-[300px] overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/50 space-y-1">
                {filteredProducts.slice(0, 15).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 hover:border-indigo-200 cursor-pointer" onClick={() => addToCart(p)}>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.price} смн
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          (p.stock_quantity || 0) < 5 
                            ? 'bg-red-50 text-red-600' 
                            : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          остаток: {p.stock_quantity || 0} шт
                        </span>
                      </p>
                    </div>
                    <Plus size={16} className="text-indigo-600" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Cart & Summary */}
            <div className="lg:col-span-1 bg-slate-50 rounded-xl p-5 flex flex-col h-full border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center justify-between">
                Корзина заказа
                <span className="bg-indigo-100 text-indigo-800 py-0.5 px-2 rounded-full text-xs">{newOrder.items?.length || 0}</span>
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {newOrder.items?.map(i => (
                  <div key={i.id} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 truncate">{i.name}</p>
                      <p className="text-xs text-slate-500">{i.price} × {i.quantity} = <span className="font-semibold text-slate-700">{i.price * i.quantity}</span> смн</p>
                    </div>
                    <button onClick={() => removeFromCart(i.id)} className="text-slate-400 hover:text-red-500 p-1">
                      <XCircle size={16} />
                    </button>
                  </div>
                ))}
                {!newOrder.items?.length && (
                  <div className="text-center py-10 text-slate-400 text-sm">Корзина пуста</div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium text-slate-600">Итого:</span>
                  <span className="text-2xl font-bold text-slate-900">{cartTotal} смн</span>
                </div>
                <button 
                  onClick={saveOrder}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium flex justify-center items-center gap-2 transition-colors"
                >
                  <Save size={18} /> Оформить заказ
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats Summary with Period Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                📊 Статистика: <span className="text-indigo-600">{periodStats.periodLabel}</span>
              </span>

              {/* Period selection tabs */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'today', label: 'Сегодня' },
                  { id: 'yesterday', label: 'Вчера' },
                  { id: '7days', label: '7 дней' },
                  { id: '30days', label: '30 дней' },
                  { id: 'custom', label: 'Выбрать дату' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setStatsPeriod(p.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      statsPeriod === p.id 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                {statsPeriod === 'custom' && (
                  <input 
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="text-xs py-0.5 px-2 rounded-lg border-slate-200 focus:ring-indigo-500 text-slate-700 bg-white ml-1"
                  />
                )}
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Заказов ({periodStats.periodLabel})</p>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{periodStats.count}</p>
              </div>
              <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500">Новые</p>
                <p className="text-2xl font-bold text-blue-600 mt-0.5">{periodStats.newCount}</p>
              </div>
              <div className="bg-amber-50/50 rounded-xl p-3.5 border border-amber-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">В доставке</p>
                <p className="text-2xl font-bold text-amber-600 mt-0.5">{periodStats.inDelivery}</p>
              </div>
              <div className="bg-emerald-50/50 rounded-xl p-3.5 border border-emerald-100">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Выручка ({periodStats.periodLabel})</p>
                <p className="text-2xl font-bold text-emerald-700 mt-0.5">{periodStats.revenue} <span className="text-xs text-slate-400 font-normal">смн</span></p>
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Поиск по ID, телефону, адресу или названию товара..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <XCircle size={16} />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'new', label: '🟡 Новые' },
                  { id: 'delivering', label: '🚚 В доставке' },
                  { id: 'paid', label: '💰 Оплачены' },
                  { id: 'cancelled', label: '❌ Отмена' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      filterStatus === tab.id 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Channel filter chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-medium mr-1">Канал:</span>
              <button
                onClick={() => setFilterChannel('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterChannel === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Все каналы
              </button>
              {Object.entries(CHANNEL_MAP).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFilterChannel(k)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterChannel === k ? 'bg-indigo-600 text-white' : `${v.color} hover:opacity-80`
                  }`}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500">ID / Дата</th>
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500">Канал</th>
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500">Клиент / Состав</th>
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500">Сумма</th>
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500">Изменить статус</th>
                    <th className="py-4 px-5 text-[11px] uppercase tracking-widest font-semibold text-slate-500 text-right">Быстрый действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map(order => {
                  const ch = CHANNEL_MAP[order.channel || 'website'] || CHANNEL_MAP.website;
                  const st = STATUS_MAP[order.status] || STATUS_MAP.new;
                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => openOrderModal(order)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-5 align-top">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">#{order.id}</span>
                          <Eye size={14} className="text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('ru-RU')} {new Date(order.created_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}</p>
                      </td>
                      <td className="py-3.5 px-5 align-top">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${ch.color}`}>
                          {ch.icon} {ch.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 align-top max-w-xs">
                        <p className="text-sm font-semibold text-slate-900">{order.phone || 'Не указан'}</p>
                        {Array.isArray(order.items) && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {order.items.map((i: OrderItem) => `${i.name} ×${i.quantity}`).join(', ')}
                          </p>
                        )}
                        {order.delivery_address && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">📍 {order.delivery_address}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-5 align-top">
                        <p className="text-sm font-bold text-slate-900">{order.total} смн</p>
                      </td>
                      <td className="py-3.5 px-5 align-top" onClick={e => e.stopPropagation()}>
                        {/* Direct dropdown for instant status change */}
                        <select 
                          value={order.status || 'new'}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          disabled={updatingOrderId === order.id}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${updatingOrderId === order.id ? 'opacity-50 cursor-wait' : ''} ${st.color}`}
                        >
                          <option value="new">🟡 Новый / В работе</option>
                          <option value="delivering">🚚 В доставке</option>
                          <option value="paid">💰 Оплата получена</option>
                          <option value="cancelled">❌ Отменен</option>
                        </select>
                        {updatingOrderId === order.id && (
                          <p className="text-[10px] text-indigo-500 mt-1 animate-pulse">Сохранение...</p>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right align-top" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openOrderModal(order); }}
                            title="Открыть детали заказа"
                            className="px-2 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all"
                          >
                            <Eye size={13} /> Карточка
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'delivering'); }}
                            disabled={updatingOrderId === order.id}
                            title="Перевести в Доставку"
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all ${
                              updatingOrderId === order.id ? 'opacity-50 cursor-wait' :
                              order.status === 'delivering' 
                                ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            <Truck size={13} /> Доставка
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'paid'); }}
                            disabled={updatingOrderId === order.id}
                            title="Отметить как Оплачен"
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all ${
                              updatingOrderId === order.id ? 'opacity-50 cursor-wait' :
                              order.status === 'paid' 
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' 
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            <CheckCircle size={13} /> Оплата
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">Заказов пока нет</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* Detailed Order Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  #{selectedOrder.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">Заказ #{selectedOrder.id}</h3>
                    {(() => {
                      const ch = CHANNEL_MAP[selectedOrder.channel || 'website'] || CHANNEL_MAP.website;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${ch.color}`}>
                          {ch.icon} {ch.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(selectedOrder.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })} в {new Date(selectedOrder.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              
              {/* Grid 2 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Col: Customer & Payment */}
                <div className="space-y-4">
                  {/* Customer Card */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <User size={14} className="text-indigo-500" /> Информация о клиенте
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-base">{selectedOrder.phone || 'Номер не указан'}</p>
                      {selectedOrder.phone && (
                        <div className="flex gap-2 mt-2">
                          <a 
                            href={`tel:${selectedOrder.phone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold transition-colors"
                          >
                            <Phone size={13} /> Позвонить
                          </a>
                          <a 
                            href={`https://wa.me/${selectedOrder.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Address & Notes */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <MapPin size={14} className="text-amber-500" /> Доставка
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium">Адрес доставки:</label>
                      <input 
                        type="text"
                        value={editableAddress}
                        onChange={e => setEditableAddress(e.target.value)}
                        placeholder="Укажите адрес..."
                        className="w-full mt-1 text-xs py-1.5 px-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    {selectedOrder.delivery_notes && (
                      <div>
                        <span className="text-[11px] text-slate-400 font-medium">Примечание к доставке:</span>
                        <p className="text-xs text-slate-700 bg-white p-2 rounded-xl border border-slate-100 mt-1">{selectedOrder.delivery_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Payment Details */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <CreditCard size={14} className="text-emerald-500" /> Оплата
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-slate-500">Способ оплаты:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedOrder.payment_method === 'card' ? '💳 Банковская карта' :
                         selectedOrder.payment_method === 'alif' ? '📲 Alif Моби' :
                         selectedOrder.payment_method === 'dc' ? '📲 Dushanbe City' :
                         selectedOrder.payment_method === 'transfer' ? '🏦 Перевод' : '💵 Наличные'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Статус оплаты:</span>
                      <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                        selectedOrder.payment_status === 'paid' || selectedOrder.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {selectedOrder.payment_status === 'paid' || selectedOrder.status === 'paid' ? 'Оплачено' : 'Ожидает оплаты'}
                      </span>
                    </div>
                  </div>

                  {/* Marketing & Attribution Details */}
                  {(selectedOrder.promocode || selectedOrder.utm_source || (selectedOrder.discount && Number(selectedOrder.discount) > 0)) ? (
                    <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-500">
                        <Globe size={14} /> Источник заказа и Маркетинг
                      </div>
                      
                      {selectedOrder.promocode && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Промокод:</span>
                          <span className="font-extrabold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 font-outfit">
                            {selectedOrder.promocode}
                          </span>
                        </div>
                      )}

                      {selectedOrder.discount !== undefined && selectedOrder.discount !== null && Number(selectedOrder.discount) > 0 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Скидка по промокоду:</span>
                          <span className="font-extrabold text-red-600">
                            -{selectedOrder.discount} смн
                          </span>
                        </div>
                      )}

                      {selectedOrder.original_total && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Сумма без скидки:</span>
                          <span className="font-bold text-slate-700">
                            {selectedOrder.original_total} смн
                          </span>
                        </div>
                      )}

                      {(selectedOrder.utm_source || selectedOrder.utm_medium || selectedOrder.utm_campaign) && (
                        <div className="pt-2 border-t border-indigo-100/50 space-y-1.5 text-[11px]">
                          <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">UTM-метки:</p>
                          {selectedOrder.utm_source && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Источник (source):</span>
                              <span className="font-semibold text-slate-800">{selectedOrder.utm_source}</span>
                            </div>
                          )}
                          {selectedOrder.utm_medium && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Канал (medium):</span>
                              <span className="font-semibold text-slate-800">{selectedOrder.utm_medium}</span>
                            </div>
                          )}
                          {selectedOrder.utm_campaign && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Кампания (campaign):</span>
                              <span className="font-semibold text-slate-800">{selectedOrder.utm_campaign}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <Globe size={14} className="text-slate-500" /> Источник заказа
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Переход:</span>
                        <span className="font-semibold text-slate-800">
                          Прямой переход / Органический трафик с сайта
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Col: Status Control, Courier & Operator Notes */}
                <div className="space-y-4">
                  {/* Status Change Control */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Текущий статус</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${STATUS_MAP[selectedOrder.status]?.color || STATUS_MAP.new.color}`}>
                        {STATUS_MAP[selectedOrder.status]?.icon} {STATUS_MAP[selectedOrder.status]?.label}
                      </span>
                    </div>
                    <div className="pt-2 flex flex-wrap gap-2">
                      {[
                        { key: 'new', label: '🟡 Новый', color: 'hover:bg-blue-100 text-blue-700 bg-blue-50 border-blue-200' },
                        { key: 'delivering', label: '🚚 В доставку', color: 'hover:bg-amber-100 text-amber-700 bg-amber-50 border-amber-200' },
                        { key: 'paid', label: '💰 Оплачен', color: 'hover:bg-emerald-100 text-emerald-700 bg-emerald-50 border-emerald-200' },
                        { key: 'cancelled', label: '❌ Отмена', color: 'hover:bg-red-100 text-red-700 bg-red-50 border-red-200' },
                      ].map(st => (
                        <button
                          key={st.key}
                          disabled={updatingOrderId === selectedOrder.id}
                          onClick={async () => {
                            await updateOrderStatus(selectedOrder.id, st.key);
                            setSelectedOrder(prev => prev ? { ...prev, status: st.key } : null);
                          }}
                          className={`flex-1 py-2 px-2.5 text-xs font-semibold rounded-xl border transition-all ${st.color} ${
                            selectedOrder.status === st.key ? 'ring-2 ring-indigo-500 font-bold' : ''
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Courier & Operator Notes Input */}
                  <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Truck size={14} className="text-indigo-500" /> Назначение и заметки
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium">Имя курьера:</label>
                      <input 
                        type="text"
                        value={editableCourier}
                        onChange={e => setEditableCourier(e.target.value)}
                        placeholder="Укажите имя курьера..."
                        className="w-full mt-1 text-xs py-1.5 px-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium">Заметка оператора:</label>
                      <textarea 
                        rows={2}
                        value={editableNotes}
                        onChange={e => setEditableNotes(e.target.value)}
                        placeholder="Внутренние примечания..."
                        className="w-full mt-1 text-xs py-1.5 px-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white resize-none"
                      />
                    </div>
                    <button
                      onClick={saveOrderDetails}
                      disabled={isSavingDetails}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Save size={14} /> {isSavingDetails ? 'Сохранение...' : 'Сохранить курьера и заметки'}
                    </button>
                  </div>
                </div>

              </div>

              {/* Composition of Order */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Package size={16} className="text-indigo-600" /> Состав заказа ({selectedOrder.items?.length || 0} товаров)
                  </h4>
                  <div className="text-right">
                    {selectedOrder.discount && Number(selectedOrder.discount) > 0 && (
                      <span className="block text-xs font-semibold text-red-500">Скидка: -{selectedOrder.discount} смн</span>
                    )}
                    <span className="text-lg font-bold text-slate-900">Итого: {selectedOrder.total} смн</span>
                  </div>
                </div>

                <div className="bg-slate-50/70 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-white transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.price} смн × {item.quantity} шт.</p>
                        </div>
                      </div>
                      <p className="font-bold text-slate-900 text-sm">{item.price * item.quantity} смн</p>
                    </div>
                  ))}
                  {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                    <p className="p-4 text-center text-slate-400 text-xs">Состав заказа не указан</p>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors"
              >
                Закрыть
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
