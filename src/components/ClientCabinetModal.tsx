"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Lock, LogOut, ShoppingBag, Calendar, CheckCircle2, Clock, Truck, HelpCircle, UserCheck, ShieldAlert, Award } from 'lucide-react';
import { useClient, ClientProfile } from '@/store/useClient';
import { supabase } from '@/lib/supabase';
import { Lang } from '@/lib/types';

interface ClientCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Lang;
}

const STATUS_STYLE: Record<string, { label: { ru: string; tj: string }; color: string; icon: React.ReactNode }> = {
  new: { 
    label: { ru: 'Принят', tj: 'Қабул шуд' }, 
    color: 'bg-blue-500/10 text-blue-600 border border-blue-500/20', 
    icon: <Clock size={12} /> 
  },
  processing: { 
    label: { ru: 'В сборке', tj: 'Дар ҳоли ҷамъоварӣ' }, 
    color: 'bg-amber-500/10 text-amber-600 border border-amber-500/20', 
    icon: <ShoppingBag size={12} /> 
  },
  delivered: { 
    label: { ru: 'В пути', tj: 'Дар роҳ' }, 
    color: 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20', 
    icon: <Truck size={12} /> 
  },
  completed: { 
    label: { ru: 'Выдан', tj: 'Супорида шуд' }, 
    color: 'bg-green-500/10 text-green-600 border border-green-500/20', 
    icon: <CheckCircle2 size={12} /> 
  },
};

