"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Play, Pause, RotateCcw, Send, Volume2, VolumeX, 
  Layers, Film, Sliders, Download, Copy, Check, Plus, Trash2, 
  Search, ArrowLeft, ArrowRight, Clock, ShieldCheck, Pill, 
  Zap, Activity, Eye, Settings2, Mic, Share2, HelpCircle, 
  RefreshCw, ChevronRight, CheckCircle2, AlertCircle, ShoppingBag,
  ExternalLink, Wand2, Palette, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminDbQuery } from '@/lib/admin-api';
import { Product } from '@/lib/types';
import { 
  VideoProject, VideoScene, SelectedProduct, 
  HudOverlay, ChatMessage, MoAAsset 
} from './video-studio/types';
import { MOA_ASSETS } from './video-studio/moaAssets';

interface VideoStudioProps {
  onBack?: () => void;
}

const PRESET_ANGLES = [
  { label: '⚡ Упадок сил и энергия', focus: 'Хроническая усталость, истощение митохондрий и нехватка АТФ по утрам' },
  { label: '🧠 Стресс и бессонница', focus: 'Высокий кортизол, тревожность, прерывистый сон и перевозбуждение нейронов' },
  { label: '✨ Anti-Age и сияние кожи', focus: 'Потеря эластичности, разрушение коллагеновой сетки фибробластов и сухая дерма' },
  { label: '🦴 Хруст и боли в суставах', focus: 'Истирание хряща, воспаление синовиальной жидкости и скованность движений' },
  { label: '🛡 Иммунный щит', focus: 'Слабый фагоцитоз, частые простуды и защита мембран клеток от вирусов' },
];

