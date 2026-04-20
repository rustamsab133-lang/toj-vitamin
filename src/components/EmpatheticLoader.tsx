"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Lang } from '@/lib/types';

interface EmpatheticLoaderProps {
  lang?: Lang;
  categoryId?: string;
}

const MESSAGES: Record<string, { title: string; stat: string }> = {
  cat_sleep: {
    title: 'Анализируем паттерны сна и нервной системы...',
    stat: 'Хроническое недосыпание снижает иммунитет на 70%. Это поддаётся коррекции.',
  },
  cat_men: {
    title: 'Составляем мужской нутритивный протокол...',
    stat: 'После 30 лет тестостерон снижается на 1% ежегодно. Специальный комплекс это компенсирует.',
  },
  cat_women: {
    title: 'Подбираем формулу женского здоровья...',
    stat: '8 из 10 женщин испытывают дефицит хотя бы одного ключевого нутриента.',
  },
  cat_brain: {
    title: 'Анализируем когнитивный профиль...',
    stat: 'Дефицит Омега-3 снижает скорость мышления на 30%. Клинически доказано.',
  },
  cat_weight: {
    title: 'Рассчитываем метаболический профиль...',
    stat: '60% случаев лишнего веса связаны с дефицитом хрома и микроэлементов.',
  },
  cat_joints: {
    title: 'Оцениваем состояние суставов и связок...',
    stat: 'Коллаген типа II и глюкозамин восстанавливают хрящ за 90 дней курсового приёма.',
  },
  cat_sport: {
    title: 'Формируем спортивный нутритивный стек...',
    stat: 'Правильный нутритивный стек увеличивает результаты тренировок на 20-35%.',
  },
  cat_detox: {
    title: 'Анализируем токсическую нагрузку на организм...',
    stat: 'Печень ежедневно фильтрует 1700 литров крови. Поддержка глутатионом критически важна.',
  },
  cat_mom: {
    title: 'Подбираем безопасную поддержку для мамы...',
    stat: 'Каждая вторая беременная испытывает дефицит фолата и йода в первом триместре.',
  },
  cat_kids: {
    title: 'Формируем детский нутритивный комплекс...',
    stat: '70% детей в Центральной Азии имеют дефицит витамина D. Это влияет на иммунитет и рост.',
  },
};

const DEFAULT = {
  title: 'Анализ и подбор клинического решения...',
  stat: 'С этой проблемой регулярно сталкиваются 60% людей. Это поддается коррекции.',
};

export const EmpatheticLoader: React.FC<EmpatheticLoaderProps> = ({ lang = 'ru', categoryId }) => {
  const msg = (categoryId && MESSAGES[categoryId]) || DEFAULT;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full flex items-center justify-center p-12 text-center min-h-[400px]"
    >
      <div className="max-w-md space-y-8">
        {/* Animated bars */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 flex items-center justify-center gap-1.5">
             <motion.div 
               animate={{ height: ['8px', '28px', '8px'] }}
               transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0 }}
               className="w-1.5 bg-[#1E40AF] rounded-full"
             />
             <motion.div 
               animate={{ height: ['8px', '28px', '8px'] }}
               transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
               className="w-1.5 bg-[#1D1D1F] rounded-full"
             />
             <motion.div 
               animate={{ height: ['8px', '28px', '8px'] }}
               transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
               className="w-1.5 bg-[#1E40AF] rounded-full"
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
            {lang === 'ru' ? msg.title : 'Таҳлил ва интихоби қарори клиникӣ...'}
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[#86868B] text-[15px] leading-relaxed max-w-sm mx-auto"
          >
            {lang === 'ru'
              ? <><span className="font-medium text-[#1D1D1F]">🔬 </span>{msg.stat}</>
              : <>Бо ин мушкилот <span className="font-medium text-[#1D1D1F]">60% одамон</span> мунтазам дучор мешаванд. Ин ислоҳ мешавад.</>
            }
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};
