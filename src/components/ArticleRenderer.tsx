"use client";
import React from 'react';
import { Article, Lang } from '@/lib/types';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Share2, ArrowLeft } from 'lucide-react';
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

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6">
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
      </div>

      {/* Footer CTA */}
      <footer className="max-w-3xl mx-auto px-6 mt-24">
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
