import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { getMarkupSettings, applyMarkupToPrice } from '@/lib/markup';

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

// Загрузка каталога с наценками
async function loadCatalog(): Promise<string> {
  try {
    const { data: dbProducts } = await supabase.from('products').select('*').order('id');
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
      .filter((p: any) => p.price > 0 && !p.name.includes('[УДАЛЕН]'))
      .map((p: any) => {
        const enrich = findEnrichmentForProduct(p.name, enrichedData);
        const props = enrich.properties ? enrich.properties.join(', ') : 'Общее оздоровление';
        const synergies = enrich.synergies ? enrich.synergies.join('; ') : 'Отсутствует';
        
        const markedPrice = applyMarkupToPrice(Number(p.price) || 0, markupSettings);
        return `- ${p.name} (${p.full_name}): Цена: ${markedPrice} сомони. Свойства: [${props}]. Синергия: [${synergies}]`;
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
    const { message, chatId } = await request.json() as { message: string; chatId?: string | null };

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
    const catalog = await loadCatalog();

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

    const fullPrompt = `${basePrompt}
${langInstruction}

Каталог в наличии на складе:
${catalog}

Краткое саммари о пользователе: ${chat.summary || 'Нет данных'}

История недавнего диалога (учитывай её при ответе!):
${historyText}

Клиент: "${message}"
Бот:`;

    // 8. Запрос к Gemini 3.1 Flash Lite
    const model = genAI.getGenerativeModel({ model: 'models/gemini-3.1-flash-lite' });
    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text().trim();

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
      chatId: currentChatId
    });

  } catch (error: any) {
    console.error('❌ Ошибка в роуте веб-чата:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
