import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const client = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  console.log('Fetching database items...');
  const { data: products, error } = await client.from('products').select('*');
  
  if (error || !products) {
    console.error('Error fetching:', error);
    return;
  }

  const enrichedDataPath = path.join(__dirname, '../data/enriched_gls_products.json');
  const enrichedData = JSON.parse(fs.readFileSync(enrichedDataPath, 'utf8'));
  
  let perfectCount = 0;
  let missingImages = [];
  let missingDescriptions = [];
  let missingTags = [];
  let notInEnrichedData = [];

  products.forEach(p => {
    let isPerfect = true;
    const nameKey = p.name ? p.name.trim().toLowerCase() : '';

    if (!p.image_url) {
      missingImages.push(p.name);
      isPerfect = false;
    }
    
    // Check if the description exists in DB OR in the mapped local JSON
    const localDescription = enrichedData[nameKey]?.properties;
    if (!p.description && !localDescription) {
      missingDescriptions.push(p.name);
      isPerfect = false;
    }
    
    const localTags = enrichedData[nameKey]?.tags;
    if ((!p.tags || p.tags.length === 0) && (!localTags || localTags.length === 0)) {
       missingTags.push(p.name);
       isPerfect = false;
    }

    if (!enrichedData[nameKey]) {
       notInEnrichedData.push(p.name);
    }

    if (isPerfect) perfectCount++;
  });

  const report = `
# Отчет Робота: Аудит базы данных товаров

Проверено товаров в базе Supabase: **${products.length}**

## 📊 Общая готовность
* Идеально заполненных карточек: **${perfectCount}**
* Товары отсутствующие в локальном JSON-словаре: **${notInEnrichedData.length}**

## 🖼️ Нет фотографий (${missingImages.length})
${missingImages.length === 0 ? 'Все фото на месте! ✅' : missingImages.map(n => '- ' + n).join('\n')}

## 📝 Нет описания (Marketing Hooks / Properties) (${missingDescriptions.length})
${missingDescriptions.length === 0 ? 'У всех товаров есть описание! ✅' : missingDescriptions.map(n => '- ' + n).join('\n')}

## 🏷️ Нет тегов (${missingTags.length})
${missingTags.length === 0 ? 'У всех товаров есть теги! ✅' : missingTags.map(n => '- ' + n).join('\n')}
  `;

  fs.writeFileSync(path.join(__dirname, '../../../audit_report.md'), report, 'utf8');
  console.log('Audit complete. Saved to audit_report.md');
}

runAudit();
