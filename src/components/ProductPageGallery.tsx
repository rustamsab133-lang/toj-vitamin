"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { Lang } from '@/lib/types';
import { ZoomIn, X, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductPageGalleryProps {
  images: string[];
  name: string;
  lang: Lang;
}

export const ProductPageGallery: React.FC<ProductPageGalleryProps> = ({ images, name, lang }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const galleryList = images && images.length > 0 ? images : [];
  const currentImage = galleryList[activeIndex] || galleryList[0] || '';

  const getAngleLabel = (idx: number) => {
    if (idx === 0) return lang === 'en' ? 'Front' : (lang === 'tj' ? 'Рӯ' : 'Лицо');
    if (idx === 1) return lang === 'en' ? 'Back side' : (lang === 'tj' ? 'Қафо' : 'Оборот');
    if (idx === 2) return lang === 'en' ? 'Nutritional facts' : (lang === 'tj' ? 'Ҷадвал' : 'Таблица');
    return `№${idx + 1}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Main Showcase Stage */}
      <div 
        onClick={() => currentImage && setIsZoomOpen(true)}
        className="relative group bg-white rounded-[40px] p-6 sm:p-8 md:p-10 shadow-[0_20px_40px_rgba(0,0,0,0.02)] border border-black/[0.04] flex flex-col items-center justify-center min-h-[360px] md:min-h-[440px] overflow-hidden cursor-zoom-in select-none"
        title={lang === 'en' ? 'Click to enlarge' : 'Нажмите, чтобы увеличить и прочитать состав'}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.01] pointer-events-none" />

        {currentImage ? (
          <div className="relative w-full h-[280px] md:h-[350px]">
            <Image
              key={currentImage}
              src={currentImage}
              alt={`${name} - ${getAngleLabel(activeIndex)}`}
              fill
              priority
              unoptimized
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-contain group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#94A3B8]">
            <ShoppingBag size={48} strokeWidth={1} />
            <span className="text-sm font-medium">
              {lang === 'en' ? 'Product image' : (lang === 'tj' ? 'Тасвири маҳсулот' : 'Изображение товара')}
            </span>
          </div>
        )}

        {/* Prev / Next Arrows */}
        {galleryList.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : galleryList.length - 1));
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-black/5 shadow-md text-slate-700 flex items-center justify-center hover:scale-110 active:scale-95 transition-all opacity-80 hover:opacity-100 z-20"
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(prev => (prev < galleryList.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-black/5 shadow-md text-slate-700 flex items-center justify-center hover:scale-110 active:scale-95 transition-all opacity-80 hover:opacity-100 z-20"
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Zoom In Badge */}
        {currentImage && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomOpen(true);
            }}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-sm border border-black/5 text-[#475569] hover:text-[#1E40AF] text-[11px] font-bold transition-all z-20 group-hover:scale-105"
          >
            <ZoomIn size={14} className="text-[#1E40AF]" />
            <span>{lang === 'en' ? 'Zoom' : 'Увеличить'}</span>
          </button>
        )}
      </div>

      {/* Thumbnails Navigator */}
      {galleryList.length > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {galleryList.map((imgUrl, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-[#1E40AF] text-white border-[#1E40AF] shadow-md shadow-blue-500/20 scale-105'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-black/5 hover:border-black/15 shadow-sm'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-[#1E40AF]'}`} />
                <span>{getAngleLabel(idx)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox / Zoom Modal */}
      <AnimatePresence>
        {isZoomOpen && currentImage && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl max-h-[92vh] w-full h-full flex flex-col items-center justify-center"
            >
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md transition-all z-50 shadow-lg"
              >
                <X size={24} />
              </button>

              <div className="relative w-full h-[72vh] sm:h-[78vh]">
                <Image
                  src={currentImage}
                  alt={`${name} - zoom`}
                  fill
                  unoptimized
                  className="object-contain drop-shadow-2xl"
                />
              </div>

              {galleryList.length > 1 && (
                <div className="flex items-center gap-2 mt-4 z-50 bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                  {galleryList.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeIndex === idx
                          ? 'bg-[#1E40AF] text-white shadow-lg'
                          : 'text-white/70 hover:text-white bg-white/10'
                      }`}
                    >
                      {getAngleLabel(idx)}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
