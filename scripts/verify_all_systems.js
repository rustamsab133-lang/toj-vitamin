const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });

const RESULTS = [];

function assert(condition, testName, details = '') {
  if (condition) {
    RESULTS.push({ status: 'PASS', name: testName, details });
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    RESULTS.push({ status: 'FAIL', name: testName, details });
    console.log(`  ❌ [FAIL] ${testName} - ${details}`);
  }
}

async function runAllTests() {
  console.log("=================================================");
  console.log("🧪 ЗАПУСК КОМПЛЕКСНОГО ТЕСТИРОВАНИЯ TOJ-VITAMIN");
  console.log("=================================================\n");

  // ----------------------------------------------------
  // ТЕСТ 1: Проверка базы данных Supabase
  // ----------------------------------------------------
  console.log("--- 1. Тестирование подключения к Supabase ---");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  assert(Boolean(supabaseUrl && supabaseKey), "Переменные окружения Supabase присутствуют");

  const supabase = createClient(supabaseUrl, supabaseKey);

  let productsCount = 0;
  try {
    const { data: products, error } = await supabase.from('products').select('id, name, price').limit(5);
    assert(!error && products && products.length > 0, "Таблица products доступна и возвращает товары", error?.message || `Найдено записей: ${products?.length}`);
    productsCount = products?.length || 0;
  } catch (e) {
    assert(false, "Таблица products доступна", e.message);
  }

  try {
    const { data: articles, error } = await supabase.from('journal_articles').select('slug, title_ru').eq('is_published', true).limit(5);
    assert(!error && articles && articles.length > 0, "Таблица journal_articles доступна и возвращает опубликованные статьи", error?.message || `Найдено статей: ${articles?.length}`);
  } catch (e) {
    assert(false, "Таблица journal_articles доступна", e.message);
  }

  // ----------------------------------------------------
  // ТЕСТ 2: Тестирование Google APIs (GSC + Service Account)
  // ----------------------------------------------------
  console.log("\n--- 2. Тестирование интеграции с Google APIs ---");
  const keyFilePath = path.join(__dirname, '../google-key.json');
  assert(fs.existsSync(keyFilePath), "Файл google-key.json присутствует");

  try {
    const keyData = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
    assert(Boolean(keyData.client_email && keyData.private_key), "Сервисный аккаунт Google валиден", `Email: ${keyData.client_email}`);

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;
    
    assert(Boolean(siteUrl), "SEARCH_CONSOLE_SITE_URL задан", siteUrl);

    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 4);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 34);

    const res = await searchconsole.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: threeDaysAgo.toISOString().split('T')[0],
        dimensions: ['query'],
        rowLimit: 5
      }
    });
    assert(Boolean(res && res.data), "Google Search Console API отвечает успешно", `Строк данных: ${res.data.rows?.length || 0}`);
  } catch (e) {
    assert(false, "Google Search Console API", e.message);
  }

  // ----------------------------------------------------
  // ТЕСТ 3: Проверка отсутствия старого бренда в файлах кода (Zero Legacy Brand)
  // ----------------------------------------------------
  console.log("\n--- 3. Проверка чистоты брендинга (Zero 'Green Leaf Sciences' в src/) ---");
  const criticalFiles = [
    'src/app/layout.tsx',
    'src/app/product/[id]/page.tsx',
    'src/app/journal/page.tsx',
    'src/app/journal/[slug]/page.tsx',
    'src/app/HomeClient.tsx',
    'src/app/not-found.tsx',
    'src/app/loading.tsx',
    'src/app/buy/[city]/[slug]/page.tsx',
    'src/components/ArticleRenderer.tsx',
    'src/components/ProductDetailModal.tsx',
  ];

  criticalFiles.forEach(relPath => {
    const fullPath = path.join(__dirname, '..', relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const hasLegacy = content.includes('Green Leaf Sciences');
      assert(!hasLegacy, `Файл ${relPath} очищен от стороннего бренда`, hasLegacy ? 'ОБНАРУЖЕНО Green Leaf Sciences!' : 'Чисто');
    } else {
      assert(false, `Файл ${relPath} существует`, 'Файл не найден');
    }
  });

  // ----------------------------------------------------
  // ТЕСТ 4: Проверка валидности маршрутов GEO и SEO
  // ----------------------------------------------------
  console.log("\n--- 4. Проверка серверных маршрутов /llms.txt, /llms-full.txt, /robots.ts ---");
  
  // Проверяем наличие файла llms.txt route
  const llmsRoutePath = path.join(__dirname, '../src/app/llms.txt/route.ts');
  assert(fs.existsSync(llmsRoutePath), "Маршрут src/app/llms.txt/route.ts создан");
  if (fs.existsSync(llmsRoutePath)) {
    const code = fs.readFileSync(llmsRoutePath, 'utf8');
    assert(code.includes('revalidate = 3600'), "llms.txt имеет ISR кеширование (revalidate = 3600)");
    assert(code.includes('toj-vitamin'), "llms.txt позиционирует магазин как toj-vitamin");
    assert(code.includes('text/plain'), "llms.txt возвращает mime-type text/plain");
  }

  // Проверяем наличие файла llms-full.txt route
  const llmsFullRoutePath = path.join(__dirname, '../src/app/llms-full.txt/route.ts');
  assert(fs.existsSync(llmsFullRoutePath), "Маршрут src/app/llms-full.txt/route.ts создан");
  if (fs.existsSync(llmsFullRoutePath)) {
    const code = fs.readFileSync(llmsFullRoutePath, 'utf8');
    assert(code.includes('getProductsWithMarkup'), "llms-full.txt использует актуальную наценку и фильтр наличия");
    assert(code.includes('TJS'), "llms-full.txt содержит цены в валюте TJS");
  }

  // Проверяем robots.ts
  const robotsPath = path.join(__dirname, '../src/app/robots.ts');
  assert(fs.existsSync(robotsPath), "src/app/robots.ts существует");
  if (fs.existsSync(robotsPath)) {
    const code = fs.readFileSync(robotsPath, 'utf8');
    assert(code.includes('GPTBot') && code.includes('PerplexityBot') && code.includes('ClaudeBot'), "robots.ts открыт для ключевых AI-краулеров (GPTBot, PerplexityBot, ClaudeBot)");
    assert(code.includes('/llms.txt'), "robots.ts явно разрешает доступ к /llms.txt");
  }

  // Проверяем sitemap.ts
  const sitemapPath = path.join(__dirname, '../src/app/sitemap.ts');
  assert(fs.existsSync(sitemapPath), "src/app/sitemap.ts существует");
  if (fs.existsSync(sitemapPath)) {
    const code = fs.readFileSync(sitemapPath, 'utf8');
    assert(code.includes('/llms.txt') && code.includes('/llms-full.txt'), "sitemap.ts включает /llms.txt и /llms-full.txt");
  }

  // ----------------------------------------------------
  // ИТОГОВЫЙ ОТЧЕТ
  // ----------------------------------------------------
  console.log("\n=================================================");
  const total = RESULTS.length;
  const passed = RESULTS.filter(r => r.status === 'PASS').length;
  const failed = RESULTS.filter(r => r.status === 'FAIL').length;

  console.log(`📊 ИТОГИ ТЕСТОВ: Всего: ${total} | Пройдено: ${passed} | Ошибок: ${failed}`);
  if (failed === 0) {
    console.log("🎉 ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ! СИСТЕМА ГОТОВА К РАБОТЕ БЕЗ НАРЕКАНИЙ.");
  } else {
    console.log("⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ, ТРЕБУЮЩИЕ ИСПРАВЛЕНИЯ.");
  }
  console.log("=================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
