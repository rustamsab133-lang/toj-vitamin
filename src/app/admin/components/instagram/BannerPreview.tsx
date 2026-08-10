"use client";
import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, RotateCw, Instagram, Loader2, AlertCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BannerConfig } from '@/lib/types/banner';

interface BannerPreviewProps {
  bannerUrl: string | null;
  config: BannerConfig;
  onCopyCaption: () => void;
  copied: boolean;
  onRegenerate: () => void;
  isLoading: boolean;
  selectedProductId: string | null;
  onSelectProductId: (id: string | null) => void;
}

export function BannerPreview({
  bannerUrl,
  config,
  onCopyCaption,
  copied,
  onRegenerate,
  isLoading,
  selectedProductId,
  onSelectProductId,
}: BannerPreviewProps) {
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishCaption, setPublishCaption] = useState('');
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
  const [publishError, setPublishError] = useState('');
  const [publishedPostUrl, setPublishedPostUrl] = useState('');
  const [instagramProfile, setInstagramProfile] = useState<{ username: string; name: string; profilePictureUrl: string } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const fetchProfileInfo = async () => {
    setIsLoadingProfile(true);
    try {
      const res = await fetch('/api/instagram/profile');
      const data = await res.json();
      if (data.success && data.profile) {
        setInstagramProfile(data.profile);
      }
    } catch (e) {
      console.error('Failed to load instagram profile info:', e);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const openPublishModal = () => {
    setPublishCaption(config.caption || '');
    setPublishStatus('idle');
    setPublishError('');
    setPublishedPostUrl('');
    setIsPublishModalOpen(true);
    fetchProfileInfo();
  };

  const handlePublishToInstagram = async () => {
    setPublishStatus('publishing');
    setPublishError('');
    try {
      const response = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bannerConfig: config,
          caption: publishCaption,
          customImageBase64: undefined // server will generate the banner via AI
        })
      });
      const data = await response.json();
      if (data.success) {
        setPublishStatus('success');
        setPublishedPostUrl(data.postUrl || `https://instagram.com/p/${data.postId}`);
      } else {
        setPublishStatus('error');
        setPublishError(data.error || 'Произошла непредвиденная ошибка при публикации.');
      }
    } catch (err: any) {
      console.error('Publish error:', err);
      setPublishStatus('error');
      setPublishError(err.message || 'Ошибка соединения с сервером.');
    }
  };

  const triggerDownload = () => {
    if (!bannerUrl) return;
    const link = document.createElement('a');
    link.href = bannerUrl;
    link.download = `toj-vitamin-banner-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAspectClass = (ratio: string) => {
    switch (ratio) {
      case '4:5': return 'aspect-[4/5] max-w-[320px]';
      case '1:1': return 'aspect-square max-w-[360px]';
      case '16:9': return 'aspect-[16/9] max-w-[480px]';
      case '9:16':
      default:
        return 'aspect-[9/16] max-w-[260px]';
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
          <span className="ml-2 mr-4 text-xs font-mono text-slate-500">ИИ Креатив</span>
        </div>
        
        <div className="flex items-center gap-2">
          {bannerUrl && (
            <button
              onClick={onRegenerate}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
              Перегенерировать
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
            disabled={!bannerUrl || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50 border border-slate-700"
          >
            <Download size={12} />
            Скачать
          </button>

          <button
            onClick={openPublishModal}
            disabled={!bannerUrl || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 text-white text-[10px] font-bold rounded-lg transition-all shadow-md shadow-pink-600/20 disabled:opacity-50 active:scale-95"
          >
            <Instagram size={12} />
            В Instagram
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-y-auto md:overflow-hidden min-h-0">
        {/* Left Column: Image Canvas Preview */}
        <div className="w-full md:w-[360px] flex flex-col justify-center items-center shrink-0 mx-auto min-h-[300px] md:min-h-0 bg-slate-950 rounded-xl border border-slate-800/60 p-4 relative">
          {isLoading ? (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-35 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs font-mono">
              <Loader2 size={36} className="text-fuchsia-500 animate-spin mb-4" />
              <span className="font-bold text-slate-200 text-sm mb-1">Генерация баннера через ИИ...</span>
              <span className="opacity-60 max-w-[240px] leading-relaxed">Nano Banana Pro (Gemini 3 Pro Image) рисует креатив. Это может занять 5-15 секунд.</span>
            </div>
          ) : null}

          {bannerUrl ? (
            <div className={`w-full relative shadow-2xl transition-all border border-slate-800 overflow-hidden rounded-lg ${getAspectClass(config.aspectRatio)}`}>
              <img 
                src={bannerUrl} 
                alt="AI Generated Banner" 
                className="w-full h-full object-contain select-none"
                draggable={false}
              />
            </div>
          ) : (
            <div className="text-slate-600 text-xs font-mono text-center p-6">
              <Loader2 size={24} className="text-slate-700 animate-pulse mx-auto mb-2" />
              <p className="font-bold text-slate-500">Баннер отсутствует</p>
              <p className="opacity-60 mt-1 max-w-[200px] mx-auto">Отправьте сообщение ИИ-агенту слева, чтобы запустить генерацию баннера</p>
            </div>
          )}
        </div>

        {/* Right Column: Caption Text */}
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

          {config.caption && bannerUrl && (
            <button
              onClick={openPublishModal}
              disabled={isLoading}
              className="mt-3 w-full py-3 bg-gradient-to-r from-pink-600 via-fuchsia-600 to-indigo-600 hover:from-pink-500 hover:via-fuchsia-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-fuchsia-500/25 flex items-center justify-center gap-2 border border-fuchsia-500/30 group active:scale-[0.98] disabled:opacity-50"
            >
              <Instagram size={14} className="group-hover:scale-110 transition-transform" />
              🚀 ОПУБЛИКОВАТЬ В INSTAGRAM
            </button>
          )}
          
          {/* Инфо о выбранных товарах */}
          {config.products.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 shrink-0">
              {config.products.map(p => (
                <button 
                  key={p.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProductId(p.id);
                  }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all max-w-full text-left bg-slate-800 ${
                    selectedProductId === p.id 
                      ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-950/40' 
                      : 'border-slate-700 text-slate-300'
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

      {/* Instagram Publishing Modal Wizard */}
      <AnimatePresence>
        {isPublishModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
            onClick={() => publishStatus !== 'publishing' && setIsPublishModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-slate-900 border border-slate-800 text-slate-100 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col relative max-h-[90vh] md:max-h-[680px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Instagram className="text-pink-500 animate-pulse" size={20} />
                  <span className="font-extrabold text-sm uppercase tracking-wider bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent">
                    {publishStatus === 'idle' && 'Предпросмотр публикации'}
                    {publishStatus === 'publishing' && 'Публикация в Instagram...'}
                    {publishStatus === 'success' && 'Пост опубликован!'}
                    {publishStatus === 'error' && 'Ошибка публикации'}
                  </span>
                </div>
                {publishStatus !== 'publishing' && (
                  <button
                    onClick={() => setIsPublishModalOpen(false)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* IDLE: Confirm & Edit */}
                {publishStatus === 'idle' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                    {/* Left Column: Visual Card Preview */}
                    <div className="space-y-3">
                      <span className="block text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">Макет для Instagram Feed</span>
                      <div className="w-full rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg flex flex-col">
                        {/* Instagram Mockup Header */}
                        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 select-none">
                          <div className="flex items-center gap-3">
                            {instagramProfile?.profilePictureUrl ? (
                              <img 
                                src={instagramProfile.profilePictureUrl} 
                                alt="Avatar" 
                                className="w-8 h-8 rounded-full object-cover border border-slate-850" 
                                crossOrigin="anonymous" 
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
                                IG
                              </div>
                            )}
                            <div className="text-left leading-tight">
                              <span className="font-extrabold text-xs text-white block">
                                @{instagramProfile?.username || 'tojvitamin'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium block">
                                Душанбе, Таджикистан
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                            <span>Активен</span>
                          </div>
                        </div>

                        {/* Mockup Main Image */}
                        <div className="aspect-square w-full bg-slate-900 flex items-center justify-center relative overflow-hidden">
                          {bannerUrl ? (
                            <img src={bannerUrl} alt="Preview" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-xs text-slate-600 font-mono">
                              <Loader2 size={24} className="text-fuchsia-500 animate-spin mb-2" />
                              <span>Сборка баннера...</span>
                            </div>
                          )}
                        </div>

                        {/* Mockup Instagram Interaction Bar */}
                        <div className="px-4 py-2 bg-slate-900 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400 select-none">
                          <div className="flex items-center gap-3">
                            <span className="hover:text-red-500 cursor-pointer transition-colors">❤️</span>
                            <span className="hover:text-white cursor-pointer transition-colors">💬</span>
                            <span className="hover:text-white cursor-pointer transition-colors">✈️</span>
                          </div>
                          <span className="hover:text-white cursor-pointer transition-colors">🔖</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Edit Post Caption */}
                    <div className="flex flex-col h-full space-y-3">
                      <span className="block text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">Подпись к посту (Редактирование)</span>
                      <textarea
                        value={publishCaption}
                        onChange={(e) => setPublishCaption(e.target.value)}
                        placeholder="Напишите текст поста с хештегами..."
                        className="flex-1 min-h-[220px] md:min-h-[280px] bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 focus:outline-none focus:border-fuchsia-500 font-sans leading-relaxed resize-none"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        💡 Текст поста сгенерирован ИИ с учетом синергии и болей клиента. Вы можете добавить свои хештеги или отредактировать призыв к действию.
                      </p>
                    </div>
                  </div>
                )}

                {/* PUBLISHING: Progress steps */}
                {publishStatus === 'publishing' && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-8 max-w-md mx-auto">
                    <div className="relative flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full border-4 border-fuchsia-500/10 border-t-fuchsia-500 animate-spin" />
                      <Instagram className="absolute text-fuchsia-500 animate-pulse" size={28} />
                    </div>

                    <div className="w-full space-y-4">
                      <h4 className="text-center font-bold text-sm text-slate-200">Отправляем данные в Meta Graph API</h4>
                      <p className="text-center text-xs text-slate-500">Пожалуйста, не закрывайте вкладку. Процесс может занять 10-15 секунд...</p>
                      
                      <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3 font-mono text-[10px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <Check className="text-green-500" size={12} />
                          <span>Инициализация процесса публикации... OK</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="text-fuchsia-500 animate-spin" size={12} />
                          <span>Генерация High-Res холста через Gemini API...</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="text-fuchsia-500 animate-spin" size={12} />
                          <span>Загрузка в облачный буфер Supabase Storage...</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="text-fuchsia-500 animate-spin" size={12} />
                          <span>Meta API: создание медиа-контейнера...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUCCESS: Confetti & Links */}
                {publishStatus === 'success' && (
                  <div className="flex flex-col items-center justify-center py-10 space-y-6 max-w-md mx-auto text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                      <Check size={32} className="animate-bounce" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-white">Успешно Опубликовано!</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Поздравляем! Ваш рекламный ИИ-баннер и сгенерированный текст успешно выгружены в официальный Instagram-аккаунт.
                      </p>
                    </div>

                    <div className="w-full p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-left">
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Ссылка</span>
                        <span className="text-[11px] text-slate-300 truncate block mt-0.5 font-mono">{publishedPostUrl}</span>
                      </div>
                      <a
                        href={publishedPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 text-white text-[10px] font-extrabold rounded-lg shadow-md transition-all flex items-center gap-1 shrink-0 ml-4 active:scale-95"
                      >
                        Открыть в Instagram ↗
                      </a>
                    </div>
                  </div>
                )}

                {/* ERROR: Alert and retry */}
                {publishStatus === 'error' && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-6 max-w-md mx-auto text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                      <AlertCircle size={32} />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-md font-black text-white">Ошибка интеграции Instagram</h3>
                      <p className="text-xs text-red-400 bg-red-950/20 border border-red-950/40 rounded-xl p-3 text-left leading-relaxed">
                        {publishError}
                      </p>
                      <p className="text-[11px] text-slate-500 text-left leading-normal mt-2">
                        💡 Пожалуйста, проверьте правильность введенных токенов в подразделе <b>«Настройки Агента»</b>. Токен доступа должен иметь разрешения `instagram_basic` и `instagram_content_publish`.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
                {publishStatus === 'idle' && (
                  <>
                    <button
                      onClick={() => setIsPublishModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handlePublishToInstagram}
                      disabled={!publishCaption.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-pink-600/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Send size={12} />
                      Опубликовать в Ленту!
                    </button>
                  </>
                )}

                {publishStatus === 'success' && (
                  <button
                    onClick={() => setIsPublishModalOpen(false)}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Отлично
                  </button>
                )}

                {publishStatus === 'error' && (
                  <>
                    <button
                      onClick={() => setIsPublishModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
                    >
                      Закрыть
                    </button>
                    <button
                      onClick={handlePublishToInstagram}
                      className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1.5"
                    >
                      🔄 Попробовать снова
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
