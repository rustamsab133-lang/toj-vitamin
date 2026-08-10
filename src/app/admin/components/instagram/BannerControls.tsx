"use client";
import React from 'react';
import { BannerConfig, BannerProduct } from '@/lib/types/banner';
import { Layout, Palette, Sparkles, Trash2, AlignLeft, Type } from 'lucide-react';

interface BannerControlsProps {
  config: BannerConfig;
  onChange: (config: BannerConfig) => void;
  disabled: boolean;
  onRegenerate?: () => void;
}

export function BannerControls({
  config,
  onChange,
  disabled,
  onRegenerate,
}: BannerControlsProps) {
  
  const updateConfig = (updates: Partial<BannerConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleRemoveProduct = (productId: string) => {
    const updatedProducts = config.products.filter(p => p.id !== productId);
    updateConfig({ products: updatedProducts });
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-5 space-y-6 text-slate-100 select-none">
      
      {/* 1. Соотношение сторон */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <Layout size={13} className="text-fuchsia-500" /> Соотношение сторон
        </h4>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: '9:16', value: '9:16', desc: 'Stories' },
            { label: '4:5', value: '4:5', desc: 'Лента' },
            { label: '1:1', value: '1:1', desc: 'Квадрат' },
            { label: '16:9', value: '16:9', desc: 'Широкий' },
          ].map(r => (
            <button
              key={r.value}
              disabled={disabled}
              onClick={() => updateConfig({ aspectRatio: r.value as any })}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg border transition-all ${
                (config.aspectRatio || '9:16') === r.value
                  ? 'border-fuchsia-500 bg-fuchsia-950/30 text-fuchsia-400 shadow-inner'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="text-[9px] font-black">{r.label}</span>
              <span className="text-[7px] text-slate-500 font-semibold">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Стиль ИИ-генерации */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <Palette size={13} className="text-fuchsia-500" /> Стиль ИИ-генерации
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '💎 Luxury Spa', value: 'luxury_spa' },
            { label: '⚡ Sport Energy', value: 'sport_energy' },
            { label: '🔬 Clinical Science', value: 'clinical_science' },
            { label: '📰 Editorial', value: 'editorial_magazine' },
          ].map(style => (
            <button
              key={style.value}
              disabled={disabled}
              onClick={() => updateConfig({ stylePreset: style.value as any })}
              className={`py-2 px-1 rounded-lg border text-[10px] font-black transition-all text-center ${
                config.stylePreset === style.value 
                  ? 'border-fuchsia-500 bg-fuchsia-950/30 text-fuchsia-400 shadow-inner' 
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Текст на баннере */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <Type size={13} className="text-fuchsia-500" /> Текст на баннере
        </h4>
        <div className="space-y-2">
          <div>
            <label className="text-[9px] text-slate-400 block mb-1">Основной заголовок (RU)</label>
            <input
              type="text"
              disabled={disabled}
              value={config.headline}
              onChange={(e) => updateConfig({ headline: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-fuchsia-500"
              placeholder="Введите заголовок баннера..."
            />
          </div>
          <div>
            <label className="text-[9px] text-slate-400 block mb-1">Подзаголовок / Бренд</label>
            <input
              type="text"
              disabled={disabled}
              value={config.subtitle}
              onChange={(e) => updateConfig({ subtitle: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-fuchsia-500"
              placeholder="TOJ-VITAMIN"
            />
          </div>
        </div>
      </div>

      {/* 4. Промпт для ИИ-генератора */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <AlignLeft size={13} className="text-fuchsia-500" /> Промпт для Nano Banana (EN)
        </h4>
        <textarea
          disabled={disabled}
          value={config.imagePrompt}
          onChange={(e) => updateConfig({ imagePrompt: e.target.value })}
          rows={5}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-fuchsia-500 font-mono leading-normal resize-none"
          placeholder="Опишите сцену для генерации изображения на английском..."
        />
        <p className="text-[9px] text-slate-500 leading-normal">
          💡 Вы можете отредактировать этот промпт вручную и нажать «Сгенерировать баннер» для точечного изменения фона, света или окружения.
        </p>
      </div>

      {/* 5. Выбранные продукты */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <Sparkles size={13} className="text-fuchsia-500" /> Продукты на баннере
        </h4>
        {config.products.length > 0 ? (
          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
            {config.products.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2 bg-slate-950/40 rounded-xl border border-slate-800 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <img src={p.image_url} alt={p.name} className="w-8 h-8 object-contain shrink-0 bg-slate-900 rounded p-0.5" />
                  <span className="text-[10px] font-bold text-slate-300 truncate">{p.name}</span>
                </div>
                <button
                  disabled={disabled}
                  onClick={() => handleRemoveProduct(p.id)}
                  className="p-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-lg border border-red-900/30 transition-colors shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[9px] text-slate-500 italic text-center py-2">
            Продукты не выбраны
          </p>
        )}
      </div>

      {/* Кнопка генерации */}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={disabled || !config.imagePrompt || config.products.length === 0}
          className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-fuchsia-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Sparkles size={12} />
          Сгенерировать ИИ-баннер
        </button>
      )}

    </div>
  );
}
