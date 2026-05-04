const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Ключевые слова для поиска "товара-партнера" в обосновании
const PARTNER_KEYWORDS = [
  { keywords: ['омега', 'omega'], name: 'Омега 3 PRO капс. (сердце, концентрация) 700мг №60 GLS' },
  { keywords: ['витамин с', 'vitamin c'], name: 'Витамин С капс. (иммунитет, сердце, красота) 900мг 500мг №60 GLS' },
  { keywords: ['магний', 'magnesium'], name: 'Магний Хелат капс. (сон, нервы, сердце) 400мг №180 GLS' },
  { keywords: ['коэнзим', 'q10'], name: 'Коэнзим Q10 капс. (красота, сердце) 310мг №60 GLS' },
  { keywords: ['цитруллин', 'citrulline'], name: 'Цитруллин капс. 320мг №90 GLS' },
  { keywords: ['коллаген', 'collagen'], name: 'Коллаген морской 1000МЕ капс. (молодость, кожа, волосы) 430мг №90 GLS' },
  { keywords: ['мультивитамины', 'multivitamins'], name: 'Мультивитамины 12+9 капс.420мг №60 GLS' },
  { keywords: ['pqq'], name: 'PQQ комплекс капс. (энергия, продуктивность) 400мг №30 GLS' },
];

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[^а-яa-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getBaseName(str) {
  const match = str.match(/^(.*?)(?:\s+(капс\.|шипучие|паст\.|порошок|\d+мг|\d+г|\())/i);
  if (match && match[1]) {
    return normalizeString(match[1]);
  }
  return normalizeString(str).split(' ').slice(0, 2).join(' ');
}

async function applySynergies() {
  console.log('--- STARTING DATABASE UPDATE ---');
  
  // 1. Загружаем все товары из базы
  const { data: dbProducts, error: dbError } = await supabase.from('products').select('id, name');
  if (dbError) throw dbError;

  // 2. Создаем карту Name -> ID для быстрого поиска партнеров
  const productMap = {};
  dbProducts.forEach(p => productMap[normalizeString(p.name)] = p.id);

  // 3. Предварительно находим ID основных партнеров
  const partnerIds = {};
  for (const item of PARTNER_KEYWORDS) {
    const normName = normalizeString(item.name);
    // Ищем точное совпадение или частичное в базе
    const foundId = productMap[normName] || dbProducts.find(p => normalizeString(p.name).includes(normName))?.id;
    if (foundId) partnerIds[item.keywords[0]] = foundId;
  }

  // 4. Парсим файл с синергиями
  const fileContent = fs.readFileSync('synergies_fixed.txt', 'utf8');
  const fileLines = fileContent.split('\n');
  const fileData = [];

  fileLines.forEach(line => {
    const match = line.match(/^\[(.*?)\]\s*->\s*Reason:\s*(.*)/);
    if (match) {
      fileData.push({
        normalizedName: normalizeString(match[1]),
        baseName: getBaseName(match[1]),
        reason: match[2].trim()
      });
    }
  });

  console.log(`Processing ${dbProducts.length} products...`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const dbProduct of dbProducts) {
    const normDbName = normalizeString(dbProduct.name);
    const baseDbName = getBaseName(dbProduct.name);

    // Поиск причины
    let match = fileData.find(f => f.normalizedName === normDbName);
    if (!match) {
      match = fileData.find(f => 
        (f.baseName.length > 3 && baseDbName === f.baseName) || 
        (f.baseName.length > 5 && normDbName.includes(f.baseName))
      );
    }

    let finalReason = match ? match.reason : "Омега-3 создает правильную липидную оболочку клеток, улучшая усвоение данного нутриента.";
    
    // Поиск ID партнера в тексте причины
    let finalPartnerId = null;
    const lowerReason = finalReason.toLowerCase();
    
    for (const partner of PARTNER_KEYWORDS) {
      if (partner.keywords.some(k => lowerReason.includes(k))) {
        finalPartnerId = partnerIds[partner.keywords[0]];
        if (finalPartnerId) break;
      }
    }

    // Если партнер не найден в тексте, используем Омега-3 как золотой стандарт
    if (!finalPartnerId) {
      finalPartnerId = partnerIds['омега'];
    }

    // Обновление в базе
    const { error: updateError } = await supabase
      .from('products')
      .update({
        synergy_reason: finalReason,
        synergy_product_id: finalPartnerId
      })
      .eq('id', dbProduct.id);

    if (updateError) {
      console.error(`Error updating ${dbProduct.name}:`, updateError.message);
      errorCount++;
    } else {
      updatedCount++;
      if (updatedCount % 20 === 0) console.log(`Updated ${updatedCount} products...`);
    }
  }

  console.log('\n--- UPDATE COMPLETE ---');
  console.log(`Successfully updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
}

applySynergies().catch(err => console.error('FATAL ERROR:', err));
