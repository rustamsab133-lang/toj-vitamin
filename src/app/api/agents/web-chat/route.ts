import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { getMarkupSettings, applyMarkupToPrice } from '@/lib/markup';
import { getRelevantProducts } from '@/lib/agents/vectorSearch';

// Инициализация Supabase с использованием service_role для полного обхода RLS в серверном коде
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Инициализация Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Функция для сопоставления продуктов RAG
function findEnrichmentForProduct(pName: string, enrichedData: Record<string, any>) {
  if (!pName) return {};
  const name = pName.toLowerCase().trim();
  if (enrichedData[name]) return enrichedData[name];

  let cleaned = name
    .replace(/\([^)]+\)/g, ' ')
    .replace(/капс\.*|таб\.*|порошок|экстракт|комплекс|сироп/gi, ' ')
    .replace(/gls|pharm|№\d+|\d+\s*мг|\d+\s*г|\d+\s*ие|\d+\s*ме/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (enrichedData[cleaned]) return enrichedData[cleaned];

  const keys = Object.keys(enrichedData).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return enrichedData[key];
    }
  }
  return {};
}

// Форматирование списка продуктов со свойствами и синергиями в строку RAG
async function formatCatalogProducts(dbProducts: any[]): Promise<string> {
  try {
    if (!dbProducts || dbProducts.length === 0) return 'Каталог пуст.';

    let enrichedData: Record<string, any> = {};
    const { data: enrichedSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'enriched_gls_products_data')
      .single();

    if (enrichedSetting?.value) {
      try {
        enrichedData = JSON.parse(enrichedSetting.value);
      } catch (e) {
        console.error("❌ Ошибка парсинга enriched_gls_products_data из Supabase:", e);
      }
    }

    if (Object.keys(enrichedData).length === 0) {
      try {
        const jsonPath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');
        if (fs.existsSync(jsonPath)) {
          enrichedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        }
      } catch (err) {
        console.warn('⚠️ Не удалось загрузить локальный файл обогащения:', err);
      }
    }

    const markupSettings = await getMarkupSettings();

    const catalogString = dbProducts
      .map((p: any) => {
        const enrich = findEnrichmentForProduct(p.name, enrichedData);
        const props = enrich.properties ? enrich.properties.join(', ') : 'Общее оздоровление';
        const synergies = enrich.synergies ? enrich.synergies.join('; ') : 'Отсутствует';
        
        const markedPrice = applyMarkupToPrice(Number(p.price) || 0, markupSettings);
        return `- [ID: ${p.id}] ${p.name} (${p.full_name}): Цена: ${markedPrice} сомони. Свойства: [${props}]. Синергия: [${synergies}]`;
      })
      .join('\n');

    return catalogString;
  } catch (error) {
    console.error('❌ Ошибка при сборке каталога:', error);
    return 'Ошибка загрузки каталога.';
  }
}

