"use client";
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, ShoppingCart, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/store/useCart';
import { Product } from '@/lib/types';
import './ChatWidget.css';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  lang: 'ru' | 'tj';
}

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

  // Load chat session and initial message
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
          setMessages(parsed.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        } catch {
          initializeWelcomeMessage();
        }
      } else {
        initializeWelcomeMessage();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Keep local storage updated
  useEffect(() => {
    if (messages.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem('web_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  const initializeWelcomeMessage = () => {
    const welcomeText = lang === 'ru'
      ? 'Здравствуйте! 😊 Я ваш личный ИИ-нутрициолог TOJ-VITAMIN. Расскажите о ваших целях или жалобах на здоровье, и я помогу подобрать идеальную связку витаминов из каталога!'
      : 'Салом! 😊 Ман маслиҳатчии инфиродии шумо TOJ-VITAMIN мебошам. Дар бораи мақсадҳо ва мушкилоти саломатии худ нависед ва ман ба шумо маҷмӯи беҳтарини витаминҳоро аз каталог интихоб мекунам!';

    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: welcomeText,
        timestamp: new Date()
      }
    ]);
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: userText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/agents/web-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          chatId: chatId
        })
      });

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
          timestamp: new Date()
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
        text: lang === 'ru'
          ? 'К сожалению, произошла небольшая заминка сети. Пожалуйста, напишите еще раз или обратитесь в нашу поддержку.'
          : 'Мутаассифона, хатогии шабака рух дод. Лутфан, дубора нависед ё бо дастгирии мо тамос гиред.',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Специфический нечеткий поиск продуктов в тексте сообщения для вывода карточек покупки
  const detectProductsInText = (text: string): Product[] => {
    if (!text || !allProducts || allProducts.length === 0) return [];
    
    const lower = text.toLowerCase();
    const matched: Product[] = [];
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const p of allProducts) {
      const shortName = p.name.toLowerCase().trim();
      const fullName = p.full_name ? p.full_name.toLowerCase().trim() : '';

      if (shortName.length < 3) continue;

      const escapedShortName = escapeRegExp(shortName);
      const pattern = new RegExp(`(?:^|[^a-zA-Zа-яА-Я0-9_])${escapedShortName}(?:$|[^a-zA-Zа-яА-Я0-9_])`, 'i');

      const isShortNameMentioned = pattern.test(lower);
      const isFullNameMentioned = fullName && lower.includes(fullName);

      if (isShortNameMentioned || isFullNameMentioned) {
        if (!matched.some(mp => mp.id === p.id)) {
          matched.push(p);
        }
      }
    }
    
    // Ограничиваемся первыми 3 продуктами на сообщение для эстетичности интерфейса
    return matched.slice(0, 3);
  };

  const handleAddToCart = (product: Product) => {
    addItem(product);
    
    // Триггерим визуальное подтверждение добавления на секунду
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
      // Плавно открываем корзину на сайте для финализации заказа
      setCartOpen(true);
    }, 800);
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
          aria-label="Open Chat Support"
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
                  <img src="/logo.webp" alt="TOJ-VITAMIN Logo" className="chat-avatar-img" />
                  <span className="chat-avatar-status" />
                </div>
                <div className="chat-title-wrapper">
                  <span className="chat-brand-name">TOJ-VITAMIN</span>
                  <span className="chat-status-text">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25d366] inline-block"></span>
                    {lang === 'ru' ? 'ИИ-нутрициолог онлайн' : 'ИИ-мушовир онлайн'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearHistory}
                  title={lang === 'ru' ? 'Очистить историю' : 'Тоза кардани таърих'}
                  className="chat-close-btn text-[10px] uppercase font-bold tracking-widest px-2"
                >
                  {lang === 'ru' ? 'Сброс' : 'Тоза'}
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
                const detectedProducts = msg.sender === 'bot' ? detectProductsInText(msg.text) : [];
                
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
                    
                    {/* Render Interactive Buy Cards if Bot mentions Products */}
                    {detectedProducts.length > 0 && (
                      <div className="chat-products-container">
                        {detectedProducts.map((p) => {
                          const isAdded = addedProductIds.has(p.id);
                          return (
                            <div key={p.id} className="chat-product-card">
                              <div className="chat-product-img-wrapper">
                                <img 
                                  src={p.image_url || '/logo.webp'} 
                                  alt={p.name} 
                                  className="chat-product-img" 
                                />
                              </div>
                              <div className="chat-product-details">
                                <span className="chat-product-name" title={p.name}>{p.name}</span>
                                <span className="chat-product-price">{p.price} сомони</span>
                              </div>
                              <button
                                onClick={() => handleAddToCart(p)}
                                className={`chat-product-add-btn ${isAdded ? 'bg-[#25d366] hover:bg-[#25d366]' : ''}`}
                                disabled={isAdded}
                              >
                                {isAdded ? (
                                  <>
                                    <Check size={12} />
                                    {lang === 'ru' ? 'В корзине!' : 'Дар сабад!'}
                                  </>
                                ) : (
                                  <>
                                    <ShoppingCart size={12} />
                                    {lang === 'ru' ? 'Купить' : 'Харид'}
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
                  placeholder={lang === 'ru' ? 'Напишите сообщение...' : 'Паём нависед...'}
                  disabled={isLoading}
                  className="chat-input-field"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="chat-send-btn"
                  aria-label="Send message"
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
