import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';
import { getMarkupSettings, applyMarkupToPrice } from '@/lib/markup';

// Инициализация Gemini (модель возьмет ключ из process.env.GEMINI_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Ключи из настроек Meta
const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'my_super_secret_verify_token_123';
const PAGE_ACCESS_TOKEN = process.env.INSTAGRAM_PAGE_TOKEN || '';

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

// Функция для сборки компактного каталога со свойствами и синергиями (RAG)
async function loadEnrichedCatalog(): Promise<string> {
  try {
    // 1. Получаем активные товары из Supabase
    const { data: dbProducts } = await supabase
      .from('products')
      .select('*')
      .order('id');
    
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
      .filter((p: any) => p.price > 0 && !p.name.includes('[УДАЛЕН]'))
      .map((p: any) => {
        const enrich = enrichedData[p.name.toLowerCase().trim()] || {};
        const props = enrich.properties ? enrich.properties.join(', ') : 'Общее оздоровление';
        const tags = enrich.tags ? enrich.tags.join(', ') : 'Иммунитет';
        const synergies = enrich.synergies ? enrich.synergies.join('; ') : 'Отсутствует';
        
        // Apply pricing markup dynamically so AI directs clients to the marked up retail price
        const markedPrice = applyMarkupToPrice(Number(p.price) || 0, markupSettings);

        return `- ${p.name} (${p.full_name}): Цена: ${markedPrice} сомони. Свойства: [${props}]. Теги: [${tags}]. Синергия: [${synergies}]`;
      })
      .join('\n');

    return catalogString;
  } catch (error) {
    console.error('❌ Ошибка при сборке обогащенного каталога для RAG:', error);
    return 'Ошибка загрузки каталога.';
  }
}

// Генерация умного ответа через Gemini с инъекцией динамического каталога и промптов
async function generateAIResponse(senderId: string, userMessage: string): Promise<string | null> {
  try {
    // 1. Считываем настройки ИИ
    const { data: settingsData } = await supabase.from('site_settings').select('key, value');
    const getSetting = (key: string, def: string) => settingsData?.find((s: any) => s.key === key)?.value || def;

    if (getSetting('instagram_agent_active', 'true') !== 'true') {
      console.log('🔌 ИИ-Агент деактивирован. Игнорируем.');
      return null;
    }
    const chatLang = getSetting('instagram_agent_chat_lang', 'auto');

    // 2. Память (Memory)
    let { data: chat } = await supabase.from('agent_chats').select('*').eq('instagram_user_id', senderId).single();
    if (!chat) {
      const { data: newChat } = await supabase.from('agent_chats').insert({ instagram_user_id: senderId }).select().single();
      chat = newChat;
    }

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
    const fallbackPromptText = 'Ты — консультант "TOJ-VITAMIN". Отвечай кратко, предлагай витамины из предоставленного каталога в наличии, подбирай синергию.';
    let selectedPrompt = prompts && prompts.length > 0 ? prompts[Math.floor(Math.random() * prompts.length)] : null;
    
    // 4. Достаем золотые примеры
    const { data: goldenExamples } = await supabase.from('agent_golden_examples').select('*').limit(3);
    const goldenText = goldenExamples?.map((g: any) => `Пример запроса клиента: "${g.user_query}"\nИдеальный ответ бота: "${g.ideal_response}"`).join('\n\n') || '';

    // 5. Собираем каталог
    const catalog = await loadEnrichedCatalog();
    
    // 6. Инструкции по языку общения
    let langInstruction = '';
    if (chatLang === 'tj') langInstruction = 'ВНИМАНИЕ: Общайся ИСКЛЮЧИТЕЛЬНО на таджикском языке.';
    else if (chatLang === 'ru') langInstruction = 'ВНИМАНИЕ: Общайся ИСКЛЮЧИТЕЛЬНО на русском языке.';

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
Бот:`;

    // 8. Генерация
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text().trim();

    // 9. Логирование сообщений
    if (chat) {
      await supabase.from('agent_messages').insert([
        { chat_id: chat.id, sender: 'user', message_text: userMessage, prompt_id_used: selectedPrompt?.id },
        { chat_id: chat.id, sender: 'bot', message_text: reply, prompt_id_used: selectedPrompt?.id }
      ]);
      await supabase.from('agent_chats').update({ updated_at: new Date().toISOString() }).eq('id', chat.id);
    }

    return reply;
  } catch (error) {
    console.error("❌ Ошибка Gemini API в Direct:", error);
    return "К сожалению, система сейчас перегружена. Пожалуйста, напишите нам чуть позже, и наш специалист обязательно вас проконсультирует!";
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
            console.log(`📩 НОВОЕ СООБЩЕНИЕ [ID: ${senderId}]: ${text}`);
            
            // Шаг 1: Думаем с помощью Gemini
            const aiReply = await generateAIResponse(senderId, text);
            
            // Шаг 2: Отвечаем клиенту в Директ (только если ответ получен и агент активен)
            if (aiReply) {
              await sendInstagramMessage(senderId, aiReply);
            } else {
              console.log('🔇 Агент отключен, сообщение проигнорировано.');
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
