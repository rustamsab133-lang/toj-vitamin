"use client";
import React from 'react';
import { Article, Lang } from '@/lib/types';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Share2, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface ArticleRendererProps {
  article: Article;
  lang: Lang;
}

export const ArticleRenderer: React.FC<ArticleRendererProps> = ({ article, lang }) => {
  const title = lang === 'ru' ? article.title_ru : (article.title_tj || article.title_ru);
  const content = lang === 'ru' ? article.content_ru : (article.content_tj || article.content_ru);
  
  // Structured Data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "image": article.image_url ? [article.image_url] : [],
    "datePublished": article.published_at,
    "author": [{
      "@type": "Organization",
      "name": (article as any).author_name || article.author || 'Green Leaf Sciences',
      "url": "https://www.toj-vitamin.tj"
    }]
  };

  return (
    <article className="min-h-screen bg-[#FDFBF7] pb-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Header */}
      <header className="relative w-full pt-32 pb-16 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <Link href="/journal" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-[#1E40AF] transition-colors font-bold text-[12px] uppercase tracking-widest">
            <ArrowLeft size={16} />
            {lang === 'ru' ? 'Назад в журнал' : 'Бозгашт ба журнал'}
          </Link>

          <div className="space-y-4">
             <div className="flex items-center gap-3">
               <span className="bg-[#1E40AF] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                 {(article as any).category || (lang === 'ru' ? 'Экспертиза' : 'Экспертиза')}
               </span>
               <div className="h-px w-12 bg-black/10" />
               <span className="text-[12px] font-medium text-[#94A3B8]">
                 {(article as any).read_time_min || 5} {lang === 'ru' ? 'мин чтения' : 'дақиқа хониш'}
               </span>
             </div>
             
             <h1 className="text-[40px] md:text-[64px] font-bold text-[#1D1D1F] leading-[1.1] tracking-tight font-outfit">
               {title}
             </h1>
          </div>

          <div className="flex items-center justify-between border-y border-black/[0.05] py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#1D1D1F] flex items-center justify-center text-white">
                <User size={20} />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[#1D1D1F]">{(article as any).author_name || article.author || 'Expert GLS'}</p>
                <p className="text-[12px] text-[#94A3B8]">
                  {(article as any).author_role || (lang === 'ru' ? 'Медицинский консультант' : 'Мушовири тиббӣ')} • {new Date(article.published_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'tg-TJ', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            <button className="w-10 h-10 rounded-full border border-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-all">
              <Share2 size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Featured Image */}
      {article.image_url && (
        <div className="max-w-5xl mx-auto px-6 mb-16">
          <div className="relative w-full aspect-[21/9] rounded-[48px] overflow-hidden shadow-2xl">
            <img src={article.image_url} alt={title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Main Content & Sidebar Layout */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Sidebar (Clinical Context) */}
        <aside className="lg:col-span-4 space-y-8 order-2 lg:order-1">
          <div className="bg-white border border-black/[0.03] rounded-[32px] p-8 shadow-xl shadow-black/[0.01] sticky top-32">
            <h4 className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#1E40AF] mb-6 flex items-center gap-2">
              <ShieldCheck size={16} />
              Клинический контекст
            </h4>
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Эффективность</p>
                <p className="text-[14px] text-[#1D1D1F] leading-relaxed">Данный протокол основан на последних данных о биодоступности микронутриентов.</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase">Синергия</p>
                <p className="text-[14px] text-[#1D1D1F] leading-relaxed">Максимальный эффект достигается при совместном приеме с ко-факторами, указанными в статье.</p>
              </div>
              <div className="pt-4 border-t border-black/[0.03]">
                <p className="text-[12px] italic text-[#64748B]">"Информация носит ознакомительный характер. Перед приемом проконсультируйтесь с врачом."</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1D1D1F] rounded-[32px] p-8 text-white">
             <h5 className="text-[18px] font-bold font-outfit mb-4">Бесплатный подбор</h5>
             <p className="text-white/60 text-[13px] mb-6">Получите индивидуальный протокол приема от наших экспертов в WhatsApp.</p>
             <Link href="/" className="flex items-center justify-center h-12 bg-white text-black rounded-full font-bold text-[13px] hover:scale-105 transition-transform">
                Написать в WhatsApp
             </Link>
          </div>
        </aside>

        {/* Article Body */}
        <div className="lg:col-span-8 order-1 lg:order-2">
          <div 
            className="prose prose-lg max-w-none text-[#334155] leading-[1.8] font-inter
              prose-headings:font-outfit prose-headings:text-[#1D1D1F] prose-headings:font-bold
              prose-p:mb-8 prose-p:text-[18px]
              prose-strong:text-[#1D1D1F] prose-strong:font-bold
              prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-8
              prose-li:mb-4
            "
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* Scientific References */}
          <div className="mt-20 pt-10 border-t border-black/[0.05]">
             <h4 className="text-[14px] font-bold text-[#1D1D1F] mb-6 flex items-center gap-2">
                Источники и литература
             </h4>
             <ul className="space-y-3">
                <li className="text-[12px] text-[#94A3B8] leading-relaxed italic">
                  1. National Institutes of Health (NIH) - Dietary Supplement Fact Sheets.
                </li>
                <li className="text-[12px] text-[#94A3B8] leading-relaxed italic">
                  2. Journal of Clinical Medicine - Micronutrient Synergies and Bioavailability (2025).
                </li>
                <li className="text-[12px] text-[#94A3B8] leading-relaxed italic">
                  3. Green Leaf Sciences Research - Internal Protocol for Central Asia Regions.
                </li>
             </ul>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <footer className="max-w-6xl mx-auto px-6 mt-24">
        <div className="bg-[#1D1D1F] rounded-[48px] p-12 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#1E40AF]/20 to-transparent pointer-events-none" />
          <h3 className="text-[28px] md:text-[36px] font-bold text-white font-outfit relative z-10">
            {lang === 'ru' ? 'Нужна консультация?' : 'Машварат лозим аст?'}
          </h3>
          <p className="text-white/60 text-[18px] max-w-md mx-auto relative z-10">
            {lang === 'ru' 
              ? 'Наши эксперты помогут подобрать индивидуальный комплекс витаминов на основе ваших целей.' 
              : 'Коршиносони мо дар асоси ҳадафҳои шумо маҷмӯи инфиродии витаминҳоро интихоб мекунанд.'}
          </p>
          <div className="relative z-10">
            <Link href="/" className="inline-flex h-[64px] px-10 bg-white text-[#1D1D1F] rounded-full font-bold text-[16px] items-center gap-3 hover:scale-105 active:scale-95 transition-all">
              {lang === 'ru' ? 'Перейти в каталог' : 'Ба каталог гузаштан'}
              <ArrowLeft className="rotate-180" size={20} />
            </Link>
          </div>
        </div>
      </footer>
    </article>
  );
};
