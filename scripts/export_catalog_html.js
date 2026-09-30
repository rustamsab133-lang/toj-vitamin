/**
 * export_catalog_html.js
 * 
 * Скрипт генерации постраничного PDF/HTML каталога TOJ-VITAMIN
 * со строгой разбивкой по листам A4 (ровно 2 крупных товара на страницу).
 * Чистый светлый дизайн, крупные фотографии товаров (150-180px),
 * отсутствие черного фона и гарантия, что ни одна строчка не сползает на другую страницу.
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
  console.log('\n📄 === ПОСТРАНИЧНАЯ ГЕНЕРАЦИЯ КАТАЛОГА TOJ-VITAMIN (2 ТОВАРА НА ЛИСТ) ===');
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

  // Map products
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

  // Strict 4 products per physical A4 sheet (2x2 grid)
  const ITEMS_PER_PAGE = 4;
  const productPages = chunkArray(items, ITEMS_PER_PAGE);
  const totalPagesCount = productPages.length + 2; // Cover + Product Pages + Back Cover

  console.log(`📑 Сформировано страниц: ${totalPagesCount} (Обложка + ${productPages.length} стр. каталога + Финал)`);

  function renderCard(p) {
    return `
      <div class="product-card-2x2">
        <div class="card-inner-top">
          <div class="card-header">
            <span class="category-pill">${p.category}</span>
            <span class="code-badge">${p.code}</span>
          </div>

          <!-- Prominent Product Image -->
          <div class="image-box">
            <img src="${p.imgUrl}" alt="${p.name.replace(/"/g, '&quot;')}" loading="eager" decoding="sync" />
          </div>

          <h3 class="card-title" title="${p.name.replace(/"/g, '&quot;')}">${p.name}</h3>
          
          <ul class="properties-list">
            ${p.properties.slice(0, 2).map(pr => `<li>${pr}</li>`).join('')}
          </ul>

          <div class="instructions-box">
            <div class="instructions-header">💊 КАК И СКОЛЬКО ПРИНИМАТЬ:</div>
            <div class="instruction-row">👉 <strong>Схема:</strong> ${p.usage}</div>
            <div class="instruction-sub">🕒 <strong>Время:</strong> ${p.timing} &bull; 📅 <strong>Курс:</strong> ${p.course}</div>
          </div>
        </div>

        <div class="card-footer">
          <div class="price-box">
            <span class="price-label">Цена:</span>
            <span class="price-val">${p.retailPrice} смн</span>
          </div>
          <a href="${p.waLink}" target="_blank" class="order-btn">📲 Заказать</a>
        </div>
      </div>
    `;
  }

  const pagesHtml = productPages.map((pageItems, pageIdx) => {
    const pageNum = pageIdx + 2;
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

        <!-- 4 Products Container (2x2 Grid) -->
        <div class="page-cards-container">
          ${pageItems.map(p => renderCard(p)).join('\n')}
          ${pageItems.length < 4 ? Array.from({ length: 4 - pageItems.length }).map(() => `
            <div class="product-card-placeholder">
              <div class="placeholder-icon">🛡️</div>
              <strong>TOJ-VITAMIN</strong>
              <span>Официальный дистрибьютор GLS в РТ</span>
            </div>
          `).join('') : ''}
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
      padding: 16px 8px;
    }
    
    /* Top sticky action bar */
    .action-bar {
      position: sticky;
      top: 10px;
      z-index: 100;
      max-width: 860px;
      margin: 0 auto 20px auto;
      background: #ffffff;
      padding: 12px 20px;
      border-radius: 16px;
      border: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 15px rgba(0,0,0,0.06);
    }
    .print-btn {
      background: #059669;
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
    .print-btn:hover { background: #047857; }

    /* Each physical Page container on Screen & Mobile */
    .cover-page,
    .catalog-page,
    .back-cover-page {
      max-width: 860px;
      width: 100%;
      margin: 0 auto 30px auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.05);
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 24px;
    }

    /* ================= COVER PAGE ================= */
    .cover-page {
      background: #ffffff;
      border: 2px solid #a7f3d0;
      padding: 32px;
    }
    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #f1f5f9;
    }
    .brand-wrap { display: flex; align-items: center; gap: 14px; }
    .brand-logo { width: 56px; height: 56px; border-radius: 14px; background: #fff; border: 1px solid #e2e8f0; padding: 6px; object-fit: contain; }
    .brand-name { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
    .brand-sub { font-size: 11px; text-transform: uppercase; color: #059669; font-weight: 800; letter-spacing: 1px; }
    .distributor-badge {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 8px 16px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
    }
    .cover-hero { margin: 24px 0; }
    .cover-badge-year {
      display: inline-block;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      color: #065f46;
      margin-bottom: 14px;
    }
    .cover-title { font-size: 34px; font-weight: 900; line-height: 1.25; margin-bottom: 12px; color: #0f172a; }
    .cover-desc { font-size: 14px; color: #475569; line-height: 1.6; max-width: 620px; }
    .how-to-order {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .step-box h4 { font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .step-box p { font-size: 11px; color: #64748b; line-height: 1.5; }
    .cover-contacts {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
    }
    .contact-item { color: #0f172a; text-decoration: none; font-weight: 700; }
    .contact-item span { display: block; font-size: 9px; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }

    /* ================= CATALOG PRODUCT PAGE ================= */
    .catalog-page {
      padding: 16px 20px 12px 20px;
    }
    .page-running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1.5px solid #f1f5f9;
      height: 32px;
    }
    .header-left { display: flex; align-items: center; gap: 8px; }
    .mini-logo { width: 20px; height: 20px; object-fit: contain; }
    .header-brand { font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .header-cat { font-size: 10px; font-weight: 700; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 10px; border-radius: 6px; }

    /* 4 Cards Container (2x2 Grid) */
    .page-cards-container {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 12px;
      flex: 1;
      margin: 10px 0;
      overflow: hidden;
    }

    .product-card-2x2 {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      box-sizing: border-box;
    }
    .product-card-placeholder {
      border: 1px dashed #cbd5e1;
      border-radius: 14px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 11px;
      text-align: center;
      padding: 12px;
    }
    .placeholder-icon { font-size: 24px; margin-bottom: 6px; }

    .card-inner-top {
      display: flex;
      flex-direction: column;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .category-pill {
      font-size: 9px;
      font-weight: 700;
      background: #f1f5f9;
      color: #334155;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      max-width: 130px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .code-badge {
      font-size: 10px;
      font-weight: 900;
      background: #0f172a;
      color: #ffffff;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .image-box {
      width: 100%;
      height: 115px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      border-radius: 10px;
      padding: 6px;
      margin-bottom: 6px;
      flex-shrink: 0;
    }
    .image-box img {
      max-height: 105px;
      max-width: 100%;
      object-fit: contain;
    }

    .card-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
      margin-bottom: 4px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 30px;
    }

    .properties-list {
      list-style: none;
      margin-bottom: 6px;
    }
    .properties-list li {
      font-size: 10px;
      color: #475569;
      line-height: 1.25;
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
      margin-bottom: 6px;
      font-size: 10px;
      color: #065f46;
    }
    .instructions-header {
      font-weight: 800;
      margin-bottom: 2px;
      font-size: 9px;
      letter-spacing: 0.3px;
    }
    .instruction-row {
      line-height: 1.3;
      margin-bottom: 2px;
      color: #1e293b;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .instruction-sub {
      font-size: 9px;
      color: #047857;
      line-height: 1.2;
      padding-top: 2px;
      border-top: 1px solid rgba(167, 243, 208, 0.6);
      font-weight: 600;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 6px;
      border-top: 1px solid #f1f5f9;
      margin-top: auto;
    }
    .price-box .price-label { font-size: 7.5px; color: #94a3b8; text-transform: uppercase; font-weight: 600; display: block; line-height: 1; }
    .price-box .price-val { font-size: 14px; font-weight: 900; color: #0f172a; line-height: 1.2; }
    .order-btn {
      background: #059669;
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 10.5px;
      padding: 5px 12px;
      border-radius: 6px;
    }

    /* ================= BACK COVER ================= */
    .back-cover-page {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 32px;
    }
    .back-cover-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin: auto 0;
    }
    .back-cover-col {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 18px;
    }
    .back-cover-col h4 { font-size: 14px; font-weight: 800; color: #059669; margin-bottom: 8px; }
    .back-cover-col p, .back-cover-col li { font-size: 12px; color: #475569; line-height: 1.6; }
    .disclaimer-box {
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      line-height: 1.5;
    }

    /* ================= PRINT RULES (EXACT A4 WITH ZERO SPILLOVER) ================= */
    @page {
      size: A4 portrait;
      margin: 6mm 8mm;
    }
    @media print {
      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .action-bar { display: none !important; }
      .cover-page,
      .back-cover-page {
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        height: 250mm !important;
        max-height: 255mm !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        padding: 4mm !important;
      }
      .catalog-page {
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        height: 250mm !important;
        max-height: 252mm !important;
        min-height: 245mm !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        padding: 2mm 3mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
      }
      .page-cards-container {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        grid-template-rows: repeat(2, 114mm) !important;
        gap: 2.5mm !important;
        margin: 1.5mm 0 0 0 !important;
        height: 232mm !important;
        max-height: 232mm !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .product-card-2x2 {
        height: 114mm !important;
        max-height: 114mm !important;
        min-height: 114mm !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-before: avoid !important;
        break-before: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        padding: 2mm 2.5mm !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 6px !important;
      }
      .card-inner-top {
        display: flex !important;
        flex-direction: column !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .card-footer {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding-top: 1.5mm !important;
        margin-top: auto !important;
        border-top: 1px solid #f1f5f9 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-before: avoid !important;
        break-before: avoid !important;
        height: 8mm !important;
      }
      .order-btn {
        padding: 1.5mm 3.5mm !important;
        font-size: 9.5px !important;
      }
      .image-box {
        height: 26mm !important;
        max-height: 26mm !important;
        margin-bottom: 1mm !important;
      }
      .image-box img {
        max-height: 24mm !important;
        max-width: 100% !important;
        object-fit: contain !important;
      }
      .instructions-box {
        padding: 1.5mm 2mm !important;
        margin-bottom: 1mm !important;
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
        105 товаров &bull; ${totalPagesCount} страниц (4 товара на страницу, каталог со схемами приема)
      </span>
    </div>
    <button onclick="window.print()" class="print-btn">
      📄 Сохранить идеальный PDF (Печать)
    </button>
  </div>

  <!-- PAGE 1: COVER (CLEAN LIGHT THEME) -->
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
        <p>Нажмите <strong>«Заказать»</strong> под выбранным товаром — сразу откроется WhatsApp с готовым текстом заказа.</p>
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

  <!-- PAGES 2..N: 2 LARGE PRODUCTS PER SHEET -->
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
  console.log(`✅ Каталог (2 товара на лист) успешно сохранен: ${outputPath} (${(fullHtml.length / 1024).toFixed(1)} КБ)`);
}

main().catch(console.error);
