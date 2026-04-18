import { MetadataRoute } from 'next';
import enrichedData from '@/data/enriched_gls_products.json';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.toj-vitamin.tj';

  // Base routes
  const routes = [
    '',
    '/quiz',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Product routes
  const products = Object.keys(enrichedData).map((key) => ({
    url: `${baseUrl}/product/${encodeURIComponent(key)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...routes, ...products];
}
