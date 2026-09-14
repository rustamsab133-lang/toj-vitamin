import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getRelevantProducts } from '@/lib/agents/vectorSearch';
import { checkRateLimit, getClientIP, DEFAULT_RATE_LIMIT } from '@/lib/rateLimit';
import { getActiveProducts } from '@/lib/agents/shared/catalogBuilder';
import { formatCatalogProducts, getCachedSettings, getSetting } from '@/lib/agents/shared/catalogBuilder';
import {
  AGENT_MODEL,
  MAX_MESSAGE_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_RELEVANT_PRODUCTS,
  sanitizeUserMessage,
  isValidPhone,
  safeErrorMessage,
} from '@/lib/agents/shared/config';

// Регулярное выражение для валидации UUID
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// --- System instruction (статическая часть промпта, кешируется Gemini) ---
const SYSTEM_RULES = `
ПРАВИЛА ОФОРМЛЕНИЯ ЗАКАЗА И ПОВЕДЕНИЯ:
1. Если клиент хочет совершить покупку (например: "хочу купить", "оформи заказ", "возьму это"), но ЕЩЕ не написал свой номер телефона, ты ОБЯЗАН вежливо попросить его написать телефон. В этом случае НЕ заполняй поле "create_order".
2. Если у тебя есть телефон клиента И клиент хочет заказать товары, ты ОБЯЗАН заполнить поле "create_order" в JSON.
3. Товары для поля "create_order" бери из Корзины Клиента (если клиент говорит "оформи корзину") или из обсуждаемых товаров каталога (точные id и цены).
4. Если клиент спрашивает, как принимать препарат, сколько капсул в день пить, какова продолжительность курса или есть ли противопоказания, СТРОГО называй официальную "Инструкцию производителя GLS" из предоставленного ниже каталога (дозировку, когда принимать и длительность курса).

ФОРМАТ ОТВЕТА:
Ты обязан вернуть ответ СТРОГО в виде JSON-объекта со следующей структурой:
{
  "reply": "Твой ответ клиенту на его языке длиной 2-4 предложения (максимум 60 слов).",
  "recommended_product_ids": ["список ID рекомендованных продуктов из каталога"],
  "create_order": {
    "phone": "номер телефона клиента (только если он есть в переписке)",
    "items": [
      { "id": "ID товара", "name": "Название товара", "price": цена_числом, "quantity": количество }
    ]
  }
}
Поле "create_order" добавляется ТОЛЬКО когда заказ реально оформляется (есть телефон И согласие). В остальных случаях установи в null.
Убедись, что JSON валидный и не содержит Markdown-разметки.`;

const DEFAULT_SYSTEM_INSTRUCTION = `Ты — ИИ-консультант премиального интернет-магазина витаминов "TOJ-VITAMIN" в Таджикистане.
Твоя задача — вежливо, профессионально и кратко отвечать клиентам в чате на сайте, помогать с выбором витаминов из каталога под их жалобы и боли, объяснять синергию продуктов и помогать оформить заказ.
Отвечай ОЧЕНЬ КОРОТКО (2-4 предложения, максимум 60 слов).
Пиши приветствие ("Салом!", "Привет!" и т.д.) ТОЛЬКО в самом первом сообщении диалога. Если в истории переписки уже есть предыдущие сообщения, НИКОГДА не здоровайся заново.`;

