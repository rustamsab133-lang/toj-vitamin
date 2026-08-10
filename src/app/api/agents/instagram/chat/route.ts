import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { genAI } from '@/lib/gemini';
import { generateBannerAI } from '@/lib/agents/generateBannerAI';
import { BannerConfig, BannerProduct, DEFAULT_BANNER_CONFIG, ChatMessage } from '@/lib/types/banner';
import { SchemaType, FunctionDeclaration, Tool } from '@google/generative-ai';
import { findEnrichmentForProduct } from '@/lib/agents/instagram';
import fs from 'fs';
import path from 'path';

// Создаем Supabase Admin клиент с сервисным ключом для обхода RLS политик при сохранении памяти чата
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

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
    name: 'compose_image_prompt',
    description: 'Составляет детальный промпт для генерации рекламного баннера через Nano Banana Pro AI.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        imagePrompt: {
          type: SchemaType.STRING,
          description: 'Детальное описание сцены для генерации баннера (на английском). Включи: фон, окружение, освещение, расположение продуктов, настроение, цветовую палитру. Опиши всё детально как для профессионального фотографа.'
        },
        headline: {
          type: SchemaType.STRING,
          description: 'Заголовок на русском (1-5 слов) для отображения на баннере'
        },
        subtitle: {
          type: SchemaType.STRING,
          description: 'Подзаголовок бренда (по умолчанию TOJ-VITAMIN)'
        },
        stylePreset: {
          type: SchemaType.STRING,
          description: 'Стиль баннера: luxury_spa (премиум, спа), sport_energy (спорт, энергия), clinical_science (наука, медицина), editorial_magazine (журнальный разворот)',
          enum: ['luxury_spa', 'sport_energy', 'clinical_science', 'editorial_magazine']
        } as any,
        aspectRatio: {
          type: SchemaType.STRING,
          description: 'Соотношение сторон: 9:16 (Stories/Reels), 4:5 (Пост/Портрет), 1:1 (Квадрат), 16:9 (Широкий)',
          enum: ['9:16', '4:5', '1:1', '16:9']
        } as any,
      },
      required: ['imagePrompt', 'headline', 'stylePreset', 'aspectRatio'],
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
  }
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
    const { data: dbProducts } = await supabaseAdmin
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

    // Системный промпт с правилами Nano Banana Pro (Gemini 3 Pro Image)
    const systemPrompt = `Ты — ИИ SMM-маркетолог и арт-директор бренда "TOJ-VITAMIN" (Точвитамин) в Таджикистане.
Ты управляешь генератором рекламных ИИ-баннеров нового поколения на базе Nano Banana Pro (Gemini 3 Pro Image).

У тебя есть 3 инструмента дизайна (Function Calling):
1. select_products — подбираешь 1-3 продукта из каталога для решения болей клиента.
2. compose_image_prompt — составляешь детальный английский промпт для генерации рекламного изображения, задаешь стиль, заголовок и пропорции.
3. update_caption — пишешь подписи к постам.

КАТАЛОГ ПРОДУКТОВ (${catalog.length} товаров):
${JSON.stringify(catalog.slice(0, 107), null, 1)}

ТЕКУЩАЯ КОНФИГУРАЦИЯ БАННЕРА:
${JSON.stringify(clientConfig, null, 2)}

ПРАВИЛА АРТ-ДИРЕКШЕНА ДЛЯ СОСТАВЛЕНИЯ ПРОМПТОВ (compose_image_prompt):
- **ОБЯЗАТЕЛЬНО пиши imagePrompt на английском языке** (модель генерации картинок понимает только английский).
- Описывай сцену детально: расстановку продуктов, окружение (например, "on a premium white travertine pedestal with soft shadows", "surrounded by fresh orange slices and splashing water drops"), освещение ("volumetric natural soft sunlight", "dramatic key light from the side"), палитру цветов и текстуры.
- Укажи, что на баннере должен быть написан заголовок: "Render the text '{Headline}' on the banner in a clean elegant font".
- Пресеты стилей (stylePreset):
  * luxury_spa: для продуктов красоты, спокойствия, сна, женского здоровья (Коллаген, Магний, 5-HTP). Используй мягкие пастельные тона, мрамор, дерево, цветы.
  * sport_energy: для продуктов энергии, силы, мужского здоровья (Креатин, Тестобустер, L-Карнитин). Используй бетон, металл, яркий свет, глубокие тени, воду.
  * clinical_science: для базовых витаминов, аптечных серий (Цинк, Железо, Мультивитамины). Используй чистые медицинские тона, стекло, лабораторный минимализм.
  * editorial_magazine: для стильных журнальных коллажей, креативного дизайна.
- Не пытайся вручную рассчитывать координаты пикселей и позиций. Просто пиши человеческим языком, как профессиональный фотограф и арт-директор.
- Важно: Сохраняй фирменный вид баночек TOJ-VITAMIN (зеленые пластиковые банки с лаконичной белой этикеткой). Добавляй в промпт фразу: "Show exact green supplement jar packaging matching the references, preserve labels".

Отвечай дружелюбно, лаконично и профессионально на русском языке.`;

    // Конвертируем историю в формат Gemini
    const geminiHistory = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    // Вызываем Gemini с Function Calling
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
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
            };

            functionCallResults.push({
              name,
              result: { success: true, productsSelected: selectedProducts.length, reasoning: (args as any).reasoning }
            });

          } else if (name === 'compose_image_prompt') {
            const changes = args as any;

            if (changes.imagePrompt) updatedConfig.imagePrompt = changes.imagePrompt;
            if (changes.headline) updatedConfig.headline = changes.headline;
            if (changes.subtitle) updatedConfig.subtitle = changes.subtitle;
            if (changes.stylePreset) updatedConfig.stylePreset = changes.stylePreset;
            if (changes.aspectRatio) updatedConfig.aspectRatio = changes.aspectRatio;

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
    if (updatedConfig.products && updatedConfig.products.length > 0) {
      if (!updatedConfig.imagePrompt) {
        const prodNames = updatedConfig.products.map(p => p.name).join(' and ');
        updatedConfig.imagePrompt = `A premium professional advertising studio photography of ${prodNames} placed on a clean minimalist stage, warm volumetric lighting, matching style preset ${updatedConfig.stylePreset || 'luxury_spa'}.`;
      }
      try {
        console.log(`🎨 Generating banner AI with ${updatedConfig.products.length} products...`);
        bannerUrl = await generateBannerAI(updatedConfig);
        console.log('✅ Banner AI generated successfully.');
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
      await supabaseAdmin.from('instagram_agent_sessions').upsert({
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
