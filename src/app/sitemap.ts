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
    '/quiz',
    '/journal',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic Product routes from DB to get real-time images and dates
  let { data: products } = await supabase
    .from('products')
    .select('name, image_url, updated_at')
    .order('name');

  // Fallback to enrichedData if DB fails or returns empty during build
  if (!products || products.length === 0) {
    console.log("Sitemap: Falling back to enrichedData for product routes.");
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
      lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    };

    // Advanced: Include image metadata (Supported by GSC for Image SEO)
    if (product.image_url) {
      item.images = [
        {
          url: product.image_url.startsWith('http') 
            ? product.image_url 
            : `${baseUrl}${product.image_url}`,
          title: product.name,
        }
      ];
    }

    return item;
  });

  console.log(`Sitemap: Generated ${productRoutes.length} product routes.`);
  return [...baseRoutes, ...productRoutes];
}
