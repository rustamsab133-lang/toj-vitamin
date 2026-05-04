"use client";
import React from 'react';
import { useThemeStore } from '@/store/useTheme';
import { ZONE_THEMES } from '@/lib/theme';

export const BackgroundGlow: React.FC = () => {
  const activeZone = useThemeStore(state => state.activeZone);
  const currentTheme = ZONE_THEMES[activeZone] || ZONE_THEMES.default;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 transition-colors duration-[1500ms] ease-in-out opacity-60"
      style={{
        background: `radial-gradient(circle at center top, ${currentTheme.glow} 0%, transparent 70%)`,
        willChange: 'background',
      }}
    />
  );
};
