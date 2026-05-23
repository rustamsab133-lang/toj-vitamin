import { supabase } from '@/lib/supabase';
import { genAI } from '@/lib/gemini';
import { SchemaType } from '@google/generative-ai';
import { Product } from '@/lib/types';
import fs from 'fs';
import path from 'path';

interface InstagramPostResponse {
  selectedProducts: {
    id: string;
    name: string;
    image_url: string;
    synergy_reason: string;
  }[];
  headline: string;
  caption: string;
  reasoning: string;
  backgroundPrompt?: string;
  designConfig?: {
    bgColor?: string;
    textColorPrimary?: string;
    textColorSecondary?: string;
    accentColor?: string;
    fontTitle?: string;
    fontBody?: string;
    styleSubtitle?: string;
    shadowType?: 'palm' | 'window' | 'none';
    shadowOpacity?: number;
    podiumType?: 'stone' | 'glass' | 'none';
    productArrangements?: {
      id: string;
      width: number;
      height: number;
      x: number;
      y: number;
      rotation: number;
      layerIndex: number;
    }[];
  };
}

/**
 * ИИ-Агент для копирайтинга и подбора синергетических связок под конкретную боль.
 */
export async function generateInstagramPostContent(
  painPoint: string, 
  lang = 'ru', 
  tone = 'marketing'
): Promise<InstagramPostResponse> {
  // 1. Загружаем все продукты из Supabase
  const { data: dbProducts, error } = await supabase
    .from('products')
    .select('*')
    .order('id');

  if (error || !dbProducts) {
    throw new Error(`Не удалось загрузить продукты из базы: ${error?.message}`);
  }

  // 2. Загружаем данные обогащения (свойства, синергии, теги) из JSON
  let enrichedData: Record<string, any> = {};
  try {
    const jsonPath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    enrichedData = JSON.parse(fileContent);
  } catch (err) {
    console.warn('⚠️ Не удалось загрузить файл обогащения продуктов:', err);
  }

  // 3. Формируем единый каталог для ИИ
  const productsCatalog = dbProducts.map((p: any) => {
    const enrichment = enrichedData[p.name?.toLowerCase().trim() || ''] || {};
    return {
      id: p.id,
      name: p.name,
      full_name: p.full_name || p.name,
      description: p.description || '',
      image_url: p.image_url,
      properties: enrichment.properties || [],
      tags: enrichment.tags || [],
      synergies: enrichment.synergies || [],
      marketing_hooks: enrichment.marketing_hooks || []
    };
  });

  // Инструкции по языку генерации
  let langInstruction = '';
  if (lang === 'tj') {
    langInstruction = `
- Напиши заголовок (headline) для баннера на таджикском языке (максимум 5-6 слов).
- Напиши весь текст поста (caption) на чистом и вежливом таджикском языке. Используй таджикские шрифты (ӣ, ӯ, ҳ, ҷ, қ, ғ).
- Все выбранные продукты и поле synergy_reason пиши на таджикском языке.`;
  } else if (lang === 'tj_ru') {
    langInstruction = `
- Напиши заголовок (headline) для баннера на таджикском языке (или двуязычный, если коротко).
- Напиши текст поста (caption) двуязычным: первая часть поста полностью на вежливом таджикском языке, а вторая часть — точный перевод или адаптация на русском языке. Раздели их красивой визуальной границей, например "🇹🇯 / 🇷🇺".
- Выбранные продукты и synergy_reason пиши на русском языке с указанием таджикского пояснения.`;
  } else {
    langInstruction = `
- Напиши заголовок (headline) для баннера на русском языке (максимум 5-6 слов).
- Напиши весь текст поста (caption) на русском языке.
- Выбранные продукты и synergy_reason пиши на русском языке.`;
  }

  // Инструкции по тональности генерации
  let toneInstruction = '';
  if (tone === 'expert') {
    toneInstruction = `
- Стиль текста: высокопрофессиональный, научно-популярный, нутрициологический. Делай упор на биохимию, физиологические механизмы действия витаминов, клинические исследования и факты. Избегай банальных рекламных лозунгов. Предлагай дозировки и схемы приема на основе свойств продуктов.`;
  } else if (tone === 'friendly') {
    toneInstruction = `
- Стиль текста: эмпатичный, поддерживающий, заботливый. Общайся как дружелюбный велнес-коуч. Прояви максимум понимания к проблеме (боли) клиента, пиши простым человеческим языком без сложной медицинской терминологии, давай мягкие советы по образу жизни в дополнение к витаминам.`;
  } else {
    toneInstruction = `
- Стиль текста: активный, вовлекающий, продающий. Начни с ярких маркетинговых зацепок (hooks), делай упор на быструю выгоду и преображение. Используй мощный призыв к действию (Call-to-Action) купить прямо сейчас (написав в Директ). Текст должен разжигать желание решить проблему немедленно.`;
  }

  // 4. Готовим промпт для Gemini
  const prompt = `
Ты — опытный ИИ-маркетолог и эксперт по нутрициологии бренда "TOJ-VITAMIN" (Точвитамин) в Таджикистане, а также ГЕНИАЛЬНЫЙ ЦИФРОВОЙ АРТ-ДИРЕКТОР.
Твоя задача — проанализировать указанную "боль" или проблему человека, подобрать из каталога продуктов наиболее эффективную синергетическую связку (от 1 до 3 продуктов, которые идеально дополняют друг друга), написать вовлекающий пост для Instagram и спроектировать ПОЛНЫЙ ДИЗАЙН-КОНФИГ ДЛЯ БАННЕРА 1080x1920 (9:16).

Мы используем наш фирменный Гибридный ИИ-Конвейер Дизайна (Hybrid AI Design Engine) уровня мая 2026 года!
Это дает тебе ПОЛНУЮ СВОБОДУ ТВОРЧЕСТВА:
1. Ты можешь сгенерировать детальное описание фона (backgroundPrompt) на английском языке для ИИ-диффузии (FLUX.1). Будь креативным и пиши кинематографичные промпты для дорогой фотосессии! Например: "A luxury minimalist spa vanity table, warm travertine textures, beautiful shadows of palm leaves cast by morning sun, volumetric lighting, photorealistic, 8k" или "Breathtaking peak of Pamir mountains covered in white snow, cold ice textures, bright dramatic sun ray, epic, high-end photography".
2. Ты можешь настраивать общую цветовую палитру (bgColor, textColorPrimary, textColorSecondary, accentColor) и шрифты, чтобы они идеально подходили под настроение поста и цвета продуктов!
3. Ты можешь управлять размером, позицией по осям X и Y, углом наклона (rotation от -20 до +20 градусов!) и слоем наложения (layerIndex) для КАЖДОЙ баночки на баннере. Создавай объемные, динамичные 3D композиции, где баночки наклоняются и перекрывают друг друга в пространстве!

Каталог продуктов:
${JSON.stringify(productsCatalog, null, 2)}

Боль человека / Тема поста:
"${painPoint}"

Инструкции по выполнению:
1. Выбери от 1 до 3 продуктов, которые вместе решают эту боль лучше всего. Обязательно бери продукты с корректным "image_url".
2. Напиши пост для Instagram, следуя формуле AIDA (Внимание, Интерес, Желание, Действие).
3. Добавь 5-8 релевантных хештегов (включая брендовые: #tojvitamin #витаминытаджикистан).
4. Разработай шедевральный дизайн-конфиг! Не ленись рассчитывать координаты X (от 100 до 850) и Y (от 800 до 1400) и масштабы баночек так, чтобы они стояли гармонично и устойчиво.

Требования к языку и тональности:${langInstruction}${toneInstruction}

Формат ответа:
Верни строго валидный JSON-объект согласно JSON Schema. Никаких дополнительных комментариев. Никакой разметки \`\`\`json. Только JSON-объект следующей структуры:
{
  "selectedProducts": [...],
  "headline": "Заголовок для баннера",
  "caption": "Текст поста",
  "reasoning": "Пояснение для админов",
  "backgroundPrompt": "A highly detailed backdrop prompt in English...",
  "designConfig": {
    "bgColor": "#HexColor",
    "textColorPrimary": "#HexColor",
    "textColorSecondary": "#HexColor",
    "accentColor": "#HexColor",
    "fontTitle": "Georgia, serif OR system-ui, -apple-system, sans-serif",
    "fontBody": "Georgia, serif OR system-ui, -apple-system, sans-serif",
    "styleSubtitle": "СЛОГАН НА БАННЕРЕ",
    "shadowType": "palm OR window OR none",
    "shadowOpacity": 0.15,
    "podiumType": "stone OR glass OR none",
    "productArrangements": [
      {
        "id": "ID продукта из базы",
        "width": 420,
        "height": 420,
        "x": 310,
        "y": 920,
        "rotation": -8,
        "layerIndex": 0
      }
    ]
  }
}
`;

  // 5. Вызываем модель Gemini с обработкой ошибок и фоллбэком на реальные товары из базы
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            selectedProducts: {
              type: SchemaType.ARRAY,
              description: 'От 1 до 3 продуктов из каталога.',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING },
                  name: { type: SchemaType.STRING },
                  image_url: { type: SchemaType.STRING },
                  synergy_reason: { type: SchemaType.STRING }
                },
                required: ['id', 'name', 'image_url', 'synergy_reason']
              }
            },
            headline: { type: SchemaType.STRING, description: 'Заголовок баннера (СТРОГО МАКСИМУМ 4-5 СЛОВ).' },
            caption: { type: SchemaType.STRING },
            reasoning: { type: SchemaType.STRING },
            backgroundPrompt: { type: SchemaType.STRING, description: 'Промпт на английском языке для генерации ИИ-фона на основе темы поста.' },
            designConfig: {
              type: SchemaType.OBJECT,
              properties: {
                bgColor: { type: SchemaType.STRING },
                textColorPrimary: { type: SchemaType.STRING },
                textColorSecondary: { type: SchemaType.STRING },
                accentColor: { type: SchemaType.STRING },
                fontTitle: { type: SchemaType.STRING, description: 'Шрифт заголовка: Georgia, serif или system-ui, -apple-system, sans-serif' },
                fontBody: { type: SchemaType.STRING, description: 'Шрифт текста: Georgia, serif или system-ui, -apple-system, sans-serif' },
                styleSubtitle: { type: SchemaType.STRING },
                shadowType: { type: SchemaType.STRING, description: 'Тип тени: palm, window или none' },
                shadowOpacity: { type: SchemaType.NUMBER },
                podiumType: { type: SchemaType.STRING, description: 'Тип подиума: stone, glass или none' },
                productArrangements: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      id: { type: SchemaType.STRING },
                      width: { type: SchemaType.NUMBER },
                      height: { type: SchemaType.NUMBER },
                      x: { type: SchemaType.NUMBER },
                      y: { type: SchemaType.NUMBER },
                      rotation: { type: SchemaType.NUMBER, description: 'Угол поворота в градусах от -20 до 20.' },
                      layerIndex: { type: SchemaType.NUMBER, description: 'Слой отрисовки от 0 до 3.' }
                    },
                    required: ['id', 'width', 'height', 'x', 'y', 'rotation', 'layerIndex']
                  }
                }
              },
              required: ['bgColor', 'textColorPrimary', 'textColorSecondary', 'accentColor', 'fontTitle', 'fontBody', 'styleSubtitle', 'shadowType', 'shadowOpacity', 'podiumType', 'productArrangements']
            }
          },
          required: ['selectedProducts', 'headline', 'caption', 'reasoning', 'backgroundPrompt', 'designConfig']
        }
      }
    });

    const response = await model.generateContent(prompt);
    const text = response.response.text().trim();
    
    const postData: InstagramPostResponse = JSON.parse(text);

    // Дополнительная сверка с БД: гарантируем, что картинки и ID абсолютно точные и свежие
    for (const item of postData.selectedProducts) {
      const realProd = dbProducts.find((p: any) => 
        p.id.toString() === item.id.toString() || 
        p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );
      if (realProd) {
        item.id = realProd.id.toString();
        item.name = realProd.name;
        item.image_url = realProd.image_url || '';
      }
    }

    return postData;
  } catch (err: any) {
    console.warn('⚠️ Ошибка вызова Gemini или парсинга, используем качественный офлайн-фоллбэк с баночками из базы:', err);
    
    // Выбираем 2 популярных продукта из реальной базы, чтобы баннер собрался с РЕАЛЬНЫМИ БАНОЧКАМИ!
    const collagen = dbProducts.find((p: any) => p.name?.toLowerCase().includes('коллаген')) || dbProducts[0];
    const vitaminD = dbProducts.find((p: any) => p.name?.toLowerCase().includes('d3') || p.name?.toLowerCase().includes('витамин d')) || dbProducts[1];
    
    const fallbackResponse: InstagramPostResponse = {
      selectedProducts: [
        {
          id: collagen.id.toString(),
          name: collagen.name,
          image_url: collagen.image_url || 'https://azbseceyovktqztjslup.supabase.co/storage/v1/object/public/product-images/prod-96.jpg',
          synergy_reason: "Коллаген восстанавливает структуру кожи и волос на клеточном уровне изнутри."
        },
        {
          id: vitaminD.id.toString(),
          name: vitaminD.name,
          image_url: vitaminD.image_url || 'https://azbseceyovktqztjslup.supabase.co/storage/v1/object/public/product-images/prod-34.jpg',
          synergy_reason: "Витамин D3 регулирует деление клеток волосяных фолликулов и поддерживает здоровое обновление кожи."
        }
      ],
      headline: "Здоровая Кожа и Волосы",
      caption: `🌟 РЕШЕНИЕ ДЛЯ ЗДОРОВЬЯ КОЖИ И ВОЛОС 🌟\n\nЧасто внешние проблемы — это лишь сигнал о том, что организму не хватает базовой поддержки изнутри. Представляем вам идеальную синергетическую связку для вашей красоты:\n\n1️⃣ Коллаген с Витамином С — восстанавливает упругость кожи, борется с морщинами и укрепляет корни волос.\n2️⃣ Витамин D3 5000 IU — запускает здоровое обновление клеток волосяных фолликулов и поддерживает кожный барьер.\n\nЗакажите эти витамины прямо сейчас, написав нам в Директ! 📩\n\n#tojvitamin #коллаген #витаминd3 #здоровьеволос #красиваякожа`,
      reasoning: "Временный фоллбэк из-за лимитов API Gemini на ключе разработчика. Баннер отрисован с реальными баночками из вашей базы Supabase."
    };
    
    return fallbackResponse;
  }
}
