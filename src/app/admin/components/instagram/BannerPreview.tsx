"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Download, Copy, Check, RotateCw, Plus, Minus, Move, Layers, Trash2, RefreshCw } from 'lucide-react';
import { BannerConfig, BannerProduct } from '@/lib/types/banner';

interface BannerPreviewProps {
  bannerUrl: string | null;
  config: BannerConfig;
  onCopyCaption: () => void;
  copied: boolean;
  onChange?: (config: BannerConfig) => void;
}

interface DragState {
  productId: string;
  startX: number;
  startY: number;
  startPercentX: number;
  startPercentY: number;
}

export function BannerPreview({ bannerUrl, config, onCopyCaption, copied, onChange }: BannerPreviewProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [dragTrigger, setDragTrigger] = useState(0); // to trigger state update during drag

  // Load Google Montserrat Font in client
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Calculate default position for products if not customized
  const getDefaultCoords = (index: number, total: number, layout: 'center' | 'duo' | 'pyramid', textPosition: 'top' | 'bottom') => {
    // base X and Y in percentages
    let x = 50;
    let y = 60; // centered in bottom half by default
    let scale = 1.0;
    let rotation = 0;

    // Shift Y if text is at the bottom
    if (textPosition === 'bottom') {
      y = 35; // centered in top half
    }

    if (total === 1 || layout === 'center') {
      if (total === 2) {
        const gap = 24;
        x = index === 0 ? 50 - gap : 50 + gap;
        scale = 0.85;
        rotation = index === 0 ? -6 : 6;
      } else if (total === 3) {
        const gap = 26;
        x = index === 0 ? 50 - gap : index === 2 ? 50 + gap : 50;
        scale = index === 1 ? 0.9 : 0.75;
        rotation = index === 0 ? -10 : index === 2 ? 10 : 0;
        y = index === 1 ? y + 2 : y;
      }
    } else if (layout === 'duo') {
      if (index === 0) {
        x = 35;
        y = textPosition === 'bottom' ? 32 : 57;
        scale = 0.85;
        rotation = -8;
      } else {
        x = 62;
        y = textPosition === 'bottom' ? 36 : 61;
        scale = 1.0;
        rotation = 8;
      }
    } else if (layout === 'pyramid') {
      if (index === 0) {
        x = 28;
        y = textPosition === 'bottom' ? 38 : 63;
        scale = 0.8;
        rotation = -10;
      } else if (index === 1) {
        x = 72;
        y = textPosition === 'bottom' ? 38 : 63;
        scale = 0.8;
        rotation = 10;
      } else {
        x = 50;
        y = textPosition === 'bottom' ? 28 : 53;
        scale = 1.0;
        rotation = 0;
      }
    }

    return { x, y, scale, rotation };
  };

  // Helper to get fully resolved product coordinates
  const getProductResolvedCoords = (p: BannerProduct, index: number) => {
    const total = config.products.length;
    const defaults = getDefaultCoords(index, total, config.photoLayout, config.textPosition);
    
    // Scale baseline: global photoSize / 420.
    const globalScale = config.photoSize / 420;

    return {
      x: p.x !== undefined ? p.x : defaults.x,
      y: p.y !== undefined ? p.y : defaults.y,
      scale: p.scale !== undefined ? p.scale : (defaults.scale * globalScale),
      rotation: p.rotation !== undefined ? p.rotation : (defaults.rotation + config.photoAngle),
    };
  };

  // Handle Drag Start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, p: BannerProduct, index: number) => {
    e.preventDefault();
    setSelectedProductId(p.id);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const coords = getProductResolvedCoords(p, index);

    dragStateRef.current = {
      productId: p.id,
      startX: clientX,
      startY: clientY,
      startPercentX: coords.x,
      startPercentY: coords.y,
    };

    // Attach listeners
    if ('touches' in e) {
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    } else {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }
  };

  // Handle Drag Move
  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    const state = dragStateRef.current;
    if (!state || !canvasRef.current || !onChange) return;

    // Prevent scrolling on mobile while dragging
    if (e.cancelable) e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = clientX - state.startX;
    const deltaY = clientY - state.startY;

    // Convert pixel delta to percentage of canvas bounds
    const percentDeltaX = (deltaX / rect.width) * 100;
    const percentDeltaY = (deltaY / rect.height) * 100;

    const newX = Math.max(0, Math.min(100, state.startPercentX + percentDeltaX));
    const newY = Math.max(0, Math.min(100, state.startPercentY + percentDeltaY));

    const updatedProducts = config.products.map((p, idx) => {
      if (p.id === state.productId) {
        const resolved = getProductResolvedCoords(p, idx);
        return {
          ...p,
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          scale: p.scale !== undefined ? p.scale : resolved.scale,
          rotation: p.rotation !== undefined ? p.rotation : resolved.rotation,
        };
      }
      return p;
    });

    onChange({
      ...config,
      products: updatedProducts
    });
    setDragTrigger(prev => prev + 1);
  };

  // Handle Drag End
  const handleDragEnd = () => {
    dragStateRef.current = null;
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchmove', handleDragMove);
    window.removeEventListener('touchend', handleDragEnd);
  };

  // Canvas Actions
  const handleScaleChange = (factor: number) => {
    if (!selectedProductId || !onChange) return;
    const updatedProducts = config.products.map((p, idx) => {
      if (p.id === selectedProductId) {
        const coords = getProductResolvedCoords(p, idx);
        const newScale = Math.max(0.3, Math.min(2.5, coords.scale + factor));
        return {
          ...p,
          x: coords.x,
          y: coords.y,
          scale: Math.round(newScale * 100) / 100,
          rotation: coords.rotation,
        };
      }
      return p;
    });
    onChange({ ...config, products: updatedProducts });
  };

  const handleRotationChange = (angle: number) => {
    if (!selectedProductId || !onChange) return;
    const updatedProducts = config.products.map((p, idx) => {
      if (p.id === selectedProductId) {
        const coords = getProductResolvedCoords(p, idx);
        let newRot = (coords.rotation + angle) % 360;
        if (newRot > 180) newRot -= 360;
        if (newRot < -180) newRot += 360;
        return {
          ...p,
          x: coords.x,
          y: coords.y,
          scale: coords.scale,
          rotation: newRot,
        };
      }
      return p;
    });
    onChange({ ...config, products: updatedProducts });
  };

  const handleBringToFront = () => {
    if (!selectedProductId || !onChange) return;
    const activeProduct = config.products.find(p => p.id === selectedProductId);
    if (!activeProduct) return;
    // Reorder array to put active product last (renders on top)
    const otherProducts = config.products.filter(p => p.id !== selectedProductId);
    onChange({
      ...config,
      products: [...otherProducts, activeProduct]
    });
  };

  const handleRemoveProduct = () => {
    if (!selectedProductId || !onChange) return;
    onChange({
      ...config,
      products: config.products.filter(p => p.id !== selectedProductId)
    });
    setSelectedProductId(null);
  };

  const handleResetPositions = () => {
    if (!onChange) return;
    const resetProducts = config.products.map(p => ({
      id: p.id,
      name: p.name,
      image_url: p.image_url,
      synergy_reason: p.synergy_reason,
    }));
    onChange({
      ...config,
      products: resetProducts
    });
    setSelectedProductId(null);
  };

  // Typographic calculations for layout rendering
  const headlineLines = (config.headline || '').trim().toUpperCase().split(/\s+/);
  const splitIntoLines = (words: string[], limit = 16) => {
    const lines: string[] = [];
    let current: string[] = [];
    words.forEach(w => {
      if (current.join(' ').length + w.length > limit) {
        lines.push(current.join(' '));
        current = [w];
      } else {
        current.push(w);
      }
    });
    if (current.length) lines.push(current.join(' '));
    return lines;
  };
  const processedLines = splitIntoLines(headlineLines, Math.max(10, Math.round(180 / (config.fontSize * 0.1))));

  // Inline headline editing
  const handleHeadlineChange = (e: React.FormEvent<HTMLDivElement>) => {
    if (!onChange) return;
    onChange({
      ...config,
      headline: e.currentTarget.innerText
    });
  };

  // High-Resolution Export
  const triggerDownload = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context');

      // 1. Draw solid background
      ctx.fillStyle = config.bgColor;
      ctx.fillRect(0, 0, 1080, 1920);

      // Ensure fonts loaded
      try {
        await document.fonts.load(`${config.fontSize}px Montserrat`);
      } catch (err) {
        console.warn('Montserrat font load timed out, using system font fallback');
      }

      // Coordinates setup
      const textStartY = config.textPosition === 'bottom' ? 1400 : 120;
      
      // 2. Draw brand subtitle
      ctx.fillStyle = config.textSecondary;
      ctx.font = '600 24px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.letterSpacing = '8px';
      ctx.fillText((config.subtitle || 'TOJ-VITAMIN').toUpperCase(), 540, textStartY);
      ctx.letterSpacing = '0px';

      // 3. Draw Headline Lines
      ctx.fillStyle = config.textPrimary;
      ctx.font = `bold ${config.fontSize}px Montserrat, sans-serif`;
      ctx.textBaseline = 'top';
      
      const headlineStartY = textStartY + 70;
      processedLines.forEach((line, i) => {
        const y = headlineStartY + i * (config.fontSize + 12);
        ctx.fillText(line, 540, y);
      });

      // 4. Draw Accent Divider
      const accentLineY = headlineStartY + processedLines.length * (config.fontSize + 12) + 20;
      ctx.strokeStyle = config.accentColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(440, accentLineY);
      ctx.lineTo(640, accentLineY);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // 5. Draw Subtext/Caption subtitle
      ctx.fillStyle = config.textSecondary;
      ctx.font = '500 22px Montserrat, sans-serif';
      ctx.fillText('Синергетическая связка витаминов', 540, accentLineY + 40);

      // 6. Draw Products
      for (let i = 0; i < config.products.length; i++) {
        const p = config.products[i];
        const coords = getProductResolvedCoords(p, i);
        
        // Convert percentage coordinates to 1080x1920 pixels
        const pX = (coords.x / 100) * 1080;
        const pY = (coords.y / 100) * 1920;

        // Size based on scale
        const size = 420 * coords.scale;

        const img = new Image();
        img.crossOrigin = 'anonymous'; // critical for bucket CORS
        img.src = p.image_url;

        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => {
            console.error('Failed to load image for canvas export:', p.image_url);
            resolve(); // proceed anyway
          };
        });

        // Draw with rotation centered
        ctx.save();
        ctx.translate(pX, pY);
        ctx.rotate((coords.rotation * Math.PI) / 180);
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();
      }

      // Convert to JPG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      // Trigger native download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `tojvitamin-post-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Ошибка при генерации изображения высокого разрешения. Попробуйте еще раз.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col h-full select-none">
      {/* Шапка превью */}
      <div className="px-4 py-3 bg-slate-950 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /></div>
          <div className="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /></div>
          <span className="ml-2 text-xs font-mono text-slate-500">Интерактивный Холст ИИ</span>
        </div>
        
        <div className="flex items-center gap-2">
          {config.products.some(p => p.x !== undefined) && (
            <button
              onClick={handleResetPositions}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-colors"
              title="Сбросить все продукты в шаблон"
            >
              <RefreshCw size={11} /> Шаблон
            </button>
          )}

          <button
            onClick={onCopyCaption}
            disabled={!config.caption}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Текст скопирован' : 'Копировать пост'}
          </button>
          
          <button
            onClick={triggerDownload}
            disabled={isExporting || config.products.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors shadow-md shadow-fuchsia-600/20 disabled:opacity-50"
          >
            {isExporting ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" /> : <Download size={12} />}
            {isExporting ? 'Сборка JPG...' : 'Скачать JPG'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-y-auto md:overflow-hidden min-h-0">
        
        {/* Интерактивный холст 9:16 */}
        <div 
          ref={canvasRef}
          onClick={() => setSelectedProductId(null)}
          className="w-full max-w-[280px] md:max-w-none md:h-full md:max-h-[600px] shrink-0 aspect-[9/16] rounded-xl overflow-hidden shadow-2xl relative mx-auto group border border-slate-800"
          style={{ backgroundColor: config.bgColor }}
        >
          {/* Инъекция шрифта Montserrat для Canvas */}
          <div style={{ fontFamily: "'Montserrat', sans-serif" }} className="w-full h-full relative flex flex-col justify-between p-8 overflow-hidden">
            
            {/* Текстовый блок (Вверху или Внизу) */}
            <div 
              className={`w-full flex flex-col items-center select-text z-10 transition-all ${
                config.textPosition === 'bottom' ? 'order-last mt-auto' : 'order-first mb-auto'
              }`}
            >
              {/* Бренд */}
              <div 
                className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-center mb-4 transition-colors"
                style={{ color: config.textSecondary }}
              >
                {config.subtitle || 'TOJ-VITAMIN'}
              </div>

              {/* Заголовок с inline редактированием */}
              <div 
                contentEditable
                suppressContentEditableWarning
                onBlur={handleHeadlineChange}
                className="text-center font-black uppercase leading-tight outline-none focus:ring-1 focus:ring-fuchsia-500/30 rounded px-1 transition-all"
                style={{ 
                  color: config.textPrimary,
                  fontSize: `${config.fontSize * 0.4}px`, // scaled for preview
                }}
                title="Нажмите для редактирования заголовка"
              >
                {config.headline || 'НОВЫЙ ЗАГОЛОВОК'}
              </div>

              {/* Акцентная линия */}
              <div 
                className="w-1/3 h-[2px] my-4 rounded opacity-60 transition-colors"
                style={{ backgroundColor: config.accentColor }}
              />

              {/* Подзаголовок */}
              <div 
                className="text-[9px] font-medium text-center transition-colors"
                style={{ color: config.textSecondary }}
              >
                Синергетическая связка витаминов
              </div>
            </div>

            {/* Продукты (Интерактивные Слои) */}
            {config.products.map((p, index) => {
              const coords = getProductResolvedCoords(p, index);
              const isSelected = selectedProductId === p.id;
              
              // Preview size relative to percentage width
              const widthPercent = (420 / 1080) * 100 * coords.scale;

              return (
                <div
                  key={p.id}
                  onMouseDown={(e) => handleDragStart(e, p, index)}
                  onTouchStart={(e) => handleDragStart(e, p, index)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProductId(p.id);
                  }}
                  className={`absolute cursor-grab active:cursor-grabbing transition-shadow ${
                    isSelected ? 'ring-2 ring-fuchsia-500 ring-offset-2 ring-offset-slate-900 rounded-lg z-30 shadow-xl' : 'hover:scale-[1.02] z-20'
                  }`}
                  style={{
                    left: `${coords.x}%`,
                    top: `${coords.y}%`,
                    width: `${widthPercent}%`,
                    aspectRatio: '1',
                    transform: `translate(-50%, -50%) rotate(${coords.rotation}deg)`,
                  }}
                >
                  <img 
                    src={p.image_url} 
                    alt={p.name} 
                    className="w-full h-full object-contain pointer-events-none drop-shadow-md select-none"
                    draggable={false}
                  />

                  {/* Внутри-холстовые кнопки управления для выбранного товара */}
                  {isSelected && (
                    <div 
                      className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur border border-slate-800 rounded-lg p-1 shadow-2xl flex items-center gap-1.5 z-50 text-white transform scale-90"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button 
                        onClick={() => handleScaleChange(0.05)}
                        className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-300 hover:text-white"
                        title="Увеличить"
                      >
                        <Plus size={12} />
                      </button>
                      <button 
                        onClick={() => handleScaleChange(-0.05)}
                        className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-300 hover:text-white"
                        title="Уменьшить"
                      >
                        <Minus size={12} />
                      </button>
                      <button 
                        onClick={() => handleRotationChange(5)}
                        className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-300 hover:text-white"
                        title="Повернуть вправо"
                      >
                        <RotateCw size={12} />
                      </button>
                      <button 
                        onClick={handleBringToFront}
                        className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-300 hover:text-white"
                        title="На передний план"
                      >
                        <Layers size={12} />
                      </button>
                      <div className="w-[1px] h-3.5 bg-slate-800" />
                      <button 
                        onClick={handleRemoveProduct}
                        className="p-1 hover:bg-red-950/40 rounded transition-colors text-slate-400 hover:text-red-400"
                        title="Удалить с баннера"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty State Banner info overlay */}
            {config.products.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 text-slate-500 text-xs font-mono text-center p-6 select-text z-0">
                <div>
                  <p className="font-bold">Холст пуст</p>
                  <p className="opacity-60 mt-1 max-w-[200px] mx-auto">Подберите витамины через чат-ассистента слева</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Текст поста (Caption) */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-4 overflow-y-auto min-h-[150px] md:min-h-0 relative group">
            {config.caption ? (
              <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans select-text">
                {config.caption}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs font-mono">
                Текст поста появится здесь
              </div>
            )}
          </div>
          
          {/* Инфо о выбранных товарах */}
          {config.products.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 shrink-0">
              {config.products.map(p => (
                <button 
                  key={p.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProductId(p.id);
                  }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all max-w-full text-left ${
                    selectedProductId === p.id 
                      ? 'bg-fuchsia-950/40 border-fuchsia-500 text-fuchsia-300 shadow-lg' 
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                >
                  <img src={p.image_url} alt={p.name} className="w-6 h-6 object-contain shrink-0" />
                  <span className="text-[10px] font-bold truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
