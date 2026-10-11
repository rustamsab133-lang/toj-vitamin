import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const enrichedPath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');

const BATCH2 = [
  // Multivitamins
  { id: 74, query: 'Мультивитамины актив шипучие', name: 'Мультивитамины актив шипучие' },
  { id: 75, query: 'Мультивитамины для детей капсулы', name: 'Мультивитамины для детей капсулы' },
  { id: 76, query: 'Мультивитамины для детей пастилки', name: 'Мультивитамины для детей пастилки' },
  // Omega D3
  { id: 83, query: 'Омега 3 Витамин Д3 120', name: 'Омега-3 Витамин D3 120 капс' },
  { id: 84, query: 'Омега 3 Витамин Д3 60', name: 'Омега-3 Витамин D3 60 капс' },
  // Marine collagen
  { id: 51, query: 'Коллаген морской 180', name: 'Коллаген морской 180 капсул' },
  { id: 52, query: 'Коллаген морской 90', name: 'Коллаген морской 90 капсул' },
  // D3
  { id: 15, query: 'Витамин D3 для детей 90', name: 'Витамин D3 для детей 90 пастилок' },
  { id: 18, query: 'Витамин Д3 2000 60', name: 'Витамин Д3 2000МЕ 60 капс' },
  // D3+K2
  { id: 19, query: 'Витамин Д3+К2 60 капсул', name: 'Витамин Д3+К2 60 капс' },
  // Hyaluronic
  { id: 30, query: 'Гиалуроновая кислота 300 мг', name: 'Гиалуроновая кислота 300мг' },
  // Zinc Selenium
  { id: 102, query: 'Цинк селен 60', name: 'Цинк селен 60 капсул' },
  // Omega 3-6-9
  { id: 79, query: 'Омега 3-6-9 90', name: 'Омега 3-6-9 90 капсул' },
  // Chromium
  { id: 99, query: 'Хрома пиколинат 120', name: 'Хрома пиколинат 120 капсул' },
  // Magnesium Citrate + B6 90
  { id: 68, query: 'Магний цитрат В6 90', name: 'Магний Цитрат + В6 90 капс' }
];

async function searchGls(q) {
  try {
    const res = await fetch(`https://gls.store/catalog/?q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await res.text();
    const links = Array.from(html.matchAll(/href="(\/catalog\/[^"]+)"[^>]*class="dark_link/gi));
    if (links.length > 0) return `https://gls.store${links[0][1]}`;
  } catch (e) {}
  return null;
}

function extractGalleryImages(html) {
  const results = [];
  const galleryLinkRegex = /<a[^>]+href="([^"]*\/upload\/iblock\/[^"]*\.(?:jpg|jpeg|png|webp))"[^>]*class="[^"]*(?:product-detail-gallery|fancybox|popup_link|gallery)[^"]*"/gi;
  let match;
  while ((match = galleryLinkRegex.exec(html)) !== null) {
    results.push(match[1]);
  }

  if (results.length === 0) {
    const fallbackRegex = /href="([^"]*\/upload\/iblock\/[^"]*\.(?:jpg|jpeg|png|webp))"/gi;
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (!match[1].includes('resize_cache') && !match[1].includes('logo')) {
        results.push(match[1]);
      }
    }
  }

  const unique = [];
  for (let img of results) {
    if (img.startsWith('//')) img = 'https:' + img;
    else if (!img.startsWith('http')) img = 'https://gls.store' + img;
    if (!img.includes('320x474') && !img.includes('logo') && !img.includes('icon') && !unique.includes(img)) {
      unique.push(img);
    }
  }
  return unique;
}

async function uploadToSupabase(imageUrl, productId, index) {
  try {
    const res = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const ext = imageUrl.endsWith('.png') ? 'png' : (imageUrl.endsWith('.webp') ? 'webp' : 'jpg');
    const contentType = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');
    const storagePath = `gallery/prod-${productId}-${index}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from('product-images')
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (uploadError) return null;

    const { data: urlData } = sb.storage.from('product-images').getPublicUrl(storagePath);
    return urlData.publicUrl;
  } catch (err) {
    return null;
  }
}

async function run() {
  const enriched = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  if (!enriched.by_product_id) enriched.by_product_id = {};

  for (const item of BATCH2) {
    console.log(`\nSearching [ID ${item.id}] "${item.name}"...`);
    const pageUrl = await searchGls(item.query);
    if (!pageUrl) {
      console.log(`   ❌ No page found for query "${item.query}"`);
      continue;
    }
    console.log(`   Found URL: ${pageUrl}`);

    try {
      const pageRes = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await pageRes.text();
      const rawImages = extractGalleryImages(html);
      console.log(`   Found ${rawImages.length} images`);

      if (rawImages.length === 0) continue;

      const uploadedUrls = [];
      for (let idx = 0; idx < Math.min(rawImages.length, 3); idx++) {
        const u = await uploadToSupabase(rawImages[idx], item.id, idx);
        if (u) {
          uploadedUrls.push(u);
          console.log(`   ✅ [${idx}]: ${u}`);
        }
      }

      if (uploadedUrls.length > 0) {
        if (!enriched.by_product_id[String(item.id)]) {
          enriched.by_product_id[String(item.id)] = {};
        }
        enriched.by_product_id[String(item.id)].gallery = uploadedUrls;
      }
    } catch (e) {
      console.error(`   Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync(enrichedPath, JSON.stringify(enriched, null, 2));
  console.log(`\n💾 Saved updated data to ${enrichedPath}`);

  await sb
    .from('site_settings')
    .upsert({
      key: 'enriched_gls_products_data',
      value: enriched,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  console.log('✅ Synced to Supabase site_settings!');
}

run();
