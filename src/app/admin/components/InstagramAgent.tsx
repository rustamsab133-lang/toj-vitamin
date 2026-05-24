"use client";
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Sparkles, Image as ImageIcon, Copy, Check, Download, 
  AlertCircle, Loader2, Settings, Calendar, Database, Search, Plus, Trash2, RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { applyMarkupToProduct } from '@/lib/markup';

interface InstagramAgentProps {
  onBack: () => void;
}

interface GenerationResult {
  painPoint: string;
  headline: string;
  caption: string;
  reasoning: string;
  bannerUrl: string;
  selectedProducts: {
    id: string;
    name: string;
    synergy_reason: string;
  }[];
}

interface Product {
  id: string;
  name: string;
  full_name: string;
  description: string;
  price: number;
  image_url: string | null;
}

export function InstagramAgent({ onBack }: InstagramAgentProps) {
  // Навигация по табам
  const [activeTab, setActiveTab] = useState<'generator' | 'autopost' | 'settings' | 'knowledge' | 'ab_tests' | 'audit'>('generator');

  // --- Таб 1: Генератор постов ---
  const [painPoint, setPainPoint] = useState('');
  const [selectedLang, setSelectedLang] = useState('ru');
  const [selectedTone, setSelectedTone] = useState('marketing');
  const [selectedStyle, setSelectedStyle] = useState('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // --- Таб 2, 3: Настройки Агента и авто-постинга ---
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [agentActive, setAgentActive] = useState(true);
  const [agentChatLang, setAgentChatLang] = useState('auto');
  
  const [autoPostSchedule, setAutoPostSchedule] = useState('off');
  const [autoBannerStyle, setAutoBannerStyle] = useState('auto');
  const [autoPostTopics, setAutoPostTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');

  // --- Таб 4: База знаний ИИ ---
  const [products, setProducts] = useState<Product[]>([]);
  const [enrichedCatalog, setEnrichedCatalog] = useState<Record<string, any>>({});
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Поля редактирования для выбранного продукта
  const [editingProperties, setEditingProperties] = useState<string[]>([]);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [editingSynergies, setEditingSynergies] = useState<string[]>([]);
  const [editingHooks, setEditingHooks] = useState<string[]>([]);

  const [newProperty, setNewProperty] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newSynergy, setNewSynergy] = useState('');
  const [newHook, setNewHook] = useState('');

  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);
  const [isEnrichingProduct, setIsEnrichingProduct] = useState(false);
  // --- Таб 5: A/B Тесты ---
  const [prompts, setPrompts] = useState<any[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<any | null>(null);

  // --- Таб 6: Аудит и Обучение ---
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);


  // Загрузка настроек и продуктов при монтировании
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoadingSettings(true);
    setIsLoadingKnowledge(true);
    try {
      // 1. Загрузка настроек из site_settings
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('key, value');

      const getSetting = (key: string, defaultValue: string) => {
        const item = settingsData?.find(s => s.key === key);
        return item ? item.value : defaultValue;
      };

      setAgentActive(getSetting('instagram_agent_active', 'true') === 'true');
      setAgentChatLang(getSetting('instagram_agent_chat_lang', 'auto'));
      setAutoPostSchedule(getSetting('instagram_autopost_schedule', 'off'));
      setAutoBannerStyle(getSetting('instagram_auto_banner_style', 'auto'));
      
      try {
        const topicsJson = getSetting('instagram_autopost_topics', '[]');
        setAutoPostTopics(JSON.parse(topicsJson));
      } catch (e) {
        setAutoPostTopics(['усталость и апатия', 'выпадение волос', 'здоровье суставов']);
      }

      // 2. Загрузка активных продуктов
      const { data: dbProducts } = await supabase
        .from('products')
        .select('*')
        .order('id');
      
      if (dbProducts) {
        const percent = parseFloat(getSetting('price_markup_percent', '0')) || 0;
        const flat = parseFloat(getSetting('price_markup_flat', '0')) || 0;
        
        const activeProds = dbProducts
          .filter((p: any) => p.price > 0 && !p.name.includes('[УДАЛЕН]'))
          .map((p: any) => applyMarkupToProduct(p, { percent, flat }));
        
        setProducts(activeProds);
      }

      // 3. Загрузка справочника обогащенных свойств (Базы Знаний) из site_settings
      const enrichedSetting = settingsData?.find(s => s.key === 'enriched_gls_products_data');
      if (enrichedSetting?.value) {
        setEnrichedCatalog(JSON.parse(enrichedSetting.value));
      } else {
        // Fallback на API/Файл
        await fetch('/api/webhooks/instagram').catch(() => {}); // webhook GET does nothing but we can load file or local fallback
      }

      // 4. Загрузка промптов
      const { data: promptsData } = await supabase.from('agent_prompts').select('*').order('created_at', { ascending: false });
      if (promptsData) setPrompts(promptsData);

      // 5. Загрузка последних чатов
      const { data: chatsData } = await supabase.from('agent_chats').select('*').order('updated_at', { ascending: false }).limit(20);
      if (chatsData) setRecentChats(chatsData);

    } catch (err) {
      console.error('Ошибка при загрузке настроек ИИ:', err);
    } finally {
      setIsLoadingSettings(false);
      setIsLoadingKnowledge(false);
    }
  };

  // Сохранение настроек агента и автопостинга в Supabase
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSaveSuccess(false);

    const payload = [
      { key: 'instagram_agent_active', value: String(agentActive) },
      { key: 'instagram_agent_chat_lang', value: agentChatLang },
            { key: 'instagram_auto_post_schedule', value: autoPostSchedule },
      { key: 'instagram_auto_banner_style', value: autoBannerStyle },
      { key: 'instagram_auto_post_topics', value: JSON.stringify(autoPostTopics) }
    ];

    try {
      for (const item of payload) {
        await supabase
          .from('site_settings')
          .upsert({ key: item.key, value: item.value, updated_at: new Date().toISOString() });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Ошибка сохранения настроек:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Выбор продукта в базе знаний
  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    const key = prod.name.toLowerCase().trim();
    const enriched = enrichedCatalog[key] || {};
    
    setEditingProperties(enriched.properties || []);
    setEditingTags(enriched.tags || ['Иммунитет']);
    setEditingSynergies(enriched.synergies || []);
    setEditingHooks(enriched.marketing_hooks || []);
    
    setNewProperty('');
    setNewTag('');
    setNewSynergy('');
    setNewHook('');
  };

  // Авто-генерация свойств продукта через ИИ (Gemini)
  const handleAutoEnrichProduct = async () => {
    if (!selectedProduct) return;
    setIsEnrichingProduct(true);
    try {
      const response = await fetch('/api/agents/instagram/enrich-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: selectedProduct.name,
          fullName: selectedProduct.full_name
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setEditingProperties(result.data.properties || []);
        setEditingTags(result.data.tags || []);
        setEditingSynergies(result.data.synergies || []);
        setEditingHooks(result.data.marketing_hooks || []);
      } else {
        alert('Не удалось сгенерировать свойства через ИИ.');
      }
    } catch (e) {
      console.error('Ошибка ИИ обогащения:', e);
      alert('Ошибка соединения с сервером.');
    } finally {
      setIsEnrichingProduct(false);
    }
  };

  // Добавление / Удаление элементов свойств продукта
  const handleAddProp = () => {
    if (newProperty.trim()) {
      setEditingProperties([...editingProperties, newProperty.trim()]);
      setNewProperty('');
    }
  };
  const handleAddTag = () => {
    if (newTag.trim()) {
      setEditingTags([...editingTags, newTag.trim()]);
      setNewTag('');
    }
  };
  const handleAddSynergy = () => {
    if (newSynergy.trim()) {
      setEditingSynergies([...editingSynergies, newSynergy.trim()]);
      setNewSynergy('');
    }
  };
  const handleAddHook = () => {
    if (newHook.trim()) {
      setEditingHooks([...editingHooks, newHook.trim()]);
      setNewHook('');
    }
  };

  // Сохранение отредактированного продукта в общий каталог в Supabase
  const handleSaveProductKnowledge = async () => {
    if (!selectedProduct) return;
    setIsSavingKnowledge(true);

    const productKey = selectedProduct.name.toLowerCase().trim();
    const updatedCatalog = {
      ...enrichedCatalog,
      [productKey]: {
        name: selectedProduct.name,
        properties: editingProperties,
        tags: editingTags,
        synergies: editingSynergies,
        marketing_hooks: editingHooks
      }
    };

    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key: 'enriched_gls_products_data',
          value: JSON.stringify(updatedCatalog),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setEnrichedCatalog(updatedCatalog);
      alert('База знаний продукта успешно сохранена и синхронизирована с Supabase!');
    } catch (err: any) {
      console.error('Ошибка при сохранении Базы Знаний:', err);
      alert(`Ошибка при сохранении: ${err.message}`);
    } finally {
      setIsSavingKnowledge(false);
    }
  };

  // Генерация поста в Табе 1
  const handleGenerate = async () => {
    if (!painPoint.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/agents/instagram/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          painPoint: painPoint.trim(),
          lang: selectedLang,
          tone: selectedTone,
          bannerStyle: selectedStyle
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Произошла ошибка при генерации. Попробуйте еще раз.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCaption = () => {
    if (result) {
      navigator.clipboard.writeText(result.caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Темы/Боли для планирования автопостов
  const handleAddTopic = () => {
    if (newTopic.trim() && !autoPostTopics.includes(newTopic.trim())) {
      setAutoPostTopics([...autoPostTopics, newTopic.trim()]);
      setNewTopic('');
    }
  };
  const handleRemoveTopic = (index: number) => {
    setAutoPostTopics(autoPostTopics.filter((_, i) => i !== index));
  };

  // Поиск продуктов в базе знаний
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24 text-slate-800">
      {/* Шапка с градиентным размытием */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="text-fuchsia-500" size={24} />
              Instagram ИИ-Маркетолог
            </h2>
            <p className="text-sm text-slate-500">Генератор постов, умный автоответчик и база клинических знаний ИИ</p>
          </div>
        </div>

        {/* Переключатель вкладок */}
        <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-xl border border-slate-200/50">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'generator' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Sparkles size={14} /> Генератор Постов
          </button>
          <button
            onClick={() => setActiveTab('autopost')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'autopost' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Calendar size={14} /> Авто-постинг
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'settings' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Settings size={14} /> Настройки Агента
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'knowledge' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Database size={14} /> 📚 База Знаний ИИ
          </button>
          <button
            onClick={() => setActiveTab('ab_tests')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'ab_tests' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Settings size={14} /> A/B Тесты
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'audit' ? 'bg-white text-fuchsia-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Database size={14} /> Аудит Чатов
          </button>

        </div>
      </div>

      {/* --- ТАБ 1: ГЕНЕРАТОР ПОСТОВ --- */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Какую &quot;боль&quot; мы решаем сегодня?</label>
              <input
                type="text"
                value={painPoint}
                onChange={(e) => setPainPoint(e.target.value)}
                placeholder="Например: плохой сон и тревожность, выпадение волос, сосуды..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition-all mb-4"
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
              />

              {/* Настройки тональности, языка и стиля */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Язык поста</label>
                  <select
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-fuchsia-500"
                  >
                    <option value="ru">Русский</option>
                    <option value="tj">Таджикский</option>
                    <option value="tj_ru">Двуязычный (TJ / RU)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Тональность текста</label>
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-fuchsia-500"
                  >
                    <option value="marketing">Маркетинговый / Продающий</option>
                    <option value="expert">Экспертный / Нутрициология</option>
                    <option value="friendly">Эмпатичный / Дружелюбный</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Стиль баннера</label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-fuchsia-500"
                  >
                    <option value="auto">🤖 Автоопределение ИИ (Smart)</option>
                    <option value="warm_editorial">🏛️ Теплый Травертин (Warm Editorial)</option>
                    <option value="emerald_mint">🌿 Мятный Спа-Дзен (Emerald Mint)</option>
                    <option value="matte_slate">🛡️ Графит и Бетон (Matte Slate)</option>
                    <option value="glass_minimal">💎 Стеклянный Минимализм (Glass Minimal)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !painPoint.trim()}
                className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-md shadow-fuchsia-500/20 transition-all flex items-center gap-2"
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {isGenerating ? 'Создаем шедевр...' : 'Сгенерировать'}
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Левая колонка - Баннер */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <ImageIcon size={18} className="text-slate-400" /> Готовый баннер (1080x1920)
                  </h3>
                  <a
                    href={result.bannerUrl}
                    download="instagram-banner.jpg"
                    className="flex items-center gap-2 text-xs font-bold text-fuchsia-600 bg-fuchsia-50 hover:bg-fuchsia-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download size={14} /> Скачать
                  </a>
                </div>
                
                <div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative aspect-[9/16] max-h-[700px] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.bannerUrl} alt="Generated Banner" className="w-full h-full object-cover" />
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">💡 Логика ИИ (Связка):</p>
                  <p className="text-sm text-slate-600">{result.reasoning}</p>
                </div>
              </div>

              {/* Правая колонка - Текст */}
              <div className="space-y-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">✍️</span> Текст для Instagram
                  </h3>
                  <button
                    onClick={handleCopyCaption}
                    className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copied ? 'Скопировано!' : 'Копировать текст'}
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex-1">
                  <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {result.caption}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Выбранные витамины в связке:</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.selectedProducts.map(p => (
                      <div key={p.id} className="bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm text-xs font-bold text-fuchsia-600">
                        💊 {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* --- ТАБ 2: АВТО-ПОСТИНГ --- */}
      {activeTab === 'autopost' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-fuchsia-500" size={20} />
            Планирование и автогенерация контента в ленту
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Интервал авто-постинга</label>
                <select
                  value={autoPostSchedule}
                  onChange={(e) => setAutoPostSchedule(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-fuchsia-500"
                >
                  <option value="off">Выключен (Только ручная генерация)</option>
                  <option value="daily">Каждый день (1 пост в сутки)</option>
                  <option value="three_days">Раз в 3 дня</option>
                  <option value="weekly">Раз в неделю</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Визуальный стиль баннеров</label>
                <select
                  value={autoBannerStyle}
                  onChange={(e) => setAutoBannerStyle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-fuchsia-500"
                >
                  <option value="auto">🤖 Автоопределение ИИ (Smart)</option>
                  <option value="warm_editorial">🏛️ Теплый Травертин (Warm Editorial)</option>
                  <option value="emerald_mint">🌿 Мятный Спа-Дзен (Emerald Mint)</option>
                  <option value="matte_slate">🛡️ Графит и Бетон (Matte Slate)</option>
                  <option value="glass_minimal">💎 Стеклянный Минимализм (Glass Minimal)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700">Темы и боли для генерации постов</label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Добавить новую тему (например: синдром выгорания)"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-fuchsia-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTopic(); }}
                />
                <button
                  onClick={handleAddTopic}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                >
                  <Plus size={14} /> Добавить
                </button>
              </div>

              <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-100">
                {autoPostTopics.map((topic, index) => (
                  <div key={index} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                    <span>{topic}</span>
                    <button
                      onClick={() => handleRemoveTopic(index)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {autoPostTopics.length === 0 && (
                  <p className="text-xs text-slate-400 p-2">Темы не добавлены. Пожалуйста, добавьте хотя бы одну тему.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-bold rounded-xl shadow-md shadow-fuchsia-500/20 transition-all flex items-center gap-2"
            >
              {isSavingSettings ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {isSavingSettings ? 'Сохраняем...' : 'Сохранить настройки'}
            </button>
          </div>

          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold text-center">
              🎉 Настройки планировщика и постов успешно сохранены!
            </div>
          )}
        </div>
      )}

      {/* --- ТАБ 3: НАСТРОЙКИ АГЕНТА --- */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-fuchsia-500" size={20} />
            Управление ИИ-Агентом Direct (Автоответчик)
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              {/* Переключатель активности */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-700">ИИ Автоответчик в Direct</span>
                  <input
                    type="checkbox"
                    checked={agentActive}
                    onChange={(e) => setAgentActive(e.target.checked)}
                    className="w-10 h-5 bg-slate-300 rounded-full appearance-none checked:bg-fuchsia-600 transition-colors relative outline-none cursor-pointer after:content-[''] after:w-4 after:h-4 after:bg-white after:rounded-full after:absolute after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-transform"
                  />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Когда переключатель включен, наш ИИ-агент автоматически обрабатывает сообщения клиентов в Instagram Direct с помощью RAG-каталога.
                </p>
              </div>

              {/* Язык общения */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Язык автоответчика в чатах</label>
                <select
                  value={agentChatLang}
                  onChange={(e) => setAgentChatLang(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-fuchsia-500 font-semibold"
                >
                  <option value="auto">Автоопределение (Приоритет Таджикского)</option>
                  <option value="tj">Только таджикский (TJ)</option>
                  <option value="ru">Только русский (RU)</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  ИИ будет подстраиваться под язык пользователя или строго соблюдать выбранную настройку.
                </p>
              </div>
            </div>

            
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-bold rounded-xl shadow-md shadow-fuchsia-500/20 transition-all flex items-center gap-2"
            >
              {isSavingSettings ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {isSavingSettings ? 'Сохраняем...' : 'Сохранить промпт и настройки'}
            </button>
          </div>

          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold text-center">
              🎉 Настройки ИИ-Агента успешно синхронизированы в базу!
            </div>
          )}
        </div>
      )}

      {/* --- ТАБ 4: БАЗА ЗНАНИЙ ИИ --- */}
      {activeTab === 'knowledge' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database className="text-fuchsia-500" size={20} />
            📚 Интеллектуальный Редактор Свойств и Синергий (RAG-Каталог)
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Список продуктов для выбора */}
            <div className="lg:col-span-1 border border-slate-200 rounded-2xl p-4 flex flex-col max-h-[600px]">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Поиск по 107 продуктам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {filteredProducts.map(prod => {
                  const key = prod.name.toLowerCase().trim();
                  const enriched = enrichedCatalog[key];
                  const isSelected = selectedProduct?.id === prod.id;
                  
                  return (
                    <button
                      key={prod.id}
                      onClick={() => handleSelectProduct(prod)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between border ${
                        isSelected 
                          ? 'bg-fuchsia-50/50 border-fuchsia-200 text-fuchsia-700 font-bold' 
                          : 'border-transparent text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="text-xs uppercase font-extrabold truncate">{prod.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{prod.full_name}</p>
                      </div>
                      
                      {enriched ? (
                        <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold border border-emerald-100 flex-shrink-0">
                          Обогащен
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                          Пусто
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Карточка редактирования свойств */}
            <div className="lg:col-span-2 border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
              {selectedProduct ? (
                <div className="space-y-6">
                  {/* Заголовок карточки товара */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{selectedProduct.name}</h4>
                      <p className="text-xs text-slate-400">{selectedProduct.full_name}</p>
                      <p className="text-xs text-fuchsia-600 font-bold mt-1">Цена: {selectedProduct.price} сомони</p>
                    </div>

                    <button
                      onClick={handleAutoEnrichProduct}
                      disabled={isEnrichingProduct}
                      className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-fuchsia-500/20 hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isEnrichingProduct ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {isEnrichingProduct ? 'ИИ обогащает...' : '🪄 Обогатить с помощью ИИ'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Свойства */}
                    <div className="space-y-3">
                      <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">🌟 Полезные свойства продукта</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newProperty}
                          onChange={(e) => setNewProperty(e.target.value)}
                          placeholder="Добавить полезное свойство..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-fuchsia-500"
                        />
                        <button onClick={handleAddProp} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg">+</button>
                      </div>
                      <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-h-[140px] overflow-y-auto">
                        {editingProperties.map((p, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-100 rounded-lg text-xs">
                            <span className="text-slate-700 leading-snug">{p}</span>
                            <button onClick={() => setEditingProperties(editingProperties.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Клиническая Синергия */}
                    <div className="space-y-3">
                      <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">🔬 Клиническая синергия (связки)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSynergy}
                          onChange={(e) => setNewSynergy(e.target.value)}
                          placeholder="Добавить связку с другим витамином..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-fuchsia-500"
                        />
                        <button onClick={handleAddSynergy} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg">+</button>
                      </div>
                      <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-h-[140px] overflow-y-auto">
                        {editingSynergies.map((s, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-100 rounded-lg text-xs">
                            <span className="text-slate-700 leading-snug">{s}</span>
                            <button onClick={() => setEditingSynergies(editingSynergies.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Категории (Теги) */}
                    <div className="space-y-3">
                      <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">🏷️ Категории (Теги)</label>
                      <div className="flex gap-2">
                        <select
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-fuchsia-500 font-bold"
                        >
                          <option value="">Выберите категорию...</option>
                          <option value="Иммунитет">Иммунитет</option>
                          <option value="Красота">Красота</option>
                          <option value="Мозг">Мозг</option>
                          <option value="Антистресс">Антистресс</option>
                          <option value="Похудение">Похудение</option>
                          <option value="Энергия">Энергия</option>
                          <option value="Сон">Сон</option>
                        </select>
                        <button onClick={handleAddTag} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg">+</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 min-h-[50px]">
                        {editingTags.map((t, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-fuchsia-600">
                            {t}
                            <button onClick={() => setEditingTags(editingTags.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Маркетинговые хуки */}
                    <div className="space-y-3">
                      <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">📢 Зацепки (Instagram Hooks)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newHook}
                          onChange={(e) => setNewHook(e.target.value)}
                          placeholder="Добавить рекламный хук..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-fuchsia-500"
                        />
                        <button onClick={handleAddHook} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg">+</button>
                      </div>
                      <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-h-[140px] overflow-y-auto">
                        {editingHooks.map((h, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-100 rounded-lg text-xs">
                            <span className="text-slate-700 leading-snug">{h}</span>
                            <button onClick={() => setEditingHooks(editingHooks.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-100 pt-4">
                    <button
                      onClick={handleSaveProductKnowledge}
                      disabled={isSavingKnowledge}
                      className="px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-bold rounded-xl shadow-md shadow-fuchsia-500/20 transition-all flex items-center gap-2"
                    >
                      {isSavingKnowledge ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {isSavingKnowledge ? 'Сохраняем...' : 'Сохранить Свойства Продукта'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
                  <Database size={48} className="text-slate-300 stroke-1" />
                  <p className="text-sm font-semibold">Выберите любой продукт из 107 в наличии слева,</p>
                  <p className="text-xs text-slate-400">чтобы настроить его свойства, теги и синергии для ИИ.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- ТАБ 5: A/B ТЕСТЫ ПРОМПТОВ --- */}
      {activeTab === 'ab_tests' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="text-fuchsia-500" size={20} />
            Управление Промптами (A/B Тестирование)
          </h3>
          <p className="text-sm text-slate-500 mb-4">Здесь вы можете настраивать системные промпты для бота. Бот будет случайно выбирать один из активных промптов.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {prompts.map(prompt => (
              <div key={prompt.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-800">{prompt.name} <span className="text-xs text-slate-500">(Группа {prompt.ab_test_group})</span></h4>
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${prompt.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {prompt.is_active ? 'Активен' : 'Отключен'}
                  </span>
                </div>
                <textarea 
                  className="w-full h-40 bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono mb-2 focus:border-fuchsia-500 outline-none"
                  defaultValue={prompt.prompt_text}
                  readOnly
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ТАБ 6: АУДИТ И ОБУЧЕНИЕ --- */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database className="text-fuchsia-500" size={20} />
            Аудит чатов и Обучение
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {recentChats.map(chat => (
                <div key={chat.id} 
                     onClick={async () => {
                       setSelectedChat(chat);
                       const {data} = await supabase.from('agent_messages').select('*').eq('chat_id', chat.id).order('created_at', {ascending: true});
                       setChatMessages(data || []);
                     }}
                     className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedChat?.id === chat.id ? 'bg-fuchsia-50 border-fuchsia-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}>
                  <p className="font-bold text-sm">User: {chat.instagram_user_id}</p>
                  <p className="text-xs text-slate-500 truncate">{chat.summary || 'Нет summary'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(chat.updated_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="col-span-2 bg-slate-50 rounded-2xl border border-slate-200 p-4 h-[600px] overflow-y-auto flex flex-col gap-3">
              {selectedChat ? (
                chatMessages.length > 0 ? chatMessages.map(msg => (
                  <div key={msg.id} className={`p-3 rounded-xl max-w-[80%] ${msg.sender === 'user' ? 'bg-white border border-slate-200 self-start' : 'bg-fuchsia-100 border border-fuchsia-200 self-end'}`}>
                    <p className="text-xs font-bold mb-1">{msg.sender === 'user' ? 'Клиент' : 'Бот'}</p>
                    <p className="text-sm">{msg.message_text}</p>
                    {msg.sender === 'bot' && (
                      <button 
                        onClick={async () => {
                           const userMsgIndex = chatMessages.findIndex(m => m.id === msg.id) - 1;
                           const userMsg = userMsgIndex >= 0 ? chatMessages[userMsgIndex].message_text : 'Контекст';
                           await supabase.from('agent_golden_examples').insert({user_query: userMsg, ideal_response: msg.message_text});
                           alert('Добавлено в Golden Examples!');
                        }}
                        className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded mt-2 hover:bg-slate-50"
                      >
                        ⭐ Добавить в Golden Базу
                      </button>
                    )}
                  </div>
                )) : <p className="text-center text-slate-400 mt-10">Нет сообщений</p>
              ) : (
                <p className="text-center text-slate-400 mt-10">Выберите чат слева</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
