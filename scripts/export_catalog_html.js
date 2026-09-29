/**
 * export_catalog_html.js
 * 
 * Скрипт генерации автономного красивого HTML/PDF каталога продукции TOJ-VITAMIN
 * со схемами приема (дозировками), артикулами, логотипом и кликабельными ссылками в WhatsApp.
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

async function main() {
  console.log('\n📄 === ГЕНЕРАЦИЯ АВТОНОМНОГО КАТАЛОГА TOJ-VITAMIN ===');
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

  const cardsHtml = activeProducts.map((p, index) => {
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
      ? enrichObj.properties.slice(0, 3)
      : [
          'Поддержка общего тонуса и энергии',
          'Высокая биодоступность действующих веществ',
          'Оригинальное сертифицированное качество'
        ];

    const waText = encodeURIComponent(
      `Здравствуйте! Хочу заказать товар из каталога TOJ-VITAMIN:\nКод: ${code}\nНаименование: ${p.name}\nЦена: ${retailPrice} смн`
    );
    const waLink = `https://wa.me/${OFFICIAL_PHONE}?text=${waText}`;
    const imgUrl = p.image_url || '/logo.webp';

    return `
      <div class="card">
        <div class="card-header">
          <span class="category-pill">${category}</span>
          <span class="code-badge">${code}</span>
        </div>
        <div class="image-box">
          <img src="${imgUrl}" alt="${p.name.replace(/"/g, '&quot;')}" loading="lazy" />
        </div>
        <div class="card-body">
          <div class="card-title">${p.name}</div>
          <ul class="properties-list">
            ${properties.map(pr => `<li>${pr}</li>`).join('')}
          </ul>
          <div class="instructions-box">
            <div class="instructions-header">💊 КАК И СКОЛЬКО ПРИНИМАТЬ:</div>
            <div class="instruction-row">👉 <strong>Прием:</strong> ${usage}</div>
            <div class="instruction-sub">🕒 <strong>Время:</strong> ${timing} &bull; 📅 <strong>Курс:</strong> ${course}</div>
          </div>
          <div class="card-footer">
            <div class="price-box">
              <span class="price-label">Цена:</span>
              <span class="price-val">${retailPrice} смн</span>
            </div>
            <a href="${waLink}" target="_blank" class="order-btn">📲 Заказать</a>
          </div>
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
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.45;
      padding: 24px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Cover */
    .cover {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      color: #ffffff;
      border-radius: 24px;
      padding: 40px;
      margin-bottom: 32px;
      box-shadow: 0 20px 40px -15px rgba(15,23,42,0.4);
    }
    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.15);
    }
    .brand-wrap { display: flex; align-items: center; gap: 16px; }
    .brand-logo { width: 56px; height: 56px; border-radius: 14px; background: #fff; padding: 6px; object-fit: contain; }
    .brand-name { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; text-transform: uppercase; color: #34d399; font-weight: 700; letter-spacing: 1px; }
    .distributor-badge {
      background: rgba(16,185,129,0.15);
      border: 1px solid rgba(16,185,129,0.4);
      color: #6ee7b7;
      padding: 8px 16px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
    }
    .cover-hero { margin: 32px 0; }
    .cover-title { font-size: 34px; font-weight: 900; line-height: 1.2; margin-bottom: 12px; }
    .cover-desc { font-size: 14px; color: #cbd5e1; max-width: 720px; line-height: 1.6; }
    .how-to-order {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      padding: 20px;
      margin: 24px 0;
    }
    .step-box h4 { font-size: 14px; font-weight: 800; color: #fff; margin-bottom: 4px; }
    .step-box p { font-size: 12px; color: #cbd5e1; line-height: 1.5; }
    .cover-contacts {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.15);
      font-size: 12px;
    }
    .contact-item { color: #fff; text-decoration: none; font-weight: 700; }
    .contact-item span { display: block; font-size: 10px; color: #94a3b8; font-weight: 500; text-transform: uppercase; }

    /* Action bar */
    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      background: #fff;
      padding: 16px 20px;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
    }
    .print-btn {
      background: #0f172a;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn:hover { background: #1e293b; }

    /* Grid */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 16px;
      display: flex;
      flex-col: column;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .category-pill {
      font-size: 10px;
      font-weight: 700;
      background: #f1f5f9;
      color: #475569;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .code-badge {
      font-size: 11px;
      font-weight: 800;
      background: #0f172a;
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .image-box {
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }
    .image-box img {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }
    .card-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.35;
      margin-bottom: 8px;
      min-height: 38px;
    }
    .properties-list {
      list-style: none;
      margin-bottom: 12px;
    }
    .properties-list li {
      font-size: 11px;
      color: #475569;
      margin-bottom: 3px;
      padding-left: 12px;
      position: relative;
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
      border-radius: 12px;
      padding: 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: #065f46;
    }
    .instructions-header {
      font-weight: 800;
      margin-bottom: 4px;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    .instruction-row { margin-bottom: 2px; }
    .instruction-sub { font-size: 10px; color: #047857; }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
    }
    .price-box .price-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 600; display: block; }
    .price-box .price-val { font-size: 16px; font-weight: 900; color: #0f172a; }
    .order-btn {
      background: #059669;
      color: #ffffff;
      text-decoration: none;
      font-weight: 700;
      font-size: 11px;
      padding: 8px 14px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .order-btn:hover { background: #047857; }

    /* Footer */
    .footer {
      background: #0f172a;
      color: #ffffff;
      border-radius: 24px;
      padding: 32px;
      margin-top: 32px;
      break-inside: avoid;
    }
    .footer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #334155;
    }
    .footer-col h4 { font-size: 14px; font-weight: 700; color: #34d399; margin-bottom: 10px; }
    .footer-col p, .footer-col li { font-size: 12px; color: #cbd5e1; line-height: 1.6; }
    .disclaimer {
      text-align: center;
      font-size: 10px;
      color: #64748b;
      margin-top: 20px;
      line-height: 1.5;
    }

    @media print {
      body { background: #fff !important; padding: 0 !important; }
      .action-bar { display: none !important; }
      .cover { border-radius: 0 !important; page-break-after: always; box-shadow: none !important; }
      .footer { border-radius: 0 !important; }
      .grid { grid-template-columns: 1fr 1fr !important; gap: 12px !important; }
      @page { size: A4; margin: 8mm; }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Action bar -->
    <div class="action-bar">
      <div>
        <strong>Каталог TOJ-VITAMIN (${activeProducts.length} позиций)</strong>
        <span style="font-size: 12px; color: #64748b; margin-left: 8px;">Дата: ${dateStr}</span>
      </div>
      <button onclick="window.print()" class="print-btn">
        📄 Распечатать / Сохранить в PDF
      </button>
    </div>

    <!-- Cover Page -->
    <div class="cover">
      <div class="cover-top">
        <div class="brand-wrap">
          <img src="/logo.webp" alt="Logo" class="brand-logo" onerror="this.style.display='none'" />
          <div>
            <div class="brand-name">TOJ-VITAMIN</div>
            <div class="brand-sub">Дистрибьюторский центр здоровья</div>
          </div>
        </div>
        <div class="distributor-badge">
          🛡️ Официальный дистрибьютор GLS Pharmaceuticals в Таджикистане
        </div>
      </div>

      <div class="cover-hero">
        <h1 class="cover-title">Официальный каталог продукции и схемы приема</h1>
        <p class="cover-desc">
          Сертифицированные инновационные витамины, биодоступные хелаты и минеральные комплексы для поддержки здоровья всей семьи. Прямые поставки с завода, свежие сроки годности, собственные климатические склады.
        </p>
      </div>

      <div class="how-to-order">
        <div class="step-box">
          <h4>1. Заказ одного товара</h4>
          <p>Нажмите кнопку <strong>«Заказать»</strong> под карточкой любого выбранного препарата — сразу откроется WhatsApp с готовым сообщением.</p>
        </div>
        <div class="step-box">
          <h4>2. Заказ нескольких позиций (списком)</h4>
          <p>Отправьте номера товаров (например: <strong>«Хочу #03, #11 и #24»</strong>) в WhatsApp на номер <strong>${OFFICIAL_PHONE_FORMATTED}</strong>. Мы рассчитаем сумму и оформим единую доставку.</p>
        </div>
      </div>

      <div class="cover-contacts">
        <a href="tel:+${OFFICIAL_PHONE}" class="contact-item">
          <span>Телефон для заказов</span>
          ${OFFICIAL_PHONE_FORMATTED}
        </a>
        <a href="https://wa.me/${OFFICIAL_PHONE}" class="contact-item">
          <span>WhatsApp / Telegram</span>
          ${OFFICIAL_PHONE_FORMATTED}
        </a>
        <div class="contact-item">
          <span>Склады и логистика</span>
          г. Душанбе &bull; г. Худжанд
        </div>
        <div class="contact-item">
          <span>Официальный сайт</span>
          www.toj-vitamin.tj
        </div>
      </div>
    </div>

    <!-- Cards Grid -->
    <div class="grid">
      ${cardsHtml}
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-grid">
        <div class="footer-col">
          <h4>💬 Заказ через мессенджеры</h4>
          <p>Вы можете отправить список артикулов или скриншоты прямо на наш номер WhatsApp: <strong>${OFFICIAL_PHONE_FORMATTED}</strong>.</p>
        </div>
        <div class="footer-col">
          <h4>🚚 Доставка по Таджикистану</h4>
          <p>Курьерская доставка день-в-день по Душанбе и Худжанду. Экспресс-отправка в регионы РТ до 24 часов.</p>
        </div>
        <div class="footer-col">
          <h4>🏢 Оптовые поставки аптекам</h4>
          <p>Специальные оптовые условия для аптек и медцентров. Сертификаты соответствия Минздрава РТ, накладные и счета-фактуры.</p>
        </div>
      </div>
      <div class="disclaimer">
        Биологически активная добавка к пище (БАД). Не является лекарственным средством. Перед применением рекомендуется проконсультироваться со специалистом.<br>
        &copy; ${new Date().getFullYear()} TOJ-VITAMIN (ООО «Саховати Истаравшан»). Все права защищены.
      </div>
    </div>

  </div>
</body>
</html>`;

  const outputPath = path.join(__dirname, '../public/catalog.html');
  fs.writeFileSync(outputPath, fullHtml, 'utf8');
  console.log(`✅ Каталог успешно сохранен: ${outputPath} (${(fullHtml.length / 1024).toFixed(1)} КБ)`);
  console.log('🎉 Готово! Файл доступен по пути: /catalog.html или http://localhost:3000/catalog');
}

main().catch(console.error);
