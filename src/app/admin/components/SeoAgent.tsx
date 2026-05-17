"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Bot, Search, Sparkles, FileText, Send, 
  Trash2, Eye, CheckCircle2, AlertCircle, Loader2, 
  TrendingUp, Clock, Zap, Globe
} from 'lucide-react';

interface Draft {
  id: string;
  slug: string;
  title_ru: string;
  excerpt_ru: string;
  is_published: boolean;
  published_at: string;
  author_name: string;
}

interface GSCItem {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
}

interface SeoAgentProps {
  onBack: () => void;
}

type AgentStep = 'idle' | 'gsc' | 'products' | 'writing' | 'saving' | 'done' | 'error';

const STEP_LABELS: Record<AgentStep, string> = {
  idle: 'Готов к работе',
  gsc: 'Анализирую Google Search Console...',
  products: 'Загружаю релевантные товары...',
  writing: 'Gemini пишет экспертную статью...',
  saving: 'Сохраняю черновик в базу...',
  done: 'Статья сгенерирована!',
  error: 'Произошла ошибка',
};

const STEP_ORDER: AgentStep[] = ['gsc', 'products', 'writing', 'saving', 'done'];

export const SeoAgent: React.FC<SeoAgentProps> = ({ onBack }) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentStep, setAgentStep] = useState<AgentStep>('idle');
  const [customQuery, setCustomQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Load drafts ─────────────────────────────────────────────────────────
  const loadDrafts = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/seo');
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch {
      console.error('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // ─── Run agent ───────────────────────────────────────────────────────────
  const runAgent = async () => {
    setErrorMsg('');
    setLastResult(null);

    // Simulate step progression for UX
    setAgentStep('gsc');
    
    try {
      // Start the actual API call
      const fetchPromise = fetch('/api/agents/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: customQuery || undefined }),
      });

      // Simulate step progression while waiting
      setTimeout(() => setAgentStep('products'), 2000);
      setTimeout(() => setAgentStep('writing'), 4000);

      const res = await fetchPromise;
      const data = await res.json();

      if (data.success) {
        setAgentStep('saving');
        await new Promise(r => setTimeout(r, 800));
        setAgentStep('done');
        setLastResult(data);
        setCustomQuery('');
        await loadDrafts();
      } else {
        setAgentStep('error');
        setErrorMsg(data.error || 'Неизвестная ошибка');
      }
    } catch (err: any) {
      setAgentStep('error');
      setErrorMsg(err.message || 'Сетевая ошибка');
    }
  };

  // ─── Publish draft ───────────────────────────────────────────────────────
  const publishDraft = async (articleId: string) => {
    setPublishingId(articleId);
    try {
      const res = await fetch('/api/agents/seo/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadDrafts();
      }
    } catch (err) {
      console.error('Publish error:', err);
    } finally {
      setPublishingId(null);
    }
  };

  // ─── Delete draft ────────────────────────────────────────────────────────
  const deleteDraft = async (articleId: string) => {
    if (!confirm('Удалить этот черновик?')) return;
    setDeletingId(articleId);
    try {
      await fetch('/api/agents/seo/publish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });
      await loadDrafts();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const isRunning = !['idle', 'done', 'error'].includes(agentStep);
  const unpublishedDrafts = drafts.filter(d => !d.is_published);
  const publishedArticles = drafts.filter(d => d.is_published);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Bot size={24} className="text-blue-600" />
              SEO-Агент
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">Автоматическая генерация экспертных статей для Science Journal</p>
          </div>
        </div>
      </div>

      {/* Agent Control Panel */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Gemini 2.5 Flash</span>
          </div>

          <h3 className="text-xl font-bold">Запустить генерацию статьи</h3>
          <p className="text-white/50 text-sm max-w-lg">
            Агент проанализирует Google Search Console, найдёт перспективные поисковые ниши, 
            подберёт релевантные товары из каталога и сгенерирует экспертную SEO-статью.
          </p>

          {/* Custom query input */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Тема статьи (или оставьте пустым — агент выберет из GSC)"
                className="w-full bg-white/10 backdrop-blur border border-white/10 rounded-2xl pl-11 pr-4 py-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400/50 transition-colors"
                disabled={isRunning}
              />
            </div>
            <button
              onClick={runAgent}
              disabled={isRunning}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 rounded-2xl font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              {isRunning ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Zap size={16} />
              )}
              {isRunning ? 'Работаю...' : 'Запустить'}
            </button>
          </div>

          {/* Progress Steps */}
          <AnimatePresence mode="wait">
            {agentStep !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/5 backdrop-blur rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center gap-3">
                  {agentStep === 'error' ? (
                    <AlertCircle size={20} className="text-red-400" />
                  ) : agentStep === 'done' ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : (
                    <Loader2 size={20} className="text-blue-400 animate-spin" />
                  )}
                  <span className="text-sm font-medium">
                    {STEP_LABELS[agentStep]}
                  </span>
                </div>

                {/* Progress bar */}
                {isRunning && (
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{
                        width: agentStep === 'gsc' ? '20%' :
                               agentStep === 'products' ? '40%' :
                               agentStep === 'writing' ? '70%' :
                               agentStep === 'saving' ? '90%' : '100%'
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}

                {/* Error message */}
                {agentStep === 'error' && errorMsg && (
                  <p className="text-red-300 text-sm">{errorMsg}</p>
                )}

                {/* Success result */}
                {agentStep === 'done' && lastResult?.article && (
                  <div className="space-y-2 text-sm">
                    <p className="text-emerald-300 font-medium">✅ {lastResult.article.title}</p>
                    <p className="text-white/40">{lastResult.article.excerpt}</p>
                    <p className="text-white/30 text-xs">
                      Целевой запрос: «{lastResult.targetQuery}»
                    </p>
                  </div>
                )}

                {/* GSC data preview */}
                {agentStep === 'done' && lastResult?.gscData?.length > 0 && (
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-xs text-white/30 mb-2">Найденные ниши в GSC:</p>
                    <div className="flex flex-wrap gap-2">
                      {lastResult.gscData.map((item: GSCItem, i: number) => (
                        <span key={i} className="bg-white/5 px-3 py-1 rounded-full text-xs text-white/50">
                          {item.query} (поз. {item.position})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Drafts Section */}
      {unpublishedDrafts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText size={18} className="text-amber-500" />
            Черновики
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">{unpublishedDrafts.length}</span>
          </h3>

          <div className="space-y-3">
            {unpublishedDrafts.map((draft) => (
              <motion.div
                key={draft.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-lg hover:shadow-slate-100/50 transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                        Черновик
                      </span>
                      <span className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {draft.author_name}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-1 truncate">{draft.title_ru}</h4>
                    <p className="text-sm text-slate-400 line-clamp-2">{draft.excerpt_ru}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={`/journal/${draft.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                      title="Предпросмотр"
                    >
                      <Eye size={16} />
                    </a>
                    <button
                      onClick={() => publishDraft(draft.id)}
                      disabled={publishingId === draft.id}
                      className="h-9 px-4 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
                      title="Опубликовать"
                    >
                      {publishingId === draft.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      Опубликовать
                    </button>
                    <button
                      onClick={() => deleteDraft(draft.id)}
                      disabled={deletingId === draft.id}
                      className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors text-red-400 hover:text-red-600 disabled:opacity-50"
                      title="Удалить"
                    >
                      {deletingId === draft.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Published Articles */}
      {publishedArticles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Globe size={18} className="text-emerald-500" />
            Опубликованные статьи
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold">{publishedArticles.length}</span>
          </h3>

          <div className="space-y-3">
            {publishedArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white/50 border border-slate-100 rounded-2xl p-5 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">
                      Опубликовано
                    </span>
                    <span className="text-slate-300 text-[10px]">
                      {new Date(article.published_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-700 truncate">{article.title_ru}</h4>
                </div>
                <a
                  href={`/journal/${article.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-4 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors text-sm font-medium flex items-center gap-1.5"
                >
                  <Eye size={14} />
                  Открыть
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && drafts.length === 0 && agentStep === 'idle' && (
        <div className="text-center py-16 space-y-4">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <TrendingUp size={32} className="text-slate-200" />
          </div>
          <h3 className="text-xl font-bold text-slate-300">Статей ещё нет</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Нажмите «Запустить» выше, чтобы агент проанализировал Google Search Console 
            и написал первую экспертную статью для вашего журнала.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-50 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
