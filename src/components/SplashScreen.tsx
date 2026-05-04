"use client";
import React from 'react';
import { motion } from 'framer-motion';

export const SplashScreen: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
      className="fixed inset-0 z-100 flex items-center justify-center bg-[#FDFBF7] overflow-hidden"
      style={{ zIndex: 9999 }}
    >
      {/* BACKGROUND ELEMENTS - SUBTLE AMBIENT BLUR */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#1E40AF]/5 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-[#8C7851]/5 blur-[80px] rounded-full animate-pulse delay-700" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* STYLIZED BRAND TEXT */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 1.2,
            ease: [0.2, 0.8, 0.2, 1],
            delay: 0.2
          }}
          className="flex flex-col items-center"
        >
          {/* THE REAL LOGO IMAGE - LARGE & PRESTIGIOUS */}
          <div className="w-32 h-32 mb-8 rounded-[32px] bg-white shadow-2xl flex items-center justify-center border border-[#E5E5EA]/50 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1E40AF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src="/logo.webp" alt="TOJ-VITAMIN Brand Logo" className="w-full h-full object-contain scale-[1.8] relative z-10" />
          </div>

          <div className="relative">
            {/* THE MAIN TEXT LOGO */}
            <h1 className="text-[32px] md:text-[44px] font-bold tracking-[0.2em] text-[#1D1D1F] font-outfit uppercase relative z-10">
              TOJ-VITAMIN
            </h1>

            {/* DEPTH SHADOWS */}
            <div className="absolute inset-0 blur-[40px] opacity-10 bg-[#1E40AF] -z-10 scale-125" />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-4 flex items-center gap-3"
          >
            <div className="h-px w-8 bg-[#1D1D1F]/10" />
            <span className="text-[10px] font-bold tracking-[0.4em] text-[#1D1D1F]/40 uppercase">
              Биотехнологии здоровья
            </span>
            <div className="h-px w-8 bg-[#1D1D1F]/10" />
          </motion.div>
        </motion.div>

        {/* LOADING PROGRESS LINE - MINIMALIST */}
        <div className="absolute bottom-16 w-32 h-[1px] bg-[#1D1D1F]/5 overflow-hidden">
          <div
            className="w-full h-full bg-gradient-to-r from-transparent via-[#1E40AF]/40 to-transparent animate-[shimmer_2s_linear_infinite]"
          />
        </div>
      </div>
    </motion.div>
  );
};
