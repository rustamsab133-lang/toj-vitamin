import { NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const password = request.headers.get('x-admin-password');
  const adminPass = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'toj2024';

  if (!password || password !== adminPass) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { products, prompt } = await request.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Products are required' }, { status: 400 });
    }

    const totalOriginalPrice = products.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    const productNamesList = products.map(p => `"${p.name}" (${p.price} TJS)`).join(', ');

    const systemPrompt = `Вы — ведущий маркетолог, эксперт по копирайтингу и конверсии для интернет-магазина витаминов TOJ-VITAMIN в Таджикистане.
Ваша задача — сгенерировать яркое продающее наполнение для рекламного "комбо-баннера", состоящего из следующих продуктов: ${productNamesList}.
Суммарная стоимость продуктов без скидки: ${totalOriginalPrice} сомони (TJS).

Дополнительные пожелания администратора: ${prompt || 'нет дополнительных пожеланий'}.

Вам необходимо сгенерировать следующие поля:
1. badge_ru / badge_tg — Краткая цепляющая плашка-статус (1-3 слова, например: "БЕСТСЕЛЛЕР GLS", "СУПЕР-КОМБО", "ДЛЯ МУЖЧИН", "АКТИВНЫЙ ДЕНЬ"). На таджикском пишите грамотно на кириллице (например "БЕСТСЕЛЛЕР", "МАҶМӮАИ СУПЕР", "БАРОИ МАРДОН").
2. title_ru / title_tg — Яркий, интригующий заголовок на русском и таджикском (2-4 слова).
3. subtitle_ru / subtitle_tg — Дополняющий заголовок на русском и таджикском (2-4 слова, начинающийся с символа "&" или "+").
4. desc_ru / desc_tg — Короткое продающее описание (до 15-20 слов), объясняющее синергию и пользу этого комбо для здоровья.
5. price — Рекомендованная пакетная цена комбо в сомони (целое число). Она должна быть со скидкой примерно 10-20% от оригинальной суммарной стоимости (${totalOriginalPrice} TJS). Например, если сумма 227 TJS, сделайте пакетную цену 190 TJS или 200 TJS.

Ответ должен быть строго в формате JSON, без какого-либо обрамления вроде markdown \`\`\`json:
{
  "badge_ru": "...",
  "badge_tg": "...",
  "title_ru": "...",
  "title_tg": "...",
  "subtitle_ru": "...",
  "subtitle_tg": "...",
  "desc_ru": "...",
  "desc_tg": "...",
  "price": 190
}`;

    const result = await geminiModel.generateContent(systemPrompt);
    const responseText = result.response.text().trim();
    
    // Find the JSON block
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Gemini не вернул валидный JSON. Текст ответа: ' + responseText);
    }

    const generatedData = JSON.parse(jsonMatch[0]);
    return NextResponse.json(generatedData);
  } catch (err: any) {
    console.error('Combo banner generation error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
