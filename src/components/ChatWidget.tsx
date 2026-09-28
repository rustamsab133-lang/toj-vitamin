"use client";
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, ShoppingCart, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/store/useCart';
import { Product, Lang } from '@/lib/types';
import { getLocalizedProductName } from '@/lib/productLocalization';
import './ChatWidget.css';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  recommendedProductIds?: string[];
}

interface ChatWidgetProps {
  lang: Lang;
}

const getWelcomeText = (targetLang: Lang) => {
  if (targetLang === 'en') {
    return 'Hello! 😊 I am your personal AI nutritionist at TOJ-VITAMIN. Tell me about your health goals or symptoms, and I will recommend the ideal vitamins for you!';
  }
  if (targetLang === 'tj') {
    return 'Салом! 😊 Ман мушовири шахсии Шумо оид ба саломатӣ ва маводи ғизоӣ аз TOJ-VITAMIN мебошам. Дар бораи мақсадҳо ва нигарониҳои худ нависед ва ман беҳтарин маҷмӯи витаминҳоро ба Шумо интихоб мекунам!';
  }
  return 'Здравствуйте! 😊 Я ваш личный ИИ-нутрициолог TOJ-VITAMIN. Расскажите о ваших целях или жалобах на здоровье, и я помогу подобрать идеальную связку витаминов из каталога!';
};

const QUICK_PROMPTS: Record<Lang, Array<{ label: string; prompt: string }>> = {
  en: [
    { label: '⚡ Energy & Focus', prompt: 'I feel fatigued and want more energy and concentration. What vitamins do you recommend?' },
    { label: '🦴 Joints & Bones', prompt: 'What supplements do you recommend for joint health and cartilage support?' },
    { label: '🌙 Sleep & Anti-Stress', prompt: 'I want something for stress relief, calming anxiety, and deep restorative sleep.' },
    { label: '🛡️ Immune Boost', prompt: 'What is the best stack to strengthen my immune system right now?' }
  ],
  ru: [
    { label: '⚡ Энергия и фокус', prompt: 'Чувствую упадок сил. Какие витамины попить для энергии и бодрости?' },
    { label: '🦴 Суставы и связки', prompt: 'Что порекомендуете для суставов, хрящей и связок?' },
    { label: '🌙 Сон и антистресс', prompt: 'Посоветуйте препараты от стресса, тревожности и для крепкого сна.' },
    { label: '🛡️ Иммунитет', prompt: 'Как укрепить иммунитет и защитить организм от сезонных простуд?' }
  ],
  tj: [
    { label: '⚡ Энергия ва неру', prompt: 'Ман хастагӣ ҳис мекунам. Барои энергия ва неру кадом витаминҳо беҳтаранд?' },
    { label: '🦴 Буғумҳо ва устухон', prompt: 'Барои саломатии буғумҳо ва пайвандҳо чӣ маслиҳат медиҳед?' },
    { label: '🌙 Хоб ва оромӣ', prompt: 'Барои хоби ором, рафъи асабоният ва стресс чӣ тавсия медиҳед?' },
    { label: '🛡️ Масуният', prompt: 'Барои қавӣ гардонидани масуният кадом витаминҳо лозиманд?' }
  ]
};

