import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/slugify';
import { getMarkupSettings, applyMarkupToProduct } from '@/lib/markup';
import { getHiddenProductIds, filterVisibleProducts } from '@/lib/hiddenProducts';
import enrichedData from '@/data/enriched_gls_products.json';
import { 
  sanitizeTitle, 
  sanitizeDescription, 
  escapeCsvField,
  getProductDescription,
  MANDATORY_SUPPLEMENT_DISCLAIMER 
} from '@/lib/catalogSanitizer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv'; // 'csv' or 'xml'

    const [{ data: rawProducts, error }, hiddenIds, markupSettings] = await Promise.all([
      supabase.from('products').select('*').order('id'),
      getHiddenProductIds(),
      getMarkupSettings()
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Фильтруем видимые товары и применяем наценку
    const visibleProducts = filterVisibleProducts(rawProducts || [], hiddenIds);
    const products = visibleProducts.map(p => applyMarkupToProduct(p, markupSettings));

    const baseUrl = 'https://www.toj-vitamin.tj';

    // 1. Формат CSV для Meta Commerce Manager / Instagram Shop
    if (format.toLowerCase() === 'csv') {
      const headers = [
        'id',
        'title',
        'description',
        'availability',
        'condition',
        'price',
        'link',
        'image_link',
        'brand',
        'google_product_category',
        'fb_product_category',
        'custom_label_0'
      ];

      const rows = products.map(product => {
        const safeTitle = sanitizeTitle(product.name);
        const safeDesc = getProductDescription(product, enrichedData as Record<string, any>);
        const productUrl = `${baseUrl}/product/${slugify(safeTitle)}`;
        const imageUrl = product.image_url || `${baseUrl}/og-image.png`;
        const priceFormatted = `${Number(product.price).toFixed(2)} TJS`;

        return [
          escapeCsvField(`prod_${product.id}`),
          escapeCsvField(safeTitle),
          escapeCsvField(safeDesc),
          escapeCsvField('in stock'),
          escapeCsvField('new'),
          escapeCsvField(priceFormatted),
          escapeCsvField(productUrl),
          escapeCsvField(imageUrl),
          escapeCsvField('GLS Pharmaceuticals'),
          escapeCsvField('Health & Beauty > Health Care > Fitness & Nutrition > Vitamins & Supplements'),
          escapeCsvField('health & beauty > health care > fitness & nutrition > vitamins & supplements'),
          escapeCsvField('Витамины и БАД')
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'inline; filename="meta_catalog_instagram_safe.csv"',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      });
    }

    // 2. Формат XML (RSS 2.0 Meta Feed)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>toj-vitamin.tj Meta Compliant Product Feed</title>
    <link>${baseUrl}</link>
    <description>Безопасный каталог витаминов и БАД GLS для Instagram и Meta Commerce</description>
${products.map(product => {
      const safeTitle = sanitizeTitle(product.name);
      const safeDesc = getProductDescription(product, enrichedData as Record<string, any>);
      const productUrl = `${baseUrl}/product/${slugify(safeTitle)}`;
      const imageUrl = product.image_url || `${baseUrl}/og-image.png`;

      return `    <item>
      <g:id>prod_${product.id}</g:id>
      <g:title><![CDATA[${safeTitle}]]></g:title>
      <g:description><![CDATA[${safeDesc}]]></g:description>
      <g:link>${productUrl}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:brand>GLS Pharmaceuticals</g:brand>
      <g:condition>new</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>${Number(product.price).toFixed(2)} TJS</g:price>
      <g:google_product_category>Health &amp; Beauty &gt; Health Care &gt; Fitness &amp; Nutrition &gt; Vitamins &amp; Supplements</g:google_product_category>
      <g:custom_label_0>Витамины и БАД</g:custom_label_0>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    }).join('\n')}
  </channel>
</rss>`;

    return new NextResponse(xml.trim(), {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });

  } catch (err: any) {
    console.error('Error generating safe instagram feed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
