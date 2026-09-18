/**
 * export_instagram_safe_catalog.js
 * 
 * Скрипт безопасного экспорта каталога для Meta Commerce Manager 
 * (Instagram Shop, Facebook Catalog, WhatsApp Business) и оптовых покупателей.
 * 
 * Предотвращает блокировку аккаунта по правилам:
 * - Meta Ingestible Supplements Policy (БАДы и добавки)
 * - Meta Medical Claims Policy (Запрет медицинских обещаний и названий болезней)
 * - Meta Weight Loss Policy (Запрет обещаний похудения и жиросжигания)
 * 
 * Запуск: npm run export:meta  ИЛИ  node scripts/export_instagram_safe_catalog.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

// Подключаем санитайзер
require('ts-node/register');
const { 
  sanitizeTitle, 
  sanitizeDescription, 
  checkMetaSafety, 
  escapeCsvField, 
  getProductDescription,
  MANDATORY_SUPPLEMENT_DISCLAIMER 
} = require('../src/lib/catalogSanitizer.ts');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: В .env.local не найдены ключи Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[<>:"/\\|?*#%&()[\]]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  console.log('\n🛡️  === БЕЗОПАСНЫЙ ЭКСПОРТ КАТАЛОГА ДЛЯ INSTAGRAM & META COMMERCE ===');
  console.log('⏳ Загрузка товаров и настроек из Supabase...');

  // 1. Получаем товары, скрытые ID и наценку
  const [
    { data: rawProducts, error: prodErr },
    { data: hiddenData, error: hiddenErr },
    { data: settingsData, error: settingsErr }
  ] = await Promise.all([
    supabase.from('products').select('*').order('id'),
    supabase.from('site_settings').select('value').eq('key', 'hidden_product_ids').maybeSingle(),
    supabase.from('site_settings').select('key, value')
  ]);

  if (prodErr || !rawProducts) {
    console.error('❌ Ошибка загрузки продуктов:', prodErr?.message);
    process.exit(1);
  }

  // Скрытые товары
  let hiddenIds = new Set();
  if (hiddenData?.value) {
    try {
      const parsed = JSON.parse(hiddenData.value);
      if (Array.isArray(parsed)) {
        hiddenIds = new Set(parsed.map(String));
      }
    } catch (e) {
      console.warn('⚠️ Ошибка разбора hidden_product_ids:', e.message);
    }
  }

  // Настройки наценки
  const percentSetting = settingsData?.find(s => s.key === 'price_markup_percent');
  const flatSetting = settingsData?.find(s => s.key === 'price_markup_flat');
  const markupPercent = parseFloat(percentSetting?.value || '0') || 0;
  const markupFlat = parseFloat(flatSetting?.value || '0') || 0;

  console.log(`📦 Всего товаров в базе: ${rawProducts.length}`);
  console.log(`👁️ Скрытых товаров (нет в наличии): ${hiddenIds.size}`);
  console.log(`💰 Наценка: +${markupPercent}% и +${markupFlat} TJS`);

  // Фильтруем видимые товары
  const activeProducts = rawProducts.filter(p => !hiddenIds.has(String(p.id)));
  console.log(`✨ Активных товаров для экспорта: ${activeProducts.length}\n`);

  // Загружаем обогащенные данные если есть
  let enrichedData = {};
  try {
    const enrichedPath = path.join(__dirname, '../src/data/enriched_gls_products.json');
    if (fs.existsSync(enrichedPath)) {
      enrichedData = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
    }
  } catch (e) {
    console.warn('⚠️ Обогащенные данные не загружены, используем стандартные описания.');
  }

  const baseUrl = 'https://www.toj-vitamin.tj';

  // Заголовки Meta Catalog CSV (Официальный стандарт Commerce Manager)
  const metaCsvHeaders = [
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'brand',
    'google_product_category',
    'fb_product_category',
    'custom_label_0'
  ];

  // Заголовки Оптового каталога для клиентов
  const wholesaleCsvHeaders = [
    'Артикул',
    'Наименование товара',
    'Оптовая цена (TJS)',
    'Рекомендованная розничная цена (TJS)',
    'Потенциальная маржа (TJS)',
    'Форма выпуска',
    'Ссылка на фото товара'
  ];

  const metaRows = [];
  const wholesaleRows = [];

  let renamedTitlesCount = 0;
  let sanitizedDescCount = 0;
  let totalViolationsFound = 0;
  const auditLog = [];

  for (const product of activeProducts) {
    // Расчет розничной цены с наценкой
    let basePrice = Number(product.price) || 0;
    let retailPrice = basePrice;
    if (markupPercent > 0) retailPrice = retailPrice * (1 + markupPercent / 100);
    retailPrice = Math.round(retailPrice + markupFlat);

    // Примерная оптовая цена (оригинальная цена без наценки или со скидкой 20-30%)
    let wholesalePrice = basePrice > 0 ? basePrice : Math.round(retailPrice * 0.75);
    let margin = retailPrice - wholesalePrice;

    // 1. Очистка названия
    const originalTitle = product.name || '';
    const safeTitle = sanitizeTitle(originalTitle);
    if (safeTitle !== originalTitle) {
      renamedTitlesCount++;
      auditLog.push({
        id: product.id,
        type: 'TITLE_SANITIZED',
        before: originalTitle,
        after: safeTitle
      });
    }

    // 2. Очистка и получение подробного описания
    const safeDescription = getProductDescription(product, enrichedData);
    sanitizedDescCount++;

    // 3. Проверка безопасности Meta
    const titleCheck = checkMetaSafety(safeTitle);
    const descCheck = checkMetaSafety(safeDescription);

    if (!titleCheck.isSafe || !descCheck.isSafe) {
      totalViolationsFound++;
      console.warn(`⚠️ Внимание! Товар ID ${product.id} ("${safeTitle}") требует дополнительной проверки:`);
      if (!titleCheck.isSafe) console.warn(`   Название: ${titleCheck.violations.join(', ')}`);
      if (!descCheck.isSafe) console.warn(`   Описание: ${descCheck.violations.join(', ')}`);
    }

    // Ссылка на товар и фото
    const productUrl = `${baseUrl}/product/${slugify(safeTitle)}`;
    const imageUrl = product.image_url || 'https://www.toj-vitamin.tj/og-image.png';

    // Строка для Meta Commerce CSV
    metaRows.push([
      escapeCsvField(`prod_${product.id}`),
      escapeCsvField(safeTitle),
      escapeCsvField(safeDescription),
      escapeCsvField('in stock'),
      escapeCsvField('new'),
      escapeCsvField(`${retailPrice.toFixed(2)} TJS`),
      escapeCsvField(productUrl),
      escapeCsvField(imageUrl),
      escapeCsvField('GLS Pharmaceuticals'),
      escapeCsvField('Health & Beauty > Health Care > Fitness & Nutrition > Vitamins & Supplements'),
      escapeCsvField('health & beauty > health care > fitness & nutrition > vitamins & supplements'),
      escapeCsvField('Витамины и БАД')
    ].join(','));

    // Извлекаем фасовку для оптового каталога (капс, таб, №60 и т.д.)
    const packMatch = originalTitle.match(/(№\d+|\d+г|\d+мл|\d+паст)/i);
    const packaging = packMatch ? packMatch[0] : 'Упаковка';

    // Строка для Оптового каталога (с разделителем точка с запятой для русского Excel)
    wholesaleRows.push([
      escapeCsvField(`GLS-${product.id}`),
      escapeCsvField(safeTitle),
      escapeCsvField(wholesalePrice),
      escapeCsvField(retailPrice),
      escapeCsvField(margin),
      escapeCsvField(packaging),
      escapeCsvField(imageUrl)
    ].join(';'));
  }

  // Запись файла для Meta Catalog CSV (Стандарт RFC 4180 с запятыми)
  const metaCsvContent = '\uFEFF' + [metaCsvHeaders.join(','), ...metaRows].join('\r\n');
  const metaCsvPath = path.join(__dirname, '../public/meta_catalog_instagram_safe.csv');
  fs.writeFileSync(metaCsvPath, metaCsvContent, 'utf8');

  // Запись файла для Оптового каталога (с точкой с запятой для открытия в Excel в СНГ без настроек)
  const wholesaleCsvContent = '\uFEFF' + [wholesaleCsvHeaders.join(';'), ...wholesaleRows].join('\r\n');
  const wholesaleCsvPath = path.join(__dirname, '../public/wholesale_catalog_clean.csv');
  fs.writeFileSync(wholesaleCsvPath, wholesaleCsvContent, 'utf8');

  console.log('----------------------------------------------------');
  console.log('✅ ЭКСПОРТ УСПЕШНО ЗАВЕРШЕН!');
  console.log(`📁 Файл для Meta Commerce / Instagram: public/meta_catalog_instagram_safe.csv`);
  console.log(`📁 Файл для Оптовых клиентов:          public/wholesale_catalog_clean.csv`);
  console.log('----------------------------------------------------');
  console.log(`📊 ИТОГИ САНИТАРНОЙ ОБРАБОТКИ:`);
  console.log(`• Всего обработано товаров:   ${activeProducts.length}`);
  console.log(`• Названий обезопасено:        ${renamedTitlesCount}`);
  console.log(`• Описаний нормализовано:      ${sanitizedDescCount}`);
  console.log(`• Критических нарушений Meta:  ${totalViolationsFound}`);
  console.log(`• Дисклеймер БАД добавлен:     100% товаров`);
  console.log('----------------------------------------------------\n');

  if (auditLog.length > 0) {
    console.log('🔍 Примеры замененных названий (для защиты от бана):');
    auditLog.slice(0, 10).forEach(log => {
      console.log(`   [ID ${log.id}]`);
      console.log(`   🔴 Было:  "${log.before}"`);
      console.log(`   🟢 Стало: "${log.after}"\n`);
    });
    if (auditLog.length > 10) {
      console.log(`   ... и еще ${auditLog.length - 10} позиций.`);
    }
  }

  console.log('\n💡 СОВЕТ ДЛЯ ПОДКЛЮЧЕНИЯ В META COMMERCE MANAGER:');
  console.log('1. Вручную: Загрузите файл public/meta_catalog_instagram_safe.csv через Data Feed -> File Upload.');
  console.log('2. Автоматически по ссылке: Используйте эндпоинт https://www.toj-vitamin.tj/api/catalog/instagram-safe?format=csv');
}

main().catch(err => {
  console.error('❌ Критическая ошибка выполнения экспорта:', err);
  process.exit(1);
});