export function ChatWidget({ lang }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Zustand bindings
  const allProducts = useCart((state) => state.allProducts);
  const addItem = useCart((state) => state.addItem);
  const setCartOpen = useCart((state) => state.setIsOpen);
  const cartItems = useCart((state) => state.items);
  const triggerAnimation = useCart((state) => state.triggerAnimation);
  const triggerToast = useCart((state) => state.triggerToast);

  const initializeWelcomeMessage = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: getWelcomeText(lang),
        timestamp: new Date()
      }
    ]);
  };

  // Synchronize welcome message when user changes language
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) {
        return [{
          id: 'welcome',
          sender: 'bot',
          text: getWelcomeText(lang),
          timestamp: new Date()
        }];
      }
      return prev.map(m => m.id === 'welcome' ? { ...m, text: getWelcomeText(lang) } : m);
    });
  }, [lang]);

  // Load chat session and history from localStorage on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedChatId = localStorage.getItem('web_chat_session_id');
      const savedMessages = localStorage.getItem('web_chat_messages');

      if (savedChatId) {
        setChatId(savedChatId);
      }

      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages) as any[];
          if (!parsed || parsed.length === 0) {
            initializeWelcomeMessage();
          } else {
            setMessages(parsed.map(m => ({
              ...m,
              text: m.id === 'welcome' ? getWelcomeText(lang) : m.text,
              timestamp: new Date(m.timestamp)
            })));
          }
        } catch {
          initializeWelcomeMessage();
        }
      } else {
        initializeWelcomeMessage();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep local storage updated (limit to last 50 messages to prevent storage bloat)
  useEffect(() => {
    if (messages.length > 0 && typeof window !== 'undefined') {
      const trimmed = messages.slice(-50);
      localStorage.setItem('web_chat_messages', JSON.stringify(trimmed));
    }
  }, [messages]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Lock body scroll on mobile when chat is open to prevent page shifting/jumping underneath
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        const isMobile = window.innerWidth <= 640;
        if (isOpen && isMobile) {
          document.body.style.overflow = 'hidden';
          document.body.style.height = '100%';
        } else {
          document.body.style.overflow = '';
          document.body.style.height = '';
        }
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        document.body.style.overflow = '';
        document.body.style.height = '';
      };
    }
  }, [isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const sendDirectMessage = async (rawText: string) => {
    if (!rawText.trim() || isLoading) return;

    const userText = rawText.trim();
    setInput('');

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: userText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Context preparation
    const cartContext = cartItems && cartItems.length > 0
      ? cartItems.map(item => `${getLocalizedProductName(item.name, lang)} (${lang === 'en' ? 'qty' : 'кол-во'}: ${item.quantity})`).join(', ')
      : (lang === 'en' ? 'Cart is empty' : (lang === 'tj' ? 'Сабад холӣ аст' : 'Корзина пуста'));

    let quizContext = lang === 'en' ? 'Quiz not taken' : (lang === 'tj' ? 'Тест гузаронида нашудааст' : 'Тест не пройден');
    try {
      const saved = localStorage.getItem('toj_quiz_last');
      if (saved) {
        const parsed = JSON.parse(saved);
        quizContext = lang === 'en'
          ? `Category: ${parsed.catTitle || ''}`
          : `Категория: ${parsed.catTitle || ''}`;
        if (parsed.optionTitle) {
          quizContext += lang === 'en' ? `, Concern: ${parsed.optionTitle}` : `, Проблема: ${parsed.optionTitle}`;
        }
        if (parsed.recommendedProductNames && parsed.recommendedProductNames.length > 0) {
          quizContext += lang === 'en'
            ? `, Recommended: ${parsed.recommendedProductNames.join(', ')}`
            : `, Рекомендованные продукты теста: ${parsed.recommendedProductNames.join(', ')}`;
        }
      }
    } catch (err) {
      console.warn('⚠️ Error extracting quiz context:', err);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout for AI generation

      const response = await fetch('/api/agents/web-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: userText,
          chatId: chatId,
          lang: lang,
          cartItems: cartContext,
          quizResult: quizContext,
          cartItemsRaw: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: Number(item.price) || 0,
            quantity: item.quantity
          }))
        })
      });

      clearTimeout(timeout);

      const data = await response.json();

      if (data.success && data.reply) {
        if (data.chatId && data.chatId !== chatId) {
          setChatId(data.chatId);
          localStorage.setItem('web_chat_session_id', data.chatId);
        }

        const botMessage: Message = {
          id: `msg-${Date.now()}-bot`,
          sender: 'bot',
          text: data.reply,
          timestamp: new Date(),
          recommendedProductIds: data.recommendedProductIds || []
        };

        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error(data.error || 'Failed to generate response');
      }
    } catch (err) {
      console.error('❌ Chat widget error:', err);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        sender: 'bot',
        text: lang === 'en'
          ? 'Sorry, a temporary network issue occurred. Please try sending your message again or contact our support.'
          : (lang === 'ru'
              ? 'К сожалению, произошла небольшая заминка сети. Пожалуйста, напишите еще раз или обратитесь в нашу поддержку.'
              : 'Мутаассифона, хатогии шабака рух дод. Лутфан, дубора нависед ё бо дастгирии мо тамос гиред.'),
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await sendDirectMessage(input);
  };

  // Multilingual fuzzy match for products mentioned in bot replies
  const detectProductsInText = (text: string): Product[] => {
    if (!text || !allProducts || allProducts.length === 0) return [];
    
    const lower = text.toLowerCase();
    const matched: Product[] = [];
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const p of allProducts) {
      const shortName = p.name.toLowerCase().trim();
      const fullName = p.full_name ? p.full_name.toLowerCase().trim() : '';
      const enName = getLocalizedProductName(p.name, 'en').toLowerCase().trim();

      const candidateNames = [shortName, fullName, enName].filter(n => n && n.length >= 3);

      let isMatch = false;
      for (const candidate of candidateNames) {
        const escaped = escapeRegExp(candidate);
        const pattern = new RegExp(`(?:^|[^a-zA-Zа-яА-Я0-9_])${escaped}(?:$|[^a-zA-Zа-яА-Я0-9_])`, 'i');
        if (pattern.test(lower) || lower.includes(candidate)) {
          isMatch = true;
          break;
        }
      }

      if (isMatch && !matched.some(mp => mp.id === p.id)) {
        matched.push(p);
      }
    }
    
    // Limit to top 3 products per message
    return matched.slice(0, 3);
  };

  const handleAddToCart = (product: Product) => {
    addItem(product);
    triggerAnimation();
    triggerToast(product);
    
    // Триггерим визуальное подтверждение добавления
    setAddedProductIds((prev) => {
      const next = new Set(prev);
      next.add(product.id);
      return next;
    });

    setTimeout(() => {
      setAddedProductIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2000);
  };

  const handleClearHistory = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('web_chat_messages');
      localStorage.removeItem('web_chat_session_id');
    }
    setChatId(null);
    initializeWelcomeMessage();
  };

  return (
    <div className="chat-widget-container">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="chat-trigger-btn"
          aria-label={lang === 'en' ? 'Open AI Nutritionist Chat' : (lang === 'ru' ? 'Открыть чат с ИИ-нутрициологом' : 'Кушодани чати ИИ-мушовир')}
        >
          <MessageSquare size={26} />
          <span className="chat-pulse-indicator" />
        </motion.button>
      )}

      {/* Main Support Dialog Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="chat-window"
          >
            {/* Header Area */}
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="chat-avatar-container">
                  <img src="/logo-square.webp" alt="TOJ-VITAMIN Logo" className="chat-avatar-img" />
                  <span className="chat-avatar-status" />
                </div>
                <div className="chat-title-wrapper">
                  <span className="chat-brand-name">TOJ-VITAMIN</span>
                  <span className="chat-status-text">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] inline-block"></span>
                    {lang === 'en' ? 'AI Nutritionist Online' : (lang === 'ru' ? 'ИИ-нутрициолог онлайн' : 'ИИ-мушовир онлайн')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearHistory}
                  title={lang === 'en' ? 'Clear history' : (lang === 'ru' ? 'Очистить историю' : 'Тоза кардани таърих')}
                  className="chat-close-btn text-[10px] uppercase font-bold tracking-widest px-2"
                >
                  {lang === 'en' ? 'Reset' : (lang === 'ru' ? 'Сброс' : 'Тоза')}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="chat-close-btn"
                  aria-label="Close Chat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Body (Messages) */}
            <div className="chat-messages-area">
              {messages.map((msg) => {
                const detectedProducts = msg.sender === 'bot'
                  ? (msg.recommendedProductIds && msg.recommendedProductIds.length > 0
                      ? allProducts.filter(p => msg.recommendedProductIds!.includes(p.id))
                      : detectProductsInText(msg.text))
                  : [];
                
                return (
                  <div key={msg.id} className={`flex flex-col gap-2`}>
                    <div className={`chat-message-row ${msg.sender}`}>
                      <div className="chat-bubble">
                        <div className="whitespace-pre-line">{msg.text}</div>
                        <span className="chat-time">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Quick starter suggestion chips for the current language */}
                    {msg.id === 'welcome' && messages.length === 1 && !isLoading && (
                      <div className="flex flex-wrap gap-1.5 px-1 py-1">
                        {QUICK_PROMPTS[lang]?.map((qp, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => sendDirectMessage(qp.prompt)}
                            className="text-[12px] bg-white hover:bg-[#f0f0f2] text-[#1D1D1F] border border-black/10 hover:border-black/25 rounded-full px-3 py-1.5 transition-all active:scale-95 shadow-xs text-left font-medium"
                          >
                            {qp.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Render Interactive Buy Cards if Bot mentions Products */}
                    {detectedProducts.length > 0 && (
                      <div className="chat-products-container">
                        {detectedProducts.map((p) => {
                          const isAdded = addedProductIds.has(p.id);
                          return (
                            <div key={p.id} className="chat-product-card">
                              <div className="chat-product-img-wrapper">
                                <img 
                                  src={p.image_url || '/logo-square.webp'} 
                                  alt={getLocalizedProductName(p.name, lang)} 
                                  className="chat-product-img" 
                                />
                              </div>
                              <div className="chat-product-details">
                                <span className="chat-product-name" title={getLocalizedProductName(p.name, lang)}>{getLocalizedProductName(p.name, lang)}</span>
                                <span className="chat-product-price">{p.price} {lang === 'en' ? 'TJS' : (lang === 'ru' ? 'сомони' : 'сомонӣ')}</span>
                              </div>
                              <button
                                onClick={() => handleAddToCart(p)}
                                className={`chat-product-add-btn ${isAdded ? 'bg-[#25d366] hover:bg-[#25d366]' : ''}`}
                                disabled={isAdded}
                              >
                                {isAdded ? (
                                  <>
                                    <Check size={12} />
                                    {lang === 'en' ? 'In cart!' : (lang === 'ru' ? 'В корзине!' : 'Дар сабад!')}
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart size={12} />
                                    {lang === 'en' ? 'Buy' : (lang === 'ru' ? 'Купить' : 'Харид')}
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Bot Loading Indicator */}
              {isLoading && (
                <div className="chat-message-row bot">
                  <div className="chat-typing-bubble">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form Area */}
            <form onSubmit={handleSendMessage} className="chat-footer">
              <div className="chat-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={lang === 'en' ? 'Type your health goal or question...' : (lang === 'ru' ? 'Напишите цель или вопрос...' : 'Мақсад ё саволи худро нависед...')}
                  disabled={isLoading}
                  className="chat-input-field"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="chat-send-btn"
                  aria-label={lang === 'en' ? 'Send message' : (lang === 'ru' ? 'Отправить сообщение' : 'Фиристодани паём')}
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
