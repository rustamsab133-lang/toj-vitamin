"use client";
import React from 'react';
import { Lang } from '@/lib/types';
import { ShieldCheck, Zap, Microscope } from 'lucide-react';

interface ScienceGridProps {
  lang: Lang;
}

export const ScienceGrid: React.FC<ScienceGridProps> = ({ lang }) => {
  const items = lang === 'ru' ? [
    { icon: Microscope, title: 'Клиническая чистота', desc: 'Многоуровневый контроль качества' },
    { icon: Zap, title: 'Молекулярная синергия', desc: 'Компоненты усиливают друг друга' },
    { icon: ShieldCheck, title: 'Стандарты GMP и ISO', desc: 'Автоматизированное производство' },
  ] : [
    { icon: Microscope, title: 'Тозагии клиникӣ', desc: 'Назорати бисёрзинагии сифат' },
    { icon: Zap, title: 'Синергияи молекулавӣ', desc: 'Ҷузъҳо таъсири якдигарро тақвият медиҳанд' },
    { icon: ShieldCheck, title: 'Стандартҳои GMP ва ISO', desc: 'Истеҳсоли автоматикунонидашуда' },
  ];

  return (
    <section className="w-full py-12 bg-[#FDFBF7] relative">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-4 p-5 rounded-2xl bg-white/80 border border-black/[0.04] shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-[#1E40AF]/5 flex items-center justify-center flex-shrink-0">
                  <Icon size={22} className="text-[#1E40AF]" />
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#1D1D1F] font-outfit">{item.title}</h3>
                  <p className="text-[12px] text-[#1D1D1F]/50 mt-0.5">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
