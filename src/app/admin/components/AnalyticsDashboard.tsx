"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { adminDbQuery } from '@/lib/admin-api';
import { ChevronLeft, BarChart3, TrendingUp, DollarSign, Users, Percent, Gift, Search, AlertCircle, ShoppingBag, Eye, RefreshCw, X, ArrowUpRight, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnalyticsDashboardProps {
  onBack: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onBack }) => {
  const lang = 'ru';
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'today' | '7days' | '30days' | 'all'>('7days');
  
  // Data States
  const [orders, setOrders] = useState<any[]>([]);
  const [promocodes, setPromocodes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  
  // Detail Modal State
  const [selectedPromoDetails, setSelectedPromoDetails] = useState<any | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ordersRes, promoRes, clientsRes, eventsRes] = await Promise.all([
        adminDbQuery({ action: 'select', table: 'orders', data: { order: { column: 'created_at', ascending: false } } }),
        adminDbQuery({ action: 'select', table: 'promocodes' }),
        adminDbQuery({ action: 'select', table: 'clients', data: { order: { column: 'created_at', ascending: false } } }),
        adminDbQuery({ action: 'select', table: 'analytics_events', data: { order: { column: 'created_at', ascending: false } } })
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (promoRes.data) setPromocodes(promoRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter data by selected period
  const filteredOrders = useMemo(() => {
    if (timePeriod === 'all') return orders;
    const now = new Date();
    const cutoff = new Date();
    if (timePeriod === 'today') cutoff.setHours(0, 0, 0, 0);
    if (timePeriod === '7days') cutoff.setDate(now.getDate() - 7);
    if (timePeriod === '30days') cutoff.setDate(now.getDate() - 30);
    
    return orders.filter(o => new Date(o.created_at) >= cutoff);
  }, [orders, timePeriod]);

  const filteredEvents = useMemo(() => {
    if (timePeriod === 'all') return events;
    const now = new Date();
    const cutoff = new Date();
    if (timePeriod === 'today') cutoff.setHours(0, 0, 0, 0);
    if (timePeriod === '7days') cutoff.setDate(now.getDate() - 7);
    if (timePeriod === '30days') cutoff.setDate(now.getDate() - 30);
    
    return events.filter(e => new Date(e.created_at) >= cutoff);
  }, [events, timePeriod]);

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalRev = filteredOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalDiscounts = filteredOrders.reduce((sum, o) => sum + Number(o.discount || 0), 0);
    const totalOrdersCount = filteredOrders.length;
    const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRev / totalOrdersCount) : 0;
    
    // Calculate conversion rate (whatsapp checkout clicks / total visitors based on unique pageviews or session searches)
    // As a solid proxy: checkouts / (adds to cart + search sessions)
    const cartAdds = filteredEvents.filter(e => e.event_name === 'add_to_cart').length;
    const checkouts = filteredOrders.length;
    const conversionRate = cartAdds > 0 ? Math.min(Math.round((checkouts / cartAdds) * 100), 100) : 0;
    
    return {
      revenue: totalRev,
      discounts: totalDiscounts,
      ordersCount: totalOrdersCount,
      avgOrder: avgOrderValue,
      conversion: conversionRate
    };
  }, [filteredOrders, filteredEvents]);

  // Promo Code Sales Summary
  const promoSummary = useMemo(() => {
    return promocodes.map(p => {
      // Find all orders using this code
      const codeOrders = filteredOrders.filter(o => o.promocode?.toUpperCase() === p.code.toUpperCase());
      const usages = codeOrders.length;
      const revenue = codeOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const totalDiscountGiven = codeOrders.reduce((sum, o) => sum + Number(o.discount || 0), 0);
      
      return {
        ...p,
        usages,
        revenue,
        totalDiscountGiven
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [promocodes, filteredOrders]);

  // Top Products Sales Summary
  const productSales = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; revenue: number }> = {};
    
    filteredOrders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const key = item.id || item.name;
          if (!counts[key]) {
            counts[key] = { name: item.name, qty: 0, revenue: 0 };
          }
          counts[key].qty += Number(item.quantity || 1);
          counts[key].revenue += Number(item.price || 0) * Number(item.quantity || 1);
        });
      }
    });

    return Object.values(counts).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [filteredOrders]);

  // Search Queries Analytics
  const searchQueries = useMemo(() => {
    const success: Record<string, { term: string; count: number }> = {};
    const failed: Record<string, { term: string; count: number }> = {};

    filteredEvents.filter(e => e.event_name === 'search').forEach(e => {
      const term = e.event_data?.search_term || '';
      const count = Number(e.event_data?.results_count || 0);

      if (!term.trim()) return;

      if (count === 0) {
        if (!failed[term.toLowerCase()]) failed[term.toLowerCase()] = { term, count: 0 };
        failed[term.toLowerCase()].count += 1;
      } else {
        if (!success[term.toLowerCase()]) success[term.toLowerCase()] = { term, count: 0 };
        success[term.toLowerCase()].count += 1;
      }
    });

    return {
      topSuccess: Object.values(success).sort((a, b) => b.count - a.count).slice(0, 6),
      topFailed: Object.values(failed).sort((a, b) => b.count - a.count).slice(0, 6)
    };
  }, [filteredEvents]);

  // Top Customers list (based on total phone orders)
  const topCustomers = useMemo(() => {
    const customerStats: Record<string, { name: string; phone: string; count: number; spent: number }> = {};

    orders.forEach(o => {
      if (!o.phone) return;
      const key = o.phone;
      
      if (!customerStats[key]) {
        // Look up registered client name if any
        const clientProfile = clients.find(c => c.phone === o.phone);
        customerStats[key] = {
          name: clientProfile ? clientProfile.name : (lang === 'ru' ? 'Гость WhatsApp' : 'Меҳмони WhatsApp'),
          phone: o.phone,
          count: 0,
          spent: 0
        };
      }
      customerStats[key].count += 1;
      customerStats[key].spent += Number(o.total || 0);
    });

    return Object.values(customerStats).sort((a, b) => b.spent - a.spent).slice(0, 5);
  }, [orders, clients]);

  // Live Stream Feed
  const liveFeed = useMemo(() => {
    return filteredEvents.slice(0, 6).map(e => {
      let actionText = '';
      let colorClass = '';

      if (e.event_name === 'add_to_cart') {
        actionText = lang === 'ru' ? `Добавлен товар в корзину: "${e.event_data?.items?.[0]?.item_name || 'Товар'}"` : `Маҳсулот ба сабад илова шуд: "${e.event_data?.items?.[0]?.item_name || 'Маҳсулот'}"`;
        colorClass = 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      } else if (e.event_name === 'whatsapp_order_click') {
        actionText = lang === 'ru' ? `Клик заказа на товар: "${e.event_data?.product_name || 'Товар'}"` : `Дархости маҳсулот: "${e.event_data?.product_name || 'Маҳсулот'}"`;
        colorClass = 'bg-green-500/10 text-green-600 border border-green-500/20';
      } else if (e.event_name === 'promocode_applied') {
        actionText = lang === 'ru' ? `Успешно применен промокод: "${e.event_data?.code}" (-${e.event_data?.discount_amount || 0} смн)` : `Промокод бомуваффақият истифода шуд: "${e.event_data?.code}"`;
        colorClass = 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20';
      } else if (e.event_name === 'search') {
        actionText = lang === 'ru' ? `Поиск по запросу: "${e.event_data?.search_term}" (${e.event_data?.results_count || 0} результатов)` : `Ҷустуҷӯ бо дархост: "${e.event_data?.search_term}"`;
        colorClass = 'bg-slate-500/10 text-slate-600 border border-slate-500/20';
      } else {
        actionText = `${e.event_name}`;
        colorClass = 'bg-slate-100 text-slate-600';
      }

      return {
        ...e,
        actionText,
        colorClass
      };
    });
  }, [filteredEvents]);

  // Calculate Product Item details for applied promocode
  const handleOpenPromoDetails = (promoCode: string) => {
    // Find all orders using this specific promocode
    const promoOrders = filteredOrders.filter(o => o.promocode?.toUpperCase() === promoCode.toUpperCase());
    
    // Aggregate products sold with this promocode
    const aggregatedProducts: Record<string, { name: string; qty: number; totalSoldAmount: number }> = {};
    promoOrders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const key = item.id || item.name;
          if (!aggregatedProducts[key]) {
            aggregatedProducts[key] = { name: item.name, qty: 0, totalSoldAmount: 0 };
          }
          aggregatedProducts[key].qty += Number(item.quantity || 1);
          aggregatedProducts[key].totalSoldAmount += Number(item.price || 0) * Number(item.quantity || 1);
        });
      }
    });

    setSelectedPromoDetails({
      code: promoCode,
      ordersCount: promoOrders.length,
      productsList: Object.values(aggregatedProducts).sort((a, b) => b.qty - a.qty),
      totalRevenue: promoOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
      totalDiscount: promoOrders.reduce((sum, o) => sum + Number(o.discount || 0), 0)
    });
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <BarChart3 size={22} className="text-indigo-600" />
              Мега-Аналитика
            </h2>
            <p className="text-xs text-slate-400 font-medium">Глубокие продажи, промокоды и поисковая статистика</p>
          </div>
        </div>

        {/* Time Period Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(['today', '7days', '30days', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                timePeriod === period
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {period === 'today' ? 'Сегодня' : period === '7days' ? '7 Дней' : period === '30days' ? '30 Дней' : 'Всё'}
            </button>
          ))}
          <button
            onClick={loadAllData}
            className="w-7 h-7 rounded-lg hover:bg-white text-slate-400 hover:text-slate-800 flex items-center justify-center transition-all active:scale-90"
            title="Обновить данные"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-32 space-y-3">
          <span className="w-10 h-10 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Анализ базы данных...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* KPI CARDS GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute right-4 top-4 text-emerald-500 bg-emerald-500/5 w-8 h-8 rounded-lg flex items-center justify-center">
                <DollarSign size={16} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Выручка за период</p>
              <p className="text-2xl font-extrabold text-slate-800 font-outfit">{metrics.revenue} <span className="text-xs font-bold text-slate-400">смн</span></p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute right-4 top-4 text-indigo-500 bg-indigo-500/5 w-8 h-8 rounded-lg flex items-center justify-center">
                <ShoppingBag size={16} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Всего заказов</p>
              <p className="text-2xl font-extrabold text-slate-800 font-outfit">{metrics.ordersCount}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute right-4 top-4 text-indigo-500 bg-indigo-500/5 w-8 h-8 rounded-lg flex items-center justify-center">
                <Users size={16} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Зарегистрировано клиентов</p>
              <p className="text-2xl font-extrabold text-slate-800 font-outfit">{clients.length}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute right-4 top-4 text-red-500 bg-red-500/5 w-8 h-8 rounded-lg flex items-center justify-center">
                <Percent size={16} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Выдано скидок</p>
              <p className="text-2xl font-extrabold text-red-500 font-outfit">-{metrics.discounts} <span className="text-xs font-bold text-red-400">смн</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* PROMO CODES SUMMARY TABLE (2/3 width) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-[16px] flex items-center gap-2">
                  <Gift size={18} className="text-indigo-500" />
                  Эффективность Промокодов
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-medium text-slate-500">
                  <thead>
                    <tr className="border-b border-slate-100 pb-3 text-slate-400 uppercase tracking-wider text-[9px]">
                      <th className="pb-3">Код</th>
                      <th className="pb-3">Тип</th>
                      <th className="pb-3 text-center">Применения</th>
                      <th className="pb-3 text-right">Выручка</th>
                      <th className="pb-3 text-right">Выдано скидок</th>
                      <th className="pb-3 text-center">Детали</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promoSummary.map((promo) => (
                      <tr key={promo.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 font-bold text-slate-800">{promo.code}</td>
                        <td className="py-4">
                          {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `${promo.discount_value} смн`}
                        </td>
                        <td className="py-4 text-center font-bold text-slate-700">{promo.usages}</td>
                        <td className="py-4 text-right font-extrabold text-slate-800 font-outfit">{promo.revenue} смн</td>
                        <td className="py-4 text-right font-bold text-red-500 font-outfit">-{promo.totalDiscountGiven} смн</td>
                        <td className="py-4 text-center">
                          <button
                            onClick={() => handleOpenPromoDetails(promo.code)}
                            className="w-8 h-8 rounded-lg bg-indigo-500/5 hover:bg-indigo-600 hover:text-white text-indigo-600 transition-all flex items-center justify-center mx-auto"
                            title="Детальные продажи"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LIVE EVENT STREAM (1/3 width) */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-800 text-[16px] flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-500" />
                Стрим Активности
              </h3>

              <div className="space-y-4 relative pl-4 border-l border-slate-100 max-h-[350px] overflow-y-auto pr-1 apple-shelf-scroll">
                {liveFeed.length === 0 ? (
                  <p className="text-xs text-slate-300 py-10 text-center">Действий пока нет</p>
                ) : (
                  liveFeed.map((e, idx) => (
                    <div key={idx} className="relative space-y-1">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white shadow-sm" />
                      <p className="text-[11px] font-bold text-slate-800 leading-normal">{e.actionText}</p>
                      <span className="text-[9px] font-bold text-slate-400 block">
                        {new Date(e.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* POPULAR PRODUCTS */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5">
              <h3 className="font-bold text-slate-800 text-[16px] flex items-center gap-2">
                <ShoppingBag size={18} className="text-indigo-500" />
                Топ Продаваемых Товаров
              </h3>

              <div className="space-y-4">
                {productSales.length === 0 ? (
                  <p className="text-xs text-slate-300 py-10 text-center">Продаж пока нет</p>
                ) : (
                  productSales.map((prod, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-50 bg-slate-50/20">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center">{idx + 1}</span>
                        <span className="text-xs font-bold text-slate-800 truncate max-w-[220px]">{prod.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <span className="text-xs font-bold text-slate-400">{prod.qty} шт.</span>
                        <span className="text-xs font-extrabold text-slate-800 font-outfit">{prod.revenue} смн</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SEARCH QUERIES CONSOLE */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5">
              <h3 className="font-bold text-slate-800 text-[16px] flex items-center gap-2">
                <Search size={18} className="text-indigo-500" />
                Поисковая Аналитика
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* SUCCESS SEARCHES */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Часто Ищут:</h4>
                  {searchQueries.topSuccess.length === 0 ? (
                    <p className="text-xs text-slate-300 py-6">Запросов нет</p>
                  ) : (
                    <div className="space-y-2">
                      {searchQueries.topSuccess.map((q, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-600 truncate max-w-[150px]">{q.term}</span>
                          <span className="font-bold text-indigo-600">{q.count} раз</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* FAILED SEARCHES */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-400 flex items-center gap-1">
                    <AlertCircle size={10} />
                    Не нашли на сайте (0 результатов):
                  </h4>
                  {searchQueries.topFailed.length === 0 ? (
                    <p className="text-xs text-slate-300 py-6">Неуспешных поисков нет</p>
                  ) : (
                    <div className="space-y-2">
                      {searchQueries.topFailed.map((q, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-red-500/5 p-1 px-2 rounded-lg border border-red-500/10">
                          <span className="font-bold text-red-600 truncate max-w-[140px]">{q.term}</span>
                          <span className="font-bold text-red-500">{q.count} раз</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* TOP CRM CUSTOMERS DATABASE */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-[16px] flex items-center gap-2">
              <Users size={18} className="text-indigo-500" />
              Топ Покупателей (CRM база)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium text-slate-500">
                <thead>
                  <tr className="border-b border-slate-100 pb-3 text-slate-400 uppercase tracking-wider text-[9px]">
                    <th className="pb-3">Имя клиента</th>
                    <th className="pb-3">Номер телефона</th>
                    <th className="pb-3 text-center">Заказов совершено</th>
                    <th className="pb-3 text-right">Всего потрачено</th>
                    <th className="pb-3 text-center">Связаться в WA</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((cust, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-bold text-slate-800">{cust.name}</td>
                      <td className="py-4 font-semibold text-slate-600">{cust.phone}</td>
                      <td className="py-4 text-center font-bold text-slate-700">{cust.count}</td>
                      <td className="py-4 text-right font-extrabold text-slate-800 font-outfit">{cust.spent} смн</td>
                      <td className="py-4 text-center">
                        <a
                          href={`https://wa.me/${cust.phone.replace(/[\s\-\(\)\+]/g, '')}`}
                          target="_blank"
                          className="w-8 h-8 rounded-lg bg-green-500/5 hover:bg-green-600 hover:text-white text-green-600 transition-all flex items-center justify-center mx-auto"
                        >
                          <MessageCircle size={13} fill="currentColor" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* PROMO PRODUCT BREAKDOWN MODAL */}
      <AnimatePresence>
        {selectedPromoDetails && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPromoDetails(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative z-10 border border-slate-100 space-y-6"
            >
              <button
                onClick={() => setSelectedPromoDetails(null)}
                className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-all active:scale-90"
              >
                <X size={16} />
              </button>

              <div>
                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-500/5 px-2.5 py-1 rounded-md">Детали продаж</span>
                <h3 className="text-xl font-bold text-slate-800 font-outfit tracking-tight mt-2">Промокод: {selectedPromoDetails.code}</h3>
                <p className="text-xs text-slate-400 mt-1">Оформлено {selectedPromoDetails.ordersCount} заказов с использованием этого кода</p>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Проданные товары поштучно:</h4>
                
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 apple-shelf-scroll">
                  {selectedPromoDetails.productsList.length === 0 ? (
                    <p className="text-xs text-slate-300 py-6 text-center">Нет проданных товаров</p>
                  ) : (
                    selectedPromoDetails.productsList.map((prod: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="font-medium text-slate-600 truncate max-w-[220px]">{prod.name}</span>
                        <span>{prod.qty} шт. <span className="text-slate-300 font-normal">({prod.totalSoldAmount} смн)</span></span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Принесенная Выручка</p>
                  <p className="text-lg font-extrabold text-slate-800 font-outfit mt-1">{selectedPromoDetails.totalRevenue} смн</p>
                </div>
                <div className="bg-red-500/5 p-3 rounded-2xl border border-red-500/10">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-red-400">Сумма скидок</p>
                  <p className="text-lg font-extrabold text-red-500 font-outfit mt-1">-{selectedPromoDetails.totalDiscount} смн</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
