import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/slugify';
import enrichedData from '@/data/enriched_gls_products.json';

/**
 * Enhanced Sitemap for Google Search Console
 * Includes product image support for Google Images indexing
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.toj-vitamin.tj';

  // Base routes
  const baseRoutes = [
    '',
    '/journal',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic Product routes
  let { data: products } = await supabase
    .from('products')
    .select('name, image_url, created_at')
    .order('name');

  // Dynamic Journal/Articles routes
  const { data: articles } = await supabase
    .from('journal_articles')
    .select('slug, published_at, image_url, title_ru')
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  // Fallback products...
  if (!products || products.length === 0) {
    const enrichedMap = enrichedData as Record<string, any>;
    products = Object.keys(enrichedMap).map(name => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      image_url: enrichedMap[name].image_url || null,
      updated_at: new Date().toISOString()
    })) as any;
  }

  const productRoutes = (products || []).map((product) => {
    const slug = slugify(product.name);
    const item: any = {
      url: `${baseUrl}/product/${slug}`,
      lastModified: product.created_at ? new Date(product.created_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    };

    if (product.image_url) {
      item.images = [{
        url: product.image_url.startsWith('http') ? product.image_url : `${baseUrl}${product.image_url}`,
        title: product.name,
      }];
    }
    return item;
  });

  const articleRoutes = (articles || []).map((article) => ({
    url: `${baseUrl}/journal/${article.slug}`,
    lastModified: article.published_at ? new Date(article.published_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    images: article.image_url ? [{
      url: article.image_url.startsWith('http') ? article.image_url : `${baseUrl}${article.image_url}`,
      title: article.title_ru,
    }] : undefined
  }));

  // Programmatic City routes (pSEO)
  const cities = ['dushanbe', 'khujand', 'kulob', 'bokhtar', 'vakhdat', 'hissar'];
  const cityRoutes: any[] = [];
  
  cities.forEach(city => {
    (products || []).forEach(product => {
      const slug = slugify(product.name);
      cityRoutes.push({
        url: `${baseUrl}/buy/${city}/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.5
      });
    });
  });

  console.log(`Sitemap: Generated ${productRoutes.length} products, ${articleRoutes.length} articles, and ${cityRoutes.length} city-pSEO pages.`);

  return [...baseRoutes, ...productRoutes, ...articleRoutes, ...cityRoutes];
}
