import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const enrichedPath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');

const VARIANT_URLS = [
  // 1. 5-HTP real Maximum
  { id: 1, url: 'https://gls.store/catalog/ot_stressa/95598/', name: '5-HTP MAXIMUM 60 капсул' },
  // 2. Vitamin A
  { id: 16, url: 'https://gls.store/catalog/v_sezon_prostud/22688/', name: 'Витамин А 10000 МЕ 60 капсул' },
  // 3. Vitamin B12
  { id: 12, url: 'https://gls.store/catalog/dlya_mozga/96382/', name: 'Витамин В12 60 капсул' },
  // 4. Vitamin B5
  { id: 13, url: 'https://gls.store/catalog/vitaminy_i_aminokisloty/101179/', name: 'Витамин В5 60 капсул' },
  // 5. Selenium
  { id: 89, url: 'https://gls.store/catalog/vitaminy_i_aminokisloty/97001/', name: 'Селен 100 мкг 60 капсул' },
  // 6. Protein Strawberry
  { id: 86, url: 'https://gls.store/catalog/for_sports_vitamins/89921/', name: 'Протеин Клубника 900г' },
  // 7. Protein Banana
  { id: 87, url: 'https://gls.store/catalog/aminokislota/89919/', name: 'Протеин Сливочный банан 900г' },
  // 8. Protein Chocolate
  { id: 88, url: 'https://gls.store/catalog/for_sports_vitamins/89922/', name: 'Протеин Шоколад 900г' },
  // 9. Creatine Raspberry 300g
  { id: 58, url: 'https://gls.store/catalog/for_sports_vitamins/86528/', name: 'Креатин Малина 300г' },
  // 10. Creatine Citrus 300g
  { id: 59, url: 'https://gls.store/catalog/for_sports_vitamins/86529/', name: 'Креатин Цитрус 300г' },
  // 11. Creatine Citrus 150g
  { id: 60, url: 'https://gls.store/catalog/aminokislota/88213/', name: 'Креатин Цитрус 150г' },
  // 12. Creatine Exotic 150g
  { id: 61, url: 'https://gls.store/catalog/aminokislota/97091/', name: 'Креатин Экзотик 150г' },
  // 13. Creatine Exotic 300g
  { id: 62, url: 'https://gls.store/catalog/for_sports_vitamins/86530/', name: 'Креатин Экзотик 300г' },
  // 14. Vitamin C Orange effervescent
  { id: 23, url: 'https://gls.store/catalog/v_sezon_prostud/4463/', name: 'Витамин С шипучий Апельсин' },
  // 15. Vitamin C Lemon effervescent
  { id: 24, url: 'https://gls.store/catalog/v_sezon_prostud/5554/', name: 'Витамин С шипучий Лимон' },
  // 16. Collagen Lemon powder 180g
  { id: 54, url: 'https://gls.store/catalog/dlya_kostey_i_sustavov/43020/', name: 'Коллаген Лимон порошок 180г' },
  // 17. Collagen Raspberry powder 180g
  { id: 55, url: 'https://gls.store/catalog/dlya_kostey_i_sustavov/43018/', name: 'Коллаген Малина порошок 180г' },
  // 18. Collagen Joint capsules 120 (prod-49)
  { id: 49, url: 'https://gls.store/catalog/dlya_kostey_i_sustavov/22685/', name: 'Коллаген для суставов с мартинией' },
  // 19. Collagen Animal capsules 120 (prod-50)
  { id: 50, url: 'https://gls.store/catalog/dlya_kostey_i_sustavov/22685/', name: 'Коллаген животный' }
];

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

    if (uploadError) {
      console.error(`      ⚠️ Error uploading (${storagePath}):`, uploadError.message);
      return null;
    }

    const { data: urlData } = sb.storage.from('product-images').getPublicUrl(storagePath);
    return urlData.publicUrl;
  } catch (err) {
    console.error(`      ⚠️ Error downloading ${imageUrl}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('🚀 Starting targeted download and upload of verified galleries...');
  const enriched = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  if (!enriched.by_product_id) enriched.by_product_id = {};

  for (let i = 0; i < VARIANT_URLS.length; i++) {
    const target = VARIANT_URLS[i];
    console.log(`\n[${i + 1}/${VARIANT_URLS.length}] Processing [ID ${target.id}] "${target.name}"...`);
    console.log(`   Source: ${target.url}`);

    try {
      const pageRes = await fetch(target.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!pageRes.ok) {
        console.error(`   ❌ Failed to fetch page: HTTP ${pageRes.status}`);
        continue;
      }

      const html = await pageRes.text();
      const rawImages = extractGalleryImages(html);
      console.log(`   Found ${rawImages.length} gallery images on gls.store`);

      if (rawImages.length === 0) continue;

      const uploadedUrls = [];
      for (let idx = 0; idx < Math.min(rawImages.length, 4); idx++) {
        const publicUrl = await uploadToSupabase(rawImages[idx], target.id, idx);
        if (publicUrl) {
          uploadedUrls.push(publicUrl);
          console.log(`   ✅ Uploaded [${idx}]: ${publicUrl}`);
        }
      }

      if (uploadedUrls.length > 0) {
        if (!enriched.by_product_id[String(target.id)]) {
          enriched.by_product_id[String(target.id)] = {};
        }
        enriched.by_product_id[String(target.id)].gallery = uploadedUrls;

        // Extract usage text if available
        const m = html.match(/(?:Рекомендации по применению|Способ применения|взрослым)[^<]+/gi);
        if (m && m.length > 0) {
          const usageText = m[0].replace(/<[^>]+>/g, '').trim();
          if (!enriched.by_product_id[String(target.id)].instructions) {
            enriched.by_product_id[String(target.id)].instructions = {};
          }
          enriched.by_product_id[String(target.id)].instructions.usage = usageText;
          enriched.by_product_id[String(target.id)].instructions.source_url = target.url;
        }

        // Special update for 5-HTP top level
        if (target.id === 1) {
          if (enriched['5-htp']) {
            enriched['5-htp'].gallery = uploadedUrls;
            enriched['5-htp'].instructions = {
              usage: 'Взрослым по 1-2 капсулы в день во время еды',
              course: 'Продолжительность приема - 1 месяц',
              contraindications: 'Противопоказания: индивидуальная непереносимость компонентов, беременность, кормление грудью',
              age: 'Возрастные ограничения: 18+',
              full_text: 'Взрослым по 1-2 капсулы в день во время еды. Продолжительность приема - 1 месяц. При необходимости прием можно повторить. Возрастные ограничения: 18+. Противопоказания: индивидуальная непереносимость компонентов, беременность, кормление грудью. Перед применением рекомендуется проконсультироваться с врачом.',
              source_url: target.url
            };
          }
        }
      }
    } catch (e) {
      console.error(`   ❌ Error processing ID ${target.id}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // Save back to JSON
  fs.writeFileSync(enrichedPath, JSON.stringify(enriched, null, 2));
  console.log(`\n💾 Saved updated data to ${enrichedPath}`);

  // Sync to Supabase site_settings
  console.log('🔄 Syncing enriched_gls_products_data to Supabase site_settings...');
  const { error: syncErr } = await sb
    .from('site_settings')
    .upsert({
      key: 'enriched_gls_products_data',
      value: enriched,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (syncErr) {
    console.error('❌ Error syncing to Supabase:', syncErr.message);
  } else {
    console.log('✅ Successfully synced to Supabase site_settings!');
  }
}

run();
