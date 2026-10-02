"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatorWorkspace } from '../components/OperatorWorkspace';

export default function OperatorOrdersStandalonePage() {
  const [isAuth, setIsAuth] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check saved session on mount
  useEffect(() => {
    setMounted(true);
    const sessionAuth = sessionStorage.getItem('toj-admin-auth');
    const localAuth = localStorage.getItem('toj-admin-auth');
    const localPassword = localStorage.getItem('toj-admin-password');

    if (sessionAuth === 'true') {
      setIsAuth(true);
    } else if (localAuth === 'true' && localPassword) {
      // Synchronize to sessionStorage for seamless API calls
      sessionStorage.setItem('toj-admin-auth', 'true');
      sessionStorage.setItem('toj-admin-password', localPassword);
      setIsAuth(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError(null);

    const trimmedPassword = password.trim();

    try {
      const response = await fetch('/api/admin/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': trimmedPassword,
        },
        body: JSON.stringify({ action: 'verify' }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem('toj-admin-auth', 'true');
        sessionStorage.setItem('toj-admin-password', trimmedPassword);

        if (rememberMe) {
          localStorage.setItem('toj-admin-auth', 'true');
          localStorage.setItem('toj-admin-password', trimmedPassword);
        } else {
          localStorage.removeItem('toj-admin-auth');
          localStorage.removeItem('toj-admin-password');
        }

        setIsAuth(true);
      } else {
        setError(data.error || 'Неверный пароль доступа');
      }
    } catch (err) {
      console.error('Ошибка проверки пароля:', err);
      setError('Ошибка сети. Проверьте подключение.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('toj-admin-auth');
    sessionStorage.removeItem('toj-admin-password');
    localStorage.removeItem('toj-admin-auth');
    localStorage.removeItem('toj-admin-password');
    setIsAuth(false);
    setPassword('');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg))]">
      <AnimatePresence mode="wait">
        {!isAuth ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="min-h-screen flex items-center justify-center p-4 sm:p-6"
          >
            <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
              {/* Header */}
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/25">
                  <ShoppingBag size={32} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase tracking-wider mb-2">
                    <Sparkles size={12} className="text-indigo-600" /> Колл-центр и доставка
                  </div>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    АРМ Оператора
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Прием заказов и управление доставкой TOJ-VITAMIN
                  </p>
                </div>
              </div>

              {/* Error banner */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-2.5 text-xs text-red-600 font-medium"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Пароль доступа:
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-3 text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Введите пароль..."
                      autoFocus
                      required
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Запомнить на этом устройстве</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !password.trim()}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 active:scale-[0.99]"
                >
                  {loading ? (
                    <span>Проверка...</span>
                  ) : (
                    <>
                      <span>Войти в АРМ</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Footer Note */}
              <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100 flex items-center justify-center gap-2">
                <span>Пароль доступа оператора</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8"
          >
            <OperatorWorkspace onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
