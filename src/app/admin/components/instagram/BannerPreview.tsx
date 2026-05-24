"use client";
import React from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { BannerConfig } from '@/lib/types/banner';

interface BannerPreviewProps {
  bannerUrl: string | null;
  config: BannerConfig;
  onCopyCaption: () => void;
  copied: boolean;
}

export function BannerPreview({ bannerUrl, config, onCopyCaption, copied }: BannerPreviewProps) {
  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col h-full">
      {/* Шапка превью */}
      <div className="px-4 py-3 bg-slate-950 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /></div>
          <div className="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /></div>
          <span className="ml-2 text-xs font-mono text-slate-500">1080x1920 (9:16)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCopyCaption}
            disabled={!config.caption}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Текст скопирован' : 'Копировать пост'}
          </button>
          
          <a
            href={bannerUrl || '#'}
            download="tojvitamin-banner.jpg"
            className={`flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-[10px] font-bold rounded-lg transition-colors ${!bannerUrl ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
          >
            <Download size={12} /> Скачать JPG
          </a>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-y-auto md:overflow-hidden min-h-0">
        {/* Баннер */}
        <div className="w-full max-w-[220px] md:max-w-none md:h-full md:max-h-[600px] shrink-0 aspect-[9/16] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center relative mx-auto">
          {bannerUrl ? (
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="text-slate-600 text-xs font-mono text-center px-4">
              <p>Нет изображения</p>
              <p className="opacity-50 mt-1">Отправьте запрос агенту для генерации</p>
            </div>
          )}
        </div>

        {/* Текст поста (Caption) */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 overflow-y-auto min-h-[150px] md:min-h-0">
            {config.caption ? (
              <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                {config.caption}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">
                Текст поста появится здесь
              </div>
            )}
          </div>
          
          {/* Инфо о товарах */}
          {config.products.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {config.products.map(p => (
                <div key={p.id} className="flex items-center gap-2 bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-700 max-w-full">
                  <img src={p.image_url} alt={p.name} className="w-6 h-6 object-contain shrink-0" />
                  <span className="text-[10px] font-bold text-slate-300 truncate">{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
