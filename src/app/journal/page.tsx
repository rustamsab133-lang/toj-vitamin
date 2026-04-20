import React from 'react';
import { supabase } from '@/lib/supabase';
import { JournalList } from '@/components/JournalList';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: "Научный Журнал | Green Leaf Sciences",
  description: "Экспертные статьи о здоровье, биохакинге и синергии витаминов от врачей и нутрициологов Green Leaf Sciences.",
};

export default async function JournalPage() {
  const { data: articles, error } = await supabase
    .from('journal_articles')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  return (
    <main className="min-h-screen bg-[#FDFBF7]">
      {/* Header Section */}
      <section className="pt-32 pb-16 px-6 border-b border-black/[0.03]">
        <div className="max-w-4xl mx-auto space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-[#1E40AF] transition-colors font-bold text-[12px] uppercase tracking-widest">
            <ArrowLeft size={16} />
            На главную
          </Link>
          
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-[#1E40AF]">
               <Sparkles size={20} />
               <span className="text-[12px] font-bold uppercase tracking-[0.3em]">Научный Журнал</span>
             </div>
             <h1 className="text-[48px] md:text-[72px] font-bold text-[#1D1D1F] leading-[1.1] tracking-tighter font-outfit">
               Лаборатория <br /> знаний
             </h1>
             <p className="text-[18px] md:text-[22px] text-[#475569] max-w-xl leading-relaxed">
               Клинические исследования, гиды по нутрицевтикам и последние новости превентивной медицины.
             </p>
          </div>
        </div>
      </section>

      {/* List Section */}
      <section className="py-20">
        {articles && articles.length > 0 ? (
          <JournalList articles={articles} lang="ru" />
        ) : (
          <div className="max-w-4xl mx-auto px-6 text-center py-20 space-y-6">
            <div className="w-20 h-20 bg-black/[0.03] rounded-full flex items-center justify-center mx-auto">
              <Sparkles size={32} className="text-black/10" />
            </div>
            <h3 className="text-[24px] font-bold text-[#1D1D1F]">Статьи скоро появятся</h3>
            <p className="text-[#94A3B8]">Наши эксперты готовят для вас эксклюзивный материал.</p>
            <Link href="/" className="inline-block font-bold text-[#1E40AF] border-b-2 border-[#1E40AF]">
              Вернуться в каталог
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
