"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Bot, User } from 'lucide-react';
import { ChatMessage } from '@/lib/types/banner';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

export function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Автоскролл при новых сообщениях
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Шапка чата */}
      <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-fuchsia-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">ИИ Арт-директор</h3>
            <p className="text-[10px] text-slate-500">Gemini 2.5 Flash • TOJ-VITAMIN</p>
          </div>
          {isLoading && (
            <div className="ml-auto flex items-center gap-1.5 text-fuchsia-500">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-[10px] font-bold">Думает...</span>
            </div>
          )}
        </div>
      </div>

      {/* Сообщения */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 opacity-60">
            <Sparkles size={32} className="text-fuchsia-400 mb-3" />
            <p className="text-sm font-bold text-slate-600">Привет! Я ваш ИИ арт-директор</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
              Опишите «боль» клиента, и я подберу товары, создам баннер и напишу пост.
            </p>
            <div className="mt-4 space-y-2 w-full max-w-[280px]">
              {['Плохой сон и тревожность', 'Выпадение волос', 'Нет энергии, постоянная усталость'].map((hint) => (
                <button
                  key={hint}
                  onClick={() => { setInput(hint); }}
                  className="w-full text-left px-3 py-2 bg-slate-50 hover:bg-fuchsia-50 rounded-xl text-xs text-slate-600 hover:text-fuchsia-700 border border-slate-100 hover:border-fuchsia-200 transition-all"
                >
                  💬 {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'agent' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center mt-0.5">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-fuchsia-600 text-white rounded-br-md'
                  : 'bg-slate-100 text-slate-800 rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center mt-0.5">
                <User size={14} className="text-slate-600" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Инпут */}
      <div className="p-3 border-t border-slate-100">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Опишите боль клиента или что изменить в баннере..."
            rows={1}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-1.5 shadow-md shadow-fuchsia-500/20 hover:opacity-90 disabled:opacity-40 transition-all"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
