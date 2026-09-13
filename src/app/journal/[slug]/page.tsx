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

  const cleanSlug = params.slug.toLowerCase().trim();

  return {
    title: `${article.title_ru} | Научный Журнал`,
    description: article.excerpt_ru,
    openGraph: {
      images: article.image_url ? [article.image_url] : [],
    },
    alternates: {
      canonical: `https://www.toj-vitamin.tj/journal/${cleanSlug}`,
      languages: {
        'ru-TJ': `https://www.toj-vitamin.tj/journal/${cleanSlug}?lang=ru`,
        'tg-TJ': `https://www.toj-vitamin.tj/journal/${cleanSlug}?lang=tj`,
      }
    }
  };
}

export async function generateStaticParams() {
  const { data: articles } = await supabase
    .from('journal_articles')
    .select('slug')
    .eq('is_published', true);

  return (articles || [])
    .map((a) => ({
      slug: (a.slug || '').trim(),
    }))
    .filter((a) => Boolean(a.slug && a.slug.length > 0));
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Как принимать ${article.title_ru}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Рекомендуемую дозировку и протокол приема вы найдете в нашей статье или можете получить бесплатную консультацию эксперта интернет-магазина toj-vitamin в WhatsApp.`
        }
      },
      {
        "@type": "Question",
        "name": "Есть ли доставка по Душанбе?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Да, интернет-магазин toj-vitamin осуществляет быструю доставку витаминов и БАДов по Душанбе, Худжанду и всем регионам Таджикистана."
        }
      }
    ]
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title_ru,
    "image": [article.image_url],
    "datePublished": article.published_at,
    "dateModified": article.published_at,
    "author": [{
      "@type": "Organization",
      "name": article.author_name || 'toj-vitamin',
      "url": "https://www.toj-vitamin.tj"
    }]
  };

  return (
    <>
      <script 
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} 
      />
      <script 
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} 
      />
      <ArticleRenderer article={article} lang="ru" />
    </>
  );
}
