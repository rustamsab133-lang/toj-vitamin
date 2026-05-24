import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { generateBannerV2 } from '@/lib/agents/bannerGeneratorV2';
import { BannerConfig, BannerProduct, DEFAULT_BANNER_CONFIG, BANNER_THEMES, ChatMessage } from '@/lib/types/banner';
import { SchemaType, FunctionDeclaration, Tool } from '@google/generative-ai';
import { findEnrichmentForProduct } from '@/lib/agents/instagram';
import fs from 'fs';
import path from 'path';

// Загрузка обогащённых данных
function loadEnrichedData(): Record<string, any> {
  try {
    const jsonPath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');
    return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch {
    return {};
  }
}

// Function declarations для Gemini
const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'select_products',
    description: 'Выбирает от 1 до 3 оптимальных продуктов из каталога GLS/TOJ-VITAMIN для решения указанной боли/проблемы клиента. Возвращает синергетическую связку.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        product_ids: {
          type: SchemaType.ARRAY,
          description: 'Массив ID выбранных продуктов (от 1 до 3)',
          items: { type: SchemaType.STRING }
        },
        headline: {
          type: SchemaType.STRING,
          description: 'Короткий заголовок для баннера (макс 5 слов, на русском)'
        },
        caption: {
          type: SchemaType.STRING,
          description: 'Полный текст подписи для Instagram поста в стиле AIDA с хештегами'
        },
        reasoning: {
          type: SchemaType.STRING,
          description: 'Объяснение почему выбрана именно эта связка продуктов'
        },
      },
      required: ['product_ids', 'headline', 'caption', 'reasoning'],
    },
  },
  {
    name: 'update_banner_config',
    description: 'Обновляет визуальные параметры баннера: цвет фона, размер шрифта, размер фото, наклон, расположение, цвета текста.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        bgColor: { type: SchemaType.STRING, description: 'Hex-цвет фона баннера, например #EFEAE2' },
        textPrimary: { type: SchemaType.STRING, description: 'Hex-цвет основного текста' },
        textSecondary: { type: SchemaType.STRING, description: 'Hex-цвет второстепенного текста' },
        accentColor: { type: SchemaType.STRING, description: 'Hex-цвет акцента (линия-разделитель)' },
        fontSize: { type: SchemaType.NUMBER, description: 'Размер шрифта заголовка в пикселях (40-90)' },
        photoSize: { type: SchemaType.NUMBER, description: 'Размер фото товаров в пикселях (300-600)' },
        photoAngle: { type: SchemaType.NUMBER, description: 'Угол наклона фото в градусах (-20 до +20)' },
        photoLayout: { type: SchemaType.STRING, description: 'Расположение фото: center, duo или pyramid' },
        textPosition: { type: SchemaType.STRING, description: 'Позиция текста: top или bottom' },
        headline: { type: SchemaType.STRING, description: 'Новый заголовок баннера' },
        subtitle: { type: SchemaType.STRING, description: 'Подзаголовок бренда' },
        theme: { type: SchemaType.STRING, description: 'Имя темы: cream, chocolate, mint, indigo, white, black' },
      },
    },
  },
  {
    name: 'update_caption',
    description: 'Обновляет текст подписи поста для Instagram.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        caption: { type: SchemaType.STRING, description: 'Новый текст подписи поста' },
      },
      required: ['caption'],
    },
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, bannerConfig: clientConfig, sessionId } = body as {
      messages: ChatMessage[];
      bannerConfig: BannerConfig;
      sessionId?: string;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: false, error: 'No messages provided' }, { status: 400 });
    }

    // Загружаем продукты из БД
    const { data: dbProducts } = await supabase
      .from('products')
      .select('*')
      .gt('price', 0)
      .order('id');

    if (!dbProducts || dbProducts.length === 0) {
      return NextResponse.json({ success: false, error: 'Нет продуктов в базе' }, { status: 500 });
    }

    // Загружаем обогащённые данные
    const enrichedData = loadEnrichedData();

    // Формируем каталог для промпта
    const catalog = dbProducts.map((p: any) => {
      const enrichment = findEnrichmentForProduct(p.name, enrichedData);
      return {
        id: String(p.id),
        name: p.name,
        image_url: p.image_url || '',
        properties: enrichment?.properties || [],
        tags: enrichment?.tags || [],
        synergies: enrichment?.synergies || [],
      };
    });

    // Системный промпт
    const systemPrompt = `Ты — ИИ SMM-маркетолог и арт-директор бренда "TOJ-VITAMIN" (Точвитамин) в Таджикистане.
Ты управляешь генератором Instagram-баннеров через чат. У тебя есть 3 функции:

1. select_products — подбираешь 1-3 продукта из каталога для решения "боли" клиента
2. update_banner_config — изменяешь визуал баннера (цвет, шрифт, размер, расположение)
3. update_caption — обновляешь текст подписи поста

КАТАЛОГ ПРОДУКТОВ (${catalog.length} товаров):
${JSON.stringify(catalog.slice(0, 107), null, 1)}

ТЕКУЩАЯ КОНФИГУРАЦИЯ БАННЕРА:
${JSON.stringify(clientConfig, null, 2)}

ПРАВИЛА И ИНСТРУКЦИИ ДЛЯ ИИ-АРТ-ДИРЕКТОРА:
- Когда пользователь описывает боль/проблему — СНАЧАЛА вызови select_products, потом ответь текстом
- Когда пользователь просит изменить визуал (цвет, шрифт, размер, наклон, расположение) — ОБЯЗАТЕЛЬНО вызови update_banner_config с нужными параметрами. Не пытайся просто пообещать сделать это в тексте ответа, ты ОБЯЗАН совершить вызов функции!
- Когда просит изменить текст подписи — вызови update_caption

- **УВЕЛИЧЕНИЕ И УМЕНЬШЕНИЕ ФОТО ТОВАРОВ**:
  * Если пользователь просит сделать фото/картинки продуктов крупнее, больше, увеличить их — вызови update_banner_config и установи параметр photoSize больше текущего (например: 450, 500, 550, макс 600).
  * Если просит сделать фото меньше, уменьшить их — уменьши параметр photoSize (например: 350, 320, мин 300).

- **НАКЛОН И ПОВОРОТ ФОТО ТОВАРОВ**:
  * Если пользователь просит повернуть, наклонить, развернуть продукты (например: "поверни фото", "сделай наклон побольше") — вызови update_banner_config и передай photoAngle от -20 до +20 (положительные значения наклоняют вправо, отрицательные — влево).

- **ТИПОГРАФИКА И ШРИФТ**:
  * Заголовок fontSize может быть от 40 до 90. Если просит увеличить текст заголовка — увеличь fontSize.

- **СЕТКА РАСПОЛОЖЕНИЯ (LAYOUTS & POSITION)**:
  * Доступные layouts: center (горизонтальный ряд), duo (нахлёст двух продуктов), pyramid (пирамида из 3 продуктов).
  * Доступные textPosition: top (текст вверху, продукты внизу) и bottom (текст внизу, продукты вверху).

- **ЦВЕТОВЫЕ ТЕМЫ**:
  * Доступные темы: cream, chocolate, mint, indigo, white, black. Вызови update_banner_config с параметром theme для автоматического применения гармоничной цветовой палитры.

- Отвечай дружелюбно, профессионально, кратко и по делу на русском языке. При вызове функций передавай только те параметры, которые нужно обновить.`;

    // Конвертируем историю в формат Gemini
    const geminiHistory = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    // Вызываем Gemini с Function Calling
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ functionDeclarations }] as Tool[],
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    // Обрабатываем ответ
    let agentText = '';
    let updatedConfig = { ...clientConfig };
    let bannerUrl: string | undefined;
    let functionCallResults: any[] = [];

    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.text) {
          agentText += part.text;
        }

        if (part.functionCall) {
          const { name, args } = part.functionCall;
          console.log(`🔧 Agent calling function: ${name}`, JSON.stringify(args).substring(0, 200));

          if (name === 'select_products') {
            const productIds = (args as any).product_ids || [];
            const selectedProducts: BannerProduct[] = [];

            for (const pid of productIds) {
              const prod = dbProducts.find((p: any) => String(p.id) === String(pid));
              if (prod && prod.image_url) {
                selectedProducts.push({
                  id: String(prod.id),
                  name: prod.name,
                  image_url: prod.image_url,
                  synergy_reason: '',
                });
              }
            }

            updatedConfig = {
              ...updatedConfig,
              products: selectedProducts,
              headline: (args as any).headline || updatedConfig.headline,
              caption: (args as any).caption || updatedConfig.caption,
              photoLayout: selectedProducts.length >= 3 ? 'pyramid' : selectedProducts.length === 2 ? 'duo' : 'center',
            };

            functionCallResults.push({
              name,
              result: { success: true, productsSelected: selectedProducts.length, reasoning: (args as any).reasoning }
            });

          } else if (name === 'update_banner_config') {
            const changes = args as any;

            // Применяем тему если указана
            if (changes.theme && BANNER_THEMES[changes.theme]) {
              const theme = BANNER_THEMES[changes.theme];
              updatedConfig.bgColor = theme.bgColor;
              updatedConfig.textPrimary = theme.textPrimary;
              updatedConfig.textSecondary = theme.textSecondary;
              updatedConfig.accentColor = theme.accentColor;
            }

            // Применяем остальные изменения
            if (changes.bgColor) updatedConfig.bgColor = changes.bgColor;
            if (changes.textPrimary) updatedConfig.textPrimary = changes.textPrimary;
            if (changes.textSecondary) updatedConfig.textSecondary = changes.textSecondary;
            if (changes.accentColor) updatedConfig.accentColor = changes.accentColor;
            if (changes.fontSize) updatedConfig.fontSize = Math.max(40, Math.min(90, changes.fontSize));
            if (changes.photoSize) updatedConfig.photoSize = Math.max(300, Math.min(600, changes.photoSize));
            if (changes.photoAngle !== undefined) updatedConfig.photoAngle = Math.max(-20, Math.min(20, changes.photoAngle));
            if (changes.photoLayout) updatedConfig.photoLayout = changes.photoLayout;
            if (changes.textPosition) updatedConfig.textPosition = changes.textPosition;
            if (changes.headline) updatedConfig.headline = changes.headline;
            if (changes.subtitle) updatedConfig.subtitle = changes.subtitle;

            functionCallResults.push({ name, result: { success: true, appliedChanges: Object.keys(changes) } });

          } else if (name === 'update_caption') {
            updatedConfig.caption = (args as any).caption || updatedConfig.caption;
            functionCallResults.push({ name, result: { success: true } });
          }
        }
      }
    }

    // Если были function calls, отправляем результаты обратно в Gemini для финального ответа
    if (functionCallResults.length > 0 && !agentText) {
      const functionResponses = functionCallResults.map(fr => ({
        functionResponse: {
          name: fr.name,
          response: fr.result,
        },
      }));

      const followUp = await chat.sendMessage(functionResponses);
      const followUpText = followUp.response.text();
      if (followUpText) {
        agentText = followUpText;
      }
    }

    if (!agentText) {
      agentText = 'Готово! Баннер обновлён.';
    }

    // Генерируем баннер если есть продукты
    if (updatedConfig.products && updatedConfig.products.length > 0 && updatedConfig.headline) {
      try {
        console.log(`🎨 Generating banner V2 with ${updatedConfig.products.length} products...`);
        bannerUrl = await generateBannerV2(updatedConfig);
        console.log('✅ Banner V2 generated successfully.');
      } catch (err) {
        console.error('❌ Banner generation error:', err);
      }
    }

    // Сохраняем сессию в Supabase
    const agentMessage: ChatMessage = {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: agentText,
      timestamp: new Date().toISOString(),
    };

    const allMessages = [...messages, agentMessage];

    if (sessionId) {
      await supabase.from('instagram_agent_sessions').upsert({
        id: sessionId,
        messages: allMessages,
        banner_config: updatedConfig,
        caption: updatedConfig.caption,
        updated_at: new Date().toISOString(),
      }).then(res => {
        if (res.error) console.warn('⚠️ Session save error:', res.error.message);
      });
    }

    return NextResponse.json({
      success: true,
      agentMessage,
      bannerConfig: updatedConfig,
      bannerUrl,
    });

  } catch (error: any) {
    console.error('❌ Chat agent error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
