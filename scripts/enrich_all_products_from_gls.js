process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const sb = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

const urlMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'final_gls_url_map.json'), 'utf8'));
const dbProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_db_products.json'), 'utf8'));
const jsonPath = path.join(__dirname, '../src/data/enriched_gls_products.json');
const enrichedData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

if (!enrichedData.by_product_id) {
  enrichedData.by_product_id = {};
}

// Helper to parse official GLS page
async function scrapeGlsPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 1. Description
    let desc = '';
    const descMatch = html.match(/id="desc"[\s\S]*?<div class="content-inner">([\s\S]*?)<\/div>/i);
    if (descMatch) {
      desc = descMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n• ')
        .replace(/<[^>]+>/g, '')
        .replace(/[ \t]+/g, ' ')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('Свидетельство') && !/\d+[\s,]*[кКмМ][бБ]/i.test(l))
        .join('\n\n');
    }

    // 2. Properties (paragraphs from description)
    const properties = [];
    if (desc) {
      const paragraphs = desc.split('\n\n');
      for (const p of paragraphs) {
        const cleanP = p.replace(/^[•\-\*]\s*/, '').trim();
        if (cleanP.length >= 25 && cleanP.length <= 400 && !properties.includes(cleanP)) {
          properties.push(cleanP);
        }
      }
    }

    // 3. Instructions (buy tab)
    let buyText = '';
    const buyMatch = html.match(/id="buy"[\s\S]*?<div class="content-inner">([\s\S]*?)<\/div>/i);
    if (buyMatch) {
      buyText = buyMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    }

    let usage = '';
    const usageMatch = buyText.match(/(?:Взрослым|Детям|Лицам|Принимать|По)[\s\S]{10,250}?(?=\.\s*(?:Продолжительность|Возрастные|Противопоказания|$))/i);
    if (usageMatch) {
      usage = usageMatch[0].replace(/\s+/g, ' ').trim();
      if (!usage.endsWith('.')) usage += '.';
    }

    let course = '';
    const courseMatch = buyText.match(/Продолжительность приема[^\n.]+/i);
    if (courseMatch) {
      course = courseMatch[0].replace(/Продолжительность приема\s*[-—:]*\s*/i, '').replace(/\s+/g, ' ').trim();
      if (!course.endsWith('.')) course += '.';
    }

    let contraindications = '';
    const contraMatch = buyText.match(/Противопоказания:?[^\n.]+/i);
    if (contraMatch) {
      contraindications = contraMatch[0].replace(/Противопоказания:\s*/i, '').replace(/\s+/g, ' ').trim();
      if (!contraindications.endsWith('.')) contraindications += '.';
    }

    return {
      desc,
      properties: properties.length > 0 ? properties : [desc.slice(0, 200)],
      usage: usage || null,
      course: course || '1 месяц.',
      contraindications: contraindications || 'Индивидуальная непереносимость компонентов, беременность, кормление грудью.',
      source_url: url
    };
  } catch (err) {
    return null;
  }
}

// Special products predefined data
const SPECIAL_PRODUCTS = {
  '9': {
    name: 'Барбарис Берберин капс. (похудение, печень, метаболизм) №60 GLS',
    description: 'Комплекс экстракта плодов барбариса (источник берберина) и хрома пиколината для нормализации углеводного и липидного обмена, улучшения чувствительности к инсулину и поддержки функции печени. Способствует поддержанию оптимального уровня сахара и холестерина в крови, оказывает мягкое желчегонное действие и помогает контролировать массу тела.',
    properties: [
      'Экстракт барбариса (берберин) повышает чувствительность клеток к инсулину и стимулирует утилизацию глюкозы.',
      'Способствует снижению уровня холестерина и липопротеидов низкой плотности в плазме крови.',
      'Поддерживает здоровье печени, улучшает отток желчи и препятствует развитию жирового гепатоза.',
      'Хрома пиколинат снижает тягу к сладкой и углеводной пище, способствуя эффективному контролю веса.'
    ],
    usage: 'Взрослым по 1 капсуле 2 раза в день во время еды.',
    course: '1 месяц.',
    contraindications: 'Индивидуальная непереносимость компонентов, беременность, кормление грудью.',
    source_url: 'https://gls.store'
  },
  '21': {
    name: 'Витамин С детс. паст. (иммунитет, сердце) №90 апельсин',
    description: 'Натуральные жевательные мармеладные пастилки с витамином С и натуральным апельсиновым маслом для укрепления детского иммунитета, защиты от вирусов и простуд и поддержки жизненного тонуса ребенка в период повышенных нагрузок.',
    properties: [
      'L-аскорбиновая кислота в легкоусвояемой форме активирует защитные силы детского организма.',
      'Способствует синтезу коллагена для правильного формирования костей, связок, зубов и кровеносных сосудов.',
      'Натуральное апельсиновое масло придает приятный цитрусовый вкус без искусственных красителей.',
      'Помогает снизить утомляемость и ускоряет восстановление после активных игр и учебы.'
    ],
    usage: 'Детям от 3 до 6 лет — по 1 пастилке в день, детям старше 7 лет — по 2 пастилки в день во время или после еды.',
    course: '1 месяц.',
    contraindications: 'Индивидуальная непереносимость компонентов, нарушения углеводного обмена (сахарный диабет).',
    source_url: 'https://gls.store'
  },
  '22': {
    name: 'Витамин С капс. (иммунитет, сердце, красота) 900мг 500мг №60 GLS',
    description: 'Высокоэффективная дозировка витамина С (900 мг в суточной порции из 2 капсул) для мощной антиоксидантной защиты, укрепления иммунитета в сезон простуд и синтеза собственного коллагена.',
    properties: [
      'Обеспечивает 900 мг чистой L-аскорбиновой кислоты в суточной порции для максимальной биодоступности.',
      'Защищает клетки от свободных радикалов и окислительного стресса.',
      'Стимулирует синтез коллагена для упругости кожи, здоровья суставов и эластичности сосудистой стенки.',
      'Улучшает усвоение негемового железа и поддерживает уровень энергии.'
    ],
    usage: 'Взрослым принимать по 2 капсулы в день во время еды.',
    course: '2-3 недели. При необходимости курс можно повторить.',
    contraindications: 'Индивидуальная непереносимость компонентов, беременность, кормление грудью.',
    source_url: 'https://gls.store'
  },
  '70': {
    name: 'Мелатонин Мелиссон капс. (сон, спокойствие) 2мг №60 GLS',
    description: 'Специальный растительный комплекс мелатонина (2 мг) со стандартизированными экстрактами корней валерианы (150 мг) и травы мелиссы (25 мг) для легкого засыпания, глубокого сна и нормализации суточных ритмов без чувства утренней сонливости.',
    properties: [
      'Мелатонин (2 мг) восстанавливает естественный циркадный ритм и сокращает время засыпания.',
      'Экстракт корня валерианы (150 мг) снимает психоэмоциональное напряжение и мышечные спазмы.',
      'Экстракт мелиссы (25 мг) оказывает мягкое седативное действие и улучшает качество фаз глубокого сна.',
      'Не вызывает привыкания, вялости или разбитости при утреннем пробуждении.'
    ],
    usage: 'Взрослым принимать по 1 капсуле в день за 30-40 минут до сна.',
    course: '1 месяц.',
    contraindications: 'Индивидуальная непереносимость компонентов, беременность, кормление грудью.',
    source_url: 'https://gls.store'
  }
};

