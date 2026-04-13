"use client";
import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';
import { Lang } from '@/lib/types';
import { ShieldCheck, Zap, Microscope, Activity, LucideIcon } from 'lucide-react';

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
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["4deg", "-4deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-4deg", "4deg"]);

  const imgX = useTransform(mouseXSpring, [-0.5, 0.5], [15, -15]);
  const imgY = useTransform(mouseYSpring, [-0.5, 0.5], [15, -15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const Icon = block.icon;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`${className} relative group rounded-[40px] overflow-hidden bg-white border border-black/[0.05] shadow-sm hover:shadow-2xl transition-shadow duration-700`}
    >
      <div 
        style={{
          transform: "translateZ(20px)",
          transformStyle: "preserve-3d",
        }}
        className="absolute inset-0 z-0 overflow-hidden"
      >
        <motion.div
          style={{
            x: imgX,
            y: imgY,
          }}
          className="absolute inset-0"
        >
          <Image 
            src={block.img} 
            fill 
            className={`${isLarge ? 'object-contain p-12' : 'object-cover'} opacity-90 group-hover:scale-105 transition-transform duration-700 ease-out`} 
            alt="" 
          />
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
      
      <div 
        style={{ transform: "translateZ(40px)" }}
        className="absolute bottom-10 left-10 right-10 z-20"
      >
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
    </motion.div>
  );
};

export const ScienceGrid: React.FC<ScienceGridProps> = ({ lang }) => {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  return (
    <section className="w-full py-24 md:py-32 bg-[#FDFBF7] relative overflow-hidden">
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
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-[36px] md:text-[56px] font-bold tracking-tight text-[#1D1D1F] leading-[1.1] mb-8 font-outfit"
          >
            {t.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-[18px] md:text-[22px] text-[#1D1D1F]/60 max-w-2xl font-medium leading-relaxed"
          >
            {t.subtitle}
          </motion.p>
        </div>

        {/* BENTO GRID */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-6 md:auto-rows-[340px]"
        >
          <BentoCard block={t.blocks[0]} className="md:col-span-7 md:row-span-2 min-h-[400px] md:min-h-0" isLarge />
          <BentoCard block={t.blocks[1]} className="md:col-span-5 md:col-start-8 min-h-[300px] md:min-h-0" />
          <BentoCard block={t.blocks[2]} className="md:col-span-5 md:col-start-8 min-h-[300px] md:min-h-0" />

        </motion.div>
      </div>
    </section>
  );
};
