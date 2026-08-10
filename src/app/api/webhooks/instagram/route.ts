import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { getMarkupSettings, applyMarkupToPrice } from '@/lib/markup';
import { getRelevantProducts } from '@/lib/agents/vectorSearch';

// Инициализация Supabase с использованием service_role ключа для обхода Row Level Security (RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Инициализация Gemini (модель возьмет ключ из process.env.GEMINI_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Ключи из настроек Meta
const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'my_super_secret_verify_token_123';
const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_TOKEN || '';

// Кэш для предотвращения шторма повторных запросов от Meta (интервал повторов обычно в пределах секунд)
const processedMids = new Set<string>();
const midQueue: string[] = [];

function isDuplicateWebhook(mid: string): boolean {
  if (processedMids.has(mid)) {
    return true;
  }
  processedMids.add(mid);
  midQueue.push(mid);
  
  // Ограничиваем размер очереди 500 элементами для защиты памяти
  if (midQueue.length > 500) {
    const oldest = midQueue.shift();
    if (oldest) {
      processedMids.delete(oldest);
    }
  }
  return false;
}

// Функция для умной нормализации и нечеткого сопоставления продуктов RAG
function findEnrichmentForProduct(pName: string, enrichedData: Record<string, any>) {
  if (!pName) return {};
  const name = pName.toLowerCase().trim();
  
  // 1. Точное совпадение
  if (enrichedData[name]) return enrichedData[name];

  // 2. Очистка суффиксов лекарственных форм, дозировок и упаковки
  let cleaned = name
    .replace(/\([^)]+\)/g, ' ') // Удаляем содержимое круглых скобок
    .replace(/капс\.*|таб\.*|порошок|экстракт|комплекс|сироп/gi, ' ') // Удаляем формы выпуска
    .replace(/gls|pharm|№\d+|\d+\s*мг|\d+\s*г|\d+\s*ие|\d+\s*ме/gi, ' ') // Удаляем дозировки, упаковки и бренды
    .replace(/\s+/g, ' ')
    .trim();

  if (enrichedData[cleaned]) return enrichedData[cleaned];

  // 3. Сопоставление по подстроке (с приоритетом более специфичных длинных ключей)
  const keys = Object.keys(enrichedData).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return enrichedData[key];
    }
  }

  // 4. Пословный поиск по первому слову/словосочетанию
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 1) {
    const firstWord = words[0];
    if (enrichedData[firstWord]) return enrichedData[firstWord];
    if (words.length >= 2) {
      const firstTwo = `${words[0]} ${words[1]}`;
      if (enrichedData[firstTwo]) return enrichedData[firstTwo];
    }
  }

  return {};
}

// Функция для отправки ответа клиенту обратно в Директ
async function sendInstagramMessage(recipientId: string, text: string) {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Ошибка отправки в Instagram:', errorData);
    } else {
      console.log(`✅ Сообщение успешно отправлено клиенту ${recipientId}!`);
    }
  } catch (error) {
    console.error('❌ Ошибка сети при отправке в Instagram:', error);
  }
}

// Функция для отправки картинки в Директ
async function sendInstagramImage(recipientId: string, imageUrl: string) {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: {
              url: imageUrl,
              is_reusable: true
            }
          }
        }
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Ошибка отправки изображения в Instagram:', errorData);
    } else {
      console.log(`✅ Изображение успешно отправлено клиенту ${recipientId}!`);
    }
  } catch (error) {
    console.error('❌ Ошибка сети при отправке изображения в Instagram:', error);
  }
}