export const ClientCabinetModal: React.FC<ClientCabinetModalProps> = ({ isOpen, onClose, lang }) => {
  const { client, isAuth, setClient, logout } = useClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when cabinet modal is open to prevent background scrolling
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
  
  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Cabinet Panel State
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');

  // Clear errors when switching forms
  useEffect(() => {
    setErrorMsg('');
    setName('');
    setPhone('');
    setPassword('');
  }, [isRegister, isOpen]);

  const loadClientOrders = useCallback(async () => {
    if (!client) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('phone', client.phone)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to load client orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, [client, lang]);

  // Load orders when cabinet is open and authenticated
  useEffect(() => {
    if (isOpen && isAuth && client) {
      loadClientOrders();
    }
  }, [isOpen, isAuth, client, loadClientOrders]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    // Ensure we send full format
    const formattedPhone = '+992' + phone.replace(/\D/g, '');

    if (formattedPhone.length < 9) {
      setErrorMsg(lang === 'ru' ? 'Введите корректный номер телефона' : 'Рақами телефони дурустро ворид кунед');
      setLoading(false);
      return;
    }

    if (password.length < 4) {
      setErrorMsg(lang === 'ru' ? 'Пароль должен быть не менее 4 символов' : 'Рамз бояд на камтар аз 4 аломат бошад');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/client/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: isRegister ? 'register' : 'login',
          name: name.trim(),
          phone: formattedPhone,
          password: password
        })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        setErrorMsg(resData.error || (lang === 'ru' ? 'Произошла ошибка. Попробуйте позже.' : 'Хатогӣ рух дод. Баъдтар кӯшиш кунед.'));
        setLoading(false);
        return;
      }

      setClient(resData.client);
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMsg(lang === 'ru' ? 'Произошла ошибка. Попробуйте позже.' : 'Хатогӣ рух дод. Баъдтар кӯшиш кунед.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!client || !editName.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/client/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          name: editName.trim()
        })
      });
      const data = await response.json();
      if (data.success) {
        setClient(data.client);
        setIsEditingProfile(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'tg-TG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex justify-end overflow-hidden pointer-events-auto">
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[8px] pointer-events-auto"
          />

          {/* SIDE PANEL */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 40, stiffness: 300 }}
            className="w-full sm:w-[500px] h-full bg-white/80 backdrop-blur-[24px] shadow-[-20px_0_60px_rgba(0,0,0,0.15)] flex flex-col relative z-10 border-l border-white/20"
            style={{
              background: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.45) 100%)'
            }}
          >
            {/* CLOSE BUTTON */}
            <div className="absolute top-6 right-6 z-20">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/60 border border-black/[0.05] hover:bg-black hover:text-white transition-all flex items-center justify-center active:scale-90 shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* AUTH VIEW (IfNot LoggedIn) */}
            {!isAuth ? (
              <div className="flex-1 flex flex-col justify-center px-8 sm:px-12">
                <div className="mb-8 text-center sm:text-left">
                  <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mb-4 mx-auto sm:mx-0 shadow-lg">
                    <User size={24} />
                  </div>
                  <h2 className="text-[28px] font-bold text-[#1D1D1F] tracking-tight font-outfit">
                    {isRegister 
                      ? (lang === 'ru' ? 'Регистрация' : 'Сабти ном') 
                      : (lang === 'ru' ? 'Личный кабинет' : 'Кабинети инфиродӣ')
                    }
                  </h2>
                  <p className="text-[14px] text-[#86868B] mt-1 font-medium">
                    {isRegister
                      ? (lang === 'ru' ? 'Создайте профиль для отслеживания заказов' : 'Барои пайгирии фармоишҳо профил созед')
                      : (lang === 'ru' ? 'Войдите для просмотра ваших заказов и рецептов' : 'Барои дидани фармоишҳо ва нусхаҳои худ ворид шавед')
                    }
                  </p>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {isRegister && (
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={lang === 'ru' ? 'Ваше имя' : 'Номи шумо'}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/60 border border-black/[0.05] focus:border-black outline-none font-bold text-[15px] transition-all font-outfit"
                        required
                      />
                    </div>
                  )}

                  <div className="relative flex items-center">
                    <Phone size={18} className="absolute left-4 text-slate-400 z-10" />
                    <span className="absolute left-11 font-bold text-[15px] text-slate-800 z-10">+992</span>
                    <input
                      type="tel"
                      placeholder="901234567"
                      maxLength={9}
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                        setPhone(val);
                      }}
                      className="w-full h-14 pl-24 pr-4 rounded-2xl bg-white/60 border border-black/[0.05] focus:border-black outline-none font-bold text-[15px] transition-all font-outfit tracking-wide"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      placeholder={lang === 'ru' ? 'Пароль' : 'Рамз'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/60 border border-black/[0.05] focus:border-black outline-none font-bold text-[15px] transition-all font-outfit"
                      required
                    />
                  </div>

                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/10 text-red-600 text-xs font-bold flex items-center gap-2"
                    >
                      <ShieldAlert size={14} className="shrink-0" />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-black text-white rounded-2xl font-bold text-[16px] hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-98 shadow-md disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserCheck size={18} />
                        <span>
                          {isRegister 
                            ? (lang === 'ru' ? 'Зарегистрироваться' : 'Бақайдгирӣ') 
                            : (lang === 'ru' ? 'Войти в кабинет' : 'Ворид шудан')
                          }
                        </span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <button
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-[13px] font-bold text-blue-600 hover:text-blue-800 hover:underline transition-all"
                  >
                    {isRegister
                      ? (lang === 'ru' ? 'Уже есть аккаунт? Войдите' : 'Аллакай профил доред? Ворид шавед')
                      : (lang === 'ru' ? 'Нет аккаунта? Зарегистрироваться за 10 сек' : 'Профил надоред? Сабти ном кунед')
                    }
                  </button>
                </div>
              </div>
            ) : (
              /* CABINET VIEW (If LoggedIn) */
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* CABINET HEADER */}
                <div className="shrink-0 p-8 pt-10 flex items-center justify-between border-b border-black/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1E40AF] to-blue-500 text-white flex items-center justify-center shadow-md">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[20px] text-[#1D1D1F] leading-tight font-outfit">
                        {client?.name}
                      </h3>
                      <p className="text-[11px] text-[#86868B] font-bold tracking-wider mt-0.5">
                        {client?.phone}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { logout(); onClose(); }}
                    className="w-10 h-10 rounded-xl hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors flex items-center justify-center"
                    title={lang === 'ru' ? 'Выйти' : 'Баромадан'}
                  >
                    <LogOut size={18} />
                  </button>
                </div>

                {/* CABINET NAVIGATION TABS */}
                <div className="shrink-0 px-6 py-3 flex gap-2 border-b border-black/[0.03] bg-black/[0.01]">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      activeTab === 'profile'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-slate-500 hover:bg-black/[0.03] hover:text-black'
                    }`}
                  >
                    {lang === 'ru' ? 'Профиль и Рецепты' : 'Профил ва Нусхаҳо'}
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative ${
                      activeTab === 'orders'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-slate-500 hover:bg-black/[0.03] hover:text-black'
                    }`}
                  >
                    {lang === 'ru' ? 'Мои заказы' : 'Фармоишҳои ман'}
                    {orders.length > 0 && (
                      <span className="absolute top-1.5 right-2 w-4 h-4 rounded-full bg-blue-600 text-[9px] font-bold text-white flex items-center justify-center">
                        {orders.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* SCROLLABLE CONTENT BODY */}
                <div className="flex-1 overflow-y-auto p-6 apple-shelf-scroll overscroll-contain">
                  <AnimatePresence mode="wait">
                    {activeTab === 'profile' ? (
                      /* PROFILE & SMART RECOMMENDATIONS VIEW */
                      <motion.div
                        key="tab-profile"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                      >
                        {/* PROFILE INFO & EDIT */}
                        <div className="p-6 rounded-3xl bg-white border border-black/[0.04] shadow-sm space-y-4">
                          <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl uppercase">
                              {client?.name?.[0] || 'U'}
                            </div>
                            <div className="flex-1">
                              {isEditingProfile ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full h-10 px-3 rounded-xl border border-black/[0.1] font-bold text-[16px] outline-none focus:border-blue-500 font-outfit"
                                  placeholder={lang === 'ru' ? 'Ваше имя' : 'Номи шумо'}
                                />
                              ) : (
                                <h4 className="text-[18px] font-bold text-slate-800 leading-tight font-outfit">
                                  {client?.name}
                                </h4>
                              )}
                              <p className="text-[13px] text-slate-500 mt-0.5">{client?.phone}</p>
                            </div>
                          </div>

                          {isEditingProfile ? (
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={handleSaveProfile}
                                disabled={loading}
                                className="flex-1 h-10 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-black transition-colors flex items-center justify-center"
                              >
                                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (lang === 'ru' ? 'Сохранить' : 'Сабт кардан')}
                              </button>
                              <button
                                onClick={() => setIsEditingProfile(false)}
                                disabled={loading}
                                className="px-4 h-10 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors"
                              >
                                {lang === 'ru' ? 'Отмена' : 'Бекор'}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditName(client?.name || '');
                                setIsEditingProfile(true);
                              }}
                              className="w-full h-10 bg-slate-50 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors"
                            >
                              {lang === 'ru' ? 'Редактировать профиль' : 'Таҳрири профил'}
                            </button>
                          )}
                        </div>

                        {/* QUIZ RESULTS */}
                        {client?.quiz_results && (
                          <div className="space-y-3">
                            <h4 className="text-[12px] font-bold text-[#1D1D1F] uppercase tracking-[0.2em] px-1">
                              {lang === 'ru' ? 'Ваши рекомендации' : 'Тавсияҳои шумо'}
                            </h4>
                            <div className="p-5 rounded-3xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                              <h5 className="font-bold text-[15px] text-slate-800 font-outfit leading-tight">
                                {client.quiz_results.optionTitle || client.quiz_results.catTitle}
                              </h5>
                              {client.quiz_results.recommendedProductNames && client.quiz_results.recommendedProductNames.length > 0 && (
                                <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                                  {client.quiz_results.recommendedProductNames.join(' • ')}
                                </p>
                              )}
                              <button
                                onClick={() => {
                                  onClose();
                                  document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="h-9 px-4 mt-2 rounded-xl bg-blue-600 text-white font-bold text-[11px] uppercase tracking-wider hover:bg-black transition-colors w-full"
                              >
                                {lang === 'ru' ? 'Подобрать комплекс' : 'Интихоби маҷмӯа'}
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      /* ORDERS HISTORY LIST VIEW */
                      <motion.div
                        key="tab-orders"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        {loadingOrders ? (
                          <div className="flex flex-col items-center py-16 space-y-3">
                            <span className="w-8 h-8 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{lang === 'ru' ? 'Загрузка...' : 'Боргирӣ...'}</p>
                          </div>
                        ) : orders.length === 0 ? (
                          <div className="text-center py-16 text-slate-300 bg-white rounded-3xl border border-black/[0.02] p-8 shadow-sm">
                            <ShoppingBag size={48} strokeWidth={1} className="mx-auto mb-4 text-[#C1C9D2]" />
                            <h5 className="font-bold text-[16px] text-slate-800 font-outfit mb-1">{lang === 'ru' ? 'Заказов пока нет' : 'Фармоиш нест'}</h5>
                            <p className="text-[13px] text-slate-400 max-w-xs mx-auto leading-relaxed mb-6">
                              {lang === 'ru' 
                                ? 'Соберите корзину лучших витаминов, примените промокод и сделайте ваш первый заказ!'
                                : 'Сабади витаминҳоро ҷамъ кунед ва аввалин фармоиши худро сабт кунед!'}
                            </p>
                            <button
                              onClick={() => {
                                onClose();
                                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="h-10 px-5 rounded-xl bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-blue-600 active:scale-95 transition-all"
                            >
                              {lang === 'ru' ? 'В каталог' : 'Ба каталог'}
                            </button>
                          </div>
                        ) : (
                          /* Render orders */
                          <div className="space-y-4">
                            {orders.map((order) => {
                              const style = STATUS_STYLE[order.status] || STATUS_STYLE.new;
                              const isExpanded = expandedOrder === order.id;

                              return (
                                <div
                                  key={order.id}
                                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                  className={`bg-white rounded-3xl border p-5 cursor-pointer hover:shadow-md transition-all duration-300 ${
                                    isExpanded ? 'border-slate-800 shadow-sm' : 'border-black/[0.03]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-3.5">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-extrabold text-slate-800 font-outfit">#{order.id}</span>
                                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.color}`}>
                                        {style.icon}
                                        <span>{style.label[lang]}</span>
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-[#94A3B8] font-bold">{formatDate(order.created_at)}</span>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <p className="text-[13px] text-slate-500 font-medium line-clamp-1 max-w-[250px]">
                                      {Array.isArray(order.items) 
                                        ? order.items.map((i: any) => `${i.name} ×${i.quantity}`).join(', ') 
                                        : 'Товары'}
                                    </p>
                                    <p className="font-extrabold text-slate-800 font-outfit text-base">
                                      {order.total} <span className="text-[11px] font-bold text-slate-400">смн</span>
                                    </p>
                                  </div>

                                  {/* Expandable Order Breakdown */}
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 pt-4 border-t border-black/[0.05] space-y-3 overflow-hidden"
                                      >
                                        <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Состав заказа:</h6>
                                        {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                                          <div key={idx} className="flex items-center justify-between text-xs font-bold text-slate-700">
                                            <span className="font-medium text-slate-600">
                                              {item.name} <span className="text-slate-400 text-[10px]">×{item.quantity}</span>
                                            </span>
                                            <span className="font-outfit">{item.price * item.quantity} смн</span>
                                          </div>
                                        ))}

                                        {/* Promocode details if applied */}
                                        {order.promocode && (
                                          <div className="flex items-center justify-between text-[11px] font-bold text-green-600 bg-green-500/5 p-2.5 rounded-xl border border-green-500/10">
                                            <span>Промокод: {order.promocode}</span>
                                            <span>-{order.discount} смн</span>
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;

  return createPortal(modalContent, document.body);
};
