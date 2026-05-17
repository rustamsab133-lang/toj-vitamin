import { NextRequest, NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';
import { createClient } from '@supabase/supabase-js';

// Use service role key for full DB access (server-side only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Google Search Console Integration ───────────────────────────────────────
async function getGSCOpportunities(): Promise<{ query: string; clicks: number; impressions: number; position: number }[]> {
  try {
    const { OAuth2Client } = await import('google-auth-library');
    const { google } = await import('googleapis');

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

    // Last 28 days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const res = await searchconsole.searchanalytics.query({
      siteUrl: process.env.SEARCH_CONSOLE_SITE_URL,
      requestBody: {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        dimensions: ['query'],
        rowLimit: 50,
      },
    });

    if (!res.data.rows) return [];

    // Find "golden niches": queries with decent impressions but low clicks (position 5-25)
    // These are keywords where we're visible but not ranking well enough
    return res.data.rows
      .filter((row: any) => row.position >= 5 && row.position <= 25 && row.impressions >= 5)
      .sort((a: any, b: any) => b.impressions - a.impressions)
      .slice(0, 10)
      .map((row: any) => ({
        query: row.keys![0],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        position: Math.round(row.position || 0),
      }));
  } catch (err: any) {
    console.error('GSC Error:', err.message);
    return [];
  }
}

// ─── Product Context from Supabase ───────────────────────────────────────────
async function getProductContext(targetQuery: string): Promise<string> {
  const { data: products } = await supabase
    .from('products')
    .select('name, full_name, description, price, tags, marketing_hooks, med_interactions')
    .limit(50);

  if (!products || products.length === 0) return 'Нет данных о товарах.';

  // Find products relevant to the query
  const queryWords = targetQuery.toLowerCase().split(/\s+/);
  const scored = products.map(p => {
    const text = `${p.name} ${p.full_name} ${p.description} ${(p.tags || []).join(' ')}`.toLowerCase();
    const score = queryWords.filter(w => text.includes(w)).length;
    return { ...p, score };
  });

  const relevant = scored.filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  const productList = (relevant.length > 0 ? relevant : products.slice(0, 5));

  return productList.map(p =>
    `- ${p.name} (${p.full_name || ''}): ${p.description?.slice(0, 200)}. Цена: ${p.price} сомони. Теги: ${(p.tags || []).join(', ')}. Маркетинг: ${(p.marketing_hooks || []).join('; ')}`
  ).join('\n');
}

// ─── Generate Article with Gemini ────────────────────────────────────────────
async function generateArticle(targetQuery: string, productContext: string) {
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

  let lastError;
  for (let i = 0; i < 3; i++) {
    try {
      const result = await geminiModel.generateContent([
        { text: systemPrompt },
        { text: userPrompt },
      ]);

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Gemini не вернул валидный JSON');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err: any) {
      lastError = err;
      console.warn(`🤖 SEO Agent: Gemini Attempt ${i + 1} failed: ${err.message}`);
      // Wait before retry (exponential backoff)
      if (i < 2) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastError;
}

// ─── Slug helper ─────────────────────────────────────────────────────────────
function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// ─── Main POST handler ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const customQuery = body.query as string | undefined;
    console.log('🤖 SEO Agent: Starting...', { customQuery });

    // STEP 1: Find golden niche from GSC (or use custom query)
    let targetQuery: string;
    let gscData: { query: string; clicks: number; impressions: number; position: number }[] = [];

    if (customQuery && customQuery.trim().length > 0) {
      targetQuery = customQuery.trim();
      console.log('🤖 SEO Agent: Using custom query:', targetQuery);
    } else {
      console.log('🤖 SEO Agent: Fetching GSC opportunities...');
      gscData = await getGSCOpportunities();
      if (gscData.length === 0) {
        console.log('🤖 SEO Agent: No GSC data found');
        return NextResponse.json({
          success: false,
          error: 'Не найдено поисковых запросов в GSC. Попробуйте указать тему вручную.',
          gscData: [],
        }, { status: 200 });
      }
      targetQuery = gscData[0].query;
      console.log('🤖 SEO Agent: Selected query from GSC:', targetQuery);
    }

    // STEP 2: Get relevant products from Supabase
    console.log('🤖 SEO Agent: Fetching product context...');
    const productContext = await getProductContext(targetQuery);
    console.log('🤖 SEO Agent: Product context loaded');

    // STEP 3: Generate article with Gemini
    console.log('🤖 SEO Agent: Generating article with Gemini...');
    const article = await generateArticle(targetQuery, productContext);
    console.log('🤖 SEO Agent: Article generated successfully');

    // STEP 4: Save as DRAFT in Supabase
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
        is_published: false, // ЧЕРНОВИК — публикуется вручную
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Supabase save error:', saveError);
      return NextResponse.json({
        success: false,
        error: `Ошибка сохранения: ${saveError.message}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      article: {
        id: saved.id,
        slug: finalSlug,
        title: article.title_ru,
        excerpt: article.excerpt_ru,
        category: article.category,
        read_time_min: article.read_time_min,
      },
      targetQuery,
      gscData: gscData.slice(0, 5),
    });

  } catch (err: any) {
    console.error('SEO Agent Error:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Внутренняя ошибка агента',
    }, { status: 500 });
  }
}

// ─── GET: List all drafts ────────────────────────────────────────────────────
export async function GET() {
  try {
    const { data: drafts, error } = await supabase
      .from('journal_articles')
      .select('id, slug, title_ru, excerpt_ru, is_published, published_at, author_name')
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ drafts: drafts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
