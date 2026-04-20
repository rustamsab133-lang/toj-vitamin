import React from 'react';
import { supabase } from '@/lib/supabase';
import { ArticleRenderer } from '@/components/ArticleRenderer';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: article } = await supabase
    .from('journal_articles')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!article) return { title: 'Статья не найдена' };

  return {
    title: `${article.title_ru} | Научный Журнал`,
    description: article.excerpt_ru,
    openGraph: {
      images: article.image_url ? [article.image_url] : [],
    }
  };
}

export async function generateStaticParams() {
  const { data: articles } = await supabase
    .from('journal_articles')
    .select('slug')
    .eq('is_published', true);

  return (articles || []).map((a) => ({
    slug: a.slug,
  }));
}

export default async function ArticlePage({ params }: Props) {
  const { data: article } = await supabase
    .from('journal_articles')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!article) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title_ru,
    "image": [article.image_url],
    "datePublished": article.published_at,
    "dateModified": article.published_at,
    "author": [{
      "@type": "Person",
      "name": article.author_name || 'Green Leaf Sciences',
      "url": "https://www.toj-vitamin.tj"
    }]
  };

  return (
    <>
      <script 
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} 
      />
      <ArticleRenderer article={article} lang="ru" />
    </>
  );
}
