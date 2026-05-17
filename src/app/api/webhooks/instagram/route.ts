import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Генерация умного ответа через Gemini
async function generateAIResponse(userMessage: string) {
  try {
    // Используем самую умную модель (можно поменять на gemini-1.5-flash для скорости)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); 
    
    // СИСТЕМНЫЙ ПРОМПТ (Мозг нашего Агента)
    const prompt = `Ты - высококлассный врач-нутрициолог и консультант премиального интернет-магазина "Toj Vitamin" (Таджикистан). 
Твоя специализация - мужское здоровье и витаминные комплексы для улучшения потенции. 

Твои жесткие правила:
1. Пользователь пришел с рекламы в Instagram (где мы говорили о проблемах: стресс, возрастные изменения, сосуды, нехватка энергии).
2. Отвечай КОРОТКО (2-4 предложения макс), тактично и профессионально. Это чат в Инстаграме, люди не читают длинные тексты.
3. Прояви эмпатию. Если он написал кодовое слово (например "СИЛА" или "ТЕСТ") или просто поздоровался, мягко спроси, с чем именно он столкнулся (какие симптомы).
4. Если потребность понятна, расскажи, как витамины помогают (например, Омега-3 и L-Аргинин для сосудов), и предложи оформить заказ.
5. Общайся на уважительном русском языке.

Сообщение клиента: "${userMessage}"
Твой ответ:`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("❌ Ошибка Gemini API:", error);
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

// POST: Прием сообщений от реальных людей
export async function POST(request: Request) {
  // ВАЖНО: Meta требует ответ 200 немедленно, иначе повторяет запрос
  try {
    const body = await request.json();
    console.log('📬 Webhook получен:', JSON.stringify(body).slice(0, 500));

    if (body.object === 'instagram' || body.object === 'page') {
      
      // Используем for...of вместо forEach для корректной работы с async/await
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
              const aiReply = await generateAIResponse(text);
              
              // Шаг 2: Отвечаем клиенту в Директ
              await sendInstagramMessage(senderId, aiReply);
            }
          } catch (eventError) {
            // Изолируем ошибки — одно сломанное сообщение не убивает весь батч
            console.error('❌ Ошибка обработки события:', eventError);
          }
        }
      }

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
