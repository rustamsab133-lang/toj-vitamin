"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Lang } from '@/lib/types';

interface EmpatheticLoaderProps {
  lang?: Lang;
}

export const EmpatheticLoader: React.FC<EmpatheticLoaderProps> = ({ lang = 'ru' }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full flex items-center justify-center p-12 text-center min-h-[400px]"
    >
      <div className="max-w-md space-y-8">
        {/* Minimalist Medical loader */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 flex items-center justify-center gap-1.5">
             <motion.div 
               animate={{ height: ['8px', '24px', '8px'] }}
               transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0 }}
               className="w-1.5 bg-[#1D1D1F] rounded-full"
             />
             <motion.div 
               animate={{ height: ['8px', '24px', '8px'] }}
               transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
               className="w-1.5 bg-[#1D1D1F] rounded-full"
             />
             <motion.div 
               animate={{ height: ['8px', '24px', '8px'] }}
               transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
               className="w-1.5 bg-[#1D1D1F] rounded-full"
             />
          </div>
        </div>

        <div className="space-y-3">
          <motion.h3 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[22px] font-semibold text-[#1D1D1F] tracking-tight font-outfit"
          >
            {lang === 'ru' 
              ? 'Анализ и подбор клинического решения...' 
              : 'Таҳлил ва интихоби қарори клиникӣ...'}
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[#86868B] text-[15px] leading-relaxed max-w-sm mx-auto"
          >
            {lang === 'ru'
              ? <>С этой проблемой регулярно сталкиваются <span className="font-medium text-[#1D1D1F]">60% людей.</span> Это поддается коррекции.</>
              : <>Бо ин мушкилот <span className="font-medium text-[#1D1D1F]">60% одамон</span> мунтазам дучор мешаванд. Ин ислоҳ мешавад.</>
            }
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};