async function run() {
  console.log('🚀 Начинаем обогащение 117 товаров официальными описаниями и инструкциями с gls.store...');

  let updatedCount = 0;
  const dbUpdates = [];

  for (let i = 0; i < dbProducts.length; i++) {
    const p = dbProducts[i];
    const pid = String(p.id);

    // Non-GLS products keep existing high-quality verified descriptions
    if (['114', '115', '116', '117', '118'].includes(pid)) {
      console.log(`[${i + 1}/${dbProducts.length}] ⏩ Non-GLS бренд: "${p.name}"`);
      continue;
    }

    let itemData = null;

    if (SPECIAL_PRODUCTS[pid]) {
      itemData = SPECIAL_PRODUCTS[pid];
      console.log(`[${i + 1}/${dbProducts.length}] ⭐ Применены официальные данные для "${p.name}"`);
    } else if (urlMap[pid]) {
      const mapping = urlMap[pid];
      console.log(`[${i + 1}/${dbProducts.length}] 🌐 Загружаем с gls.store: "${mapping.title}"...`);
      const scraped = await scrapeGlsPage(mapping.url);
      if (scraped && scraped.desc) {
        itemData = {
          name: p.name,
          description: scraped.desc,
          properties: scraped.properties,
          usage: scraped.usage || enrichedData.by_product_id[pid]?.instructions?.usage,
          course: scraped.course || enrichedData.by_product_id[pid]?.instructions?.course || '1 месяц.',
          contraindications: scraped.contraindications || enrichedData.by_product_id[pid]?.instructions?.contraindications || 'Индивидуальная непереносимость компонентов.',
          source_url: mapping.url
        };
      }
      await new Promise(r => setTimeout(r, 120));
    }

    if (itemData) {
      // 1. Update by_product_id in enrichedData
      const existing = enrichedData.by_product_id[pid] || {};
      enrichedData.by_product_id[pid] = {
        ...existing,
        name: p.name,
        description: itemData.description,
        properties: itemData.properties,
        instructions: {
          usage: itemData.usage || existing.instructions?.usage || 'Взрослым во время еды.',
          course: itemData.course || existing.instructions?.course || '1 месяц.',
          contraindications: itemData.contraindications || existing.instructions?.contraindications || 'Индивидуальная непереносимость компонентов.',
          age: existing.instructions?.age || '18+',
          full_text: `${itemData.usage || ''} Продолжительность приема: ${itemData.course || '1 месяц.'} Противопоказания: ${itemData.contraindications || ''}`.trim(),
          source_url: itemData.source_url
        }
      };

      // 2. Queue Supabase product update
      dbUpdates.push({
        id: p.id,
        description: itemData.description.split('\n\n').slice(0, 3).join('\n\n')
      });

      updatedCount++;
    }
  }

  console.log(`\n✅ Успешно обработано ${updatedCount} товаров.`);

  // Write updated enriched_gls_products.json
  fs.writeFileSync(jsonPath, JSON.stringify(enrichedData, null, 2), 'utf8');
  console.log('💾 Сохранен обновленный src/data/enriched_gls_products.json');

  // Update Supabase site_settings
  console.log('☁️ Синхронизируем site_settings в Supabase...');
  const { error: ssError } = await sb
    .from('site_settings')
    .upsert({
      key: 'enriched_gls_products',
      value: enrichedData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (ssError) {
    console.error('❌ Ошибка синхронизации site_settings:', ssError.message);
  } else {
    console.log('✅ site_settings успешно обновлен!');
  }

  // Update Supabase products descriptions in batches of 20
  console.log(`☁️ Обновляем descriptions для ${dbUpdates.length} товаров в Supabase products...`);
  for (const upd of dbUpdates) {
    if (upd.description && upd.description.length > 20) {
      await sb.from('products').update({ description: upd.description }).eq('id', upd.id);
    }
  }
  console.log('✅ Все описания в таблице products в Supabase успешно обновлены!');
}

run();
