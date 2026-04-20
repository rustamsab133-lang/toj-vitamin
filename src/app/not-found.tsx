"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-12">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="text-[120px] md:text-[180px] font-black text-[#1D1D1F]/[0.03] leading-none select-none font-outfit"
        >
          404
        </motion.div>
        
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-20 h-20 bg-white rounded-[32px] shadow-xl flex items-center justify-center border border-black/5">
              <Search size={32} className="text-[#1E40AF]" />
           </div>
        </div>
      </div>

      <h1 className="text-[32px] md:text-[42px] font-bold text-[#1D1D1F] mb-4 font-outfit tracking-tight">
        Страница не найдена
      </h1>
      
      <p className="text-[#1D1D1F]/60 max-w-sm mb-12 leading-relaxed">
        Похоже, эта молекула здоровья еще не открыта. Возможно, адрес введен неверно или страница была перемещена.
      </p>

      <Link
        href="/"
        className="h-14 px-10 bg-[#1D1D1F] text-white rounded-full font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-[#1E40AF] transition-all active:scale-95"
      >
        <ArrowLeft size={18} />
        <span>Вернуться к витаминам</span>
      </Link>

      <div className="mt-20 opacity-30">
         <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-[#1D1D1F]">
           Green Leaf Sciences
         </p>
      </div>
    </div>
  );
}
