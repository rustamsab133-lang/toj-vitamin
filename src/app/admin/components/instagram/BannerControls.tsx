"use client";
import React from 'react';
import { BannerConfig, BANNER_THEMES } from '@/lib/types/banner';
import { Type, Image as ImageIcon, Layout, Palette } from 'lucide-react';

interface BannerControlsProps {
  config: BannerConfig;
  onChange: (config: BannerConfig) => void;
  disabled: boolean;
}

export function BannerControls({ config, onChange, disabled }: BannerControlsProps) {
  
  const updateConfig = (updates: Partial<BannerConfig>) => {
    onChange({ ...config, ...updates });
  };

  const applyTheme = (themeKey: string) => {
    const theme = BANNER_THEMES[themeKey];
    if (theme) {
      updateConfig({
        bgColor: theme.bgColor,
        textPrimary: theme.textPrimary,
        textSecondary: theme.textSecondary,
        accentColor: theme.accentColor,
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-6">
      
      {/* 1. Темы */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
          <Palette size={14} className="text-fuchsia-500" /> Цветовые Темы
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(BANNER_THEMES).map(([key, theme]) => (
            <button
              key={key}
              disabled={disabled}
              onClick={() => applyTheme(key)}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg border text-[10px] font-bold transition-all ${config.bgColor === theme.bgColor ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <span>{theme.emoji}</span>
              <span className="truncate">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Настройки Фото */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
          <ImageIcon size={14} className="text-fuchsia-500" /> Фото товаров
        </h4>
        
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-slate-500">
            <span>Размер</span>
            <span>{config.photoSize}px</span>
          </div>
          <input
            type="range"
            min="300"
            max="600"
            step="10"
            value={config.photoSize}
            onChange={(e) => updateConfig({ photoSize: Number(e.target.value) })}
            disabled={disabled}
            className="w-full accent-fuchsia-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-slate-500">
            <span>Наклон</span>
            <span>{config.photoAngle}°</span>
          </div>
          <input
            type="range"
            min="-20"
            max="20"
            step="1"
            value={config.photoAngle}
            onChange={(e) => updateConfig({ photoAngle: Number(e.target.value) })}
            disabled={disabled}
            className="w-full accent-fuchsia-500"
          />
        </div>
      </div>

      {/* 3. Типографика */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
          <Type size={14} className="text-fuchsia-500" /> Текст
        </h4>
        
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-slate-500">
            <span>Размер заголовка</span>
            <span>{config.fontSize}px</span>
          </div>
          <input
            type="range"
            min="40"
            max="90"
            step="2"
            value={config.fontSize}
            onChange={(e) => updateConfig({ fontSize: Number(e.target.value) })}
            disabled={disabled}
            className="w-full accent-fuchsia-500"
          />
        </div>
      </div>

      {/* 4. Расположение */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
          <Layout size={14} className="text-fuchsia-500" /> Расположение
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateConfig({ textPosition: 'top' })}
            disabled={disabled}
            className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold transition-all ${config.textPosition === 'top' ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Текст Сверху
          </button>
          <button
            onClick={() => updateConfig({ textPosition: 'bottom' })}
            disabled={disabled}
            className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold transition-all ${config.textPosition === 'bottom' ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            Текст Снизу
          </button>
        </div>
      </div>

    </div>
  );
}