const SYSTEM_INSTRUCTION = `${DEFAULT_SYSTEM_INSTRUCTION}\n\n${SYSTEM_RULES}`;

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const ip = getClientIP(request);
    const rl = checkRateLimit(`webchat:${ip}`, DEFAULT_RATE_LIMIT);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: `Слишком много запросов. Подождите ${rl.resetIn} сек.` },
        { status: 429 }
      );
    }

    const { message, chatId, cartItems, quizResult, cartItemsRaw } = await request.json() as {
      message: string;
      chatId?: string | null;
      cartItems?: string;
      quizResult?: string;
      cartItemsRaw?: Array<{ id: string; name: string; price: number; quantity: number }>;
    };

    // 2. Sanitize and validate input
    const sanitizedMessage = sanitizeUserMessage(message);
    if (!sanitizedMessage || sanitizedMessage.length === 0) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    // 3. Поиск или создание чата
    let chat: any = null;
    if (chatId && uuidRegex.test(chatId)) {
      const { data } = await supabaseAdmin.from('agent_chats').select('*').eq('id', chatId).single();
      chat = data;
    }

    if (!chat) {
      // Создаем новый сессионный чат с отметкой, что это веб-сайт
      const { data, error } = await supabaseAdmin
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

    // 4. Базовый предохранитель от двойных кликов
    const { data: recentMessages } = await supabaseAdmin
      .from('agent_messages')
      .select('message_text, created_at')
      .eq('chat_id', currentChatId)
      .eq('sender', 'user')
      .order('created_at', { ascending: false })
      .limit(1);

    if (recentMessages && recentMessages.length > 0) {
      const lastMsg = recentMessages[0];
      const timeDiff = Date.now() - new Date(lastMsg.created_at).getTime();
      if (lastMsg.message_text === sanitizedMessage && timeDiff < 2000) {
        return NextResponse.json({ success: false, error: 'Duplicate click ignored' }, { status: 429 });
      }
    }

    // 5. Сохраняем сообщение пользователя
    await supabaseAdmin.from('agent_messages').insert({
      chat_id: currentChatId,
      sender: 'user',
      message_text: sanitizedMessage
    });

    // 6. Подтягиваем историю сообщений чата (ограничено)
    let historyText = 'Нет истории диалога.';
    const { data: messagesHistory } = await supabaseAdmin
      .from('agent_messages')
      .select('sender, message_text')
      .eq('chat_id', currentChatId)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY_MESSAGES);

    if (messagesHistory && messagesHistory.length > 0) {
      historyText = messagesHistory
        .reverse()
        .map((m: any) => `${m.sender === 'user' ? 'Клиент' : 'Бот'}: ${m.message_text}`)
        .join('\n');
    }

    // 7. Загружаем настройки (кешированные)
    const settings = await getCachedSettings();
    const chatLang = getSetting(settings, 'instagram_agent_chat_lang', 'auto');

    // 8. Векторный RAG-поиск релевантных товаров (кешированные продукты)
    const activeProducts = await getActiveProducts();
    const relevantProducts = await getRelevantProducts(sanitizedMessage, activeProducts, MAX_RELEVANT_PRODUCTS);
    const catalog = await formatCatalogProducts(relevantProducts);

    // 9. Инструкции по языку общения
    let langInstruction = '';
    if (chatLang === 'tj') {
      langInstruction = 'ВНИМАНИЕ: Общайся ИСКЛЮЧИТЕЛЬНО на таджикском языке.';
    } else if (chatLang === 'ru') {
      langInstruction = 'ВНИМАНИЕ: Общайся ИСКЛЮЧИТЕЛЬНО на русском языке.';
    } else {
      langInstruction = 'ВНИМАНИЕ: Определи язык последнего сообщения клиента. Если клиент написал на таджикском языке, ты обязан отвечать СТРОГО на таджикском. Если на русском — СТРОГО на русском. Язык ответа должен ВСЕГДА совпадать с языком вопроса клиента.';
    }

    // 10. Подгружаем активный A/B промпт или используем системную инструкцию
    const { data: activePrompts } = await supabaseAdmin.from('agent_prompts').select('id, prompt_text').eq('is_active', true);

    let selectedPromptId: string | null = null;
    let customPromptText: string | null = null;

    if (activePrompts && activePrompts.length > 0) {
      const selected = activePrompts[Math.floor(Math.random() * activePrompts.length)];
      selectedPromptId = selected.id;
      customPromptText = selected.prompt_text
        .replace(/в Instagram Direct/gi, 'в чате на сайте')
        .replace(/Instagram Direct/gi, 'чат на сайте')
        .replace(/в Инстаграме/gi, 'на сайте');
    }

    const cartItemsRawText = cartItemsRaw && cartItemsRaw.length > 0
      ? JSON.stringify(cartItemsRaw, null, 2)
      : 'Корзина пуста';

    // 11. Формируем динамическую часть промпта (user message)
    const userPrompt = `${langInstruction}

Каталог в наличии на складе:
${catalog}

Текущее состояние корзины клиента:
${cartItemsRawText}

Результаты теста здоровья клиента: ${quizResult || 'Тест не пройден'}

Краткое саммари о пользователе: ${chat.summary || 'Нет данных'}

История недавнего диалога:
${historyText}

Клиент: "${sanitizedMessage}"

Бот:`;

    // 12. Запрос к Gemini — используем systemInstruction для статических правил
    const finalSystemInstruction = customPromptText
      ? `${customPromptText}\n\n${SYSTEM_RULES}`
      : SYSTEM_INSTRUCTION;

    const model = genAI.getGenerativeModel({
      model: AGENT_MODEL,
      systemInstruction: finalSystemInstruction,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
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
      reply = parsed.reply || parsed.response || parsed.message || parsed.text || '';
      recommendedProductIds = parsed.recommended_product_ids || parsed.product_ids || parsed.products || [];
      createOrderData = parsed.create_order || parsed.order;
    } catch (e) {
      console.error('❌ Ошибка парсинга JSON ответа Gemini:', e, responseText);
      reply = responseText; // Фоллбек на весь текст, если не удалось распарсить JSON
    }

    if (!reply || reply.trim().length === 0) {
      reply = chatLang === 'tj'
        ? 'Салом! Ман метавонам ба шумо дар интихоби витаминҳо кӯмак кунам. Шуморо кадом масъала ё мақсад нигарон мекунад?'
        : 'Здравствуйте! Я помогу вам подобрать витамины. Расскажите, какая у вас цель или жалоба?';
    }

    // 13. Если ИИ решил создать заказ — валидируем телефон
    if (createOrderData && createOrderData.phone && createOrderData.items && createOrderData.items.length > 0) {
      const phoneClean = String(createOrderData.phone).trim();

      if (!isValidPhone(phoneClean)) {
        console.warn('⚠️ Невалидный номер телефона от ИИ:', phoneClean);
        // Не создаём заказ с невалидным номером
      } else {
        try {
          // Вычисляем сумму
          const total = createOrderData.items.reduce((acc: number, item: any) => {
            return acc + (Number(item.price) || 0) * (Number(item.quantity) || 1);
          }, 0);

          // Вставляем заказ в Supabase
          const { data: newOrder, error: orderError } = await supabaseAdmin
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
              phone: phoneClean,
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
    }

    // 14. Сохраняем ответ бота в базу (с ID промпта для A/B аналитики)
    await supabaseAdmin.from('agent_messages').insert({
      chat_id: currentChatId,
      sender: 'bot',
      message_text: reply,
      ...(selectedPromptId ? { metadata: { prompt_id: selectedPromptId } } : {})
    });

    // Обновляем метку времени чата
    await supabaseAdmin.from('agent_chats').update({ updated_at: new Date().toISOString() }).eq('id', currentChatId);

    return NextResponse.json({
      success: true,
      reply,
      chatId: currentChatId,
      recommendedProductIds
    });

  } catch (error: any) {
    console.error('❌ Ошибка в роуте веб-чата:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
