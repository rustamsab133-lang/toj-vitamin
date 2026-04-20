const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[^а-яa-z0-9]/g, ' ') // Убираем спецсимволы
    .replace(/\s+/g, ' ') // Убираем двойные пробелы
    .trim();
}

function getBaseName(str) {
  // Пытаемся вытащить базовое название до скобок или веса (капс, таб, порошок)
  const match = str.match(/^(.*?)(?:\s+(капс\.|шипучие|паст\.|порошок|\d+мг|\d+г|\())/i);
  if (match && match[1]) {
    return normalizeString(match[1]);
  }
  return normalizeString(str).split(' ').slice(0, 2).join(' '); // Берем первые два слова как базу
}

async function runDryRun() {
  console.log('Fetching products from database...');
  const { data: dbProducts, error } = await supabase.from('products').select('id, name');
  if (error) {
    console.error('Error fetching from DB:', error);
    return;
  }

  console.log(`Loaded ${dbProducts.length} products from DB.`);

  let fileContent = fs.readFileSync('synergies_fixed.txt', 'utf8');
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.substring(1);
  }

  const lines = fileContent.split('\n');
  const fileData = [];

  // Парсим файл
  lines.forEach(line => {
    const match = line.match(/^\[(.*?)\]\s*->\s*Reason:\s*(.*)/);
    if (match) {
      fileData.push({
        rawName: match[1].trim(),
        normalizedName: normalizeString(match[1]),
        baseName: getBaseName(match[1]),
        reason: match[2].trim()
      });
    }
  });

  console.log(`Parsed ${fileData.length} synergies from file.`);
  if (fileData.length > 0) {
    console.log('Sample parsed from file:', JSON.stringify(fileData[0], null, 2));
    console.log('Sample parsed from DB:', { name: dbProducts[0].name, norm: normalizeString(dbProducts[0].name), base: getBaseName(dbProducts[0].name) });
  }

  const report = [];
  let exactMatchCount = 0;
  let fuzzyMatchCount = 0;
  let missingCount = 0;

  const matchedFileItems = new Set();

  dbProducts.forEach(dbProduct => {
    const normDbName = normalizeString(dbProduct.name);
    const baseDbName = getBaseName(dbProduct.name);

    // 1. Точное совпадение (после нормализации)
    let match = fileData.find(f => f.normalizedName === normDbName);

    if (match) {
      exactMatchCount++;
      matchedFileItems.add(match.rawName);
      report.push(`✅ [ТОЧНО] **${dbProduct.name}**\n   -> Найдено: ${match.rawName}\n   -> Обоснование: ${match.reason.substring(0, 60)}...`);
    } else {
      // 2. Частичное совпадение (по базовому имени - например "Коллаген морской")
      match = fileData.find(f => 
        (f.baseName.length > 3 && baseDbName === f.baseName) || 
        (f.baseName.length > 5 && normDbName.includes(f.baseName))
      );
      
      if (match) {
        fuzzyMatchCount++;
        matchedFileItems.add(match.rawName);
        report.push(`⚠️ [ПОХОЖЕ] **${dbProduct.name}**\n   -> Найдено: ${match.rawName} (база: '${baseDbName}')\n   -> Обоснование: ${match.reason.substring(0, 60)}...`);
      } else {
        // 3. Не найдено
        missingCount++;
        report.push(`❌ [ПУСТО] **${dbProduct.name}**\n   -> Будет применена универсальная синергия (Омега-3 / Мультивитамины).`);
      }
    }
  });

  const markdownReport = `
# Отчет о сопоставлении синергий (Dry-Run)

Всего товаров в базе: **${dbProducts.length}**
Всего записей в файле: **${fileData.length}**

## Статистика сопоставления:
- ✅ Точные совпадения: **${exactMatchCount}**
- ⚠️ Найдено по частичному сходству (наследование): **${fuzzyMatchCount}**
- ❌ Не найдено (применим универсальный совет): **${missingCount}**

> Общий процент покрытия каталога уникальными описаниями: **${Math.round(((exactMatchCount + fuzzyMatchCount) / dbProducts.length) * 100)}%**

---

## Детализация:

${report.join('\n\n')}
  `;

  fs.writeFileSync('synergy_report.md', markdownReport.trim(), 'utf8');
  console.log('\nReport generated: synergy_report.md');
}

runDryRun();
