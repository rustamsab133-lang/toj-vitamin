import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { genAI } from '@/lib/gemini';
import { generateBannerV2 } from '@/lib/agents/bannerGeneratorV2';
import { BannerConfig, BannerProduct, DEFAULT_BANNER_CONFIG, BANNER_THEMES, ChatMessage, TextLayer } from '@/lib/types/banner';
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
    name: 'update_banner_config',
    description: 'Обновляет визуальные параметры баннера: цвет фона, размер шрифта, размер фото, наклон, расположение, цвета текста, темы и шаблоны.',
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
        photoLayout: { type: SchemaType.STRING, description: 'Шаблон сетки: center (по центру), duo (нахлёст двух продуктов), pyramid (пирамида из 3 продуктов), asymmetric_left (асимметричный сдвиг банок влево, текст справа), editorial_split (журнальный разделенный экран: слева текст на плашке, справа подиум)' },
        textPosition: { type: SchemaType.STRING, description: 'Позиция текста: top или bottom' },
        headline: { type: SchemaType.STRING, description: 'Новый заголовок баннера' },
        subtitle: { type: SchemaType.STRING, description: 'Подзаголовок бренда' },
        theme: { type: SchemaType.STRING, description: 'Имя темы: cream, chocolate, mint, indigo, white, black' },
        aspectRatio: { type: SchemaType.STRING, description: 'Соотношение сторон баннера: 9:16 (Stories/Reels), 4:5 (Пост/Портрет), 1:1 (Квадрат), 16:9 (Широкий)' },
        shadowIntensity: { type: SchemaType.NUMBER, description: 'Интенсивность теней под товарами 0-100 (0=нет, 55=средние, 100=глубокие)' },
        lightAngle: { type: SchemaType.NUMBER, description: 'Угол источника света 0-360 градусов' },
        bgGradient: { type: SchemaType.STRING, description: 'Hex-цвет второго конца градиента фона' },
        bgGradientAngle: { type: SchemaType.NUMBER, description: 'Угол градиента фона 0-360' },
        vignette: { type: SchemaType.NUMBER, description: 'Затемнение по краям (виньетка) 0-100 (20=легкое, 70=драматичное)' },
        bgImage: { type: SchemaType.STRING, description: 'Путь к 3D-фону: /backgrounds/marble_podium.png (мраморный подиум), /backgrounds/tropical_pedestal.png (тропический), /backgrounds/dark_obsidian.png (черный обсидиан), /backgrounds/luxury_gold.png (золотистый спа) или пустая строка для цвета' },
        fontTheme: { type: SchemaType.STRING, description: 'Стиль шрифтов: luxury (изящный Serif Lora для спа/премиума), sport (мощный Oswald для энергии/актива), clinical (минималистичный Outfit для науки), default (стандартный Montserrat)' },
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
  {
    name: 'manage_text_layers',
    description: 'Добавляет, обновляет или удаляет свободные текстовые слои (бейджи, рекламные тексты, кнопки CTA, буллиты преимуществ, блоки цен) на баннере.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        action: {
          type: SchemaType.STRING,
          description: 'Действие: add (добавить новый слой), update (изменить существующий), remove (удалить слой)',
          enum: ['add', 'update', 'remove']
        } as any,
        layerId: {
          type: SchemaType.STRING,
          description: 'ID текстового слоя (обязателен для update и remove)'
        },
        type: {
          type: SchemaType.STRING,
          description: 'Тип слоя: badge (бейдж с фоном), text (простой текст), cta (кнопка призыва с рамкой), bullets (маркированный список с галочками), price (крупный блок цены)',
          enum: ['badge', 'text', 'cta', 'bullets', 'price']
        } as any,
        content: {
          type: SchemaType.STRING,
          description: 'Текст слоя. Для bullets разделяй строки символом переноса \\n'
        },
        x: {
          type: SchemaType.NUMBER,
          description: 'X координата в процентах холста (0-100)'
        },
        y: {
          type: SchemaType.NUMBER,
          description: 'Y координата в процентах холста (0-100)'
        },
        fontSize: {
          type: SchemaType.NUMBER,
          description: 'Размер шрифта в px (18-60)'
        },
        color: {
          type: SchemaType.STRING,
          description: 'Hex-цвет текста (например, #FAFAFA)'
        },
        bgColor: {
          type: SchemaType.STRING,
          description: 'Hex-цвет фона плашки/кнопки (для badge и cta)'
        },
        fontWeight: {
          type: SchemaType.NUMBER,
          description: 'Насыщенность шрифта: 400, 700 (bold), 800 (extra-bold), 900 (black)'
        },
        rotation: {
          type: SchemaType.NUMBER,
          description: 'Угол поворота в градусах (-180 до 180)'
        },
        opacity: {
          type: SchemaType.NUMBER,
          description: 'Прозрачность слоя от 0.0 до 1.0'
        },
        align: {
          type: SchemaType.STRING,
          description: 'Выравнивание текста: left, center, right',
          enum: ['left', 'center', 'right']
        } as any,
        placement: {
          type: SchemaType.STRING,
          description: 'Расположение слоя: foreground (спереди баночек - по умолчанию), background (сзади баночек для трехмерной глубины и эффекта сэндвича)',
          enum: ['foreground', 'background']
        } as any
      },
      required: ['action']
    }
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

    // Системный промпт с правилами дизайна 3.0
    const systemPrompt = `Ты — ИИ SMM-маркетолог и арт-директор бренда "TOJ-VITAMIN" (Точвитамин) в Таджикистане.
Ты управляешь генератором рекламных ИИ-баннеров нового поколения (версия 3.0).

У тебя есть 4 инструмента дизайна (Function Calling):
1. select_products — подбираешь 1-3 продукта из каталога для решения болей клиента.
2. update_banner_config — управляешь фоном, разметкой, темами, размером банок и стилем шрифта.
3. update_caption — пишешь подписи к постам.
4. manage_text_layers — управляешь свободным вектором: добавляешь рекламные бейджи, CTA-кнопки, ценники, галочки.

КАТАЛОГ ПРОДУКТОВ (${catalog.length} товаров):
${JSON.stringify(catalog.slice(0, 107), null, 1)}

ТЕКУЩАЯ КОНФИГУРАЦИЯ БАННЕРА:
${JSON.stringify(clientConfig, null, 2)}

ПРАВИЛА АРТ-ДИРЕКШЕНА ДЛЯ СУПЕРПРОФЕССИОНАЛЬНЫХ КРЕАТИВОВ:
- **ШРИФТЫ (fontTheme)**:
  * Если товар премиальный, спа, для женской красоты, сна или спокойствия (Коллаген, 5-HTP, Гиалуронка) — ОБЯЗАТЕЛЬНО ставь fontTheme='luxury' (включает королевский Serif шрифт Lora).
  * Если товар спортивный, мужской, для энергии и выносливости (Креатин, Тестобустер, Карнитин) — ОБЯЗАТЕЛЬНО ставь fontTheme='sport' (включает брутальный плотный Oswald).
  * Если товар научный, клинический, строгий (Магний, Цинк, Железо) — используй fontTheme='clinical' (минималистичный Outfit).
- **СЕТКА КОМПОЗИЦИИ (photoLayout)**:
  * Для ультрамодного дизайна используй:
    - \`asymmetric_left\`: продукт крупно слева, текстовый блок справа. Идеально для одиночных товаров-героев.
    - \`editorial_split\`: левые 50% закрыты полупрозрачной подложкой с текстом, правые 50% содержат 3D-подиум с товаром. Выглядит как разворот дорогого журнала!
- **ЭФФЕКТ СЭНДВИЧА (3D СЛОИ)**:
  * При добавлении текста через manage_text_layers, если просят добавить фоновый текст, красивое огромное слово (например, "SLEEP", "ENERGY", "VITAMIN") — установи параметр placement='background'. Такой текст будет наложен ЗА баночкой, создавая колоссальный объем!
  * Интерактивные кнопки (cta), бейджи со скидками (badge), цены (price) всегда держи спереди (placement='foreground' - по умолчанию).
- **ЦВЕТОВЫЕ ТЕМЫ**:
  * Доступные темы: cream, chocolate, mint, indigo, white, black. Выбирай их в зависимости от настроения.

Когда пользователь просит изменить баннер, добавляй надписи, кнопки и меняй настройки через соответствующие инструменты. Отвечай дружелюбно, лаконично и профессионально на русском языке.`;

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
            if (changes.bgImage !== undefined) updatedConfig.bgImage = changes.bgImage;
            if (changes.bgGradient !== undefined) updatedConfig.bgGradient = changes.bgGradient;
            if (changes.bgGradientAngle !== undefined) updatedConfig.bgGradientAngle = changes.bgGradientAngle;
            if (changes.shadowIntensity !== undefined) updatedConfig.shadowIntensity = changes.shadowIntensity;
            if (changes.lightAngle !== undefined) updatedConfig.lightAngle = changes.lightAngle;
            if (changes.vignette !== undefined) updatedConfig.vignette = changes.vignette;
            if (changes.fontTheme !== undefined) updatedConfig.fontTheme = changes.fontTheme;

            functionCallResults.push({ name, result: { success: true, appliedChanges: Object.keys(changes) } });

          } else if (name === 'update_caption') {
            updatedConfig.caption = (args as any).caption || updatedConfig.caption;
            functionCallResults.push({ name, result: { success: true } });

          } else if (name === 'manage_text_layers') {
            const { action, layerId, type: lType, content, x, y, fontSize, color, bgColor, fontWeight, rotation, opacity, align, placement } = args as any;
            const layers = [...(updatedConfig.textLayers || [])];

            if (action === 'add') {
              const newId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              const newLayer: TextLayer = {
                id: newId,
                type: lType || 'text',
                content: content || 'Новый текст',
                x: x !== undefined ? Math.max(0, Math.min(100, x)) : 50,
                y: y !== undefined ? Math.max(0, Math.min(100, y)) : 50,
                fontSize: fontSize || 24,
                color,
                bgColor,
                fontWeight: fontWeight || 700,
                rotation: rotation || 0,
                opacity: opacity !== undefined ? Math.max(0, Math.min(1, opacity)) : 1,
                align: align || 'center',
                placement: placement || 'foreground',
              };
              layers.push(newLayer);
              updatedConfig.textLayers = layers;
              functionCallResults.push({ name, result: { success: true, action: 'add', layerId: newId } });
            } else if (action === 'update' && layerId) {
              updatedConfig.textLayers = layers.map(l => {
                if (l.id === layerId) {
                  return {
                    ...l,
                    type: lType || l.type,
                    content: content !== undefined ? content : l.content,
                    x: x !== undefined ? Math.max(0, Math.min(100, x)) : l.x,
                    y: y !== undefined ? Math.max(0, Math.min(100, y)) : l.y,
                    fontSize: fontSize || l.fontSize,
                    color: color !== undefined ? color : l.color,
                    bgColor: bgColor !== undefined ? bgColor : l.bgColor,
                    fontWeight: fontWeight || l.fontWeight,
                    rotation: rotation !== undefined ? Math.max(-180, Math.min(180, rotation)) : l.rotation,
                    opacity: opacity !== undefined ? Math.max(0, Math.min(1, opacity)) : l.opacity,
                    align: align || l.align,
                    placement: placement !== undefined ? placement : l.placement,
                  };
                }
                return l;
              });
              functionCallResults.push({ name, result: { success: true, action: 'update', layerId } });
            } else if (action === 'remove' && layerId) {
              updatedConfig.textLayers = layers.filter(l => l.id !== layerId);
              functionCallResults.push({ name, result: { success: true, action: 'remove', layerId } });
            }
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
