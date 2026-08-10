"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { adminDbQuery } from '@/lib/admin-api';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/slugify';
import { 
  ChevronLeft, Users, Copy, Check, TrendingUp, DollarSign, 
  ShoppingBag, Percent, RefreshCw, Eye, Plus, Trash, Link, 
  ChevronDown, X, Download, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BloggerDashboardProps {
  onBack: () => void;
}

interface BloggerProfile {
  id: string;
  name: string;
  username: string;
  promocode: string;
  discount_value: number;
  discount_type: 'percentage' | 'fixed';
  created_at: string;
}

interface GeneratedLinkItem {
  id: string;
  bloggerName: string;
  bloggerUsername: string;
  link: string;
  description: string;
  created_at: string;
}

export const BloggerDashboard: React.FC<BloggerDashboardProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [bloggersList, setBloggersList] = useState<BloggerProfile[]>([]);
  
  // Link generator states
  const [bloggerNameInput, setBloggerNameInput] = useState('');
  const [utmMediumInput, setUtmMediumInput] = useState('shortlink');
  const [utmCampaignInput, setUtmCampaignInput] = useState('blogger');
  const [targetProductInput, setTargetProductInput] = useState('home');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Link History states
  const [generatedLinksList, setGeneratedLinksList] = useState<GeneratedLinkItem[]>([]);
  const [newLinkDescription, setNewLinkDescription] = useState('');
  const [savingLinkHistory, setSavingLinkHistory] = useState(false);

  // Blogger Profile Form States
  const [newBloggerName, setNewBloggerName] = useState('');
  const [newBloggerUsername, setNewBloggerUsername] = useState('');
  const [newBloggerPromocode, setNewBloggerPromocode] = useState('');
  const [newBloggerDiscountValue, setNewBloggerDiscountValue] = useState('10');
  const [newBloggerDiscountType, setNewBloggerDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [savingMapping, setSavingMapping] = useState(false);

  // Selected Blogger for detail view
  const [selectedBlogger, setSelectedBlogger] = useState<string | null>(null);
  
  // Tabs and Period filter
  const [activeTab, setActiveTab] = useState<'bloggers' | 'referrals'>('bloggers');
  const [timePeriod, setTimePeriod] = useState<'today' | '7days' | '30days' | 'all'>('7days');

  // Attribution mappings computed dynamically from bloggers list
  const mappings = useMemo(() => {
    const map: Record<string, string> = {};
    bloggersList.forEach(b => {
      if (b.promocode) {
        map[b.promocode.toUpperCase().trim()] = b.username.toLowerCase().trim();
      }
    });
    return map;
  }, [bloggersList]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, eventsRes, settingsRes, productsRes] = await Promise.all([
        adminDbQuery({ action: 'select', table: 'orders', data: { order: { column: 'created_at', ascending: false } } }),
        adminDbQuery({ action: 'select', table: 'analytics_events', data: { order: { column: 'created_at', ascending: false } } }),
        supabase.from('site_settings').select('*'),
        supabase.from('products').select('id, name').order('name')
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (productsRes.data) setProducts(productsRes.data);

      if (settingsRes.data) {
        const profilesSetting = settingsRes.data.find(s => s.key === 'blogger_profiles');
        if (profilesSetting && profilesSetting.value) {
          try {
            setBloggersList(JSON.parse(profilesSetting.value));
          } catch (e) {
            console.error("Failed to parse blogger profiles JSON:", e);
          }
        }
        const linksSetting = settingsRes.data.find(s => s.key === 'blogger_generated_links');
        if (linksSetting && linksSetting.value) {
          try {
            setGeneratedLinksList(JSON.parse(linksSetting.value));
          } catch (e) {
            console.error("Failed to parse blogger generated links JSON:", e);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load blogger analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Attribution helper function
  const getBloggerForOrder = (order: any) => {
    const match = order.operator_notes?.match(/\[UTM:\s*source=([^,\]]+)(?:,\s*medium=([^,\]]+))?(?:,\s*campaign=([^,\]]+))?\]/);
    let utmSource = match ? match[1] : null;

    if (!utmSource && order.promocode) {
      const codeUpper = order.promocode.toUpperCase().trim();
      if (mappings[codeUpper]) {
        utmSource = mappings[codeUpper];
      } else {
        utmSource = order.promocode.replace(/\d+$/, '').toLowerCase();
      }
    }
    return utmSource ? utmSource.toLowerCase().trim() : null;
  };

  // Filter events and orders by selected time period
  const filteredEvents = useMemo(() => {
    if (timePeriod === 'all') return events;
    const cutoff = new Date();
    if (timePeriod === 'today') cutoff.setHours(0, 0, 0, 0);
    if (timePeriod === '7days') cutoff.setDate(cutoff.getDate() - 7);
    if (timePeriod === '30days') cutoff.setDate(cutoff.getDate() - 30);
    return events.filter(e => new Date(e.created_at) >= cutoff);
  }, [events, timePeriod]);

  const filteredOrdersForStats = useMemo(() => {
    if (timePeriod === 'all') return orders;
    const cutoff = new Date();
    if (timePeriod === 'today') cutoff.setHours(0, 0, 0, 0);
    if (timePeriod === '7days') cutoff.setDate(cutoff.getDate() - 7);
    if (timePeriod === '30days') cutoff.setDate(cutoff.getDate() - 30);
    return orders.filter(o => new Date(o.created_at) >= cutoff);
  }, [orders, timePeriod]);

  // Blogger & Campaign Sales Summary (uses period-filtered data)
  const bloggerSummary = useMemo(() => {
    const stats: Record<string, {
      source: string;
      visits: number;
      cartAdds: number;
      ordersCount: number;
      revenue: number;
      discountGiven: number;
      promoCodesUsed: Set<string>;
    }> = {};

    // 1. Process visits and cart adds from events
    filteredEvents.forEach(e => {
      const utmSource = e.event_data?.utm_source;
      if (!utmSource) return;

      const sourceKey = utmSource.toLowerCase().trim();
      if (!stats[sourceKey]) {
        stats[sourceKey] = {
          source: utmSource,
          visits: 0,
          cartAdds: 0,
          ordersCount: 0,
          revenue: 0,
          discountGiven: 0,
          promoCodesUsed: new Set<string>()
        };
      }

      if (e.event_name === 'campaign_visit') {
        stats[sourceKey].visits += 1;
      } else if (e.event_name === 'add_to_cart') {
        stats[sourceKey].cartAdds += 1;
      }
    });

    // 2. Process orders with mapping attribution
    filteredOrdersForStats.forEach(o => {
      const utmSource = getBloggerForOrder(o);
      if (!utmSource) return;

      const sourceKey = utmSource.toLowerCase().trim();
      if (!stats[sourceKey]) {
        stats[sourceKey] = {
          source: utmSource,
          visits: 0,
          cartAdds: 0,
          ordersCount: 0,
          revenue: 0,
          discountGiven: 0,
          promoCodesUsed: new Set<string>()
        };
      }

      stats[sourceKey].ordersCount += 1;
      stats[sourceKey].revenue += Number(o.total || 0);
      stats[sourceKey].discountGiven += Number(o.discount || 0);
      if (o.promocode) {
        stats[sourceKey].promoCodesUsed.add(o.promocode);
      }
    });

    return Object.values(stats).map(s => {
      const visitsCount = s.visits || s.ordersCount * 5;
      const conversionRate = visitsCount > 0 ? ((s.ordersCount / visitsCount) * 100).toFixed(1) : '0';
      
      return {
        ...s,
        name: s.source,
        visits: visitsCount,
        conversion: conversionRate,
        promoCodes: Array.from(s.promoCodesUsed).join(', ') || 'Нет'
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredEvents, filteredOrdersForStats, mappings]);

  // Split into bloggers / referrals
  const filteredSummary = useMemo(() => {
    if (activeTab === 'bloggers') {
      return bloggersList.map(b => {
        const stats = bloggerSummary.find(s => s.source.toLowerCase().trim() === b.username.toLowerCase().trim());
        return {
          id: b.id,
          name: b.name,
          username: b.username,
          promocode: b.promocode || 'Нет',
          discount_value: b.discount_value || '0',
          discount_type: b.discount_type || 'percentage',
          visits: stats ? stats.visits : 0,
          cartAdds: stats ? stats.cartAdds : 0,
          ordersCount: stats ? stats.ordersCount : 0,
          conversion: stats ? stats.conversion : '0',
          revenue: stats ? stats.revenue : 0,
          discountGiven: stats ? stats.discountGiven : 0,
          promoCodes: b.promocode || 'Нет',
          source: b.username
        };
      }).sort((a, b) => b.revenue - a.revenue);
    } else {
      const bloggerUsernames = new Set(bloggersList.map(b => b.username.toLowerCase().trim()));
      return bloggerSummary
        .filter(s => !bloggerUsernames.has(s.source.toLowerCase().trim()))
        .map(s => ({
          ...s,
          name: s.source,
          username: s.source,
          promocode: 'Нет',
          discount_value: '0',
          discount_type: 'percentage'
        }));
    }
  }, [bloggerSummary, bloggersList, activeTab]);

  // Overall Campaign Metrics
  const summaryMetrics = useMemo(() => {
    return filteredSummary.reduce((acc, curr) => {
      acc.visits += curr.visits;
      acc.orders += curr.ordersCount;
      acc.revenue += curr.revenue;
      acc.discounts += curr.discountGiven;
      return acc;
    }, { visits: 0, orders: 0, revenue: 0, discounts: 0 });
  }, [filteredSummary]);

  // Selected blogger detailed statistics for funnel visualization
  const selectedBloggerStats = useMemo(() => {
    if (!selectedBlogger) return null;
    const found = filteredSummary.find(b => b.source.toLowerCase().trim() === selectedBlogger.toLowerCase().trim());
    if (found) return found;
    return bloggerSummary.find(b => b.source.toLowerCase().trim() === selectedBlogger.toLowerCase().trim()) || null;
  }, [selectedBlogger, filteredSummary, bloggerSummary]);

  // Export to CSV for Excel (UTF-8 BOM + semicolon separator)
  const handleExportCSV = () => {
    const title = activeTab === 'bloggers' ? 'Аналитика_Блогеров' : 'Внешние_Рефералы';
    const filename = `${title}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    const headers = [
      activeTab === 'bloggers' ? 'Блогер' : 'Источник',
      'Переходы',
      'В корзину',
      'Заказы',
      'Конверсия (%)',
      'Промокоды',
      'Выручка (смн)',
      'Выдано скидок (смн)'
    ];

    const rows = filteredSummary.map(item => [
      activeTab === 'bloggers' ? item.name : item.source,
      item.visits,
      item.cartAdds,
      item.ordersCount,
      item.conversion,
      item.promoCodes,
      item.revenue,
      item.discountGiven
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(val => {
        const strVal = String(val ?? '');
        if (strVal.includes(';') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export a single blogger's orders list to CSV for Excel
  const handleExportSingleBloggerCSV = () => {
    if (!selectedBlogger) return;
    const filename = `Заказы_${selectedBlogger}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    const headers = [
      'ID Заказа',
      'Дата',
      'Статус',
      'Товары',
      'Сумма (смн)',
      'Скидка (смн)'
    ];

    const rows = selectedBloggerOrders.map((order: any) => {
      const itemsStr = Array.isArray(order.items) 
        ? order.items.map((item: any) => `${item.name} x${item.quantity}`).join(', ')
        : 'Нет товаров';
      return [
        order.id,
        new Date(order.created_at).toLocaleDateString('ru-RU'),
        order.status,
        itemsStr,
        order.total,
        order.discount
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(val => {
        const strVal = String(val ?? '');
        if (strVal.includes(';') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Link Generator Output
  const generatedLink = useMemo(() => {
    if (!bloggerNameInput.trim()) return '';
    const cleanName = encodeURIComponent(bloggerNameInput.trim().toLowerCase());

    if (targetProductInput === 'home') {
      if (utmMediumInput === 'shortlink' && utmCampaignInput === 'blogger') {
        return `https://www.toj-vitamin.tj/b/${cleanName}`;
      }
      return `https://www.toj-vitamin.tj/?utm_source=${cleanName}&utm_medium=${encodeURIComponent(utmMediumInput)}&utm_campaign=${encodeURIComponent(utmCampaignInput)}`;
    } else {
      if (selectedProductIds.length === 0) return '';
      
      if (selectedProductIds.length === 1) {
        // Single product: direct link with buy=1
        const matchedProd = products.find(p => p.id === selectedProductIds[0]);
        if (!matchedProd) return '';
        const prodSlug = slugify(matchedProd.name);
        return `https://www.toj-vitamin.tj/product/${prodSlug}?utm_source=${cleanName}&utm_medium=${encodeURIComponent(utmMediumInput)}&utm_campaign=${encodeURIComponent(utmCampaignInput)}&buy=1`;
      } else {
        // Multiple products: homepage with buy_ids
        return `https://www.toj-vitamin.tj/?utm_source=${cleanName}&utm_medium=${encodeURIComponent(utmMediumInput)}&utm_campaign=${encodeURIComponent(utmCampaignInput)}&buy_ids=${selectedProductIds.join(',')}`;
      }
    }
  }, [bloggerNameInput, utmMediumInput, utmCampaignInput, targetProductInput, selectedProductIds, products]);

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save generated link to history
  const handleSaveLinkToHistory = async () => {
    if (!generatedLink || !bloggerNameInput) return;
    
    const blogger = bloggersList.find(b => b.username === bloggerNameInput);
    const bName = blogger ? blogger.name : bloggerNameInput;

    const newLinkItem: GeneratedLinkItem = {
      id: Date.now().toString(),
      bloggerName: bName,
      bloggerUsername: bloggerNameInput,
      link: generatedLink,
      description: newLinkDescription.trim() || 'Без описания',
      created_at: new Date().toISOString()
    };

    const updatedList = [newLinkItem, ...generatedLinksList];
    
    try {
      setSavingLinkHistory(true);
      const { error } = await adminDbQuery({
        action: 'upsert',
        table: 'site_settings',
        data: {
          key: 'blogger_generated_links',
          value: JSON.stringify(updatedList),
          updated_at: new Date().toISOString()
        }
      });

      if (!error) {
        setGeneratedLinksList(updatedList);
        setNewLinkDescription('');
        alert("Ссылка успешно сохранена в историю!");
      } else {
        alert("Ошибка сохранения истории: " + error.message);
      }
    } catch (err: any) {
      console.error(err);
      alert("Ошибка: " + err.message);
    } finally {
      setSavingLinkHistory(false);
    }
  };

  // Delete generated link from history
  const handleDeleteLinkFromHistory = async (id: string) => {
    if (!window.confirm("Удалить эту ссылку из истории?")) return;
    const updatedList = generatedLinksList.filter(item => item.id !== id);
    try {
      const { error } = await adminDbQuery({
        action: 'upsert',
        table: 'site_settings',
        data: {
          key: 'blogger_generated_links',
          value: JSON.stringify(updatedList),
          updated_at: new Date().toISOString()
        }
      });

      if (!error) {
        setGeneratedLinksList(updatedList);
      } else {
        alert("Ошибка удаления: " + error.message);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Save new blogger profile (Site Settings + database promocodes table)
  const handleSaveBlogger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBloggerName.trim() || !newBloggerUsername.trim()) return;

    const usernameClean = newBloggerUsername.toLowerCase().replace(/[^a-z0-9_\-]/g, '').trim();
    const promocodeClean = newBloggerPromocode.toUpperCase().trim();

    if (bloggersList.some(b => b.username === usernameClean)) {
      alert("Блогер с таким логином уже существует!");
      return;
    }

    setSavingMapping(true);

    // 1. Create or update the promocode in Supabase DB table
    if (promocodeClean) {
      try {
        await adminDbQuery({
          action: 'upsert',
          table: 'promocodes',
          data: {
            code: promocodeClean,
            discount_type: newBloggerDiscountType,
            discount_value: Number(newBloggerDiscountValue || 0),
            is_active: true,
            min_order_amount: 0
          }
        });
      } catch (dbErr: any) {
        console.error("Failed to upsert promocode in DB:", dbErr);
        alert("Ошибка при создании промокода в БД: " + dbErr.message);
        setSavingMapping(false);
        return;
      }
    }

    // 2. Save profile to Site Settings
    const newProfile: BloggerProfile = {
      id: Date.now().toString(),
      name: newBloggerName.trim(),
      username: usernameClean,
      promocode: promocodeClean,
      discount_value: Number(newBloggerDiscountValue || 0),
      discount_type: newBloggerDiscountType,
      created_at: new Date().toISOString()
    };

    const updatedList = [...bloggersList, newProfile];

    try {
      const { error } = await adminDbQuery({
        action: 'upsert',
        table: 'site_settings',
        data: {
          key: 'blogger_profiles',
          value: JSON.stringify(updatedList),
          updated_at: new Date().toISOString()
        }
      });

      if (!error) {
        setBloggersList(updatedList);
        setNewBloggerName('');
        setNewBloggerUsername('');
        setNewBloggerPromocode('');
        setNewBloggerDiscountValue('10');
        setNewBloggerDiscountType('percentage');
      } else {
        alert("Не удалось сохранить блогера: " + error.message);
      }
    } catch (err: any) {
      console.error(err);
      alert("Ошибка сохранения: " + err.message);
    } finally {
      setSavingMapping(false);
    }
  };

  // Delete blogger profile (deactivates promocode in DB + removes from Site Settings)
  const handleDeleteBlogger = async (id: string) => {
    const blogger = bloggersList.find(b => b.id === id);
    if (!blogger) return;
    if (!window.confirm(`Вы уверены, что хотите удалить блогера ${blogger.name}?`)) return;

    // 1. Deactivate promocode in Supabase DB table
    if (blogger.promocode) {
      try {
        await adminDbQuery({
          action: 'upsert',
          table: 'promocodes',
          data: {
            code: blogger.promocode.toUpperCase().trim(),
            is_active: false
          }
        });
      } catch (dbErr) {
        console.error("Failed to deactivate promocode in DB:", dbErr);
      }
    }

    // 2. Remove profile from settings list
    const updatedList = bloggersList.filter(b => b.id !== id);

    try {
      const { error } = await adminDbQuery({
        action: 'upsert',
        table: 'site_settings',
        data: {
          key: 'blogger_profiles',
          value: JSON.stringify(updatedList),
          updated_at: new Date().toISOString()
        }
      });

      if (!error) {
        setBloggersList(updatedList);
      } else {
        alert("Не удалось удалить блогера: " + error.message);
      }
    } catch (err: any) {
      console.error(err);
      alert("Ошибка удаления: " + err.message);
    }
  };

  // Orders details list for selected blogger
  const selectedBloggerOrders = useMemo(() => {
    if (!selectedBlogger) return [];
    return orders.filter(o => getBloggerForOrder(o) === selectedBlogger.toLowerCase());
  }, [selectedBlogger, orders, mappings]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Users size={22} className="text-indigo-600" />
              Реклама у Блогеров & UTM
            </h2>
            <p className="text-xs text-slate-400 font-medium">Сквозной трекинг переходов, заказов и генератор коротких редиректов</p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-all active:scale-90 border border-slate-100 bg-white"
          title="Обновить данные"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-32 space-y-3">
          <span className="w-10 h-10 border-4 border-indigo-600/10 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Анализ реферального трафика...</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Всего переходов</p>
              <p className="text-2xl font-extrabold text-slate-800 font-outfit">{summaryMetrics.visits}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Заказов от блогеров</p>
              <p className="text-2xl font-extrabold text-indigo-600 font-outfit">{summaryMetrics.orders}</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Общая выручка</p>
              <p className="text-2xl font-extrabold text-slate-800 font-outfit">{summaryMetrics.revenue} <span className="text-xs font-bold text-slate-400">смн</span></p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Предоставлено скидок</p>
              <p className="text-2xl font-extrabold text-red-500 font-outfit">-{summaryMetrics.discounts} <span className="text-xs font-bold text-red-400">смн</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* UTM Link Generator */}
            <div className="lg:col-span-2 bg-gradient-to-r from-indigo-50/50 to-slate-50 border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
                  <Link size={16} className="text-indigo-500" />
                  Продвинутый Генератор UTM Ссылок
                </h3>
                <p className="text-xs text-slate-500">Создавайте точные посадочные ссылки на товары с разметкой для Reels/Stories</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Выбрать блогера (Source)</label>
                  <div className="relative">
                    <select
                      value={bloggerNameInput}
                      onChange={(e) => setBloggerNameInput(e.target.value)}
                      className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs font-semibold bg-white appearance-none cursor-pointer"
                    >
                      <option value="">-- Выбрать блогера --</option>
                      {bloggersList.map(b => (
                        <option key={b.id} value={b.username}>{b.name} (@{b.username})</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-outfit">Направление ссылки</label>
                  <div className="relative">
                    <select
                      value={targetProductInput}
                      onChange={(e) => {
                        setTargetProductInput(e.target.value);
                        if (e.target.value === 'home') {
                          setSelectedProductIds([]);
                        } else if (e.target.value === 'products' && selectedProductIds.length === 0 && products.length > 0) {
                          setSelectedProductIds([products[0].id]);
                        }
                      }}
                      className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs font-semibold bg-white appearance-none cursor-pointer"
                    >
                      <option value="home">Главная страница</option>
                      <option value="products">Выбрать товары (Добавить в корзину)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {targetProductInput === 'products' && (
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Выберите товары для авто-добавления:</label>
                    <div className="bg-white border border-slate-200 rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-1.5 no-scrollbar">
                      {products.map(p => {
                        const isChecked = selectedProductIds.includes(String(p.id));
                        return (
                          <label key={p.id} className="flex items-start gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-800 transition-colors">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductIds([...selectedProductIds, String(p.id)]);
                                } else {
                                  setSelectedProductIds(selectedProductIds.filter(id => id !== String(p.id)));
                                }
                              }}
                              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                            />
                            <span>{p.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Medium (Тип рекламы)</label>
                  <input
                    type="text"
                    value={utmMediumInput}
                    onChange={(e) => setUtmMediumInput(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs font-semibold transition-all bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Campaign (Кампания)</label>
                  <input
                    type="text"
                    value={utmCampaignInput}
                    onChange={(e) => setUtmCampaignInput(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs font-semibold transition-all bg-white"
                  />
                </div>
              </div>

              {generatedLink && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex-1 text-xs font-bold text-indigo-600 select-all leading-normal break-all shadow-inner">
                      {generatedLink}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="h-11 sm:h-auto px-5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shrink-0 transition-all flex items-center justify-center gap-1.5"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Скопировано!' : 'Копировать'}
                    </button>
                  </div>
                  
                  {/* Save History Form */}
                  <div className="flex flex-col sm:flex-row gap-2 bg-indigo-50/30 p-3 rounded-2xl border border-indigo-100/50">
                    <input 
                      type="text"
                      placeholder="Заметка к ссылке (напр. Пост про Магний у Марины от 15 августа)"
                      value={newLinkDescription}
                      onChange={(e) => setNewLinkDescription(e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg border border-slate-200 outline-none text-xs font-semibold bg-white"
                    />
                    <button
                      onClick={handleSaveLinkToHistory}
                      disabled={savingLinkHistory}
                      className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shrink-0 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={12} /> Сохранить в историю
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Blogger Profiles Management Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
                  <Percent size={16} className="text-indigo-500" />
                  Управление Блогерами
                </h3>
                <p className="text-xs text-slate-400">Добавление карточек блогеров и управление скидками промокодов</p>
              </div>

              <form onSubmit={handleSaveBlogger} className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Имя (напр. Марина Фит)"
                  value={newBloggerName}
                  onChange={(e) => setNewBloggerName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-xs font-semibold bg-slate-50"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="UTM Логин (marina_fit)"
                    value={newBloggerUsername}
                    onChange={(e) => setNewBloggerUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, ''))}
                    className="w-1/2 h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-xs font-semibold bg-slate-50"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Промокод (MARINA15)"
                    value={newBloggerPromocode}
                    onChange={(e) => setNewBloggerPromocode(e.target.value.toUpperCase())}
                    className="w-1/2 h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-xs font-bold bg-slate-50"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Скидка"
                    value={newBloggerDiscountValue}
                    onChange={(e) => setNewBloggerDiscountValue(e.target.value)}
                    className="w-1/2 h-10 px-3 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-xs font-bold bg-slate-50"
                    required
                  />
                  <select
                    value={newBloggerDiscountType}
                    onChange={(e: any) => setNewBloggerDiscountType(e.target.value)}
                    className="w-1/2 h-10 px-2 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-xs font-bold bg-slate-50"
                  >
                    <option value="percentage">% Процент</option>
                    <option value="fixed">TJS Сумма</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={savingMapping}
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Plus size={14} /> Добавить блогера
                </button>
              </form>

              {/* Mappings List */}
              <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1 no-scrollbar pt-2 border-t border-slate-100">
                {bloggersList.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">Список блогеров пуст</p>
                ) : (
                  bloggersList.map((blogger) => (
                    <div key={blogger.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-extrabold text-slate-800">{blogger.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          UTM: <span className="font-bold text-slate-500">{blogger.username}</span> | Промокод: <span className="font-bold text-indigo-600">{blogger.promocode}</span> (-{blogger.discount_value}{blogger.discount_type === 'percentage' ? '%' : ' смн'})
                        </span>
                      </div>
                      <button 
                        onClick={() => handleDeleteBlogger(blogger.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Link History Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-[15px] flex items-center gap-2">
                <Link size={16} className="text-indigo-500" />
                История созданных ссылок ({generatedLinksList.length})
              </h3>
              <p className="text-xs text-slate-400">Список ссылок, сгенерированных ранее с описанием и датой</p>
            </div>

            {generatedLinksList.length === 0 ? (
              <p className="text-xs text-slate-300 py-6 text-center font-bold">История пуста. Вы еще не сохраняли ссылки.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-2.5">Дата</th>
                      <th className="py-2.5">Блогер</th>
                      <th className="py-2.5">Описание / Заметка</th>
                      <th className="py-2.5">Ссылка</th>
                      <th className="py-2.5 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedLinksList.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-xs">
                        <td className="py-3 font-semibold text-slate-500 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="py-3 font-bold text-slate-800 whitespace-nowrap">{item.bloggerName}</td>
                        <td className="py-3 font-medium text-slate-600 max-w-[150px] truncate" title={item.description}>
                          {item.description}
                        </td>
                        <td className="py-3 text-indigo-600 font-bold select-all break-all max-w-[200px] truncate" title={item.link}>
                          {item.link}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.link);
                                alert("Ссылка скопирована!");
                              }}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded text-[10px] transition-colors"
                            >
                              Копировать
                            </button>
                            <button
                              onClick={() => handleDeleteLinkFromHistory(item.id)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
                <h3 className="font-bold text-slate-800 text-[15px] flex items-center gap-2 shrink-0">
                  <TrendingUp size={18} className="text-indigo-500" />
                  Статистика Эффективности
                </h3>
                
                {/* Tabs */}
                <div className="flex bg-slate-100/80 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
                  <button
                    onClick={() => setActiveTab('bloggers')}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg transition-all ${
                      activeTab === 'bloggers' 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Блогеры
                  </button>
                  <button
                    onClick={() => setActiveTab('referrals')}
                    className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg transition-all ${
                      activeTab === 'referrals' 
                        ? 'bg-white text-slate-800 shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Внешние рефералы
                  </button>
                </div>

                {/* Period Filter */}
                <div className="relative w-full sm:w-auto">
                  <select
                    value={timePeriod}
                    onChange={(e: any) => setTimePeriod(e.target.value)}
                    className="w-full sm:w-auto h-9 pl-3 pr-8 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none text-xs font-bold bg-slate-50 cursor-pointer appearance-none"
                  >
                    <option value="today">Сегодня</option>
                    <option value="7days">За 7 дней</option>
                    <option value="30days">За 30 дней</option>
                    <option value="all">За всё время</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Export button */}
              {filteredSummary.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs flex items-center gap-2 transition-all border border-indigo-100/50 w-full xl:w-auto justify-center"
                >
                  <Download size={13} />
                  Экспорт в Excel (CSV)
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              {filteredSummary.length === 0 ? (
                <p className="text-xs text-slate-300 py-12 text-center font-bold">
                  {activeTab === 'bloggers' 
                    ? 'Активных переходов или заказов от блогеров пока не зарегистрировано' 
                    : 'Органических переходов или рефералов пока не зарегистрировано'}
                </p>
              ) : (
                <table className="w-full text-left text-xs font-medium text-slate-500">
                  <thead>
                    <tr className="border-b border-slate-100 pb-3 text-slate-400 uppercase tracking-wider text-[9px]">
                      <th className="pb-3">Источник / Кампания</th>
                      <th className="pb-3 text-center">Переходы</th>
                      <th className="pb-3 text-center">В корзину</th>
                      <th className="pb-3 text-center">Заказы</th>
                      <th className="pb-3 text-center">Конверсия</th>
                      <th className="pb-3">Промокоды</th>
                      <th className="pb-3 text-right">Выручка</th>
                      <th className="pb-3 text-right">Выдано скидок</th>
                      <th className="pb-3 text-center">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummary.map((blogger, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 font-bold text-[10px] flex items-center justify-center shrink-0">{idx + 1}</span>
                            <div className="flex flex-col">
                              <span>{activeTab === 'bloggers' ? blogger.name : blogger.source}</span>
                              {activeTab === 'bloggers' && (
                                <a 
                                  href={`https://instagram.com/${blogger.username}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-indigo-500 hover:text-indigo-700 hover:underline flex items-center gap-0.5 font-semibold mt-0.5"
                                >
                                  @{blogger.username}
                                  <ArrowUpRight size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center font-bold text-slate-600">{blogger.visits}</td>
                        <td className="py-4 text-center text-slate-600">{blogger.cartAdds}</td>
                        <td className="py-4 text-center font-bold text-indigo-600">{blogger.ordersCount}</td>
                        <td className="py-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 font-outfit">
                            {blogger.conversion}%
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 font-outfit">
                            {blogger.promoCodes}
                          </span>
                        </td>
                        <td className="py-4 text-right font-extrabold text-slate-800 font-outfit">{blogger.revenue} смн</td>
                        <td className="py-4 text-right font-bold text-red-500 font-outfit">-{blogger.discountGiven} смн</td>
                        <td className="py-4 text-center">
                          <button
                            onClick={() => setSelectedBlogger(blogger.source)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-600 flex items-center gap-1.5 mx-auto transition-colors"
                          >
                            <Eye size={12} /> Детали
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Orders List Overlay/Modal for selected Blogger */}
      <AnimatePresence>
        {selectedBlogger && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/40 backdrop-blur-sm">
            {/* Dismiss overlay click */}
            <div className="absolute inset-0" onClick={() => setSelectedBlogger(null)} />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col p-6 overflow-hidden z-10"
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="text-indigo-600" size={20} />
                  <h3 className="font-extrabold text-slate-800 text-[16px]">Заказы: {selectedBloggerStats ? selectedBloggerStats.name : selectedBlogger}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {selectedBloggerOrders.length > 0 && (
                    <button
                      onClick={handleExportSingleBloggerCSV}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg font-bold text-[10px] flex items-center gap-1.5 transition-all border border-slate-200"
                      title="Скачать заказы в Excel"
                    >
                      <Download size={11} />
                      Экспорт в Excel
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedBlogger(null)}
                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Conversion Funnel Visualization */}
              {selectedBloggerStats && (
                <div className="mb-6 p-4 rounded-2xl border border-slate-100 bg-indigo-50/20 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Воронка Конверсии</h4>
                  
                  {/* Step 1: Visits */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">1. Переходы (Визиты)</span>
                      <span className="text-slate-800">{selectedBloggerStats.visits}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>

                  {/* Step 2: Cart Adds */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">2. Добавили в корзину</span>
                      <span className="text-indigo-600">
                        {selectedBloggerStats.cartAdds} ({selectedBloggerStats.visits > 0 ? ((selectedBloggerStats.cartAdds / selectedBloggerStats.visits) * 100).toFixed(1) : '0'}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                        style={{ width: `${selectedBloggerStats.visits > 0 ? Math.min(100, (selectedBloggerStats.cartAdds / selectedBloggerStats.visits) * 100) : 0}%` }} 
                      />
                    </div>
                  </div>

                  {/* Step 3: Orders */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">3. Оформленные заказы</span>
                      <span className="text-emerald-600">
                        {selectedBloggerStats.ordersCount} ({selectedBloggerStats.conversion}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${selectedBloggerStats.visits > 0 ? Math.min(100, (selectedBloggerStats.ordersCount / selectedBloggerStats.visits) * 100) : 0}%` }} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Orders List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 no-scrollbar">
                {selectedBloggerOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-20 font-bold">Заказы для этого блогера не найдены</p>
                ) : (
                  selectedBloggerOrders.map((order: any) => (
                    <div key={order.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-extrabold text-slate-800">Заказ #{order.id}</span>
                          <span className="text-slate-400 ml-2 font-medium">
                            {new Date(order.created_at).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="text-xs text-slate-600 space-y-1 bg-white p-3 rounded-xl border border-slate-100/50">
                        {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span className="font-semibold">{item.name}</span>
                            <span className="font-bold text-slate-500">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-slate-100">
                        <span className="text-slate-400">Сумма:</span>
                        <div className="text-right">
                          <span className="text-slate-800 text-[14px] font-extrabold">{order.total} смн</span>
                          {order.discount > 0 && (
                            <span className="block text-[10px] text-red-500 font-bold">Скидка: -{order.discount} смн</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
