"use client";
import React from 'react';
import { Article, Lang } from '@/lib/types';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Clock, Calendar } from 'lucide-react';

interface JournalListProps {
  articles: Article[];
  lang: Lang;
}

export const JournalList: React.FC<JournalListProps> = ({ articles, lang }) => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="space-y-16">
        {articles.map((article, idx) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: idx * 0.1 }}
            className="group relative"
          >
            <Link href={`/journal/${article.slug}`} className="block">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                
                {/* Meta & Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#1E40AF]">
                    <span className="bg-[#1E40AF]/5 px-3 py-1 rounded-full">{(article as any).category || (lang === 'ru' ? 'Экспертиза' : 'Экспертиза')}</span>
                    <span className="flex items-center gap-1.5 text-[#94A3B8]">
                      <Calendar size={12} />
                      {new Date(article.published_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'tg-TJ', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>

                  <h2 className="text-[28px] md:text-[36px] font-bold text-[#1D1D1F] leading-tight font-outfit group-hover:text-[#1E40AF] transition-colors duration-500">
                    {lang === 'ru' ? article.title_ru : (article.title_tj || article.title_ru)}
                  </h2>

                  <p className="text-[16px] text-[#475569] leading-relaxed line-clamp-3">
                    {lang === 'ru' ? article.excerpt_ru : (article.excerpt_tj || article.excerpt_ru)}
                  </p>

                  <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#94A3B8]">
                      <Clock size={14} />
                      {(article as any).read_time_min || 5} {lang === 'ru' ? 'мин чтения' : 'дақиқа хониш'}
                    </div>
                    
                    <div className="flex items-center gap-2 text-[14px] font-bold text-[#1D1D1F] opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-500">
                      <span>{lang === 'ru' ? 'Читать' : 'Хондан'}</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>

                {/* Optional Image Thumbnail */}
                {article.image_url && (
                  <div className="w-full md:w-[240px] aspect-[4/3] rounded-[32px] overflow-hidden bg-white border border-black/[0.05] shadow-sm">
                    <img 
                      src={article.image_url} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                  </div>
                )}
              </div>
            </Link>
            
            {/* Divider */}
            <div className="h-px w-full bg-black/[0.05] mt-16" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
