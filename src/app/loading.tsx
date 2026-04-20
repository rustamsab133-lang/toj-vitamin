"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-[#FDFBF7] z-[1000] flex flex-col items-center justify-center">
      <div className="relative">
        {/* Animated Rings */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="w-24 h-24 rounded-full border-2 border-[#1E40AF]/20"
        />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
            className="w-12 h-12 rounded-xl border-t-2 border-[#1E40AF]"
          />
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src="/logo.webp" 
            alt="Loading..." 
            className="w-6 h-6 object-contain opacity-40"
          />
        </div>
      </div>
      
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-[12px] font-bold text-[#1D1D1F]/40 uppercase tracking-[0.3em] font-outfit"
      >
        Green Leaf Sciences
      </motion.p>
    </div>
  );
}
