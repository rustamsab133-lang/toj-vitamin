/**
 * export_catalog_html.js
 * 
 * Скрипт генерации постраничного PDF/HTML каталога TOJ-VITAMIN
 * со строгой разбивкой по листам A4 (ровно 4 товара на страницу).
 * Исключает разрезание карточек и текста между страницами.
 * 
 * Запуск: node scripts/export_catalog_html.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: В .env.local не найдены ключи Supabase.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const OFFICIAL_PHONE = '992176660707';
const OFFICIAL_PHONE_FORMATTED = '+992 17 666 07 07';

function getProductCategory(name) {
  const n = (name || '').toLowerCase();
  if (/мужск|тестостерон|бустер|йохимбе|артурон/i.test(n)) return 'Для мужчин';
  if (/женск|красот|коллаген|биотин|гиалурон|инозитол|максиферт|железо/i.test(n)) return 'Для женщин и красоты';
  if (/стресс|сон|5-htp|триптофан|магний|мелатонин|гамк|нерв/i.test(n)) return 'Антистресс и сон';
  if (/мозг|памят|ноофит|гинкго|в-комплекс|фолиев|b-комплекс|b1|b2|b6|b12|лецитин/i.test(n)) return 'Мозг и энергия';
  if (/сустав|кост|хондро|глюкозамин|мсм|msm|кальций|к2/i.test(n)) return 'Суставы и кости';
  if (/омега|omega|q10|коэнзим|сердц|сосуд|давлен/i.test(n)) return 'Сердце и Омега-3';
  if (/детск|для детей|малыш/i.test(n)) return 'Детские витамины';
  if (/иммун|витамин c|витамин с|d3|д3|цинк|селен|чеснок|прополис|бузин|эхинацея/i.test(n)) return 'Иммунитет и защита';
  if (/похуден|метаболизм|карнитин|хром|берберин|липотроп|детокс|очищен|семена льна|хитозан/i.test(n)) return 'Метаболизм и тонус';
  return 'Витамины и минералы';
}

function cleanSearchQuery(name) {
  return (name || '')
    .replace(/\([^)]+\)/g, ' ')
    .replace(/капс\.*|таб\.*|пор\.*|порошок|паст\.*|сироп|масса\s*[\d.,]+г*|лимон|апельсин/gi, ' ')
    .replace(/gls|pharm|№\d+|\d+\s*мг|\d+\s*г|\d+\s*ие|\d+\s*ме|\d+\s*мкг/gi, ' ')
    .replace(/[^\wа-яА-ЯёЁ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findEnrichedProduct(name, enrichedData) {
  const lower = (name || '').toLowerCase().trim();
  if (enrichedData[lower]) return enrichedData[lower];

  const cleaned = cleanSearchQuery(name).toLowerCase();
  if (enrichedData[cleaned]) return enrichedData[cleaned];

  if (lower.includes('комплекс для мужчин') || lower.includes('мужская формула') || lower.includes('бустер')) {
    if (enrichedData['мужская формула']) return enrichedData['мужская формула'];
  }
  if (lower.includes('карнитин')) {
    for (const [k, v] of Object.entries(enrichedData)) {
      if (k.includes('карнитин')) return v;
    }
  }

  for (const [k, v] of Object.entries(enrichedData)) {
    if (lower.includes(k) || k.includes(cleaned) || (cleaned.length > 4 && cleaned.includes(k))) {
      return v;
    }
  }

  const words = cleaned.split(/\s+/).filter(w => w.length >= 3);
  for (const w of words) {
    if (enrichedData[w]) return enrichedData[w];
  }

  return null;
}

function parseInstructionDetails(rawUsage, fullText) {
  let usage = rawUsage || 'Взрослым по 1-2 капсулы в день во время еды';
  let timing = 'Во время еды';
  let course = 'Курс 1 месяц (1 упаковка)';

  const lower = (rawUsage + ' ' + (fullText || '')).toLowerCase();

  if (lower.includes('в первой половине дня') || lower.includes('утром')) {
    timing = 'Утром / в первой половине дня';
  } else if (lower.includes('вечером') || lower.includes('перед сном')) {
    timing = 'Вечером за 30-40 мин до сна';
  } else if (lower.includes('до еды')) {
    timing = 'За 30 мин до еды';
  } else {
    timing = 'Во время приема пищи';
  }

  if (lower.includes('2-3 недели') || lower.includes('2–3 недели')) {
    course = '2–3 недели';
  } else if (lower.includes('1-2 месяца') || lower.includes('1–2 месяца')) {
    course = '1–2 месяца (1-2 упаковки)';
  } else if (lower.includes('3 месяца')) {
    course = 'Курс 3 месяца';
  } else {
    course = 'Курс 1 месяц (1 упаковка)';
  }

  return { usage, timing, course };
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  console.log('\n📄 === ПОСТРАНИЧНАЯ ГЕНЕРАЦИЯ КАТАЛОГА TOJ-VITAMIN ===');
  console.log('⏳ Загрузка товаров и настроек из Supabase...');

  const [
    { data: rawProducts, error: prodErr },
    { data: hiddenData },
    { data: settingsData }
  ] = await Promise.all([
    supabase.from('products').select('*').order('name'),
    supabase.from('site_settings').select('value').eq('key', 'hidden_product_ids').maybeSingle(),
    supabase.from('site_settings').select('key, value')
  ]);

  if (prodErr || !rawProducts) {
    console.error('❌ Ошибка загрузки продуктов:', prodErr?.message);
    process.exit(1);
  }

  let hiddenIds = new Set();
  if (hiddenData?.value) {
    try {
      const parsed = JSON.parse(hiddenData.value);
      if (Array.isArray(parsed)) hiddenIds = new Set(parsed.map(String));
    } catch (e) {}
  }

  const percentSetting = settingsData?.find(s => s.key === 'price_markup_percent');
  const flatSetting = settingsData?.find(s => s.key === 'price_markup_flat');
  const markupPercent = parseFloat(percentSetting?.value || '0') || 0;
  const markupFlat = parseFloat(flatSetting?.value || '0') || 0;

  const activeProducts = rawProducts.filter(p => !hiddenIds.has(String(p.id)));
  console.log(`📦 Всего активных товаров: ${activeProducts.length}`);

  let enriched = {};
  const enrichedPath = path.join(__dirname, '../src/data/enriched_gls_products.json');
  if (fs.existsSync(enrichedPath)) {
    enriched = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  }

  const collator = new Intl.Collator(['ru', 'tg', 'en'], { sensitivity: 'base', numeric: true });
  activeProducts.sort((a, b) => collator.compare((a.name || '').trim(), (b.name || '').trim()));

  const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  // Map products to structured objects
  const items = activeProducts.map((p, index) => {
    const codeNum = index + 1;
    const code = `#${codeNum < 10 ? '0' + codeNum : codeNum}`;
    const category = getProductCategory(p.name);

    const basePrice = Number(p.price) || 0;
    const retailPrice = Math.round(basePrice * (1 + markupPercent / 100) + markupFlat);

    const enrichObj = findEnrichedProduct(p.name, enriched);
    const rawUsage = enrichObj?.instructions?.usage || 'Взрослым по 1-2 капсулы в день во время еды';
    const rawCourse = enrichObj?.instructions?.course || '1 месяц';
    const fullText = enrichObj?.instructions?.full_text || '';
    const { usage, timing, course } = parseInstructionDetails(rawUsage, fullText);

    const properties = (enrichObj?.properties && enrichObj.properties.length > 0)
      ? enrichObj.properties.slice(0, 2)
      : [
          'Поддержка тонуса и укрепление защитных сил',
          'Высокая биодоступность действующих веществ'
        ];

    const waText = encodeURIComponent(
      `Здравствуйте! Хочу заказать товар из каталога TOJ-VITAMIN:\nКод: ${code}\nНаименование: ${p.name}\nЦена: ${retailPrice} смн`
    );
    const waLink = `https://wa.me/${OFFICIAL_PHONE}?text=${waText}`;

    const thumbPath = path.join(__dirname, `../public/catalog-thumbs/prod-${p.id}.png`);
    const imgUrl = fs.existsSync(thumbPath) ? `/catalog-thumbs/prod-${p.id}.png` : (p.image_url || '/logo.webp');

    return {
      code,
      name: p.name,
      category,
      retailPrice,
      usage,
      timing,
      course,
      properties,
      waLink,
      imgUrl
    };
  });

  // Chunk products: exactly 4 items per page!
  const ITEMS_PER_PAGE = 4;
  const productPages = chunkArray(items, ITEMS_PER_PAGE);
  const totalPagesCount = productPages.length + 2; // Cover + Product Pages + Back Cover

  console.log(`📑 Сформировано страниц: ${totalPagesCount} (Обложка + ${productPages.length} стр. каталога + Финал)`);

  function renderCard(p) {
    return `
      <div class="card">
        <div class="card-header">
          <span class="category-pill">${p.category}</span>
          <span class="code-badge">${p.code}</span>
        </div>
        
        <div class="image-box">
          <img src="${p.imgUrl}" alt="${p.name.replace(/"/g, '&quot;')}" loading="lazy" />
        </div>

        <div class="card-body">
          <div class="card-title" title="${p.name.replace(/"/g, '&quot;')}">${p.name}</div>
          
          <ul class="properties-list">
            ${p.properties.map(pr => `<li>${pr}</li>`).join('')}
          </ul>

          <div class="instructions-box">
            <div class="instructions-header">💊 КАК И СКОЛЬКО ПРИНИМАТЬ:</div>
            <div class="instruction-row">👉 <strong>Прием:</strong> ${p.usage}</div>
            <div class="instruction-sub">🕒 <strong>Время:</strong> ${p.timing} &bull; 📅 <strong>Курс:</strong> ${p.course}</div>
          </div>

          <div class="card-footer">
            <div class="price-box">
              <span class="price-label">Цена:</span>
              <span class="price-val">${p.retailPrice} смн</span>
            </div>
            <a href="${p.waLink}" target="_blank" class="order-btn">📲 Заказать</a>
          </div>
        </div>
      </div>
    `;
  }

  const pagesHtml = productPages.map((pageItems, pageIdx) => {
    const pageNum = pageIdx + 2; // Cover is page 1
    // Primary category on this page
    const pageCategory = pageItems[0]?.category || 'Витамины и минералы';

    return `
      <div class="catalog-page">
        <!-- Page Running Header -->
        <div class="page-running-header">
          <div class="header-left">
            <img src="/logo.webp" alt="TOJ-VITAMIN" class="mini-logo" onerror="this.style.display='none'" />
            <span class="header-brand">TOJ-VITAMIN &bull; Официальный дистрибьютор</span>
          </div>
          <div class="header-right">
            <span class="header-cat">${pageCategory}</span>
          </div>
        </div>

        <!-- 2x2 Products Grid (Fixed Page Content) -->
        <div class="page-grid-2x2">
          ${pageItems.map(p => renderCard(p)).join('\n')}
          ${pageItems.length < 4 ? '<div class="card-placeholder"></div>'.repeat(4 - pageItems.length) : ''}
        </div>

        <!-- Page Running Footer -->
        <div class="page-running-footer">
          <div class="footer-left">
            📞 Заказ и консультация в WhatsApp: <strong>${OFFICIAL_PHONE_FORMATTED}</strong>
          </div>
          <div class="footer-center">www.toj-vitamin.tj</div>
          <div class="footer-right">Стр. ${pageNum} из ${totalPagesCount}</div>
        </div>
      </div>
    `;
  }).join('\n');

  const fullHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Каталог продукции TOJ-VITAMIN</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      line-height: 1.4;
      padding: 20px 0;
    }
    
    /* Top sticky action bar */
    .action-bar {
      position: sticky;
      top: 10px;
      z-index: 100;
      max-width: 210mm;
      margin: 0 auto 20px auto;
      background: #ffffff;
      padding: 12px 20px;
      border-radius: 16px;
      border: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    }
    .print-btn {
      background: #0f172a;
      color: #fff;
      border: none;
      padding: 10px 22px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .print-btn:hover { background: #1e293b; }

    /* Each physical A4 Page container */
    .cover-page,
    .catalog-page,
    .back-cover-page {
      width: 210mm;
      min-height: 297mm;
      max-height: 297mm;
      height: 297mm;
      margin: 0 auto 30px auto;
      background: #ffffff;
      box-shadow: 0 10px 30px rgba(0,0,0,0.07);
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* ================= COVER PAGE ================= */
    .cover-page {
      background: linear-gradient(145deg, #090e17 0%, #172033 60%, #0d1527 100%);
      color: #ffffff;
      padding: 14mm 16mm;
    }
    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 6mm;
      border-bottom: 1px solid rgba(255,255,255,0.15);
    }
    .brand-wrap { display: flex; align-items: center; gap: 14px; }
    .brand-logo { width: 52px; height: 52px; border-radius: 12px; background: #fff; padding: 6px; object-fit: contain; }
    .brand-name { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
    .brand-sub { font-size: 10px; text-transform: uppercase; color: #34d399; font-weight: 700; letter-spacing: 1px; }
    .distributor-badge {
      background: rgba(16,185,129,0.15);
      border: 1px solid rgba(16,185,129,0.35);
      color: #6ee7b7;
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
    }
    .cover-hero { margin: 10mm 0; }
    .cover-badge-year {
      display: inline-block;
      background: rgba(255,255,255,0.1);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      margin-bottom: 12px;
    }
    .cover-title { font-size: 32px; font-weight: 900; line-height: 1.25; margin-bottom: 12px; }
    .cover-desc { font-size: 13px; color: #cbd5e1; line-height: 1.6; max-width: 600px; }
    .how-to-order {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 8mm;
    }
    .step-box h4 { font-size: 13px; font-weight: 800; color: #fff; margin-bottom: 4px; }
    .step-box p { font-size: 11px; color: #cbd5e1; line-height: 1.45; }
    .cover-contacts {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 6mm;
      border-top: 1px solid rgba(255,255,255,0.15);
      font-size: 11px;
    }
    .contact-item { color: #fff; text-decoration: none; font-weight: 700; }
    .contact-item span { display: block; font-size: 9px; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }

    /* ================= CATALOG PRODUCT PAGE ================= */
    .catalog-page {
      padding: 10mm 12mm 8mm 12mm;
    }
    .page-running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 3.5mm;
      border-bottom: 1.5px solid #e2e8f0;
      margin-bottom: 4mm;
      height: 10mm;
    }
    .header-left { display: flex; align-items: center; gap: 8px; }
    .mini-logo { width: 22px; height: 22px; object-fit: contain; }
    .header-brand { font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .header-cat { font-size: 11px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 2px 10px; border-radius: 6px; }

    /* 2x2 Grid exactly on one page */
    .page-grid-2x2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 12px;
      flex: 1;
      height: 250mm;
      max-height: 250mm;
    }

    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
    }
    .card-placeholder {
      border: 1px dashed #e2e8f0;
      border-radius: 14px;
      background: #fafafa;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .category-pill {
      font-size: 9px;
      font-weight: 700;
      background: #f8fafc;
      color: #475569;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }
    .code-badge {
      font-size: 10px;
      font-weight: 800;
      background: #0f172a;
      color: #ffffff;
      padding: 2px 6px;
      border-radius: 5px;
    }
    .image-box {
      height: 95px;
      max-height: 95px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 6px;
    }
    .image-box img {
      max-height: 90px;
      max-width: 100%;
      object-fit: contain;
    }
    .card-body {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      flex: 1;
    }
    .card-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.3;
      margin-bottom: 6px;
      height: 32px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .properties-list {
      list-style: none;
      margin-bottom: 8px;
      height: 36px;
      overflow: hidden;
    }
    .properties-list li {
      font-size: 10px;
      color: #475569;
      line-height: 1.35;
      margin-bottom: 2px;
      padding-left: 10px;
      position: relative;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .properties-list li::before {
      content: "•";
      color: #10b981;
      position: absolute;
      left: 0;
      font-weight: bold;
    }
    .instructions-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 10px;
      padding: 6px 8px;
      margin-bottom: 8px;
      font-size: 10px;
      color: #065f46;
    }
    .instructions-header {
      font-weight: 800;
      margin-bottom: 2px;
      font-size: 9px;
      letter-spacing: 0.3px;
    }
    .instruction-row { line-height: 1.25; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .instruction-sub { font-size: 9px; color: #047857; line-height: 1.2; }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 6px;
      border-top: 1px solid #f1f5f9;
      margin-top: auto;
    }
    .price-box .price-label { font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: 600; display: block; line-height: 1; }
    .price-box .price-val { font-size: 14px; font-weight: 900; color: #0f172a; line-height: 1.2; }
    .order-btn {
      background: #059669;
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 10px;
      padding: 5px 12px;
      border-radius: 7px;
    }

    .page-running-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 3mm;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #64748b;
      margin-top: 3mm;
      height: 8mm;
    }
    .footer-left strong { color: #0f172a; }

    /* ================= BACK COVER ================= */
    .back-cover-page {
      background: #0f172a;
      color: #ffffff;
      padding: 14mm 16mm;
    }
    .back-cover-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      margin: auto 0;
    }
    .back-cover-col {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      padding: 18px;
    }
    .back-cover-col h4 { font-size: 14px; font-weight: 800; color: #34d399; margin-bottom: 8px; }
    .back-cover-col p, .back-cover-col li { font-size: 12px; color: #cbd5e1; line-height: 1.6; }
    .disclaimer-box {
      border-top: 1px solid rgba(255,255,255,0.15);
      padding-top: 14px;
      text-align: center;
      font-size: 10px;
      color: #64748b;
      line-height: 1.5;
    }

    /* PRINT RULES */
    @media print {
      @page {
        size: A4 portrait;
        margin: 0 !important;
      }
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 210mm !important;
      }
      .action-bar { display: none !important; }
      .cover-page,
      .catalog-page,
      .back-cover-page {
        margin: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        height: 297mm !important;
        max-height: 297mm !important;
        min-height: 297mm !important;
        overflow: hidden !important;
      }
    }
  </style>
</head>
<body>
  <!-- Action Bar on screen -->
  <div class="action-bar">
    <div>
      <strong style="font-size: 15px;">Каталог продукции TOJ-VITAMIN</strong>
      <span style="font-size: 12px; color: #64748b; margin-left: 8px;">
        105 товаров &bull; ${totalPagesCount} страниц (ровно 4 товара на лист)
      </span>
    </div>
    <button onclick="window.print()" class="print-btn">
      📄 Сохранить идеальный PDF (Печать)
    </button>
  </div>

  <!-- PAGE 1: COVER -->
  <div class="cover-page">
    <div class="cover-top">
      <div class="brand-wrap">
        <img src="/logo.webp" alt="Logo" class="brand-logo" onerror="this.style.display='none'" />
        <div>
          <div class="brand-name">TOJ-VITAMIN</div>
          <div class="brand-sub">Дистрибьюторский центр здоровья</div>
        </div>
      </div>
      <div class="distributor-badge">
        🛡️ Официальный дистрибьютор GLS в РТ
      </div>
    </div>

    <div class="cover-hero">
      <div class="cover-badge-year">Официальное издание &bull; 2026</div>
      <h1 class="cover-title">Каталог сертифицированных витаминов и схемы приема</h1>
      <p class="cover-desc">
        Более 100 оригинальных биодоступных комплексов GLS Pharmaceuticals в Таджикистане. Точные схемы приема, дозировки, актуальные цены и доставка до двери.
      </p>
    </div>

    <div class="how-to-order">
      <div class="step-box">
        <h4>1. Заказ одного товара</h4>
        <p>Нажмите <strong>«Заказать»</strong> под любым выбранным товаром — сразу откроется WhatsApp с готовым текстом заказа.</p>
      </div>
      <div class="step-box">
        <h4>2. Заказ нескольких позиций (списком)</h4>
        <p>Отправьте номера товаров (напр. <strong>«Хочу #03, #11 и #24»</strong>) на номер <strong>${OFFICIAL_PHONE_FORMATTED}</strong> в WhatsApp.</p>
      </div>
    </div>

    <div class="cover-contacts">
      <a href="tel:+${OFFICIAL_PHONE}" class="contact-item">
        <span>Телефон для заказов</span>
        ${OFFICIAL_PHONE_FORMATTED}
      </a>
      <a href="https://wa.me/${OFFICIAL_PHONE}" class="contact-item">
        <span>WhatsApp</span>
        ${OFFICIAL_PHONE_FORMATTED}
      </a>
      <div class="contact-item">
        <span>Склады и логистика</span>
        г. Душанбе &bull; г. Худжанд
      </div>
      <div class="contact-item">
        <span>Сайт</span>
        www.toj-vitamin.tj
      </div>
    </div>
  </div>

  <!-- PAGES 2..N: 4 PRODUCTS PER SHEET -->
  ${pagesHtml}

  <!-- LAST PAGE: BACK COVER -->
  <div class="back-cover-page">
    <div class="cover-top">
      <div class="brand-wrap">
        <img src="/logo.webp" alt="Logo" class="brand-logo" onerror="this.style.display='none'" />
        <div>
          <div class="brand-name">TOJ-VITAMIN</div>
          <div class="brand-sub">ООО «Саховати Истаравшан»</div>
        </div>
      </div>
      <div class="distributor-badge">
        📞 ${OFFICIAL_PHONE_FORMATTED}
      </div>
    </div>

    <div class="back-cover-grid">
      <div class="back-cover-col">
        <h4>💬 Заказ нескольких товаров через WhatsApp</h4>
        <p>Вы можете отправить список артикулов или скриншоты прямо на наш номер: <strong>${OFFICIAL_PHONE_FORMATTED}</strong>. Консультант рассчитает скидку и оформит доставку в одном заказе.</p>
      </div>

      <div class="back-cover-col">
        <h4>🚚 Доставка по Республике Таджикистан</h4>
        <p><strong>Душанбе и Худжанд:</strong> курьерская доставка день-в-день прямо в руки.<br>
        <strong>Регионы РТ:</strong> оперативная отправка до 24 часов в любой город республики.</p>
      </div>

      <div class="back-cover-col">
        <h4>🏢 Аптекам и оптовым партнерам</h4>
        <p>Специальные оптовые условия для аптек и медцентров. Сертификаты соответствия Службы надзора Минздрава РТ, накладные и безналичный расчет.</p>
      </div>
    </div>

    <div class="disclaimer-box">
      Биологически активная добавка к пище (БАД). Не является лекарственным средством. Перед применением рекомендуется проконсультироваться со специалистом.<br>
      &copy; ${new Date().getFullYear()} TOJ-VITAMIN. Все права защищены.
    </div>
  </div>
</body>
</html>`;

  const outputPath = path.join(__dirname, '../public/catalog.html');
  fs.writeFileSync(outputPath, fullHtml, 'utf8');
  console.log(`✅ Постраничный каталог сохранен: ${outputPath} (${(fullHtml.length / 1024).toFixed(1)} КБ)`);
}

main().catch(console.error);
