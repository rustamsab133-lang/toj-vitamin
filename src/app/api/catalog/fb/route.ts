import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/slugify';
import { getMarkupSettings, applyMarkupToProduct } from '@/lib/markup';
import { getHiddenProductIds, filterVisibleProducts } from '@/lib/hiddenProducts';
import enrichedData from '@/data/enriched_gls_products.json';
import { sanitizeTitle, sanitizeDescription, getProductDescription } from '@/lib/catalogSanitizer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [{ data: rawProducts, error }, hiddenIds] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .order('id'),
      getHiddenProductIds()
    ]);

    if (error) throw error;

    const visibleProducts = filterVisibleProducts(rawProducts || [], hiddenIds);
    const markupSettings = await getMarkupSettings();
    const products = visibleProducts.map(p => applyMarkupToProduct(p, markupSettings));

    const baseUrl = 'https://www.toj-vitamin.tj';

    // Generate XML in RSS 2.0 format (Standard for Meta/Facebook Catalog)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>toj-vitamin.tj Meta Compliant Product Feed</title>
    <link>${baseUrl}</link>
    <description>Безопасный каталог витаминов и БАД GLS для Instagram и Meta Commerce</description>
${products?.map((product) => {
      const safeTitle = sanitizeTitle(product.name);
      const safeSlug = slugify(safeTitle);
      const productUrl = `${baseUrl}/product/${safeSlug}`;
      const description = getProductDescription(product, enrichedData as Record<string, any>);
      
      return `    <item>
      <g:id>prod_${product.id}</g:id>
      <g:title><![CDATA[${safeTitle}]]></g:title>
      <g:description><![CDATA[${description.substring(0, 5000)}]]></g:description>
      <g:link>${productUrl}</g:link>
      <g:image_link>${product.image_url}</g:image_link>
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
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