// Функция для отправки изображений рекомендованных продуктов по их точным ID из базы
async function sendRecommendedProductPhotos(recipientId: string, productIds: string[]) {
  if (!productIds || productIds.length === 0) return;
  try {
    const { data: dbProducts } = await supabase
      .from('products')
      .select('name, image_url')
      .in('id', productIds);

    if (dbProducts && dbProducts.length > 0) {
      // Ограничиваемся первыми 3 для предотвращения спама в ЛС
      const limitList = dbProducts.slice(0, 3);
      for (const prod of limitList) {
        if (prod.image_url) {
          console.log(`📸 Отправка фото по ID в Instagram Direct: "${prod.name}" -> ${prod.image_url}`);
          await sendInstagramImage(recipientId, prod.image_url);
          // Небольшая задержка 600 мс между картинками для соблюдения порядка
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }
    }
  } catch (error) {
    console.error('❌ Ошибка отправки фото рекомендуемых продуктов:', error);
  }
}

// Функция для автоматического сопоставления названий товаров в ответе ИИ и отправки их фото
async function detectAndSendProductPhotos(recipientId: string, aiReplyText: string, userMessageText?: string) {
  try {
    // 1. Получаем список всех активных товаров из Supabase
    const { data: dbProducts } = await supabase
      .from('products')
      .select('name, full_name, image_url')
      .gt('price', 0);

    if (!dbProducts || dbProducts.length === 0) {
      console.log('ℹ️ Авто-сопоставление: товары в БД не найдены.');
      return;
    }

    const matchedProducts: Array<{ name: string; imageUrl: string }> = [];

    // Функция для безопасного экранирования спецсимволов для RegExp
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Функция для поиска совпадений товаров в конкретном тексте
    const scanTextForProducts = (targetText: string) => {
      const lower = targetText.toLowerCase();
      for (const p of dbProducts) {
        if (!p.image_url) continue;

        const shortName = p.name.toLowerCase().trim();
        const fullName = p.full_name ? p.full_name.toLowerCase().trim() : '';

        if (shortName.length < 3) continue;

        const escapedShortName = escapeRegExp(shortName);
        const pattern = new RegExp(`(?:^|[^a-zA-Zа-яА-Я0-9_])${escapedShortName}(?:$|[^a-zA-Zа-яА-Я0-9_])`, 'i');

        const isShortNameMentioned = pattern.test(lower);
        const isFullNameMentioned = fullName && lower.includes(fullName);

        if (isShortNameMentioned || isFullNameMentioned) {
          if (!matchedProducts.some(mp => mp.imageUrl === p.image_url)) {
            matchedProducts.push({
              name: p.name,
              imageUrl: p.image_url
            });
          }
        }
      }
    };

    // 1. Сначала сканируем текущий ответ ИИ
    scanTextForProducts(aiReplyText);

    // 2. Если в текущем ответе ИИ нет названий товаров, НО пользователь явно просит показать/прислать фото:
    if (matchedProducts.length === 0 && userMessageText) {
      const userLower = userMessageText.toLowerCase();
      const isPhotoRequest = userLower.includes('фото') || 
                             userLower.includes('картинк') || 
                             userLower.includes('покажи') || 
                             userLower.includes('скинь') || 
                             userLower.includes('пришли') || 
                             userLower.includes('отправ') || 
                             userLower.includes('изображен') ||
                             userLower.includes('выглядит');

      if (isPhotoRequest) {
        console.log('🔍 Клиент явно запросил фото, но в текущем ответе ИИ названий нет. Сканируем недавнюю историю диалога...');
        
        // Получаем чат
        const { data: chat } = await supabase
          .from('agent_chats')
          .select('id')
          .eq('instagram_user_id', recipientId)
          .single();

        if (chat) {
          // Подтягиваем последние 6 сообщений диалога
          const { data: history } = await supabase
            .from('agent_messages')
            .select('message_text')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(6);

          if (history && history.length > 0) {
            // Сканируем сообщения в хронологическом порядке (от старых к новым)
            const chronologicalHistory = [...history].reverse();
            for (const msg of chronologicalHistory) {
              scanTextForProducts(msg.message_text);
              if (matchedProducts.length >= 3) break; // Ограничиваемся 3 товарами
            }
          }
        }
      }
    }

    // Если найдены совпадения, отправляем картинки (ограничиваем 3 товарами)
    if (matchedProducts.length > 0) {
      console.log(`🔍 Авто-сопоставление нашло ${matchedProducts.length} продуктов для отправки.`);
      const limitList = matchedProducts.slice(0, 3);
      
      for (const prod of limitList) {
        console.log(`📸 Отправка фото в Instagram Direct: "${prod.name}" -> ${prod.imageUrl}`);
        await sendInstagramImage(recipientId, prod.imageUrl);
        // Небольшая задержка 600 мс между картинками для соблюдения порядка
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }
  } catch (error) {
    console.error('❌ Ошибка автоматического сопоставления и отправки фото:', error);
  }
}

// Функция для форматирования компактного каталога со свойствами и синергиями (RAG)
async function formatEnrichedCatalogProducts(dbProducts: any[]): Promise<string> {
  try {
    if (!dbProducts || dbProducts.length === 0) return 'Каталог пуст.';

    // 2. Получаем данные обогащения из Supabase site_settings
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

    // 3. Фоллбэк на локальный JSON файл
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

    // 3.5. Получаем настройки наценки
    const markupSettings = await getMarkupSettings();

    // 4. Формируем сверхкомпактное текстовое описание каталога для контекста ИИ
    const catalogString = dbProducts
      .map((p: any) => {
        const enrich = findEnrichmentForProduct(p.name, enrichedData);
        const props = enrich.properties ? enrich.properties.join(', ') : 'Общее оздоровление';
        const tags = enrich.tags ? enrich.tags.join(', ') : 'Иммунитет';
        const synergies = enrich.synergies ? enrich.synergies.join('; ') : 'Отсутствует';
        
        // Apply pricing markup dynamically so AI directs clients to the marked up retail price
        const markedPrice = applyMarkupToPrice(Number(p.price) || 0, markupSettings);

        return `- [ID: ${p.id}] ${p.name} (${p.full_name}): Цена: ${markedPrice} сомони. Свойства: [${props}]. Теги: [${tags}]. Синергия: [${synergies}]`;
      })
      .join('\n');

    return catalogString;
  } catch (error) {
    console.error('❌ Ошибка при сборке обогащенного каталога для RAG:', error);
    return 'Ошибка загрузки каталога.';
  }
}

// Генерация умного ответа через Gemini с инъекцией динамического каталога и промптов
async function generateAIResponse(senderId: string, userMessage: string, chat: any): Promise<{ reply: string; recommendedProductIds: string[] } | null> {
  try {
    // 1. Считываем настройки ИИ
    const { data: settingsData } = await supabase.from('site_settings').select('key, value');
    const getSetting = (key: string, def: string) => settingsData?.find((s: any) => s.key === key)?.value || def;

    if (getSetting('instagram_agent_active', 'true') !== 'true') {
      console.log('🔌 ИИ-Агент деактивирован. Игнорируем.');
      return null;
    }
    const chatLang = getSetting('instagram_agent_chat_lang', 'auto');

    // Память загружается на основе переданного объекта чата
    let historyText = 'Нет истории диалога.';
    if (chat) {
      const { data: messagesHistory } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (messagesHistory && messagesHistory.length > 0) {
        historyText = messagesHistory.reverse().map((m: any) => `${m.sender === 'user' ? 'Клиент' : 'Бот'}: ${m.message_text}`).join('\n');
      }
    }

    // 3. Выбираем промпт (A/B тест)
    const { data: prompts } = await supabase.from('agent_prompts').select('*').eq('is_active', true);
    const fallbackPromptText = 'Ты — консультант "TOJ-VITAMIN". Отвечай кратко, предлагай витамины из каталога в наличии, подбирай синергию. Твой язык общения должен СТРОГО на 100% совпадать с языком запроса клиента: если клиент пишет на таджикском (кириллицей или латиницей), отвечай строго на таджикском. Если на русском — строго на русском. Если клиент просит показать, прислать или скинуть фото/картинки, обязательно перечисли точные названия обсуждаемых товаров в своем ответе. Пиши приветствие ("Салом!", "Привет!" и т.д.) ТОЛЬКО в самом первом сообщении диалога. Если в истории переписки уже есть предыдущие сообщения от клиента и бота, НИКОГДА не здоровайся заново. Сразу отвечай на вопрос клиента по существу, без лишних приветствий.';
    let selectedPrompt = prompts && prompts.length > 0 ? prompts[Math.floor(Math.random() * prompts.length)] : null;
    
    // 4. Достаем золотые примеры
    const { data: goldenExamples } = await supabase.from('agent_golden_examples').select('*').limit(3);
    const goldenText = goldenExamples?.map((g: any) => `Пример запроса клиента: "${g.user_query}"\nИдеальный ответ бота: "${g.ideal_response}"`).join('\n\n') || '';

    // 5. Собираем каталог на основе векторного семантического поиска
    const { data: dbProducts } = await supabase.from('products').select('*');
    const activeProducts = dbProducts ? dbProducts.filter((p: any) => p.price > 0 && !p.name.includes('[УДАЛЕН]')) : [];
    const relevantProducts = await getRelevantProducts(userMessage, activeProducts, 10);
    const catalog = await formatEnrichedCatalogProducts(relevantProducts);
    
    // 6. Инструкции по языку общения
    let langInstruction = '';
    if (chatLang === 'tj') {
      langInstruction = 'ВНИМАНИЕ: Общайся ИСКЛЮЧИТЕЛЬНО на таджикском языке.';
    } else if (chatLang === 'ru') {
      langInstruction = 'ВНИМАНИЕ: Общайся ИСКЛЮЧИТЕЛЬНО на русском языке.';
    } else {
      // Авто-определение под язык запроса пользователя
      langInstruction = 'ВНИМАНИЕ: Определи язык последнего сообщения клиента. Если клиент написал на таджикском языке (или на таджикском с использованием латиницы/кириллицы), ты обязан отвечать СТРОГО на таджикском языке. Если клиент написал на русском языке, ты обязан отвечать СТРОГО на русском языке. Твой язык ответа должен ВСЕГДА на 100% совпадать с языком последнего вопроса клиента.';
    }

    const jsonInstruction = `
ПРАВИЛА ОФОРМЛЕНИЯ ЗАКАЗА И ПОВЕДЕНИЯ:
1. Если клиент хочет совершить покупку (например: "хочу купить", "оформи заказ", "возьму это"), но ЕЩЕ не написал свой номер телефона, ты ОБЯЗАН вежливо попросить его написать телефон. Например: "Я с радостью оформлю для вас заказ прямо здесь! Напишите, пожалуйста, ваш номер телефона". В этом случае НЕ заполняй поле "create_order".
2. Если у тебя есть телефон клиента И клиент хочет заказать обсуждаемые товары, ты ОБЯЗАН заполнить поле "create_order" в JSON.
3. Товары для поля "create_order" бери из обсуждаемых товаров каталога (точные id и цены).

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

    // 7. Формируем финальный промпт
    const basePromptText = selectedPrompt ? selectedPrompt.prompt_text : fallbackPromptText;
    const fullPrompt = `${basePromptText}
${langInstruction}

Каталог в наличии на складе:
${catalog}

${goldenText ? 'ОБЯЗАТЕЛЬНЫЕ ПРИМЕРЫ СТИЛЯ И ОТВЕТОВ (Golden Examples):\n' + goldenText : ''}

Краткое саммари о пользователе: ${chat?.summary || 'Нет данных'}

История недавнего диалога (учитывай её при ответе!):
${historyText}

Клиент: "${userMessage}"

${jsonInstruction}
Бот:`;

    // 8. Генерация
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" }); 
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
      console.error("❌ Ошибка парсинга JSON ответа Gemini в Instagram webhook:", e, responseText);
      reply = responseText;
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
            channel: 'instagram',
            operator_notes: 'Создано ИИ-консультантом в Instagram Direct'
          })
          .select('id')
          .single();

        if (orderError) {
          console.error('❌ Ошибка базы данных при создании заказа через ИИ в Instagram:', orderError);
        } else if (newOrder) {
          console.log(`✅ Заказ №${newOrder.id} успешно создан через ИИ в Instagram!`);
          const orderConfirmText = chatLang === 'tj' 
            ? `\n\n✅ Закази шумо қабул шуд! Рақами фармоиш: №${newOrder.id}`
            : `\n\n✅ Ваш заказ оформлен! Номер заказа: №${newOrder.id}`;
          reply += orderConfirmText;
        }
      } catch (orderErr) {
        console.error('❌ Ошибка при формировании заказа через ИИ в Instagram:', orderErr);
      }
    }

    // 9. Логирование ответа бота
    if (chat) {
      await supabase.from('agent_messages').insert([
        { chat_id: chat.id, sender: 'bot', message_text: reply, prompt_id_used: selectedPrompt?.id }
      ]);
      await supabase.from('agent_chats').update({ updated_at: new Date().toISOString() }).eq('id', chat.id);
    }

    return { reply, recommendedProductIds };
  } catch (error) {
    console.error("❌ Ошибка Gemini API в Direct:", error);
    return {
      reply: "К сожалению, система сейчас перегружена. Пожалуйста, напишите нам чуть позже, и наш специалист обязательно вас проконсультирует!",
      recommendedProductIds: []
    };
  }
}

// GET: Верификация для Meta (Webhook Setup)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ INSTAGRAM WEBHOOK УСПЕШНО ВЕРИФИЦИРОВАН В META!');
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

// Функция для фоновой обработки сообщений
async function processWebhookInBackground(body: any) {
  try {
    for (const entry of (body.entry || [])) {
      const messaging = entry.messaging || [];
      
      for (const webhookEvent of messaging) {
        try {
          const senderId = webhookEvent.sender?.id;
          
          // Проверяем: это текст? И это не эхо нашего бота?
          if (webhookEvent.message && webhookEvent.message.text && !webhookEvent.message.is_echo && senderId) {
            const text = webhookEvent.message.text;
            const mid = webhookEvent.message.mid || `${senderId}_${text}_${webhookEvent.timestamp}`;
            
            console.log(`📩 НОВОЕ СООБЩЕНИЕ [ID: ${senderId}, MID: ${mid}]: ${text}`);
            
            // Шаг 1.1: Быстрая in-memory дедупликация для отсечения мгновенных параллельных повторов
            if (isDuplicateWebhook(mid)) {
              console.log(`⚡ [Deduplication] Обнаружен мгновенный in-memory дубликат (mid: ${mid}). Игнорируем обработку.`);
              continue;
            }

            // Шаг 1.2: Подключение БД и поиск/создание чата (уже работает благодаря service_role ключу)
            let { data: chat } = await supabase.from('agent_chats').select('*').eq('instagram_user_id', senderId).single();
            if (!chat) {
              const { data: newChat } = await supabase.from('agent_chats').insert({ instagram_user_id: senderId }).select().single();
              chat = newChat;
            }

            if (chat) {
              // Шаг 1.3: Базовый предохранитель в БД от повторных запросов при сетевых задержках
              const { data: recentMessages } = await supabase
                .from('agent_messages')
                .select('message_text, created_at')
                .eq('chat_id', chat.id)
                .eq('sender', 'user')
                .order('created_at', { ascending: false })
                .limit(1);

              if (recentMessages && recentMessages.length > 0) {
                const lastMsg = recentMessages[0];
                const timeDiff = Date.now() - new Date(lastMsg.created_at).getTime();
                // Если текст совпадает и отправлен менее 20 секунд назад — расцениваем как дубль Meta
                if (lastMsg.message_text === text && timeDiff < 20000) {
                  console.log(`⚠️ [Deduplication] Дубликат сообщения обнаружен в БД для чата ${chat.id} (${timeDiff}ms назад). Пропускаем.`);
                  continue;
                }
              }

              // Мгновенно фиксируем входящее сообщение пользователя, блокируя параллельные транзакции
              await supabase.from('agent_messages').insert({
                chat_id: chat.id,
                sender: 'user',
                message_text: text
              });
            }

            // Шаг 2: Думаем с помощью Gemini
            const aiResponse = await generateAIResponse(senderId, text, chat);
            
            // Шаг 3: Отвечаем клиенту в Директ
            if (aiResponse && aiResponse.reply) {
              await sendInstagramMessage(senderId, aiResponse.reply);
              // Отправляем фото продуктов на основе структурированных ID
              if (aiResponse.recommendedProductIds && aiResponse.recommendedProductIds.length > 0) {
                await sendRecommendedProductPhotos(senderId, aiResponse.recommendedProductIds);
              } else {
                // Фоллбек на старый метод, если массив ID пуст
                await detectAndSendProductPhotos(senderId, aiResponse.reply, text);
              }
            } else {
              console.log('🔇 Агент отключен или не вернул ответ, сообщение проигнорировано.');
            }
          }
        } catch (eventError) {
          // Изолируем ошибки — одно сломанное сообщение не убивает весь батч
          console.error('❌ Ошибка обработки события:', eventError);
        }
      }
    }
  } catch (error) {
    console.error('❌ Ошибка в фоновой задаче:', error);
  }
}

// POST: Прием сообщений от реальных людей
export async function POST(request: Request) {
  // ВАЖНО: Meta требует ответ 200 немедленно, иначе повторяет запрос и может отключить вебхук
  try {
    const body = await request.json();
    console.log('📬 Webhook получен:', JSON.stringify(body).slice(0, 500));

    if (body.object === 'instagram' || body.object === 'page') {
      
      // Обязательно ждем завершения обработки вебхука на Vercel (Serverless),
      // иначе Vercel заморозит функцию до завершения асинхронных запросов к Gemini и Instagram.
      await processWebhookInBackground(body);

      // Всегда возвращаем 200 чтобы Meta не повторяла запрос
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      console.log('⚠️ Неизвестный объект:', body.object);
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }
  } catch (error) {
    console.error('❌ Критическая ошибка вебхука:', error);
    // Даже при ошибке возвращаем 200 чтобы Meta не флудила повторами
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  }
}
