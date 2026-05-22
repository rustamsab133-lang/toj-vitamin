import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { name, fullName } = await request.json();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Product name is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
Ты — опытный ИИ-нутрициолог и эксперт бренда премиальных витаминов "TOJ-VITAMIN" в Таджикистане.
Тебе нужно составить качественное медицинское и нутрициологическое описание свойств, клинических синергий и тегов для продукта: "${name}" (Полное название: "${fullName || name}").

Верни строго валидный JSON-объект следующей структуры (не пиши ничего лишнего, никаких \`\`\`json, только чистый JSON):
{
  "name": "${name}",
  "properties": [
    "Список из 3-5 основных свойств, полезных эффектов, показаний на русском языке (краткие предложения, 5-10 слов)"
  ],
  "tags": [
    "1-3 тега категорий строго из этого списка: 'Иммунитет', 'Красота', 'Мозг', 'Антистресс', 'Похудение', 'Энергия', 'Сон'"
  ],
  "synergies": [
    "Список из 1-2 кратких предложений-рекомендаций: с какими другими популярными продуктами (например: Омега-3, Коллаген, Магний, Витамин С, Цинк) этот витамин образует клиническую синергию и почему это круто"
  ],
  "marketing_hooks": [
    "Список из 2-3 ярких рекламных зацепок или вопросов для постов в Instagram"
  ]
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleanedText = text.replace(/^```json/i, '').replace(/```$/, '').trim();
    const enrichData = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: enrichData });
  } catch (error: any) {
    console.error('❌ Error enriching product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
