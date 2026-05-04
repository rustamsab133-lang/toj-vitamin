"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Share2, Link2, Check, MessageCircle, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  variant?: 'primary' | 'compact';
  lang?: 'ru' | 'tj';
}

import { trackEvent } from '@/lib/analytics';

// ─── Unified Analytics Helper ───────────────────────────────────────────────────
const trackShare = (method: string, productUrl: string) => {
  trackEvent({
    event_name: 'share',
    data: {
      method,
      content_type: 'product',
      item_id: productUrl,
    }
  });
};

export const ShareButton: React.FC<ShareButtonProps> = ({
  url,
  title,
  description,
  variant = 'primary',
  lang = 'ru',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fullUrl = url.startsWith('http') ? url : `https://www.toj-vitamin.tj${url}`;
  const shareText = lang === 'ru'
    ? `Посмотри ${title} на toj-vitamin.tj 💊`
    : `${title}-ро дар toj-vitamin.tj бинед 💊`;

  const handleShare = async () => {
    // Try native Web Share API first (mobile)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || shareText,
          url: fullUrl,
        });
        trackShare('native_share', fullUrl);
        return;
      } catch (err) {
        // User cancelled or error — fall through to custom menu
        if ((err as Error).name === 'AbortError') return;
      }
    }
    // Fallback: show custom menu
    setIsOpen(!isOpen);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      trackShare('copy_link', fullUrl);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1500);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      trackShare('copy_link', fullUrl);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1500);
    }
  };

  const handleWhatsApp = () => {
    trackShare('whatsapp', fullUrl);
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${fullUrl}`)}`,
      '_blank'
    );
    setIsOpen(false);
  };

  const handleTelegram = () => {
    trackShare('telegram', fullUrl);
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`,
      '_blank'
    );
    setIsOpen(false);
  };

  const isPrimary = variant === 'primary';

  return (
    <div className="relative" ref={menuRef}>
      {/* SHARE TRIGGER BUTTON */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.04 }}
        onClick={handleShare}
        className={
          isPrimary
            ? "h-[68px] px-10 rounded-[24px] font-bold text-[18px] shadow-lg transition-all flex items-center justify-center gap-3 bg-white border-2 border-[#1D1D1F]/10 text-[#1D1D1F] hover:border-[#1E40AF]/40 hover:shadow-xl group overflow-hidden relative"
            : "h-12 w-12 rounded-full bg-white/80 backdrop-blur-md border border-black/10 text-[#1D1D1F] flex items-center justify-center hover:bg-[#1E40AF] hover:text-white hover:border-[#1E40AF] hover:scale-110 active:scale-95 transition-all shadow-md"
        }
      >
        <Share2 size={isPrimary ? 20 : 18} className={isPrimary ? "group-hover:rotate-12 transition-transform" : ""} />
        {isPrimary && (
          <span className="font-outfit">
            {lang === 'ru' ? 'Поделиться' : 'Мубодила'}
          </span>
        )}
      </motion.button>

      {/* DROPDOWN SHARE MENU */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className={`absolute z-[100] ${isPrimary ? 'bottom-full mb-3' : 'top-full mt-3'} right-0 w-[280px] bg-white/95 backdrop-blur-2xl rounded-[28px] border border-black/[0.08] shadow-[0_30px_60px_rgba(0,0,0,0.15)] p-3 overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-2 pb-3 mb-1">
              <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em]">
                {lang === 'ru' ? 'Поделиться' : 'Мубодила кунед'}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[18px] hover:bg-black/[0.04] transition-all group/item text-left"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${copied ? 'bg-green-500 text-white' : 'bg-[#F1F5F9] text-[#64748B] group-hover/item:bg-[#1D1D1F] group-hover/item:text-white'}`}>
                {copied ? <Check size={18} /> : <Link2 size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#1D1D1F]">
                  {copied
                    ? (lang === 'ru' ? 'Скопировано!' : 'Нусхабардорӣ шуд!')
                    : (lang === 'ru' ? 'Копировать ссылку' : 'Нусхабардории истинод')}
                </p>
                {!copied && (
                  <p className="text-[11px] text-[#94A3B8] truncate">{fullUrl}</p>
                )}
              </div>
            </button>

            {/* Divider */}
            <div className="h-px bg-black/[0.05] mx-4 my-1" />

            {/* WhatsApp */}
            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[18px] hover:bg-[#25D366]/5 transition-all group/item text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm group-hover/item:scale-110 transition-transform">
                <MessageCircle size={18} fill="currentColor" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#1D1D1F]">WhatsApp</p>
                <p className="text-[11px] text-[#94A3B8]">
                  {lang === 'ru' ? 'Отправить другу' : 'Ба дӯст фиристодан'}
                </p>
              </div>
            </button>

            {/* Telegram */}
            <button
              onClick={handleTelegram}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-[18px] hover:bg-[#229ED9]/5 transition-all group/item text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-[#229ED9] text-white flex items-center justify-center shrink-0 shadow-sm group-hover/item:scale-110 transition-transform">
                <Send size={18} />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#1D1D1F]">Telegram</p>
                <p className="text-[11px] text-[#94A3B8]">
                  {lang === 'ru' ? 'Отправить в Telegram' : 'Ба Telegram фиристодан'}
                </p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
