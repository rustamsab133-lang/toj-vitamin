import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const enrichedPath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');

function cleanSearchQuery(name) {
  return name
    .replace(/\([^)]+\)/g, ' ')
    .replace(/капс\.*|таб\.*|пор\.*|порошок|паст\.*|сироп|масса\s*[\d.,]+г*|лимон|апельсин/gi, ' ')
    .replace(/gls|pharm|№\d+|\d+\s*мг|\d+\s*г|\d+\s*ие|\d+\s*ме|\d+\s*мкг/gi, ' ')
    .replace(/[^\wа-яА-ЯёЁ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getFallbackQueries(name) {
  const clean = cleanSearchQuery(name);
  const words = clean.split(/\s+/).filter(w => w.length >= 3);
  const fallbacks = [];

  if (words.length >= 2) {
    fallbacks.push(`${words[0]} ${words[1]}`);
  }
  if (words.length >= 1) {
    fallbacks.push(words[0]);
  }
  if (words.length >= 2 && /^(витамин|формула|комплекс|детс|экстракт|барбарис)$/i.test(words[0])) {
    fallbacks.push(words[1]);
  }

  return Array.from(new Set(fallbacks));
}

async function searchGls(query) {
  try {
    const res = await fetch(`https://gls.store/catalog/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await res.text();
    const links = Array.from(html.matchAll(/href="(\/catalog\/[^"]+)"[^>]*class="dark_link/gi));
    if (links.length > 0) {
      return `https://gls.store${links[0][1]}`;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function findEnrichmentKey(name, enrichedData) {
  const lower = name.toLowerCase().trim();
  if (enrichedData[lower]) return lower;

  const cleaned = cleanSearchQuery(name).toLowerCase();
  if (enrichedData[cleaned]) return cleaned;

  for (const k of Object.keys(enrichedData)) {
    if (lower.includes(k) || k.includes(cleaned)) return k;
  }

  const words = cleaned.split(/\s+/).filter(w => w.length >= 3);
  for (const w of words) {
    if (enrichedData[w]) return w;
  }

  return cleaned;
}

function extractGalleryImages(html) {
  const results = [];
  
  // 1. Look for gallery links: <a ... class="...product-detail-gallery__link..." href="[URL]"
  // or <a ... class="...fancybox..." href="[URL]"
  const galleryLinkRegex = /<a[^>]+href="([^"]*\/upload\/iblock\/[^"]*\.(?:jpg|jpeg|png|webp))"[^>]*class="[^"]*(?:product-detail-gallery|fancybox|popup_link|gallery)[^"]*"/gi;
  let match;
  while ((match = galleryLinkRegex.exec(html)) !== null) {
    results.push(match[1]);
  }

  // 2. If empty, look for any <a> tags in slider with /upload/iblock/
  if (results.length === 0) {
    const fallbackRegex = /href="([^"]*\/upload\/iblock\/[^"]*\.(?:jpg|jpeg|png|webp))"/gi;
    while ((match = fallbackRegex.exec(html)) !== null) {
      if (!match[1].includes('resize_cache') && !match[1].includes('logo')) {
        results.push(match[1]);
      }
    }
  }

  // Normalize URLs and deduplicate preserving order
  const uniqueUrls = [];
  for (let img of results) {
    if (img.startsWith('//')) img = 'https:' + img;
    else if (!img.startsWith('http')) img = 'https://gls.store' + img;
    
    // Ignore small icons or banners
    if (img.includes('320x474') || img.includes('logo') || img.includes('icon')) continue;
    
    if (!uniqueUrls.includes(img)) {
      uniqueUrls.push(img);
    }
  }

  return uniqueUrls;
}

async function uploadToSupabase(imageUrl, productId, index) {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = imageUrl.endsWith('.png') ? 'png' : (imageUrl.endsWith('.webp') ? 'webp' : 'jpg');
    const contentType = ext === 'png' ? 'image/png' : (ext === 'webp' ? 'image/webp' : 'image/jpeg');
    const storagePath = `gallery/prod-${productId}-${index}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from('product-images')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error(`      ⚠️ Ошибка загрузки в Storage (${storagePath}):`, uploadError.message);
      return null;
    }

    const { data: urlData } = sb.storage.from('product-images').getPublicUrl(storagePath);
    return urlData.publicUrl;
  } catch (err) {
    console.error(`      ⚠️ Ошибка скачивания фото ${imageUrl}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('🚀 Запуск сбора полной галереи (лицо + оборот + таблица) GLS...');

  const { data: dbProducts, error } = await sb.from('products').select('*').order('id');
  if (error || !dbProducts) {
    console.error('Ошибка загрузки продуктов из БД:', error);
    return;
  }

  console.log(`📦 Загружено продуктов из БД: ${dbProducts.length}`);

  let enriched = {};
  if (fs.existsSync(enrichedPath)) {
    enriched = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  }

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < dbProducts.length; i++) {
    const p = dbProducts[i];
    const enrichKey = findEnrichmentKey(p.name, enriched);

    // Skip if already has gallery with at least 2 photos (front + back)
    if (enriched[enrichKey] && Array.isArray(enriched[enrichKey].gallery) && enriched[enrichKey].gallery.length >= 2) {
      console.log(`[${i + 1}/${dbProducts.length}] ⏩ Уже есть галерея (${enriched[enrichKey].gallery.length} фото): "${p.name}"`);
      skippedCount++;
      continue;
    }

    const primaryQuery = cleanSearchQuery(p.name);
    const queries = [primaryQuery, ...getFallbackQueries(p.name)];
    let detailUrl = null;

    for (const q of queries) {
      detailUrl = await searchGls(q);
      if (detailUrl) break;
      await new Promise(r => setTimeout(r, 150));
    }

    if (!detailUrl) {
      console.log(`[${i + 1}/${dbProducts.length}] ❌ Не найден на gls.store: "${p.name}"`);
      failedCount++;
      continue;
    }

    try {
      const detailRes = await fetch(detailUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const detailHtml = await detailRes.text();
      const rawImages = extractGalleryImages(detailHtml);

      if (rawImages.length === 0) {
        console.log(`[${i + 1}/${dbProducts.length}] ⚠️ На странице не найдены изображения галереи: ${detailUrl}`);
        failedCount++;
        continue;
      }

      console.log(`[${i + 1}/${dbProducts.length}] 📸 Найдено ${rawImages.length} фото для "${p.name}". Загрузка в Supabase Storage...`);
      
      const uploadedUrls = [];
      for (let imgIdx = 0; imgIdx < rawImages.length; imgIdx++) {
        const publicUrl = await uploadToSupabase(rawImages[imgIdx], p.id, imgIdx);
        if (publicUrl) {
          uploadedUrls.push(publicUrl);
        }
        await new Promise(r => setTimeout(r, 100));
      }

      if (uploadedUrls.length > 0) {
        if (!enriched[enrichKey]) {
          enriched[enrichKey] = {
            name: p.name,
            properties: [],
            tags: p.tags || [],
            synergies: []
          };
        }

        enriched[enrichKey].gallery = uploadedUrls;
        console.log(`     ✅ Успешно сохранено ${uploadedUrls.length} фото (Оборот: ${uploadedUrls[1] ? 'Да' : 'Нет'})`);
        successCount++;

        // Save progress periodically every 5 items
        if (successCount % 5 === 0) {
          fs.writeFileSync(enrichedPath, JSON.stringify(enriched, null, 2), 'utf8');
        }
      } else {
        failedCount++;
      }
    } catch (err) {
      console.error(`[${i + 1}/${dbProducts.length}] ❌ Ошибка обработки ${detailUrl}:`, err.message);
      failedCount++;
    }

    await new Promise(r => setTimeout(r, 250));
  }

  console.log('\n=========================================');
  console.log(`🎉 Сбор галереи завершен!`);
  console.log(`   Успешно обработано: ${successCount}`);
  console.log(`   Пропущено (уже было): ${skippedCount}`);
  console.log(`   Не найдено / ошибка: ${failedCount}`);
  console.log('=========================================');

  // Save final JSON
  fs.writeFileSync(enrichedPath, JSON.stringify(enriched, null, 2), 'utf8');
  console.log('💾 Сохранен обновленный src/data/enriched_gls_products.json');

  // Save to Supabase site_settings
  console.log('☁️ Обновление site_settings в Supabase...');
  const { error: sbErr } = await sb.from('site_settings').upsert({
    key: 'enriched_gls_products_data',
    value: JSON.stringify(enriched)
  });

  if (sbErr) {
    console.error('❌ Ошибка сохранения в Supabase site_settings:', sbErr);
  } else {
    console.log('✅ Supabase site_settings успешно синхронизирован!');
  }
}

run().catch(console.error);
