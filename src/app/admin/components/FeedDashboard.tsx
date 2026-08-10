"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';
import { 
  ChevronLeft, AlertCircle, AlertTriangle, Lightbulb, CheckCircle2, 
  ArrowUpRight, Search, Filter, Wrench, BookOpen, Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeedDashboardProps {
  onBack: () => void;
  onEditProduct: (id: string) => void;
}

interface FeedIssue {
  id: string;
  name: string;
  rowInFeed: number;
  result: 'Не загружено' | 'Не показываются в магазине' | 'Не показываются в объявлениях' | 'Не показываются в Магазинах или объявлениях';
  problem: string;
  description: string;
  howToFix: string;
  helpLink?: string;
}

interface FeedRecommendation {
  id: string;
  name: string;
  rowInFeed: number;
  recommendation: string;
  description: string;
}

export const FeedDashboard: React.FC<FeedDashboardProps> = ({ onBack, onEditProduct }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'issues' | 'recommendations'>('issues');
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState<string>('all');
  
  // Validation lists
  const [issues, setIssues] = useState<FeedIssue[]>([]);
  const [recommendations, setRecommendations] = useState<FeedRecommendation[]>([]);

  useEffect(() => {
    loadProductsAndValidate();
  }, []);

  const loadProductsAndValidate = async () => {
    setLoading(true);
    try {
      // Fetch products in the exact order they are exported in feed APIs (order by ID)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id');
      
      if (error) throw error;
      
      if (data) {
        setProducts(data);
        runValidation(data);
      }
    } catch (e) {
      console.error('Error fetching products for feed validation:', e);
    } finally {
      setLoading(false);
    }
  };

  const runValidation = (productList: Product[]) => {
    const detectedIssues: FeedIssue[] = [];
    const detectedRecs: FeedRecommendation[] = [];

    productList.forEach((p, index) => {
      // Feed row starts at 2 (row 1 is headers in typical spreadsheet/CSV feeds, or item index + 2)
      const rowInFeed = index + 2;

      // === 1. CRITICAL ISSUES (Не загружено) ===
      
      // Missing Image
      if (!p.image_url || p.image_url.trim() === '') {
        detectedIssues.push({
          id: p.id,
          name: p.name,
          rowInFeed,
          result: 'Не загружено',
          problem: 'Отсутствует изображение',
          description: 'Товары без изображений не могут быть импортированы в каталог Meta/Google.',
          howToFix: 'Загрузите качественное фото товара в панели редактирования или укажите прямую ссылку.',
          helpLink: 'https://www.facebook.com/business/help/1397294963910848'
        });
      }

      // Price <= 0
      if (!p.price || p.price <= 0) {
        detectedIssues.push({
          id: p.id,
          name: p.name,
          rowInFeed,
          result: 'Не загружено',
          problem: 'Нулевая или некорректная цена',
          description: 'Цена товара должна быть больше 0 TJS для успешного импорта в каталог.',
          howToFix: 'Укажите корректную закупочную и розничную стоимость в сомони.',
          helpLink: 'https://support.google.com/merchants/answer/6324371'
        });
      }

      // Title too short
      if (!p.name || p.name.trim().length < 3) {
        detectedIssues.push({
          id: p.id,
          name: p.name,
          rowInFeed,
          result: 'Не загружено',
          problem: 'Слишком короткое название',
          description: 'Название товара не может быть пустым или короче 3 символов.',
          howToFix: 'Введите понятное и информативное название товара.',
          helpLink: 'https://www.facebook.com/business/help/120325381656307'
        });
      }

      // === 2. WARNINGS (Не показываются в магазине / объявлениях) ===
      
      // Title ALL CAPS
      const isUpperCase = p.name === p.name.toUpperCase() && p.name !== p.name.toLowerCase();
      if (isUpperCase && p.name.trim().length > 3) {
        detectedIssues.push({
          id: p.id,
          name: p.name,
          rowInFeed,
          result: 'Не показываются в объявлениях',
          problem: 'Использование ALL CAPS',
          description: 'Название товара написано исключительно заглавными буквами. Модераторы могут отклонить его за спам.',
          howToFix: 'Измените регистр названия товара на стандартный (например: "Омега-3" вместо "ОМЕГА-3").',
          helpLink: 'https://www.facebook.com/business/help/120325381656307'
        });
      }

      // Image not HTTPS
      if (p.image_url && p.image_url.trim() !== '' && !p.image_url.startsWith('https://')) {
        detectedIssues.push({
          id: p.id,
          name: p.name,
          rowInFeed,
          result: 'Не показываются в магазине',
          problem: 'Небезопасная ссылка на изображение (HTTP)',
          description: 'Ссылки на изображения должны использовать защищенный протокол HTTPS для корректного отображения.',
          howToFix: 'Настройте SSL на сервере изображений или укажите HTTPS-версию ссылки.',
          helpLink: 'https://support.google.com/merchants/answer/6324401'
        });
      }

      // Missing Description
      if (!p.description || p.description.trim() === '') {
        detectedIssues.push({
          id: p.id,
          name: p.name,
          rowInFeed,
          result: 'Не показываются в Магазинах или объявлениях',
          problem: 'Отсутствует описание товара',
          description: 'У товара нет описания, что мешает показу товара в Instagram Shop и рекламных рекомендациях.',
          howToFix: 'Заполните описание товара, указав его характеристики, состав и полезные свойства.',
          helpLink: 'https://www.facebook.com/business/help/120325381656307'
        });
      }
      
      // Description too short
      else if (p.description.trim().length < 20) {
        detectedIssues.push({
          id: p.id,
          name: p.name,
          rowInFeed,
          result: 'Не показываются в объявлениях',
          problem: 'Слишком короткое описание',
          description: 'Описание товара короче 20 символов, что снижает качество фида для рекламных объявлений.',
          howToFix: 'Расширьте описание, добавив ключевую информацию о продукте.',
          helpLink: 'https://www.facebook.com/business/help/120325381656307'
        });
      }

      // === 3. RECOMMENDATIONS (Таб 2) ===
      
      // Title under 20 chars
      if (p.name && p.name.trim().length >= 3 && p.name.trim().length < 20) {
        detectedRecs.push({
          id: p.id,
          name: p.name,
          rowInFeed,
          recommendation: 'Расширить название товара',
          description: 'Название слишком короткое. Добавьте бренд, объем или форму выпуска (например, "Green Leaf Sciences Omega-3 120 капсул").'
        });
      }

      // Description under 150 chars
      if (p.description && p.description.trim().length >= 20 && p.description.trim().length < 150) {
        detectedRecs.push({
          id: p.id,
          name: p.name,
          rowInFeed,
          recommendation: 'Сделать описание более подробным',
          description: 'Описание содержит менее 150 символов. Описание от 150 до 500 символов с ключевыми словами повышает конверсию на 25%.'
        });
      }

      // Generic fallback description used
      const isTemplateDesc = p.description && (
        p.description.includes('Купить') && 
        p.description.includes('в Таджикистане') && 
        p.description.includes('Green Leaf Sciences')
      );
      if (isTemplateDesc) {
        detectedRecs.push({
          id: p.id,
          name: p.name,
          rowInFeed,
          recommendation: 'Заменить шаблонный текст описания',
          description: 'Товар использует стандартное авто-генерируемое описание. Напишите уникальный текст для лучшего ранжирования в поиске.'
        });
      }
    });

    setIssues(detectedIssues);
    setRecommendations(detectedRecs);
  };

  // Filters & Searches
  const filteredIssues = issues.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.includes(searchQuery);
    const matchesResult = resultFilter === 'all' || item.result === resultFilter;
    return matchesSearch && matchesResult;
  });

  const filteredRecs = recommendations.filter(item => {
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.includes(searchQuery);
  });

  // Calculate status summary
  const criticalCount = issues.filter(i => i.result === 'Не загружено').length;
  const warningCount = issues.filter(i => i.result !== 'Не загружено').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <ChevronLeft size={18} className="text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Проблемы фидов</h2>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
            Meta & Google Validator
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="animate-spin text-slate-400" size={32} />
          <p className="text-sm text-slate-500 font-medium">Анализируем фид данных...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Проверенно товаров</p>
                <p className="text-2xl font-bold text-slate-800">{products.length}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Не загружено (Критично)</p>
                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Скрыто из показа</p>
                <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Lightbulb size={24} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Рекомендации Meta</p>
                <p className="text-2xl font-bold text-blue-600">{recommendations.length}</p>
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab('issues')}
              className={`pb-4 px-6 text-sm font-semibold relative transition-all ${
                activeTab === 'issues' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>Отчет с информацией о проблемах</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  issues.length > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {issues.length}
                </span>
              </div>
              {activeTab === 'issues' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 inset-x-0 h-0.5 bg-slate-800" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('recommendations')}
              className={`pb-4 px-6 text-sm font-semibold relative transition-all ${
                activeTab === 'recommendations' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>Рекомендации</span>
                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-bold">
                  {recommendations.length}
                </span>
              </div>
              {activeTab === 'recommendations' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 inset-x-0 h-0.5 bg-slate-800" />
              )}
            </button>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по названию или ID товара..."
                className="w-full h-11 bg-white rounded-xl pl-11 pr-4 text-xs font-semibold outline-none border border-slate-100 focus:border-slate-200 transition-all placeholder:text-slate-300"
              />
            </div>

            {/* Filter by Result (Only for Tab 1) */}
            {activeTab === 'issues' && (
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <select
                  value={resultFilter}
                  onChange={(e) => setResultFilter(e.target.value)}
                  className="h-11 bg-white border border-slate-100 rounded-xl pl-10 pr-8 text-xs font-semibold outline-none focus:border-slate-200 appearance-none cursor-pointer"
                >
                  <option value="all">Все результаты</option>
                  <option value="Не загружено">Не загружено</option>
                  <option value="Не показываются в магазине">Не показываются в магазине</option>
                  <option value="Не показываются в объявлениях">Не показываются в объявлениях</option>
                  <option value="Не показываются в Магазинах или объявлениях">Не показываются в Магазинах/объявлениях</option>
                </select>
              </div>
            )}
          </div>

          {/* Main Table Card */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <AnimatePresence mode="wait">
              {activeTab === 'issues' ? (
                <motion.div
                  key="issues-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="overflow-x-auto"
                >
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="p-4 w-16">ID</th>
                        <th className="p-4 min-w-[150px]">Название</th>
                        <th className="p-4 w-28 text-center">Строка в фиде</th>
                        <th className="p-4 min-w-[150px]">Результат</th>
                        <th className="p-4 min-w-[150px]">Проблема</th>
                        <th className="p-4 min-w-[200px]">Описание</th>
                        <th className="p-4 min-w-[200px]">Как исправить</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                      {filteredIssues.map((item, idx) => (
                        <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-mono text-slate-400">{item.id}</td>
                          <td className="p-4 font-bold text-slate-800">{item.name}</td>
                          <td className="p-4 text-center font-semibold text-slate-500">{item.rowInFeed}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                              item.result === 'Не загружено'
                                ? 'bg-red-50 text-red-600 border border-red-100'
                                : 'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {item.result}
                            </span>
                          </td>
                          <td className="p-4 text-slate-800 font-semibold">{item.problem}</td>
                          <td className="p-4 text-slate-400 leading-relaxed">{item.description}</td>
                          <td className="p-4 space-y-2">
                            <p className="text-slate-500 leading-relaxed text-[11px]">{item.howToFix}</p>
                            <div className="flex items-center gap-3 pt-1">
                              {item.helpLink && (
                                <a 
                                  href={item.helpLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[10px] text-blue-600 hover:text-blue-700 flex items-center gap-0.5 hover:underline font-bold transition-all shrink-0"
                                >
                                  Справка <ArrowUpRight size={10} />
                                </a>
                              )}
                              <button
                                onClick={() => onEditProduct(item.id)}
                                className="text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors flex items-center gap-1 font-bold shadow-sm"
                              >
                                <Wrench size={10} /> Исправить
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredIssues.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-20 text-slate-400 font-medium">
                            Проблем не обнаружено! Ваш фид полностью здоров 🎉
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </motion.div>
              ) : (
                <motion.div
                  key="recommendations-tab"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="overflow-x-auto"
                >
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="p-4 w-16">ID</th>
                        <th className="p-4 min-w-[150px]">Название</th>
                        <th className="p-4 w-28 text-center">Строка в фиде</th>
                        <th className="p-4 min-w-[200px]">Рекомендация</th>
                        <th className="p-4 min-w-[250px]">Описание рекомендации</th>
                        <th className="p-4 w-24 text-right">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                      {filteredRecs.map((item, idx) => (
                        <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-mono text-slate-400">{item.id}</td>
                          <td className="p-4 font-bold text-slate-800">{item.name}</td>
                          <td className="p-4 text-center font-semibold text-slate-500">{item.rowInFeed}</td>
                          <td className="p-4 text-blue-600 font-semibold">{item.recommendation}</td>
                          <td className="p-4 text-slate-400 leading-relaxed">{item.description}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => onEditProduct(item.id)}
                              className="text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors inline-flex items-center gap-1 font-bold shadow-sm"
                            >
                              <Wrench size={10} /> Улучшить
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredRecs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-20 text-slate-400 font-medium">
                            Рекомендаций нет. Все товары максимально оптимизированы ⚡
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Educational Documentation Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <BookOpen size={18} className="text-slate-500" />
              <h3 className="font-bold text-sm">Справочник по устранению ошибок в каталоге</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-slate-500 leading-relaxed">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider">Устранение проблем с товарами, данные о которых не загрузились</h4>
                <p>
                  Если статус товара помечен как <span className="font-bold text-red-600">Не загружено</span>, это означает, что Meta или Google полностью отклонили товар из-за отсутствия обязательных атрибутов. 
                  Убедитесь, что у товара указана <strong>цена больше нуля</strong> и загружено <strong>главное изображение</strong>. 
                  После исправления фид автоматически обновится при следующем сканировании роботом (обычно раз в сутки или по ручному запросу в Commerce Manager / Google Merchant Center).
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider">Устранение проблем с товарами, которые не показываются в магазинах или объявлениях</h4>
                <p>
                  Если статус товара <span className="font-bold text-amber-600">Не показывается в магазине/объявлениях</span>, товар успешно загрузился в базу данных Meta, но временно скрыт для покупателей. 
                  Это происходит из-за <strong>слишком короткого описания</strong>, <strong>небезопасных HTTP ссылок на фото</strong> или названий, написанных <strong>ВСЕМИ ЗАГЛАВНЫМИ БУКВАМИ</strong>. 
                  Также избегайте агрессивных медицинских заявлений в тексте описаний, чтобы снизить вероятность автоблокировки.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
