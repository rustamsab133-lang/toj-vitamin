"use client";
import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminLoginProps {
  onAuth: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onAuth }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    try {
      const response = await fetch('/api/admin/db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({ action: 'verify' })
      });

      if (response.ok) {
        sessionStorage.setItem('toj-admin-auth', 'true');
        sessionStorage.setItem('toj-admin-password', password);
        onAuth();
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--color-bg))] px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 text-white flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Пульт управления</h1>
          <p className="text-sm text-slate-400 mt-2">tojvitamin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              placeholder="Введите пароль"
              autoFocus
              className={`w-full h-14 px-5 rounded-2xl bg-white border text-sm font-medium outline-none transition-all placeholder:text-slate-300 ${
                error ? 'border-red-300 focus:border-red-400' : 'border-slate-100 focus:border-slate-300'
              }`}
            />
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 text-xs text-red-400 font-medium mt-2 pl-1"
              >
                <AlertCircle size={12} /> Неверный пароль
              </motion.p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full h-14 rounded-2xl bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-800/10"
          >
            {loading ? 'Проверяем...' : <>Войти <ArrowRight size={16} /></>}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
