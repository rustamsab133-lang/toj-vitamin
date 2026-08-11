"use client";
import React, { useState, useEffect } from 'react';
import { AdminLogin } from './components/AdminLogin';
import { ProductEditor } from './components/ProductEditor';
import { QuizEditor } from './components/QuizEditor';
import { ComplexEditor } from './components/ComplexEditor';
import { OperatorWorkspace } from './components/OperatorWorkspace';
import { SiteSettings } from './components/SiteSettings';
import { SeoAgent } from './components/SeoAgent';
import { InstagramAgent } from './components/InstagramAgent';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { WarehouseDashboard } from './components/WarehouseDashboard';
import { FeedDashboard } from './components/FeedDashboard';
import { CrmDashboard } from './components/CrmDashboard';
import { PharmacyOrdersDashboard } from './components/PharmacyOrdersDashboard';
import { BloggerDashboard } from './components/BloggerDashboard';
import { ComboEditor } from './components/ComboEditor';
import { supabase } from '@/lib/supabase';
import { Package, Layers, Heart, ShoppingBag, Settings, LogOut, BarChart3, Bot, Instagram, Warehouse, FileWarning, Users, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AdminView = 'dashboard' | 'products' | 'categories' | 'complexes' | 'orders' | 'settings' | 'seo-agent' | 'instagram-agent' | 'analytics' | 'warehouse' | 'feed-issues' | 'crm' | 'pharmacy-orders' | 'bloggers' | 'combos';

const MODULES = [
  { id: 'pharmacy-orders' as AdminView, title: 'Закупки аптек', desc: 'B2B заказы, ссылки партнеров', icon: <Building2 size={24} />, color: '#F0FDF4' },
  { id: 'crm' as AdminView, title: 'CRM Система', desc: 'Лояльность, задачи и клиенты', icon: <Users size={24} />, color: '#ECFDF5' },
  { id: 'instagram-agent' as AdminView, title: 'Instagram ИИ', desc: 'Авто-генерация постов', icon: <Instagram size={24} />, color: '#FDF4FF' },
  { id: 'seo-agent' as AdminView, title: 'SEO-Агент', desc: 'ИИ генерация статей', icon: <Bot size={24} />, color: '#EFF6FF' },
  { id: 'analytics' as AdminView, title: 'Мега-Аналитика', desc: 'Выручка, промокоды, CRM', icon: <BarChart3 size={24} />, color: '#F5F3FF' },
  { id: 'bloggers' as AdminView, title: 'Реклама у Блогеров', desc: 'Статистика UTM и короткие ссылки', icon: <Users size={24} />, color: '#EEF2FF' },
  { id: 'warehouse' as AdminView, title: 'Офлайн-Склад', desc: 'Остатки и касса магазина', icon: <Warehouse size={24} />, color: '#FFF1F2' },
  { id: 'feed-issues' as AdminView, title: 'Проблемы фидов', desc: 'Диагностика Meta & Google', icon: <FileWarning size={24} />, color: '#FFFBEB' },
  { id: 'products' as AdminView, title: 'Товары', desc: 'Каталог, цены, фото', icon: <Package size={24} />, color: '#F8FAFC' },
  { id: 'categories' as AdminView, title: 'Умные комплексы', desc: 'Управление подбором', icon: <Layers size={24} />, color: '#F8FAFC' },
  { id: 'complexes' as AdminView, title: 'Синергия', desc: 'Клинические связки', icon: <BarChart3 size={24} />, color: '#F8FAFC' },
  { id: 'orders' as AdminView, title: 'АРМ Оператора', desc: 'Прием и статусы', icon: <ShoppingBag size={24} />, color: '#F8FAFC' },
  { id: 'settings' as AdminView, title: 'Настройки', desc: 'Сайт, тексты', icon: <Settings size={24} />, color: '#F8FAFC' },
  { id: 'combos' as AdminView, title: 'Комбо-баннеры', desc: 'Управление комбо на главной', icon: <Layers size={24} />, color: '#F0FDFA' },
];

export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [view, setView] = useState<AdminView>('dashboard');
  const [stats, setStats] = useState({ products: 0, orders: 0, newOrders: 0 });
  const [selectedFeedProductId, setSelectedFeedProductId] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  // States for cross-routing to POS from CRM
  const [warehouseInitialTab, setWarehouseInitialTab] = useState<'pos' | 'dashboard' | 'products' | 'history' | undefined>(undefined);
  const [warehouseInitialCustomerId, setWarehouseInitialCustomerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem('toj-admin-auth');
    if (saved === 'true') setIsAuth(true);
  }, []);

  useEffect(() => {
    if (isAuth) loadStats();
  }, [isAuth]);

  const loadStats = async () => {
    const [{ count: pCount }, { data: oData }] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('status'),
    ]);
    setStats({
      products: pCount || 0,
      orders: oData?.length || 0,
      newOrders: oData?.filter((o: any) => o.status === 'new').length || 0,
    });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('toj-admin-auth');
    setIsAuth(false);
  };

  if (!mounted) return null;
  if (!isAuth) return <AdminLogin onAuth={() => setIsAuth(true)} />;

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg))]">
      {/* Admin Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center">
            <BarChart3 size={16} />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-800 leading-none">Пульт управления</p>
            <p className="text-[10px] text-slate-400 font-medium">tojvitamin</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors">
          <LogOut size={14} /> Выйти
        </button>
      </header>

      <main className="max-w-5xl mx-auto pt-24 pb-16 px-6">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Добро пожаловать 👋</h1>
                <p className="text-slate-400 mt-2">Управляйте вашей экосистемой здоровья</p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Товаров</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.products}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Всего заказов</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.orders}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Новые заказы</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.newOrders}</p>
                </div>
              </div>

              {/* Module Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MODULES.map(mod => (
                  <motion.div
                    key={mod.id}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setView(mod.id)}
                    className="p-6 rounded-2xl cursor-pointer border border-slate-100 hover:border-slate-200 transition-all hover:shadow-lg hover:shadow-slate-100/50"
                    style={{ backgroundColor: mod.color }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/60 flex items-center justify-center mb-4 text-slate-600">
                      {mod.icon}
                    </div>
                    <h3 className="font-bold text-slate-800 mb-1">{mod.title}</h3>
                    <p className="text-xs text-slate-500">{mod.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'products' && (
            <motion.div key="products" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ProductEditor 
                onBack={() => {
                  if (selectedFeedProductId) {
                    setSelectedFeedProductId(undefined);
                    setView('feed-issues');
                  } else {
                    setView('dashboard');
                  }
                }} 
                initialProductId={selectedFeedProductId}
              />
            </motion.div>
          )}

          {view === 'feed-issues' && (
            <motion.div key="feed-issues" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <FeedDashboard 
                onBack={() => setView('dashboard')} 
                onEditProduct={(id) => {
                  setSelectedFeedProductId(id);
                  setView('products');
                }}
              />
            </motion.div>
          )}

          {view === 'categories' && (
            <motion.div key="categories" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <QuizEditor onBack={() => setView('dashboard')} />
            </motion.div>
          )}

          {view === 'complexes' && (
            <motion.div key="complexes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ComplexEditor onBack={() => setView('dashboard')} />
            </motion.div>
          )}


          {view === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <OperatorWorkspace onBack={() => setView('dashboard')} />
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <SiteSettings onBack={() => setView('dashboard')} />
            </motion.div>
          )}

          {view === 'combos' && (
            <motion.div key="combos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ComboEditor onBack={() => setView('dashboard')} />
            </motion.div>
          )}

          { view === 'seo-agent' && (
            <motion.div key="seo-agent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <SeoAgent onBack={() => setView('dashboard')} />
            </motion.div>
          )}

          {view === 'instagram-agent' && (
            <motion.div key="instagram-agent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <InstagramAgent onBack={() => setView('dashboard')} />
            </motion.div>
          )}

          {view === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <AnalyticsDashboard onBack={() => setView('dashboard')} />
            </motion.div>
          )}

          {view === 'crm' && (
            <motion.div key="crm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <CrmDashboard 
                onBack={() => setView('dashboard')} 
                onNavigateToPos={(customerId) => {
                  setWarehouseInitialTab('pos');
                  setWarehouseInitialCustomerId(customerId);
                  setView('warehouse');
                }}
              />
            </motion.div>
          )}

          {view === 'pharmacy-orders' && (
            <motion.div key="pharmacy-orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <PharmacyOrdersDashboard onBack={() => setView('dashboard')} />
            </motion.div>
          )}

          {view === 'bloggers' && (
            <motion.div key="bloggers" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <BloggerDashboard onBack={() => setView('dashboard')} />
            </motion.div>
          )}

          {view === 'warehouse' && (
            <motion.div key="warehouse" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <WarehouseDashboard 
                onBack={() => setView('dashboard')} 
                initialTab={warehouseInitialTab}
                initialCustomerId={warehouseInitialCustomerId}
                onClearInitialParams={() => {
                  setWarehouseInitialTab(undefined);
                  setWarehouseInitialCustomerId(undefined);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
