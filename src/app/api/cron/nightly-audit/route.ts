import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET(request: Request) {
  try {
    // В реальном проекте здесь должна быть проверка API-ключа или заголовка Vercel Cron
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    console.log('🔄 Запуск Ночного Аудита чатов (Агент-Аналитик)...');

    // 1. Находим чаты, которые были обновлены за последние 24 часа
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: recentChats, error: chatsError } = await supabase
      .from('agent_chats')
      .select('id, instagram_user_id, summary')
      .gte('updated_at', yesterday.toISOString());

    if (chatsError) throw chatsError;

    if (!recentChats || recentChats.length === 0) {
      return NextResponse.json({ message: 'Нет новых чатов для анализа.' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" }); // Используем быструю модель для аналитики

    let auditedCount = 0;

    // 2. Для каждого чата достаем сообщения и делаем summary
    for (const chat of recentChats) {
      const { data: messages } = await supabase
        .from('agent_messages')
        .select('sender, message_text, created_at')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true }); // Весь диалог с начала до конца

      if (!messages || messages.length === 0) continue;

      const chatTranscript = messages
        .map(m => `[${new Date(m.created_at).toLocaleTimeString()}] ${m.sender === 'user' ? 'Клиент' : 'Бот'}: ${m.message_text}`)
        .join('\n');

      const prompt = `Ты — Агент-Аналитик премиального магазина витаминов "TOJ-VITAMIN".
Тебе передана история диалога между Клиентом и нашим Ботом (или текущая память о клиенте).
Твоя задача: составить ультра-краткое SUMMARY (память) об этом клиенте, чтобы при следующем обращении бот сразу вспомнил его контекст.

Предыдущая память об этом клиенте (если была):
${chat.summary || 'Пусто'}

Свежая история диалога:
${chatTranscript}

Напиши обновленную память (summary) об этом клиенте в 1-3 предложениях. Укажи его основные жалобы (боли), что он купил или чем интересовался. Пиши от 3-го лица (например: "Клиент интересовался витамином Д, жалуется на суставы. Купил Коллаген."). Если клиент просто сказал "спасибо", сохрани прошлую память, немного обновив ее.

Твоя обновленная память:`;

      try {
        const result = await model.generateContent(prompt);
        const newSummary = result.response.text().trim();

        // 3. Сохраняем обновленное summary обратно в базу
        await supabase
          .from('agent_chats')
          .update({ summary: newSummary })
          .eq('id', chat.id);

        auditedCount++;
      } catch (geminiError) {
        console.error(`Ошибка анализа чата ${chat.id}:`, geminiError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Ночной аудит завершен. Проанализировано чатов: ${auditedCount}`,
    });

  } catch (error: any) {
    console.error('❌ Критическая ошибка в ночном аудите:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