// Регулярное выражение для валидации UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const { message, chatId, cartItems, quizResult, cartItemsRaw } = await request.json() as { 
      message: string; 
      chatId?: string | null;
      cartItems?: string;
      quizResult?: string;
      cartItemsRaw?: Array<{ id: string; name: string; price: number; quantity: number }>;
    };

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    // 1. Поиск или создание чата
    let chat: any = null;
    if (chatId && uuidRegex.test(chatId)) {
      const { data } = await supabase.from('agent_chats').select('*').eq('id', chatId).single();
      chat = data;
    }

    if (!chat) {
      // Создаем новый сессионный чат с отметкой, что это веб-сайт
      const { data, error } = await supabase
        .from('agent_chats')
        .insert({ 
          summary: 'Клиент обратился через чат-виджет на сайте.',
          instagram_user_id: `web_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        })
        .select()
        .single();
      
      if (error) throw error;
      chat = data;
    }

    const currentChatId = chat.id;

    // 2. Базовый предохранитель от двойных кликов
    const { data: recentMessages } = await supabase
      .from('agent_messages')
      .select('message_text, created_at')
      .eq('chat_id', currentChatId)
      .eq('sender', 'user')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentMessages && recentMessages.length > 0) {
      const lastMsg = recentMessages[0];
      const timeDiff = Date.now() - new Date(lastMsg.created_at).getTime();
      if (lastMsg.message_text === message && timeDiff < 2000) {
        return NextResponse.json({ success: false, error: 'Duplicate click ignored' }, { status: 429 });
      }
    }

    // 3. Сохраняем сообщение пользователя
    await supabase.from('agent_messages').insert({
      chat_id: currentChatId,
      sender: 'user',
      message_text: message
    });

    // 4. Подтягиваем историю сообщений чата
    let historyText = 'Нет истории диалога.';
    const { data: messagesHistory } = await supabase
      .from('agent_messages')
      .select('sender, message_text')
      .eq('chat_id', currentChatId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesHistory && messagesHistory.length > 0) {
      historyText = messagesHistory
        .reverse()
        .map((m: any) => `${m.sender === 'user' ? 'Клиент' : 'Бот'}: ${m.message_text}`)
        .join('\n');
    }

    // 5. Загружаем настройки и промпты
    const { data: settingsData } = await supabase.from('site_settings').select('key, value');
    const getSetting = (key: string, def: string) => settingsData?.find((s: any) => s.key === key)?.value || def;

    const chatLang = getSetting('instagram_agent_chat_lang', 'auto');

    // Векторный RAG-поиск релевантных товаров
    const { data: dbProducts } = await supabase.from('products').select('*');
    const activeProducts = dbProducts ? dbProducts.filter((p: any) => p.price > 0 && !p.name.includes('[УДАЛЕН]')) : [];
    const relevantProducts = await getRelevantProducts(message, activeProducts, 10);
    const catalog = await formatCatalogProducts(relevantProducts);

    // 6. Инструкции по языку общения
    let langInstruction = '';
    if (chatLang === 'tj') {
      langInstruction = 'ВНИМАНИЕ: Общайся ИСКЛЮЧИТЕЛЬНО на таджикском языке.';
    } else if (chatLang === 'ru') {
      langInstruction = 'ВНИМАНИЕ: Общайся ИСКЛЮЧИТЕЛЬНО на русском языке.';
    } else {
      langInstruction = 'ВНИМАНИЕ: Определи язык последнего сообщения клиента. Если клиент написал на таджикском языке (или на таджикском с использованием латиницы/кириллицы), ты обязан отвечать СТРОГО на таджикском языке. Если клиент написал на русском языке, ты обязан отвечать СТРОГО на русском языке. Твой язык ответа должен ВСЕГДА на 100% совпадать с языком последнего вопроса клиента.';
    }

    // 7. Подгружаем активный A/B промпт или используем резервный
    const { data: activePrompts } = await supabase.from('agent_prompts').select('prompt_text').eq('is_active', true);
    
    const fallbackPromptText = 'Ты — ИИ-консультант премиального интернет-магазина витаминов "TOJ-VITAMIN" в Таджикистане. Твоя задача — вежливо, профессионально и кратко отвечать клиентам прямо на нашем сайте, помогать с выбором витаминов из каталога под их жалобы и боли, объяснять синергию продуктов и помогать оформить заказ. Отвечай ОЧЕНЬ КОРОТКО (2-4 предложения, максимум 60 слов). Твой язык общения должен СТРОГО на 100% совпадать с языком запроса клиента: если клиент пишет на таджикском (кириллицей или латиницей), отвечай строго на таджикском. Если на русском — строго на русском. Пиши приветствие ("Салом!", "Привет!" и т.д.) ТОЛЬКО в самом первом сообщении диалога. Если в истории переписки уже есть предыдущие сообщения от клиента и бота, НИКОГДА не здоровайся заново. Сразу отвечай на вопрос клиента по существу, без лишних приветствий.';
    
    let basePrompt = activePrompts && activePrompts.length > 0 
      ? activePrompts[Math.floor(Math.random() * activePrompts.length)].prompt_text 
      : fallbackPromptText;

    // Тюнинг промпта под контекст сайта (а не инстаграма)
    basePrompt = basePrompt
      .replace(/в Instagram Direct/gi, 'в чате на сайте')
      .replace(/Instagram Direct/gi, 'чат на сайте')
      .replace(/в Инстаграме/gi, 'на сайте');

    const cartItemsRawText = cartItemsRaw && cartItemsRaw.length > 0 
      ? JSON.stringify(cartItemsRaw, null, 2) 
      : 'Корзина пуста';

    const jsonInstruction = `
ПРАВИЛА ОФОРМЛЕНИЯ ЗАКАЗА И ПОВЕДЕНИЯ:
1. Если клиент хочет совершить покупку (например: "хочу купить", "оформи заказ", "возьму это"), но ЕЩЕ не написал свой номер телефона, ты ОБЯЗАН вежливо попросить его написать телефон. Например: "Я с радостью оформлю для вас заказ прямо здесь! Напишите, пожалуйста, ваш номер телефона". В этом случае НЕ заполняй поле "create_order".
2. Если у тебя есть телефон клиента И клиент хочет заказать товары из корзины (или товары, которые вы обсуждаете), ты ОБЯЗАН заполнить поле "create_order" в JSON.
3. Товары для поля "create_order" бери из Корзины Клиента (если клиент говорит "оформи корзину") или из обсуждаемых товаров каталога (точные id и цены).

ФОРМАТ ОТВЕТА:
Ты обязан вернуть ответ СТРОГО в виде JSON-объекта со следующей структурой:
{
  "reply": "Твой ответ клиенту на его языке (таджикском или русском) длиной 2-4 предложения (максимум 60 слов). Вежливо расскажи клиенту, что ты оформляешь его заказ, или задай уточняющий вопрос.",
  "recommended_product_ids": ["список ID рекомендованных продуктов, выбранных из предоставленного выше каталога"],
  "create_order": {
    "phone": "номер телефона клиента (только если он есть в переписке)",
    "items": [
      { "id": "ID товара", "name": "Название товара", "price": цена_числом, "quantity": количество }
    ]
  } // Поле "create_order" добавляется ТОЛЬКО когда заказ реально оформляется (есть телефон И согласие). В остальных случаях этого поля НЕ должно быть (или установи в null).
}
Убедись, что JSON в поле ответа валидный и не содержит Markdown-разметки (не оборачивай его в \`\`\`json).`;

    const fullPrompt = `${basePrompt}
${langInstruction}

Каталог в наличии на складе:
${catalog}

Текущее состояние корзины клиента (структурированное):
${cartItemsRawText}

Результаты теста здоровья клиента: ${quizResult || 'Тест не пройден'}

Краткое саммари о пользователе: ${chat.summary || 'Нет данных'}

История недавнего диалога (учитывай её при ответе!):
${historyText}

Клиент: "${message}"

${jsonInstruction}
Бот:`;

    // 8. Запрос к Gemini 3.1 Flash Lite
    const model = genAI.getGenerativeModel({ model: 'models/gemini-3.1-flash-lite' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });
    
    const responseText = result.response.text().trim();
    let reply = '';
    let recommendedProductIds: string[] = [];
    let createOrderData: any = null;

    try {
      const parsed = JSON.parse(responseText);
      reply = parsed.reply || '';
      recommendedProductIds = parsed.recommended_product_ids || [];
      createOrderData = parsed.create_order;
    } catch (e) {
      console.error('❌ Ошибка парсинга JSON ответа Gemini:', e, responseText);
      reply = responseText; // Фоллбек на весь текст, если не удалось распарсить JSON
    }

    // Если ИИ решил создать заказ
    if (createOrderData && createOrderData.phone && createOrderData.items && createOrderData.items.length > 0) {
      try {
        // Вычисляем сумму
        const total = createOrderData.items.reduce((acc: number, item: any) => {
          return acc + (Number(item.price) || 0) * (Number(item.quantity) || 1);
        }, 0);

        // Вставляем заказ в Supabase
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            items: createOrderData.items.map((item: any) => ({
              id: item.id,
              name: item.name,
              price: Number(item.price) || 0,
              quantity: Number(item.quantity) || 1
            })),
            total,
            status: 'new',
            phone: String(createOrderData.phone).trim(),
            channel: 'website',
            operator_notes: 'Создано ИИ-консультантом на сайте'
          })
          .select('id')
          .single();

        if (orderError) {
          console.error('❌ Ошибка базы данных при создании заказа через ИИ:', orderError);
        } else if (newOrder) {
          console.log(`✅ Заказ №${newOrder.id} успешно создан через ИИ-консультанта!`);
          const orderConfirmText = chatLang === 'tj' 
            ? `\n\n✅ Закази шумо қабул шуд! Рақами фармоиш: №${newOrder.id}`
            : `\n\n✅ Ваш заказ оформлен! Номер заказа: №${newOrder.id}`;
          reply += orderConfirmText;
        }
      } catch (orderErr) {
        console.error('❌ Ошибка при формировании заказа через ИИ:', orderErr);
      }
    }

    // 9. Сохраняем ответ бота в базу
    await supabase.from('agent_messages').insert({
      chat_id: currentChatId,
      sender: 'bot',
      message_text: reply
    });

    // Обновляем метку времени чата
    await supabase.from('agent_chats').update({ updated_at: new Date().toISOString() }).eq('id', currentChatId);

    return NextResponse.json({
      success: true,
      reply,
      chatId: currentChatId,
      recommendedProductIds
    });

  } catch (error: any) {
    console.error('❌ Ошибка в роуте веб-чата:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
