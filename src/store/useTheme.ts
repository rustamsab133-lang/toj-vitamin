"use client";
import { create } from 'zustand';

interface ThemeState {
  activeZone: string;
  setActiveZone: (zone: string) => void;
  search: string;
  setSearch: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  activeZone: 'default',
  setActiveZone: (zone) => set({ activeZone: zone }),
  search: '',
  setSearch: (query) => set({ search: query }),
  isSearchOpen: false,
  setIsSearchOpen: (open) => set({ isSearchOpen: open }),
}));
