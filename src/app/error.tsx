"use client";
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 bg-red-50 rounded-[24px] flex items-center justify-center text-red-500 mb-8 border border-red-100"
      >
        <AlertCircle size={40} />
      </motion.div>

      <h1 className="text-[32px] md:text-[42px] font-bold text-[#1D1D1F] mb-4 font-outfit tracking-tight">
        Упс! Что-то пошло не так
      </h1>
      
      <p className="text-[#1D1D1F]/60 max-w-md mb-12 leading-relaxed">
        Произошла техническая ошибка. Мы уже работаем над её исправлением. Попробуйте обновить страницу или вернуться на главную.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => reset()}
          className="h-14 px-8 bg-[#1D1D1F] text-white rounded-full font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-[#1E40AF] transition-all active:scale-95"
        >
          <RefreshCcw size={18} />
          <span>Попробовать снова</span>
        </button>
        
        <Link
          href="/"
          className="h-14 px-8 bg-white text-[#1D1D1F] border border-black/5 rounded-full font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          <Home size={18} />
          <span>На главную</span>
        </Link>
      </div>

      <div className="mt-20 opacity-20 flex items-center gap-3 grayscale">
         <img src="/logo.webp" alt="Logo" className="w-8 h-8 object-contain scale-[2.5]" />
         <span className="font-bold text-[14px] font-outfit tracking-widest">TOJ-VITAMIN</span>
      </div>
    </div>
  );
}
