"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Lang } from '@/lib/types';

interface EmpatheticLoaderProps {
  lang?: Lang;
  categoryId?: string;
}

interface LocalizedMessage {
  title: Record<Lang, string>;
  stat: Record<Lang, string>;
}

const MESSAGES: Record<string, LocalizedMessage> = {
  cat_sleep: {
    title: {
      ru: 'Анализируем паттерны сна и нервной системы...',
      tj: 'Таҳлили шеваи хоб ва асабҳо...',
      en: 'Analyzing sleep patterns and nervous system...'
    },
    stat: {
      ru: 'Хроническое недосыпание снижает иммунитет на 70%. Это поддаётся коррекции.',
      tj: 'Бехобии доимӣ иммунитетро 70% паст мекунад. Инро метавон ислоҳ кард.',
      en: 'Chronic sleep deprivation impairs immunity by up to 70%. This is clinically reversible.'
    }
  },
  cat_men: {
    title: {
      ru: 'Составляем мужской нутритивный протокол...',
      tj: 'Таҳияи протоколи ғизоӣ барои мардон...',
      en: "Formulating men's nutritional protocol..."
    },
    stat: {
      ru: 'После 30 лет тестостерон снижается на 1% ежегодно. Специальный комплекс это компенсирует.',
      tj: 'Пас аз 30-солагӣ сатҳи тестостерон ҳар сол 1% кам мешавад. Маҷмӯаи махсус инро барқарор мекунад.',
      en: 'After age 30, testosterone declines ~1% annually. A targeted nutritional complex offsets this.'
    }
  },
  cat_women: {
    title: {
      ru: 'Подбираем формулу женского здоровья...',
      tj: 'Интихоби формулаи саломатии занон...',
      en: "Tailoring women's health formula..."
    },
    stat: {
      ru: '8 из 10 женщин испытывают дефицит хотя бы одного ключевого нутриента.',
      tj: 'Аз ҳар 10 зан 8 нафар норасоии ҳадди ақал як моддаи заруриро доранд.',
      en: '8 out of 10 women experience a deficiency in at least one vital micronutrient.'
    }
  },
  cat_brain: {
    title: {
      ru: 'Анализируем когнитивный профиль...',
      tj: 'Таҳлили фаъолияти мағзи сар...',
      en: 'Analyzing cognitive profile and focus...'
    },
    stat: {
      ru: 'Дефицит Омега-3 снижает скорость мышления на 30%. Клинически доказано.',
      tj: 'Норасоии Омега-3 суръати фикррониро 30% коҳиш медиҳад. Клиникӣ исбот шудааст.',
      en: 'Omega-3 deficiency reduces processing speed by up to 30%. Clinically proven.'
    }
  },
  cat_weight: {
    title: {
      ru: 'Рассчитываем метаболический профиль...',
      tj: 'Ҳисобкунии суръати мубодилаи моддаҳо...',
      en: 'Calculating metabolic profile and body composition...'
    },
    stat: {
      ru: '60% случаев лишнего веса связаны с дефицитом хрома и микроэлементов.',
      tj: '60% ҳолатҳои вазни зиёдатӣ бо норасоии хром ва микроэлементҳо алоқаманданд.',
      en: '60% of metabolic plateau cases correlate with chromium and micronutrient deficits.'
    }
  },
  cat_joints: {
    title: {
      ru: 'Оцениваем состояние суставов и связок...',
      tj: 'Баҳодиҳии ҳолати пайвандҳо ва буғумҳо...',
      en: 'Assessing joint health and connective tissue...'
    },
    stat: {
      ru: 'Коллаген типа II и глюкозамин восстанавливают хрящ за 90 дней курсового приёма.',
      tj: 'Коллагени намуди II ва глюкозамин пайвандҳоро дар давоми 90 рӯз барқарор менамоянд.',
      en: 'Type II collagen and glucosamine support cartilage regeneration across a 90-day protocol.'
    }
  },
  cat_sport: {
    title: {
      ru: 'Формируем спортивный нутритивный стек...',
      tj: 'Таҳияи маҷмӯи варзишӣ...',
      en: 'Compiling sports nutrition stack...'
    },
    stat: {
      ru: 'Правильный нутритивный стек увеличивает результаты тренировок на 20-35%.',
      tj: 'Маҷмӯи дурусти ғизоӣ натиҷаҳои тамринро 20-35% беҳтар мегардонад.',
      en: 'Targeted amino acid and creatine synergy elevates athletic output by 20-35%.'
    }
  },
  cat_detox: {
    title: {
      ru: 'Анализируем токсическую нагрузку на организм...',
      tj: 'Таҳлили бори токсикӣ ба бадан...',
      en: 'Analyzing detoxification and liver load...'
    },
    stat: {
      ru: 'Печень ежедневно фильтрует 1700 литров крови. Поддержка глутатионом критически важна.',
      tj: 'Ҷигар ҳар рӯз 1700 литр хунро тоза мекунад. Дастгирӣ бо глутатион бисёр муҳим аст.',
      en: 'The liver filters 1,700 liters of blood daily. Glutathione & milk thistle support is critical.'
    }
  },
  cat_mom: {
    title: {
      ru: 'Подбираем безопасную поддержку для мамы...',
      tj: 'Интихоби дастгирии бехатар барои модарон...',
      en: 'Selecting safe prenatal & postpartum support...'
    },
    stat: {
      ru: 'Каждая вторая беременная испытывает дефицит фолата и йода в первом триместре.',
      tj: 'Аз ҳар ду зани ҳомила як нафар норасоии фолат ва йодро ҳис мекунад.',
      en: 'Over 50% of expectant mothers experience folate and iodine deficiency in the 1st trimester.'
    }
  },
  cat_kids: {
    title: {
      ru: 'Формируем детский нутритивный комплекс...',
      tj: 'Таҳияи маҷмӯи ғизоӣ барои кӯдакон...',
      en: "Formulating children's developmental complex..."
    },
    stat: {
      ru: '70% детей в Центральной Азии имеют дефицит витамина D. Это влияет на иммунитет и рост.',
      tj: '70% кӯдакон дар Осиёи Марказӣ норасоии витамини D доранд. Ин ба рушд таъсир мерасонад.',
      en: '70% of children in Central Asia have insufficient Vitamin D levels, impacting immunity and growth.'
    }
  }
};

