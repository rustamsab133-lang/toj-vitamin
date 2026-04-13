"use client";
import React, { useState, useEffect } from 'react';
import { AdminLogin } from './components/AdminLogin';
import { ProductEditor } from './components/ProductEditor';
import { QuizEditor } from './components/QuizEditor';
import { ComplexEditor } from './components/ComplexEditor';
import { OrdersDashboard } from './components/OrdersDashboard';
import { SiteSettings } from './components/SiteSettings';
import { supabase } from '@/lib/supabase';
import { Package, Layers, Heart, ShoppingBag, Settings, LogOut, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AdminView = 'dashboard' | 'products' | 'categories' | 'complexes' | 'orders' | 'settings';

const MODULES = [
  { id: 'products' as AdminView, title: 'Товары', desc: 'Каталог, цены, фото', icon: <Package size={24} />, color: '#F8FAFC' }, // Более светлый Apple-style
  { id: 'categories' as AdminView, title: 'Умные комплексы', desc: 'Управление подбором', icon: <Layers size={24} />, color: '#F8FAFC' },
  { id: 'complexes' as AdminView, title: 'Синергия', desc: 'Клинические связки', icon: <BarChart3 size={24} />, color: '#F8FAFC' },
  { id: 'orders' as AdminView, title: 'Заказы', desc: 'Лента, статусы', icon: <ShoppingBag size={24} />, color: '#F8FAFC' },
  { id: 'settings' as AdminView, title: 'Настройки', desc: 'Сайт, тексты', icon: <Settings size={24} />, color: '#F8FAFC' },
];

export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [view, setView] = useState<AdminView>('dashboard');
  const [stats, setStats] = useState({ products: 0, orders: 0, newOrders: 0 });
  const [mounted, setMounted] = useState(false);

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
              <ProductEditor onBack={() => setView('dashboard')} />
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
              <OrdersDashboard onBack={() => setView('dashboard')} />
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <SiteSettings onBack={() => setView('dashboard')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
