"use client";
import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Lang } from '@/lib/types';
import { ShieldCheck, Zap, Microscope, Activity, LucideIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface ScienceGridProps {
  lang: Lang;
}

interface Block {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  img: string;
}

const BentoCard = ({ block, className, isLarge = false }: { block: Block; className: string; isLarge?: boolean }) => {
  const Icon = block.icon;

  return (
    <div
      role="article"
      aria-label={block.title}
      className={`${className} relative group rounded-[40px] overflow-hidden bg-white border border-black/[0.05] shadow-sm hover:shadow-2xl transition-all duration-700 hover:scale-[1.01]`}
    >
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0">
          <Image 
            src={block.img} 
            fill 
            className={`${isLarge ? 'object-contain p-12' : 'object-cover'} opacity-90 group-hover:scale-110 transition-transform duration-1000 ease-out`} 
            alt="" 
          />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
      
      <div className="absolute bottom-10 left-10 right-10 z-20">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg border border-black/[0.02] group-hover:bg-[#1E40AF] group-hover:text-white transition-colors duration-500">
          <Icon size={isLarge ? 26 : 22} className="transition-colors" />
        </div>
        <h3 className={`${isLarge ? 'text-[28px] md:text-[34px]' : 'text-[22px]'} font-bold text-[#1D1D1F] mb-4 font-outfit group-hover:text-[#1E40AF] transition-colors`}>
          {block.title}
        </h3>
        <p className={`${isLarge ? 'text-[15px] md:text-[17px]' : 'text-[14px]'} text-[#1D1D1F]/60 font-medium leading-relaxed max-w-sm`}>
          {block.desc}
        </p>
      </div>
    </div>
  );
};

export const ScienceGrid: React.FC<ScienceGridProps> = ({ lang }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  const content = {
    ru: {
      title: "Наука за гранью возможного",
      subtitle: "Мы объединяем клиническую чистоту и передовые биотехнологии для достижения максимального результата.",
      blocks: [
        {
          id: 'lab',
          title: "Клиническая чистота",
          desc: "Собственные лаборатории и многоуровневый контроль качества каждого ингредиента.",
          icon: Microscope,
          img: "/assets/science/lab.png"
        },
        {
          id: 'synergy',
          title: "Молекулярная синергия",
          desc: "Формулы, где компоненты усиливают действие друг друга на клеточном уровне.",
          icon: Zap,
          img: "/assets/science/synergy.png"
        },
        {
          id: 'factory',
          title: "Стандарты будущего",
          desc: "Автоматизированное производство по стандартам GMP и ISO.",
          icon: ShieldCheck,
          img: "/assets/science/factory.png"
        }
      ]
    },
    tj: {
      title: "Илм дар марзи имкон",
      subtitle: "Мо тозагии клиникӣ ва биотехнологияҳои пешқадамро барои ба даст овардани натиҷаи максималӣ муттаҳид мекунем.",
      blocks: [
        {
          id: 'lab',
          title: "Тозагии клиникӣ",
          desc: "Лабораторияҳои шахсӣ ва назорати бисёрзинагии сифати ҳар як компонент.",
          icon: Microscope,
          img: "/assets/science/lab.png"
        },
        {
          id: 'synergy',
          title: "Синергияи молекулавӣ",
          desc: "Формулаҳое, ки дар онҳо ҷузъҳо таъсири якдигарро дар сатҳи ҳуҷайра тақвият медиҳанд.",
          icon: Zap,
          img: "/assets/science/synergy.png"
        },
        {
          id: 'factory',
          title: "Стандартҳои оянда",
          desc: "Истеҳсоли автоматикунонидашуда мувофиқи стандартҳои GMP ва ISO.",
          icon: ShieldCheck,
          img: "/assets/science/factory.png"
        }
      ]
    }
  };

  const t = content[lang] || content.ru;

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % t.blocks.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [t.blocks.length]);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <section className="w-full py-24 md:py-32 bg-[#FDFBF7] relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#1E40AF]/[0.02] to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-[radial-gradient(circle_at_bottom_left,_#1E40AF08_0%,_transparent_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6">
        {/* HEADER */}
        <div className="max-w-3xl mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="h-px w-12 bg-[#1D1D1F]/20" />
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-[#1E40AF]">THE SCIENCE</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-[36px] md:text-[56px] font-bold tracking-tight text-[#1D1D1F] leading-[1.1] mb-8 font-outfit"
          >
            {t.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-[18px] md:text-[22px] text-[#1D1D1F]/60 max-w-2xl font-medium leading-relaxed"
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* DESKTOP GRID (Hidden on mobile) */}
        <div className="hidden md:grid grid-cols-3 gap-8">
          {t.blocks.map((block) => (
            <BentoCard 
              key={block.id} 
              block={block} 
              className="h-[500px]" 
            />
          ))}
        </div>

        {/* MOBILE SLIDER (Hidden on desktop) */}
        <div className="md:hidden relative min-h-[520px]">
          <div className="relative h-[500px] w-full">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.4 }
                }}
                className="absolute inset-0"
              >
                <BentoCard 
                  block={t.blocks[currentIndex]} 
                  className="h-full w-full" 
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* SLIDER CONTROLS (Pagination Dots) */}
          <div className="flex justify-center gap-3 mt-8">
            {t.blocks.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                className={`group relative h-1.5 transition-all duration-500 rounded-full overflow-hidden ${
                  idx === currentIndex ? 'w-10 bg-[#1E40AF]' : 'w-2 bg-[#1D1D1F]/10 hover:bg-[#1D1D1F]/20'
                }`}
              >
                {idx === currentIndex && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute inset-0 bg-[#1E40AF]"
                    initial={false}
                  />
                )}
              </button>
            ))}
          </div>
          
          {/* HINT FOR SWIPE */}
          <div className="text-center mt-4">
             <span className="text-[10px] font-bold text-[#1D1D1F]/20 uppercase tracking-[0.2em]">Автоматическое переключение</span>
          </div>
        </div>
      </div>
    </section>
  );
};
