"use client";
import React, { useMemo } from 'react';
import { useThemeStore } from '@/store/useTheme';
import { ZONE_THEMES } from '@/lib/theme';

export const MainBackground: React.FC = () => {
  const activeZone = useThemeStore(state => state.activeZone);
  const currentTheme = useMemo(() => ZONE_THEMES[activeZone] || ZONE_THEMES.default, [activeZone]);

  return (
    <div
      className="fixed inset-0 -z-[100] pointer-events-none"
      style={{
        backgroundColor: currentTheme.bg,
        transition: 'background-color 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}
    />
  );
};
