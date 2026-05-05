
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/slugify';

export async function GET() {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('id');

    if (error) throw error;

    const baseUrl = 'https://www.toj-vitamin.tj';

    // Generate XML in RSS 2.0 format (Standard for Meta/Facebook Catalog)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>toj-vitamin.tj Product Feed</title>
    <link>${baseUrl}</link>
    <description>Premium Vitamins and Supplements in Tajikistan</description>
${products?.map((product) => {
      const productUrl = `${baseUrl}/product/${slugify(product.name)}`;
      const description = product.description || `Купить ${product.name} в Таджикистане. Высокое качество от Green Leaf Sciences.`;
      
      return `    <item>
      <g:id>prod_${product.id}</g:id>
      <g:title><![CDATA[${product.name}]]></g:title>
      <g:description><![CDATA[${description.substring(0, 5000)}]]></g:description>
      <g:link>${productUrl}</g:link>
      <g:image_link>${product.image_url}</g:image_link>
      <g:brand>Green Leaf Sciences</g:brand>
      <g:condition>new</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>${Number(product.price).toFixed(2)} TJS</g:price>
      <g:google_product_category>Health &amp; Beauty &gt; Health Care &gt; Fitness &amp; Nutrition &gt; Vitamins &amp; Supplements</g:google_product_category>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    }).join('\n')}
  </channel>
</rss>`;

    return new NextResponse(xml.trim(), {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
