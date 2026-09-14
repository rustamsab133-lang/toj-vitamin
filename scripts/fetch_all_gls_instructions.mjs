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

  // 1. Two-word combination
  if (words.length >= 2) {
    fallbacks.push(`${words[0]} ${words[1]}`);
  }

  // 2. First word
  if (words.length >= 1) {
    fallbacks.push(words[0]);
  }

  // 3. Second word if first is generic like 'Витамин' or 'Формула' or 'Комплекс'
  if (words.length >= 2 && /^(витамин|формула|комплекс|детс|экстракт|барбарис)$/i.test(words[0])) {
    fallbacks.push(words[1]);
  }

  return Array.from(new Set(fallbacks));
}

function parseInstructionsFromHtml(html) {
  // 1. Look for tab with id="buy"
  let text = '';
  const buyMatch = html.match(/id="buy"[\s\S]*?<div class="content-inner">([\s\S]*?)<\/div>/i);
  if (buyMatch) {
    text = buyMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
  } else {
    // 2. Fallback: look for Рекомендации по применению
    const fallback = html.match(/Рекомендации по применению[\s\S]*?<div class="content-inner">([\s\S]*?)<\/div>/i);
    if (fallback) {
      text = fallback[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    }
  }

  if (!text) return null;

  const result = {
    full_text: text.replace(/\s+/g, ' ').trim()
  };

  // Extract usage
  const usageMatch = text.match(/(?:Взрослым|Детям|Лицам|Принимать|По)[\s\S]{10,250}?(?=\.\s*(?:Продолжительность|Возрастные|Противопоказания|$))/i);
  if (usageMatch) {
    result.usage = usageMatch[0].replace(/\s+/g, ' ').trim();
  }

  // Extract course
  const courseMatch = text.match(/Продолжительность приема[^\n.]+/i);
  if (courseMatch) {
    result.course = courseMatch[0].replace(/\s+/g, ' ').trim();
  }

  // Extract contraindications
  const contraMatch = text.match(/Противопоказания:?[^\n.]+/i);
  if (contraMatch) {
    result.contraindications = contraMatch[0].replace(/\s+/g, ' ').trim();
  }

  // Extract age restriction
  const ageMatch = text.match(/Возрастные ограничения:?[^\n.]+/i);
  if (ageMatch) {
    result.age = ageMatch[0].replace(/\s+/g, ' ').trim();
  }

  return result;
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

// Matching helper to find key in enriched_gls_products.json
function findEnrichmentKey(name, enrichedData) {
  const lower = name.toLowerCase().trim();
  if (enrichedData[lower]) return lower;

  const cleaned = cleanSearchQuery(name).toLowerCase();
  if (enrichedData[cleaned]) return cleaned;

  // Search by substring
  for (const k of Object.keys(enrichedData)) {
    if (lower.includes(k) || k.includes(cleaned)) return k;
  }

  // Search by words
  const words = cleaned.split(/\s+/).filter(w => w.length >= 3);
  for (const w of words) {
    if (enrichedData[w]) return w;
  }

  return cleaned;
}

async function run() {
  console.log('🚀 Запуск сбора официальных инструкций GLS с сайта gls.store...');

  const { data: dbProducts, error } = await sb.from('products').select('*').gt('price', 0);
  if (error || !dbProducts) {
    console.error('Ошибка загрузки продуктов:', error);
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
    
    // Check if already has instructions
    if (enriched[enrichKey] && enriched[enrichKey].instructions) {
      console.log(`[${i + 1}/${dbProducts.length}] ⏩ Уже есть инструкции: "${p.name}"`);
      skippedCount++;
      continue;
    }

    const primaryQuery = cleanSearchQuery(p.name);
    const queries = [primaryQuery, ...getFallbackQueries(p.name)];
    let detailUrl = null;

    for (const q of queries) {
      detailUrl = await searchGls(q);
      if (detailUrl) break;
      await new Promise(r => setTimeout(r, 200));
    }

    if (!detailUrl) {
      console.log(`[${i + 1}/${dbProducts.length}] ❌ Не найден на gls.store: "${p.name}" (искали: ${queries.join(' | ')})`);
      failedCount++;
      continue;
    }

    try {
      const detailRes = await fetch(detailUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const detailHtml = await detailRes.text();
      const parsed = parseInstructionsFromHtml(detailHtml);

      if (parsed) {
        if (!enriched[enrichKey]) {
          enriched[enrichKey] = {
            name: p.name,
            properties: [],
            tags: p.tags || [],
            synergies: []
          };
        }

        enriched[enrichKey].instructions = {
          usage: parsed.usage || parsed.full_text,
          course: parsed.course || '1 месяц',
          contraindications: parsed.contraindications || 'Индивидуальная непереносимость компонентов, беременность, кормление грудью.',
          age: parsed.age || '18+',
          full_text: parsed.full_text,
          source_url: detailUrl
        };

        console.log(`[${i + 1}/${dbProducts.length}] ✅ "${p.name}":`);
        console.log(`     👉 Прием: ${parsed.usage || parsed.full_text}`);
        console.log(`     👉 Курс: ${parsed.course || '1 месяц'}`);
        successCount++;
      } else {
        console.log(`[${i + 1}/${dbProducts.length}] ⚠️ На странице нет блока инструкций: ${detailUrl}`);
        failedCount++;
      }
    } catch (err) {
      console.error(`[${i + 1}/${dbProducts.length}] ❌ Ошибка парсинга ${detailUrl}:`, err.message);
      failedCount++;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 350));
  }

  console.log('\n=========================================');
  console.log(`🎉 Сбор завершен!`);
  console.log(`   Успешно извлечено: ${successCount}`);
  console.log(`   Пропущено (уже было): ${skippedCount}`);
  console.log(`   Не найдено: ${failedCount}`);
  console.log(`   Всего записей в каталоге: ${Object.keys(enriched).length}`);
  console.log('=========================================');

  // Save to JSON
  fs.writeFileSync(enrichedPath, JSON.stringify(enriched, null, 2), 'utf8');
  console.log('💾 Сохранен обновленный src/data/enriched_gls_products.json');

  // Save to Supabase site_settings
  console.log('☁️ Обновление site_settings в Supabase...');
  const { error: sbErr } = await sb.from('site_settings').upsert({
    key: 'enriched_gls_products_data',
    value: JSON.stringify(enriched)
  });

  if (sbErr) {
    console.error('❌ Ошибка сохранения в Supabase:', sbErr);
  } else {
    console.log('✅ Supabase site_settings успешно обновлен!');
  }
}

run().catch(console.error);
