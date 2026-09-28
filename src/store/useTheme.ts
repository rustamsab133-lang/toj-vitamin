"use client";
import { create } from 'zustand';

export type MainBlock = 'catalog' | 'synergy' | 'combos' | 'science';

interface ThemeState {
  activeZone: string;
  setActiveZone: (zone: string) => void;
  search: string;
  setSearch: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isQuizOpen: boolean;
  setIsQuizOpen: (open: boolean) => void;
  activeBlock: MainBlock;
  setActiveBlock: (block: MainBlock) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  activeZone: 'default',
  setActiveZone: (zone) => set({ activeZone: zone }),
  search: '',
  setSearch: (query) => set({ search: query }),
  isSearchOpen: false,
  setIsSearchOpen: (open) => set({ isSearchOpen: open }),
  isQuizOpen: false,
  setIsQuizOpen: (open) => set({ isQuizOpen: open }),
  activeBlock: 'catalog',
  setActiveBlock: (block) => set({ activeBlock: block }),
}));
