const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const dns = require('dns');

// Force Node.js to prefer IPv4 over IPv6 when resolving addresses (critical for Windows environments)
if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config({ path: '.env.local' });

const keyFilePath = path.join(__dirname, '../google-key.json');

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

async function getGSCOpportunities() {
  console.log("🔍 [1/4] Fetching keywords from Google Search Console...");
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const formatDate = (d) => d.toISOString().split('T')[0];

    const res = await searchconsole.searchanalytics.query({
      siteUrl: process.env.SEARCH_CONSOLE_SITE_URL,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query'],
        rowLimit: 50,
      },
    });

    if (!res.data.rows) {
      console.log("⚠️ No keywords found in Search Console. Using fallback keywords.");
      return [];
    }

    // Filter "golden niches": position between 4 and 25, impressions >= 3
    const opportunities = res.data.rows
      .filter(row => row.position >= 4 && row.position <= 25 && row.impressions >= 3)
      .sort((a, b) => b.impressions - a.impressions)
      .map(row => ({
        query: row.keys[0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        position: Math.round(row.position || 0),
      }));

    return opportunities;
  } catch (err) {
    console.error("❌ Search Console Error:", err.message);
    return [];
  }
}

async function getProductContext(targetQuery) {
  console.log(`📦 [2/4] Fetching catalog context for query: "${targetQuery}"...`);
  const { data: products } = await supabase
    .from('products')
    .select('name, full_name, description, price, tags, marketing_hooks')
    .limit(50);

  if (!products || products.length === 0) return 'Нет данных о товарах.';

  // Load markup settings
  let percent = 0;
  let flat = 0;
  try {
    const { data: settings } = await supabase.from('site_settings').select('key, value');
    const percentSetting = settings?.find(s => s.key === 'price_markup_percent');
    const flatSetting = settings?.find(s => s.key === 'price_markup_flat');
    percent = parseFloat(percentSetting?.value || '0') || 0;
    flat = parseFloat(flatSetting?.value || '0') || 0;
  } catch (e) {
    console.error("Failed to load markup settings, using base prices.", e.message);
  }

  const applyMarkup = (price) => Math.round(price * (1 + percent / 100) + flat);

  const queryWords = targetQuery.toLowerCase().split(/\s+/);
  const scored = products.map(p => {
    const text = `${p.name} ${p.full_name || ''} ${p.description || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
    const score = queryWords.filter(w => text.includes(w)).length;
    return { ...p, score };
  });

  const relevant = scored.filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  const productList = (relevant.length > 0 ? relevant : products.slice(0, 5));

  return productList.map(p => {
    const markedPrice = applyMarkup(Number(p.price) || 0);
    return `- ${p.name} (${p.full_name || ''}): ${p.description?.slice(0, 200) || ''}. Цена: ${markedPrice} сомони. Теги: ${(p.tags || []).join(', ')}. Маркетинг: ${(p.marketing_hooks || []).join('; ')}`;
  }).join('\n');
}

async function generateArticle(targetQuery, productContext) {
  console.log("🧠 [3/4] Generating article using Gemini 3.5 Flash...");
  const systemPrompt = `Ты — ведущий медицинский редактор научного журнала Green Leaf Sciences (Таджикистан). 
Твоя задача: написать экспертную SEO-статью для сайта toj-vitamin.tj.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:
1. Tone of Voice: Клинически авторитетный, но доступный для обычного читателя. Премиальный стиль, как у Apple или The Lancet.
2. Язык: Русский (основная аудитория — русскоязычные жители Таджикистана).
3. Объем: 1500-2500 слов.
4. Формат: ЧИСТЫЙ HTML (без markdown). Используй <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>.
5. Упоминай релевантные продукты ЕСТЕСТВЕННО, как эксперт. НЕ делай прямую рекламу. Пиши как научная статья, где продукты упоминаются в контексте клинических рекомендаций.
6. Включи минимум 5 заголовков <h2>.
7. Обязательно включи раздел "Часто задаваемые вопросы" в конце (3-5 вопросов в формате <h3>Вопрос</h3><p>Ответ</p>).
8. НЕ используй слова: "купить", "заказать", "скидка", "акция". Пиши как врач, а не продавец.
9. В конце добавь медицинский дисклеймер: "Информация носит ознакомительный характер. Перед применением проконсультируйтесь с врачом."
10. Все утверждения должны быть научно обоснованы.

КОНТЕКСТ ПРОДУКТОВ (из каталога toj-vitamin.tj):
${productContext}

Ответь СТРОГО в формате JSON:
{
  "title_ru": "Заголовок статьи (50-70 символов, включает целевой запрос)",
  "slug": "url-friendly-slug-латиницей",
  "excerpt_ru": "Краткое описание для превью и meta description (150-160 символов)",
  "content_ru": "<h2>...</h2><p>...</p>...(полный HTML статьи)",
  "category": "Категория статьи (одно слово: Нутрициология / Биохакинг / Здоровье / Иммунитет / Женское здоровье / Спорт)",
  "read_time_min": число_минут_на_чтение
}`;

  const userPrompt = `Напиши экспертную статью, оптимизированную под поисковый запрос: "${targetQuery}"
Статья должна полностью раскрыть тему и помочь человеку, который ищет "${targetQuery}" в Google, получить исчерпывающий ответ.`;

  const result = await geminiModel.generateContent([
    { text: systemPrompt },
    { text: userPrompt },
  ]);

  const responseText = result.response.text();
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Gemini did not return valid JSON. Output: ' + responseText);
  }

  return JSON.parse(jsonMatch[0]);
}

function sanitizeSlug(slug) {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function run() {
  try {
    const customQuery = process.argv[2]; // Can pass custom query in CLI
    let targetQuery;

    if (customQuery) {
      targetQuery = customQuery;
      console.log(`🤖 Target Query specified via CLI: "${targetQuery}"`);
    } else {
      const opportunities = await getGSCOpportunities();
      if (opportunities.length > 0) {
        targetQuery = opportunities[0].query;
        console.log(`🤖 Selected highest priority query from GSC: "${targetQuery}" (Impressions: ${opportunities[0].impressions}, Position: ${opportunities[0].position})`);
      } else {
        const fallbacks = [
          "Витамин Д3 дозировка для взрослых в Душанбе",
          "Польза цинка для иммунитета",
          "Магний цитрат B6 как принимать",
          "Креатин для роста мышц отзывы"
        ];
        targetQuery = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        console.log(`🤖 GSC yielded no opportunities. Selected random fallback query: "${targetQuery}"`);
      }
    }

    const productContext = await getProductContext(targetQuery);
    const article = await generateArticle(targetQuery, productContext);

    console.log("💾 [4/4] Saving generated article draft to Supabase...");
    const slug = sanitizeSlug(article.slug || targetQuery.replace(/\s+/g, '-'));
    
    // Check for duplicate slug
    const { data: existing } = await supabase
      .from('journal_articles')
      .select('slug')
      .eq('slug', slug)
      .single();

    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    const { data: saved, error: saveError } = await supabase
      .from('journal_articles')
      .insert({
        slug: finalSlug,
        title_ru: article.title_ru,
        excerpt_ru: article.excerpt_ru,
        content_ru: article.content_ru,
        author_name: 'Green Leaf Sciences',
        author_role: 'Научная редакция',
        is_published: false, // Draft
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Supabase Insert Error: ${saveError.message}`);
    }

    console.log("\n=================================================");
    console.log("🎉 SUCCESS! SEO ARTICLE DRAFT GENERATED");
    console.log("=================================================");
    console.log(`Title: ${saved.title_ru}`);
    console.log(`Slug:  /journal/${saved.slug}`);
    console.log(`Excerpt: ${saved.excerpt_ru}`);
    console.log(`Read Time: ${article.read_time_min} mins`);
    console.log("=================================================");

  } catch (error) {
    console.error("\n❌ SEO Generation Failed:", error.message);
  }
}

run();