export const VideoStudio: React.FC<VideoStudioProps> = ({ onBack }) => {
  // Catalog & Product Selection
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Focus & Project Config
  const [customFocus, setCustomFocus] = useState('');
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Chat Copilot
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Привет, шеф! Я твой персональный AI-Режиссер и клинический нутрициолог TOJ-VITAMIN. Выбери от 1 до 3 товаров из каталога, укажи фокус или надиктуй задачу, и я соберу кинематографичный MoA-ролик с 3D-анимацией действия в организме!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedPrompts: [
        'Собери ролик про Магний B6 для крепкого сна',
        'Сделай комбо D3 + K2 с акцентом на чистые сосуды',
        'Ролик про Морской коллаген против морщин'
      ]
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Video Player State
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0); // 0 to 100%
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [targetSceneForAsset, setTargetSceneForAsset] = useState<number>(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  // Load Catalog on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoadingCatalog(true);
    try {
      const res = await adminDbQuery({
        action: 'select',
        table: 'products'
      });
      if (res && res.data && Array.isArray(res.data)) {
        setCatalogProducts(res.data);
      } else if (Array.isArray(res)) {
        setCatalogProducts(res);
      }
    } catch (e) {
      console.error('Failed to load products for video studio', e);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Product Selection Handlers
  const handleToggleProduct = (product: Product) => {
    const exists = selectedProducts.find(p => p.id === product.id);
    if (exists) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      if (selectedProducts.length >= 3) {
        alert('Можно выбрать максимум 3 товара для одного рекламного связочного ролика');
        return;
      }
      const firstImage = product.image_url || undefined;
      const newSel: SelectedProduct = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: firstImage,
        category: (product.tags && product.tags[0]) || 'Витамины',
        dosage: (product as any).dosage || '1 капсула в день',
        activeIngredients: product.tags && product.tags.length > 0 ? product.tags : [product.name]
      };
      setSelectedProducts([...selectedProducts, newSel]);
    }
  };

  const handleRemoveProduct = (id: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== id));
  };

  // Trigger Project Generation
  const handleCreateProject = async (overridePrompt?: string) => {
    setIsGenerating(true);
    setIsThinking(true);

    const userPrompt = overridePrompt || customFocus || (selectedProducts.length > 0 
      ? `Создай MoA-ролик для ${selectedProducts.map(p => p.name).join(' + ')}`
      : 'Создай мощный продающий ролик');

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: userPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/admin/video-studio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_project',
          message: userPrompt,
          selectedProducts,
          focusAngle: customFocus,
          currentProject: activeProject
        })
      });

      const data = await res.json();
      if (data.success && data.project) {
        setActiveProject(data.project);
        setCurrentSceneIdx(0);
        setSceneProgress(0);

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          appliedActions: data.appliedActions,
          suggestedPrompts: data.suggestedPrompts
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || 'Ошибка при генерации проекта');
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `⚠️ Не удалось собрать проект: ${err.message || 'Ошибка сети'}. Попробуйте снова.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsGenerating(false);
      setIsThinking(false);
    }
  };

  // Send Natural Language Command to Copilot
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || chatInput).trim();
    if (!prompt) return;

    setChatInput('');
    setIsThinking(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/admin/video-studio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: activeProject ? 'chat_command' : 'create_project',
          message: prompt,
          selectedProducts,
          focusAngle: customFocus,
          currentProject: activeProject
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.project) {
          setActiveProject(data.project);
        }

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          appliedActions: data.appliedActions,
          suggestedPrompts: data.suggestedPrompts
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || 'Ошибка выполнения команды');
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `⚠️ Ошибка: ${err.message || 'Не удалось применить правку'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  // Voice Input Simulation (SpeechRecognition)
  const toggleVoiceInput = () => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = false;

      if (!isListening) {
        setIsListening(true);
        recognition.start();
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setChatInput(transcript);
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
      } else {
        recognition.stop();
        setIsListening(false);
      }
    } else {
      alert('Голосовой ввод не поддерживается данным браузером. Пожалуйста, используйте Google Chrome.');
    }
  };

  // Video Timeline & Player Loop
  const currentScene: VideoScene | undefined = activeProject?.scenes[currentSceneIdx];
  const activeMoaAsset = MOA_ASSETS.find(a => a.id === currentScene?.visualAssetId) || MOA_ASSETS[0];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && activeProject && activeProject.scenes.length > 0) {
      const sceneDuration = (currentScene?.durationSeconds || 5) * 1000;
      const stepMs = 100;
      const increment = (stepMs / sceneDuration) * 100;

      interval = setInterval(() => {
        setSceneProgress(prev => {
          if (prev >= 100) {
            // Move to next scene or loop
            if (currentSceneIdx < activeProject.scenes.length - 1) {
              setCurrentSceneIdx(curr => curr + 1);
              return 0;
            } else {
              setCurrentSceneIdx(0);
              return 0;
            }
          }
          return prev + increment;
        });
      }, stepMs);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentSceneIdx, currentScene, activeProject]);

  // Voice synthesis preview fallback
  const handlePlayVoice = () => {
    if (!currentScene?.voiceoverText || isMuted) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentScene.voiceoverText);
      utterance.lang = 'ru-RU';
      utterance.rate = 1.05;
      utterance.pitch = 0.95; // slightly deeper doctor voice
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (isPlaying && !isMuted) {
      handlePlayVoice();
    }
  }, [currentSceneIdx, isPlaying]);

  // Asset Swap Handler
  const handleSelectAssetForScene = (assetId: string) => {
    if (!activeProject) return;
    const updatedScenes = [...activeProject.scenes];
    if (updatedScenes[targetSceneForAsset]) {
      updatedScenes[targetSceneForAsset] = {
        ...updatedScenes[targetSceneForAsset],
        visualAssetId: assetId
      };
      setActiveProject({
        ...activeProject,
        scenes: updatedScenes
      });
    }
    setShowAssetPicker(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl px-6 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <ArrowLeft size={18} />
              <span>Назад в пульт</span>
            </button>
          )}
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Wand2 size={18} className="text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">Toj-Bio Studio</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  AI 3D MoA ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400">Генератор и монтаж биомедицинских рекламных роликов (9:16)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeProject && (
            <>
              <button 
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 border border-slate-700 transition-all"
              >
                <Share2 size={14} className="text-emerald-400" />
                <span>Текст & Теги для Reels</span>
              </button>
              <button 
                onClick={() => alert('Рендеринг запущен! Готовый MP4 с 3D-анимацией и субтитрами сформируется через 30-40 секунд.')}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
              >
                <Download size={15} />
                <span>Срендерить в 4K MP4</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Studio Workspace: Two Columns */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: PRODUCTS + FOCUS + AI COPILOT CHAT (45%)    */}
        {/* ======================================================== */}
        <div className="w-[46%] border-r border-slate-800/80 bg-slate-900/40 flex flex-col justify-between">
          <div className="p-6 overflow-y-auto space-y-6 flex-1 max-h-[calc(100vh-140px)]">
            
            {/* 1. PRODUCT MULTI-PICKER (1-3 Products) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShoppingBag size={16} className="text-emerald-400" />
                    Выбор товаров для ролика ({selectedProducts.length}/3)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Выберите 1 товар или комбо из 2–3 препаратов для синергии</p>
                </div>
                {selectedProducts.length > 0 && (
                  <button 
                    onClick={() => setSelectedProducts([])}
                    className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    Очистить все
                  </button>
                )}
              </div>

              {/* Selected Badges */}
              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedProducts.map((p, idx) => (
                    <div 
                      key={p.id}
                      className="flex items-center gap-2.5 bg-slate-800/90 border border-emerald-500/30 rounded-xl px-3 py-1.5 shadow-sm"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {p.image && (
                        <img src={p.image} alt={p.name} className="w-6 h-6 object-contain rounded" />
                      )}
                      <span className="text-xs font-semibold text-slate-200 max-w-[140px] truncate">{p.name}</span>
                      <span className="text-[11px] text-emerald-400 font-bold">{p.price} TJS</span>
                      <button 
                        onClick={() => handleRemoveProduct(p.id)}
                        className="text-slate-500 hover:text-rose-400 ml-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Synergy Detection Callout */}
              {selectedProducts.length >= 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/40 rounded-xl flex items-start gap-2.5"
                >
                  <Zap size={16} className="text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold text-emerald-300">
                      ⚡ Биохимическая синергия активирована!
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                      AI свяжет выбранные препараты в единый каскад усвоения, усиливая взаимную биодоступность в кадре до +180%.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Product Search & Dropdown */}
              <div className="relative">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus-within:border-emerald-500 transition-colors">
                  <Search size={14} className="text-slate-500" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setIsSearching(true);
                    }}
                    onFocus={() => setIsSearching(true)}
                    placeholder="Начните вводить название витамина (например, Магний, Омега, Коллаген)..."
                    className="bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 flex-1"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setIsSearching(false); }}>
                      <Trash2 size={13} className="text-slate-500 hover:text-slate-300" />
                    </button>
                  )}
                </div>

                {/* Dropdown Menu */}
                {isSearching && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto p-1 divide-y divide-slate-800">
                    {loadingCatalog ? (
                      <div className="p-3 text-xs text-slate-500 text-center">Загрузка каталога...</div>
                    ) : (
                      catalogProducts
                        .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 10)
                        .map(p => {
                          const isSelected = selectedProducts.some(sel => sel.id === p.id);
                          return (
                            <div 
                              key={p.id}
                              onClick={() => {
                                handleToggleProduct(p);
                                setSearchQuery('');
                                setIsSearching(false);
                              }}
                              className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-emerald-950/40 text-emerald-300' : 'hover:bg-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                {p.image_url ? (
                                  <img src={p.image_url} alt={p.name} className="w-7 h-7 object-contain rounded bg-slate-950 p-0.5" />
                                ) : (
                                  <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                    V
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-semibold">{p.name}</p>
                                  <p className="text-[10px] text-slate-400">{(p.tags && p.tags[0]) || 'Витамины'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-400">{p.price} TJS</span>
                                {isSelected ? (
                                  <CheckCircle2 size={16} className="text-emerald-400" />
                                ) : (
                                  <Plus size={16} className="text-slate-500" />
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 2. CREATIVE ANGLE & FOCUS */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders size={16} className="text-emerald-400" />
                Главный акцент / Направление ролика
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ANGLES.map(angle => (
                  <button
                    key={angle.label}
                    onClick={() => setCustomFocus(angle.focus)}
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all ${
                      customFocus === angle.focus 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {angle.label}
                  </button>
                ))}
              </div>
              <textarea 
                value={customFocus}
                onChange={e => setCustomFocus(e.target.value)}
                placeholder="Или напишите свой фокус: например, 'Сделай акцент на том, что форма хелатная, не раздражает желудок и принимается строго перед сном'..."
                className="w-full h-16 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-500 transition-colors resize-none"
              />
              <button 
                onClick={() => handleCreateProject()}
                disabled={isGenerating}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>AI-Режиссер формирует раскадровку...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>{activeProject ? 'Сгенерировать новый концепт' : 'Сгенерировать MoA-ролик'}</span>
                  </>
                )}
              </button>
            </div>

            {/* 3. AI COPILOT CHAT (Gemini Omni Assistant) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare size={16} className="text-emerald-400" />
                  AI-Режиссер (Управление естественным языком)
                </h3>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Online • Tool Executor
                </span>
              </div>

              {/* Chat Messages Log */}
              <div 
                ref={chatScrollRef}
                className="h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800"
              >
                {messages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                        msg.sender === 'user' 
                          ? 'bg-emerald-600 text-white rounded-br-none' 
                          : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
                      }`}
                    >
                      <p>{msg.text}</p>
                      
                      {/* Applied Actions Tags */}
                      {msg.appliedActions && msg.appliedActions.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 space-y-1">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Примененные действия:</p>
                          {msg.appliedActions.map((act, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                              <span>{act}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>

                    {/* Suggested Follow-up Prompts */}
                    {msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {msg.suggestedPrompts.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(sug)}
                            className="text-[10px] text-slate-400 bg-slate-950/80 hover:bg-slate-800 hover:text-emerald-300 border border-slate-800 rounded-lg px-2.5 py-1 transition-all text-left"
                          >
                            ↳ {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2 bg-slate-950/50 rounded-xl w-fit">
                    <RefreshCw size={13} className="animate-spin text-emerald-400" />
                    <span>AI-Режиссер анализирует сцены и вносит изменения...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Box */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button 
                  onClick={toggleVoiceInput}
                  title="Надиктовать голосом"
                  className={`p-2.5 rounded-xl border transition-all ${
                    isListening 
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500 animate-pulse' 
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Mic size={16} />
                </button>
                <input 
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Скажите ассистенту: 'Сделай хук жестче', 'Смени 2-ю сцену на сосуды'..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-emerald-500 transition-colors"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim() || isThinking}
                  className="p-2.5 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-colors disabled:opacity-40"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: 9:16 LIVE CANVAS & TIMELINE STORYBOARD     */}
        {/* ======================================================== */}
        <div className="flex-1 bg-slate-950 flex flex-col justify-between overflow-y-auto p-6">
          
          {activeProject ? (
            <div className="max-w-4xl mx-auto w-full space-y-6">

              {/* 1. Project Header Info */}
              <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 px-5 py-3 rounded-2xl">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Film size={16} className="text-emerald-400" />
                    {activeProject.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Формат: <span className="text-slate-300 font-semibold">{activeProject.aspectRatio}</span> • 
                    ЦА: <span className="text-slate-300 font-semibold">{activeProject.targetAudience}</span> • 
                    Сцен: <span className="text-emerald-400 font-bold">{activeProject.scenes.length}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Диктор:</span>
                  <span className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-200 font-medium">
                    {activeProject.voiceConfig.speaker === 'doctor_male' ? '👨‍⚕️ Доктор (Мужской)' : '👩‍⚕️ Эксперт (Женский)'}
                  </span>
                </div>
              </div>

              {/* 2. Interactive Video Preview & Player Canvas */}
              <div className="flex justify-center items-center py-2">
                <div className="relative w-[340px] h-[600px] bg-black rounded-[36px] border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between select-none">
                  
                  {/* LAYER 1: 3D Anatomical / Biological Background Animation */}
                  <div className={`absolute inset-0 bg-gradient-to-b ${activeMoaAsset.gradientBg} opacity-90 transition-all duration-700`}>
                    {/* Simulated Floating Particles / Biological Movement */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl absolute -top-10 -left-10 animate-pulse" />
                      <div className="w-80 h-80 rounded-full bg-purple-500/10 blur-3xl absolute bottom-10 right-0 animate-pulse delay-700" />
                      
                      {/* Grid / Microscopic Depth Lines */}
                      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px]" />
                    </div>
                  </div>

                  {/* Top Bar inside Phone Screen */}
                  <div className="relative z-10 p-4 flex items-center justify-between text-white/80">
                    <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span>{activeMoaAsset.name}</span>
                    </div>
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white"
                    >
                      {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                  </div>

                  {/* LAYER 2: Floating 3D Product Bottles */}
                  <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4">
                    {activeProject.selectedProducts && activeProject.selectedProducts.length > 0 && (
                      <motion.div 
                        animate={{ 
                          y: isPlaying ? [0, -8, 0] : 0,
                          rotate: isPlaying ? [-1, 1, -1] : 0 
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="relative flex items-center justify-center -space-x-8"
                      >
                        {activeProject.selectedProducts.map((p, idx) => (
                          <div 
                            key={p.id}
                            className="relative filter drop-shadow-[0_20px_25px_rgba(0,0,0,0.8)]"
                            style={{ zIndex: 10 - idx }}
                          >
                            {p.image ? (
                              <img 
                                src={p.image} 
                                alt={p.name} 
                                className="w-28 h-36 object-contain filter drop-shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                              />
                            ) : (
                              <div className="w-24 h-32 rounded-2xl bg-gradient-to-b from-slate-700 to-slate-900 border border-emerald-500/40 flex flex-col items-center justify-center p-2 text-center">
                                <Pill size={24} className="text-emerald-400 mb-1" />
                                <span className="text-[10px] font-bold text-white leading-tight">{p.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {/* LAYER 3: Medical HUD Overlays */}
                    {currentScene?.hudOverlays && currentScene.hudOverlays.map(hud => (
                      <motion.div 
                        key={hud.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4 bg-black/60 backdrop-blur-md border border-emerald-400/50 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg shadow-emerald-950"
                      >
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <div>
                          <p className="text-[10px] font-bold text-white tracking-wide">{hud.label}</p>
                          {hud.value && <p className="text-[9px] text-emerald-400 font-semibold">{hud.value}</p>}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* LAYER 4: Dynamic Karaoke Subtitles */}
                  <div className="relative z-10 p-5 bg-gradient-to-t from-black via-black/80 to-transparent space-y-3">
                    <div className="bg-black/70 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center shadow-lg">
                      <p className="text-xs font-black uppercase tracking-wider text-emerald-400 leading-snug drop-shadow-md">
                        {currentScene?.voiceoverText}
                      </p>
                    </div>

                    {/* Progress Bar of Current Scene */}
                    <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-full transition-all duration-100 ease-linear"
                        style={{ width: `${sceneProgress}%` }}
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* 3. Player Controls Bar */}
              <div className="flex items-center justify-center gap-4 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl max-w-md mx-auto">
                <button 
                  onClick={() => {
                    setCurrentSceneIdx(curr => Math.max(0, curr - 1));
                    setSceneProgress(0);
                  }}
                  disabled={currentSceneIdx === 0}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                >
                  <ArrowLeft size={18} />
                </button>

                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-bold flex items-center gap-2 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 active:scale-95 transition-all text-xs"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  <span>{isPlaying ? 'Пауза' : 'Воспроизвести'}</span>
                </button>

                <button 
                  onClick={() => {
                    setCurrentSceneIdx(curr => Math.min(activeProject.scenes.length - 1, curr + 1));
                    setSceneProgress(0);
                  }}
                  disabled={currentSceneIdx === activeProject.scenes.length - 1}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                >
                  <ArrowRight size={18} />
                </button>

                <button 
                  onClick={() => {
                    setCurrentSceneIdx(0);
                    setSceneProgress(0);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Сбросить в начало"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {/* 4. Scene Storyboard Timeline Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers size={16} className="text-emerald-400" />
                    Раскадровка ролика (Кликните на сцену для предпросмотра)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Общий хронометраж: {activeProject.scenes.reduce((acc, s) => acc + s.durationSeconds, 0)} сек
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {activeProject.scenes.map((scene, idx) => {
                    const isCurrent = idx === currentSceneIdx;
                    const asset = MOA_ASSETS.find(a => a.id === scene.visualAssetId) || MOA_ASSETS[0];

                    return (
                      <div 
                        key={scene.id}
                        onClick={() => {
                          setCurrentSceneIdx(idx);
                          setSceneProgress(0);
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          isCurrent 
                            ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/50' 
                            : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isCurrent ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
                          }`}>
                            Сцена {idx + 1} • {scene.durationSeconds}с
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setTargetSceneForAsset(idx);
                              setShowAssetPicker(true);
                            }}
                            className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Palette size={11} /> Сменить 3D
                          </button>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-white">{scene.title}</p>
                          <p className="text-[11px] text-slate-300 mt-1 line-clamp-3 leading-relaxed italic">
                            «{scene.voiceoverText}»
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="truncate max-w-[120px]">{asset.name}</span>
                          <span className="text-emerald-400 font-semibold">{scene.hudOverlays?.length || 0} плашки</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-12 max-w-lg mx-auto space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
                <Film size={36} className="text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Студия готова к созданию ролика</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Выберите товары из каталога слева или задайте тему в окне AI-Режиссера. Система автоматически разработает сценарий, свяжет синергию и подберет 3D-анимацию работы внутри организма.
                </p>
              </div>
              <button 
                onClick={() => handleCreateProject()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Sparkles size={16} />
                <span>Создать первый демо-ролик</span>
              </button>
            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: 3D ANATOMICAL ASSET PICKER */}
      {showAssetPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Выбор 3D-анимации органа / процесса</h3>
                <p className="text-xs text-slate-400">Выберите подходящую анатомическую сцену для Сцены {targetSceneForAsset + 1}</p>
              </div>
              <button 
                onClick={() => setShowAssetPicker(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {MOA_ASSETS.map(asset => (
                <div 
                  key={asset.id}
                  onClick={() => handleSelectAssetForScene(asset.id)}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {asset.name}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">{asset.category}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{asset.description}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {asset.associatedNutrients.slice(0, 3).map(n => (
                      <span key={n} className="text-[9px] bg-slate-900 px-2 py-0.5 rounded text-slate-300">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EXPORT COPY & HASHTAGS FOR INSTAGRAM REELS */}
      {showExportModal && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Share2 size={16} className="text-emerald-400" />
                  Готовый текст для описания Reels / TikTok
                </h3>
                <p className="text-xs text-slate-400">Скопируйте продающий текст с хэштегами под этот ролик</p>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 space-y-3 max-h-72 overflow-y-auto font-mono whitespace-pre-wrap">
{`🔬 Как это работает внутри организма? Разбираем биохимию!

${activeProject.scenes.map(s => `📍 ${s.title}: ${s.voiceoverText}`).join('\n\n')}

🔥 В наличии в аптеке TOJ-VITAMIN с гарантией 100% оригинальности.
🚚 Быстрая доставка по Душанбе и всему Таджикистану за 2 часа!

👉 Для консультации и заказа пишите в Direct или переходите по ссылке в шапке профиля.

#витаминыдушанбе #витаминытаджикистан #здоровье #биохакинг #нутрициолог ${activeProject.selectedProducts.map(p => `#${p.name.replace(/\s+/g, '').toLowerCase()}`).join(' ')}`}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Закрыть
              </button>
              <button 
                onClick={() => {
                  const text = `🔬 Как это работает внутри организма? Разбираем биохимию!\n\n${activeProject.scenes.map(s => `📍 ${s.title}: ${s.voiceoverText}`).join('\n\n')}\n\n🔥 В наличии в TOJ-VITAMIN. Заказ в Direct!`;
                  navigator.clipboard.writeText(text);
                  setCopiedCaption(true);
                  setTimeout(() => setCopiedCaption(false), 2000);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 flex items-center gap-1.5 transition-all"
              >
                {copiedCaption ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedCaption ? 'Скопировано!' : 'Скопировать текст'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
