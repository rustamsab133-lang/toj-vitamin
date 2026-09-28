"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Dna, Sparkles, Microscope } from 'lucide-react';
import { useThemeStore, MainBlock } from '@/store/useTheme';
import { Lang } from '@/lib/types';

interface MainBlockSwitcherProps {
  lang: Lang;
  className?: string;
}

interface BlockItem {
  id: MainBlock;
  icon: React.ComponentType<any>;
  label: Record<Lang, string>;
  badge?: Record<Lang, string>;
}

const BLOCKS: BlockItem[] = [
  {
    id: 'catalog',
    icon: ShoppingBag,
    label: {
      ru: 'Каталог',
      tj: 'Каталог',
      en: 'Catalog'
    }
  },
  {
    id: 'synergy',
    icon: Dna,
    label: {
      ru: 'Подобрать синергию',
      tj: 'Интихоби синергия',
      en: 'Match Synergy'
    },
    badge: {
      ru: '1+1=3',
      tj: '1+1=3',
      en: '1+1=3'
    }
  },
  {
    id: 'combos',
    icon: Sparkles,
    label: {
      ru: 'Готовые сеты',
      tj: 'Маҷмӯаҳо',
      en: 'Combo Stacks'
    }
  },
  {
    id: 'science',
    icon: Microscope,
    label: {
      ru: 'О науке',
      tj: 'Дар бораи илм',
      en: 'Science'
    }
  }
];

export const MainBlockSwitcher: React.FC<MainBlockSwitcherProps> = ({ lang, className = '' }) => {
  const activeBlock = useThemeStore(state => state.activeBlock);
  const setActiveBlock = useThemeStore(state => state.setActiveBlock);

  const handleSelect = (id: MainBlock) => {
    setActiveBlock(id);
    if (typeof window !== 'undefined') {
      const hash = id === 'synergy' ? '#quiz' : ('#' + id);
      window.history.replaceState(null, '', hash);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(10);
      }
    }
  };

  return (
    <div className={'w-full max-w-4xl mx-auto px-4 ' + className}>
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar py-1.5 px-2 bg-white/80 backdrop-blur-xl border border-black/[0.06] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] gap-1 sm:gap-2">
        {BLOCKS.map(block => {
          const Icon = block.icon;
          const isActive = activeBlock === block.id;

          return (
            <button
              key={block.id}
              onClick={() => handleSelect(block.id)}
              className={'relative flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-[13px] font-bold transition-all whitespace-nowrap select-none shrink-0 ' + (
                isActive
                  ? 'text-white'
                  : 'text-[#1D1D1F]/70 hover:text-[#1D1D1F] hover:bg-black/[0.03]'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBlockPill"
                  className="absolute inset-0 bg-[#1D1D1F] rounded-full shadow-md z-0"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}

              <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                <Icon
                  size={15}
                  className={isActive ? 'text-blue-400' : 'text-[#1D1D1F]/50'}
                />
                <span className="font-outfit font-semibold tracking-wide">
                  {block.label[lang] || block.label.ru}
                </span>

                {block.badge && (
                  <span
                    className={'text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full tracking-wider ' + (
                      isActive
                        ? 'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                        : 'bg-black/[0.05] text-[#1E40AF]'
                    )}
                  >
                    {block.badge[lang] || block.badge.ru}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
