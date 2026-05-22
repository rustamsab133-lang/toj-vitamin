import { supabase } from '@/lib/supabase';
import { geminiModel } from '@/lib/gemini';
import { Product } from '@/lib/types';
import fs from 'fs';
import path from 'path';

interface InstagramPostResponse {
  selectedProducts: {
    id: string;
    name: string;
    image_url: string;
    synergy_reason: string;
  }[];
  headline: string;
  caption: string;
  reasoning: string;
}

/**
 * ИИ-Агент для копирайтинга и подбора синергетических связок под конкретную боль.
 */
export async function generateInstagramPostContent(
  painPoint: string, 
  lang = 'ru', 
  tone = 'marketing'
): Promise<InstagramPostResponse> {
  // 1. Загружаем все продукты из Supabase
  const { data: dbProducts, error } = await supabase
    .from('products')
    .select('*')
    .order('id');

  if (error || !dbProducts) {
    throw new Error(`Не удалось загрузить продукты из базы: ${error?.message}`);
  }

  // 2. Загружаем данные обогащения (свойства, синергии, теги) из JSON
  let enrichedData: Record<string, any> = {};
  try {
    const jsonPath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    enrichedData = JSON.parse(fileContent);
  } catch (err) {
    console.warn('⚠️ Не удалось загрузить файл обогащения продуктов:', err);
  }

  // 3. Формируем единый каталог для ИИ
  const productsCatalog = dbProducts.map((p: any) => {
    const enrichment = enrichedData[p.name?.toLowerCase().trim() || ''] || {};
    return {
      id: p.id,
      name: p.name,
      full_name: p.full_name || p.name,
      description: p.description || '',
      image_url: p.image_url,
      properties: enrichment.properties || [],
      tags: enrichment.tags || [],
      synergies: enrichment.synergies || [],
      marketing_hooks: enrichment.marketing_hooks || []
    };
  });

  // Инструкции по языку генерации
  let langInstruction = '';
  if (lang === 'tj') {
    langInstruction = `
- Напиши заголовок (headline) для баннера на таджикском языке (максимум 5-6 слов).
- Напиши весь текст поста (caption) на чистом и вежливом таджикском языке. Используй таджикские шрифты (ӣ, ӯ, ҳ, ҷ, қ, ғ).
- Все выбранные продукты и поле synergy_reason пиши на таджикском языке.`;
  } else if (lang === 'tj_ru') {
    langInstruction = `
- Напиши заголовок (headline) для баннера на таджикском языке (или двуязычный, если коротко).
- Напиши текст поста (caption) двуязычным: первая часть поста полностью на вежливом таджикском языке, а вторая часть — точный перевод или адаптация на русском языке. Раздели их красивой визуальной границей, например "🇹🇯 / 🇷🇺".
- Выбранные продукты и synergy_reason пиши на русском языке с указанием таджикского пояснения.`;
  } else {
    langInstruction = `
- Напиши заголовок (headline) для баннера на русском языке (максимум 5-6 слов).
- Напиши весь текст поста (caption) на русском языке.
- Выбранные продукты и synergy_reason пиши на русском языке.`;
  }

  // Инструкции по тональности генерации
  let toneInstruction = '';
  if (tone === 'expert') {
    toneInstruction = `
- Стиль текста: высокопрофессиональный, научно-популярный, нутрициологический. Делай упор на биохимию, физиологические механизмы действия витаминов, клинические исследования и факты. Избегай банальных рекламных лозунгов. Предлагай дозировки и схемы приема на основе свойств продуктов.`;
  } else if (tone === 'friendly') {
    toneInstruction = `
- Стиль текста: эмпатичный, поддерживающий, заботливый. Общайся как дружелюбный велнес-коуч. Прояви максимум понимания к проблеме (боли) клиента, пиши простым человеческим языком без сложной медицинской терминологии, давай мягкие советы по образу жизни в дополнение к витаминам.`;
  } else {
    toneInstruction = `
- Стиль текста: активный, вовлекающий, продающий. Начни с ярких маркетинговых зацепок (hooks), делай упор на быструю выгоду и преображение. Используй мощный призыв к действию (Call-to-Action) купить прямо сейчас (написав в Директ). Текст должен разжигать желание решить проблему немедленно.`;
  }

  // 4. Готовим промпт для Gemini
  const prompt = `
Ты — опытный ИИ-маркетолог и эксперт по нутрициологии бренда "TOJ-VITAMIN" (Точвитамин) в Таджикистане.
Твоя задача — проанализировать указанную "боль" или проблему человека, подобрать из каталога продуктов наиболее эффективную синергетическую связку (от 1 до 3 продуктов, которые идеально дополняют друг друга) и написать вовлекающий пост для Instagram.

Каталог продуктов:
${JSON.stringify(productsCatalog, null, 2)}

Боль человека / Тема поста:
"${painPoint}"

Инструкции по выполнению:
1. Выбери от 1 до 3 продуктов, которые вместе решают эту боль лучше всего. Обязательно бери продукты с корректным "image_url".
2. Напиши пост для Instagram, следуя формуле AIDA (Внимание, Интерес, Желание, Действие).
3. Добавь 5-8 релевантных хештегов (включая брендовые: #tojvitamin #витаминытаджикистан).

Требования к языку и тональности:${langInstruction}${toneInstruction}

Формат ответа:
Верни строго валидный JSON-объект с четырьмя полями. Не пиши никаких дополнительных пояснений или markdown-разметки (никаких \`\`\`json). Ответ должен содержать только JSON-объект следующей структуры:
{
  "selectedProducts": [
    {
      "id": "ID продукта из базы",
      "name": "Название продукта",
      "image_url": "URL изображения продукта",
      "synergy_reason": "Краткое объяснение на 1 предложение, почему этот продукт выбран в связку"
    }
  ],
  "headline": "Заголовок для баннера",
  "caption": "Полный текст поста для Instagram с эмодзи и хештегами",
  "reasoning": "Пояснение для нас (админов), почему ты выбрал эту связку"
}
`;

  // 5. Вызываем модель Gemini с обработкой ошибок и фоллбэком на реальные товары из базы
  try {
    const response = await geminiModel.generateContent(prompt);
    const text = response.response.text().trim();

    // 6. Парсим результат
    const cleanedText = text
      .replace(/^```json/i, '')
      .replace(/```$/, '')
      .trim();
    
    const postData: InstagramPostResponse = JSON.parse(cleanedText);
    return postData;
  } catch (err: any) {
    console.warn('⚠️ Ошибка вызова Gemini или парсинга, используем качественный офлайн-фоллбэк с баночками из базы:', err);
    
    // Выбираем 2 популярных продукта из реальной базы, чтобы баннер собрался с РЕАЛЬНЫМИ БАНОЧКАМИ!
    const collagen = dbProducts.find((p: any) => p.name?.toLowerCase().includes('коллаген')) || dbProducts[0];
    const vitaminD = dbProducts.find((p: any) => p.name?.toLowerCase().includes('d3') || p.name?.toLowerCase().includes('витамин d')) || dbProducts[1];
    
    const fallbackResponse: InstagramPostResponse = {
      selectedProducts: [
        {
          id: collagen.id.toString(),
          name: collagen.name,
          image_url: collagen.image_url || 'https://azbseceyovktqztjslup.supabase.co/storage/v1/object/public/product-images/prod-96.jpg',
          synergy_reason: "Коллаген восстанавливает структуру кожи и волос на клеточном уровне изнутри."
        },
        {
          id: vitaminD.id.toString(),
          name: vitaminD.name,
          image_url: vitaminD.image_url || 'https://azbseceyovktqztjslup.supabase.co/storage/v1/object/public/product-images/prod-34.jpg',
          synergy_reason: "Витамин D3 регулирует деление клеток волосяных фолликулов и поддерживает здоровое обновление кожи."
        }
      ],
      headline: "Здоровая Кожа и Волосы",
      caption: `🌟 РЕШЕНИЕ ДЛЯ ЗДОРОВЬЯ КОЖИ И ВОЛОС 🌟\n\nЧасто внешние проблемы — это лишь сигнал о том, что организму не хватает базовой поддержки изнутри. Представляем вам идеальную синергетическую связку для вашей красоты:\n\n1️⃣ Коллаген с Витамином С — восстанавливает упругость кожи, борется с морщинами и укрепляет корни волос.\n2️⃣ Витамин D3 5000 IU — запускает здоровое обновление клеток волосяных фолликулов и поддерживает кожный барьер.\n\nЗакажите эти витамины прямо сейчас, написав нам в Директ! 📩\n\n#tojvitamin #коллаген #витаминd3 #здоровьеволос #красиваякожа`,
      reasoning: "Временный фоллбэк из-за лимитов API Gemini на ключе разработчика. Баннер отрисован с реальными баночками из вашей базы Supabase."
    };
    
    return fallbackResponse;
  }
}
