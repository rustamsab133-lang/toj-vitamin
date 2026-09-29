/**
 * optimize_catalog_images.js
 * 
 * Скачивает и оптимизирует фотографии товаров для каталога в public/catalog-thumbs/
 * Сжимает каждое изображение с ~400 КБ до ~17 КБ.
 * 
 * Запуск: node scripts/optimize_catalog_images.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: В .env.local не найдены ключи Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function optimizeImages() {
  console.log('🚀 Оптимизация фотографий для мобильного PDF-каталога...');
  const thumbsDir = path.join(__dirname, '../public/catalog-thumbs');
  if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir, { recursive: true });
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image_url')
    .order('id');

  if (error || !products) {
    console.error('Ошибка загрузки продуктов:', error);
    return;
  }

  console.log(`📦 Всего товаров для обработки: ${products.length}`);
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (p) => {
      const outPath = path.join(thumbsDir, `prod-${p.id}.png`);

      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
        skipped++;
        return;
      }

      if (!p.image_url) {
        skipped++;
        return;
      }

      try {
        const res = await fetch(p.image_url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);

        await sharp(buffer)
          .resize({ height: 260, withoutEnlargement: true })
          .png({ quality: 80, compressionLevel: 9 })
          .toFile(outPath);

        processed++;
      } catch (err) {
        // console.warn(`⚠️ Ошибка для товара ${p.id}:`, err.message);
        failed++;
      }
    }));

    process.stdout.write(`\r⏳ Обработано: ${Math.min(i + BATCH_SIZE, products.length)} / ${products.length}`);
  }

  console.log('\n\n✅ Оптимизация завершена:');
  console.log(`- Обработано новых: ${processed}`);
  console.log(`- Уже было в кэше: ${skipped}`);
  console.log(`- Ошибок: ${failed}`);

  // Calculate total size of thumbs directory
  const files = fs.readdirSync(thumbsDir);
  let totalBytes = 0;
  files.forEach(f => {
    totalBytes += fs.statSync(path.join(thumbsDir, f)).size;
  });
  console.log(`📊 Общий вес всех ${files.length} миниатюр: ${(totalBytes / (1024 * 1024)).toFixed(2)} МБ`);
}

optimizeImages().catch(console.error);