const DEFAULT_MSG: LocalizedMessage = {
  title: {
    ru: 'Анализ и подбор клинического решения...',
    tj: 'Таҳлил ва интихоби қарори клиникӣ...',
    en: 'Analyzing and compiling clinical formulation...'
  },
  stat: {
    ru: 'С этой проблемой регулярно сталкиваются 60% людей. Это поддается коррекции.',
    tj: 'Бо ин мушкилот 60% одамон мунтазам дучор мешаванд. Ин ислоҳ мешавад.',
    en: 'Over 60% of individuals face similar nutrient deficiencies. Our algorithm finds the optimal synergistic formula.'
  }
};

export const EmpatheticLoader: React.FC<EmpatheticLoaderProps> = ({ lang = 'ru', categoryId }) => {
  const currentLang: Lang = lang === 'en' ? 'en' : (lang === 'tj' ? 'tj' : 'ru');
  const msg = (categoryId && MESSAGES[categoryId]) || DEFAULT_MSG;
  const title = msg.title[currentLang] || msg.title.ru;
  const stat = msg.stat[currentLang] || msg.stat.ru;

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
               animate={{ scaleY: [0.3, 1, 0.3] }}
               transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
               className="w-1.5 h-7 bg-[#1E40AF] rounded-full transform-gpu origin-center"
             />
             <motion.div 
               animate={{ scaleY: [0.3, 1, 0.3] }}
               transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
               className="w-1.5 h-7 bg-[#1D1D1F] rounded-full transform-gpu origin-center"
             />
             <motion.div 
               animate={{ scaleY: [0.3, 1, 0.3] }}
               transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
               className="w-1.5 h-7 bg-[#1E40AF] rounded-full transform-gpu origin-center"
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
            {title}
          </motion.h3>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[#86868B] text-[15px] leading-relaxed max-w-sm mx-auto"
          >
            <span className="font-medium text-[#1D1D1F]">🔬 </span>
            {stat}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};
