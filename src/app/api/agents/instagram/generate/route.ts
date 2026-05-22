import { NextRequest, NextResponse } from 'next/server';
import { generateInstagramPostContent } from '@/lib/agents/instagram';
import { generateBanner } from '@/lib/agents/bannerGenerator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const painPoint = body.painPoint || body.topic;
    const lang = body.lang || 'ru';
    const tone = body.tone || 'marketing';
    const bannerStyle = body.bannerStyle || 'dark_purple';

    if (!painPoint) {
      return NextResponse.json(
        { success: false, error: 'Пожалуйста, укажите "painPoint" или "topic" в теле запроса.' },
        { status: 400 }
      );
    }

    console.log(`🤖 Instagram Agent: Начинаю генерацию для боли: "${painPoint}", Язык: ${lang}, Тон: ${tone}, Стиль: ${bannerStyle}`);

    // 1. Запускаем "мозг" агента - выбор продуктов и копирайтинг
    const postContent = await generateInstagramPostContent(painPoint, lang, tone);
    console.log(`🧠 Gemini выбрал связку из ${postContent.selectedProducts.length} продуктов.`);

    // 2. Запускаем "дизайнера" - верстку баннера
    console.log(`🎨 Sharp начинает генерацию баннера с заголовком: "${postContent.headline}"`);
    const bannerBase64 = await generateBanner(postContent.headline, postContent.selectedProducts, bannerStyle);
    console.log('✅ Баннер успешно сгенерирован.');

    // 3. Возвращаем результат для превью
    return NextResponse.json({
      success: true,
      painPoint,
      headline: postContent.headline,
      reasoning: postContent.reasoning,
      caption: postContent.caption,
      selectedProducts: postContent.selectedProducts.map(p => ({
        id: p.id,
        name: p.name,
        synergy_reason: p.synergy_reason
      })),
      bannerUrl: bannerBase64 // Base64 Data URL, который можно отобразить прямо в теге <img src="...">
    });

  } catch (error: any) {
    console.error('❌ Ошибка Instagram-агента:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Внутренняя ошибка сервера при генерации.' },
      { status: 500 }
    );
  }
}

// Также добавим GET-метод для быстрого теста прямо из браузера с дефолтной темой
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const painPoint = searchParams.get('painPoint') || 'постоянная усталость и нехватка энергии';

    console.log(`🤖 GET-Тест Instagram Agent: Начинаю генерацию для боли: "${painPoint}"`);

    const postContent = await generateInstagramPostContent(painPoint);
    const bannerBase64 = await generateBanner(postContent.headline, postContent.selectedProducts);

    // Возвращаем HTML-страницу для красивого превью прямо в браузере!
    const htmlPreview = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Превью Instagram Поста • TOJ-VITAMIN</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; }
          .font-outfit { font-family: 'Outfit', sans-serif; }
        </style>
      </head>
      <body class="bg-slate-950 text-slate-100 min-h-screen py-12 px-4">
        <div class="max-w-5xl mx-auto space-y-8">
          
          <header class="text-center space-y-2">
            <h1 class="text-4xl font-outfit font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">🤖 Instagram AI Agent</h1>
            <p class="text-slate-400">Демонстрация генерации контента (Фаза 1)</p>
          </header>

          <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 shadow-2xl">
            
            <!-- Левая колонка: Сгенерированный баннер -->
            <div class="space-y-4">
              <h3 class="text-lg font-bold text-indigo-400 flex items-center gap-2">
                <span>🎨 Сгенерированный баннер (1080x1080)</span>
              </h3>
              <div class="aspect-square bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
                <img src="${bannerBase64}" alt="Instagram Banner" class="w-full h-full object-cover">
              </div>
              <div class="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Почему выбрана эта связка (ИИ):</h4>
                <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(postContent.reasoning)}</p>
              </div>
            </div>

            <!-- Правая колонка: Копирайтинг и детали -->
            <div class="space-y-6 flex flex-col justify-between">
              
              <div class="space-y-4">
                <h3 class="text-lg font-bold text-indigo-400">✍️ Текст поста (Instagram Caption)</h3>
                <div class="bg-slate-950 p-6 rounded-2xl border border-slate-800 font-mono text-sm whitespace-pre-wrap leading-relaxed select-all max-h-[480px] overflow-y-auto">${escapeHtml(postContent.caption)}</div>
              </div>

              <div class="space-y-4">
                <h3 class="text-md font-bold text-slate-300">💊 Выбранные продукты в связке:</h3>
                <div class="grid gap-3">
                  ${postContent.selectedProducts.map(p => `
                    <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
                      <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        <img src="${p.image_url}" alt="${p.name}" class="h-full object-contain">
                      </div>
                      <div>
                        <h4 class="text-sm font-bold text-white uppercase">${escapeHtml(p.name)}</h4>
                        <p class="text-xs text-slate-400">${escapeHtml(p.synergy_reason)}</p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

            </div>

          </div>

          <footer class="text-center text-xs text-slate-600">
            Запрос сгенерирован для боли: "${escapeHtml(painPoint)}" • TOJ-VITAMIN 2026
          </footer>

        </div>
      </body>
      </html>
    `;

    return new NextResponse(htmlPreview, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error: any) {
    console.error('❌ Ошибка GET-Теста Instagram-агента:', error);
    return new NextResponse(`
      <div style="background:#0f172a;color:#ef4444;padding:24px;font-family:sans-serif;border-radius:12px;border:1px solid #ef4444;">
        <h3>Ошибка генерации:</h3>
        <p>${error.message || error}</p>
      </div>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
