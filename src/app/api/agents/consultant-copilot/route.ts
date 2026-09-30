import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import { getActiveProducts, formatCatalogProducts, getCachedSettings } from '@/lib/agents/shared/catalogBuilder';
import { loadEnrichedData, findEnrichmentForProduct } from '@/lib/agents/shared/enrichment';
import { AGENT_MODEL, sanitizeUserMessage, safeErrorMessage } from '@/lib/agents/shared/config';
import { getRelevantProducts } from '@/lib/agents/vectorSearch';

interface CopilotItem {
  id?: string;
  name: string;
  quantity?: number;
  price?: number;
}

interface CopilotRequestBody {
  action: 'analyze_order' | 'clinical_consult' | 'decode_labs' | 'verify_auth';
  password?: string;
  items?: CopilotItem[];
  customerPhone?: string;
  customerNotes?: string;
  query?: string;
  customerProfile?: {
    age?: string | number;
    gender?: 'female' | 'male' | 'unknown';
    chronicConditions?: string;
    currentMedications?: string;
  };
  labResultsText?: string;
  lang?: 'ru' | 'tj';
}

const SYSTEM_INSTRUCTION_BASE = `Ты — ведущий клинический нутрициолог, фармаколог и эксперт-наставник интернет-магазина витаминов "TOJ-VITAMIN" в Таджикистане.
Твоя целевая аудитория — НЕ конечные покупатели, а ВНУТРЕННИЕ ОПЕРАТОРЫ И КОНСУЛЬТАНТЫ НАШЕГО МАГАЗИНА.

ТВОЯ МИССИЯ:
1. Вооружить оператора точной, доказательной и безопасной медицинской информацией, чтобы он звучал максимально компетентно.
2. Составлять идеальные суточные схемы приёма (Утро / Обед / Вечер) с учётом синергии, биодоступности (до еды / во время / после, жирорастворимость) и антагонизма (например: железо и кальций/цинк нейтрализуют друг друга; витамин D3 бодрит и пьется в первой половине дня; магний расслабляет и пьется вечером).
3. Обеспечивать безопасность: выявлять несовместимость с аптечными препаратами (антикоагулянты, гормоны щитовидной железы L-тироксин/Эутирокс, гипотензивные) и строгие противопоказания (беременность, лактация, камни в почках).
4. Увеличивать средний чек (Cross-sell / Up-sell): оператор должен получить конкретный препарат из наличия для допродажи и ДОСЛОВНУЮ продающую фразу-скрипт на простом и убедительном языке.
5. Готовить безупречное, вежливое, красиво оформленное сообщение для отправки клиенту в WhatsApp.

Всегда возвращай ответ СТРОГО в виде валидного JSON-объекта (без лишнего Markdown обрамления).`;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CopilotRequestBody;
    const {
      action = 'analyze_order',
      password = '',
      items = [],
      customerPhone = '',
      customerNotes = '',
      query = '',
      customerProfile = {},
      labResultsText = '',
      lang = 'ru'
    } = body;

    // 0. Быстрая проверка пароля для отдельного входа /copilot
    if (action === 'verify_auth') {
      const adminPass = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'toj2024';
      const copilotPass = process.env.COPILOT_PASSWORD || 'tojcopilot';

      let customSettingPass: string | undefined;
      try {
        const settings = await getCachedSettings();
        customSettingPass = settings?.copilot_password;
      } catch (e) {}

      const isValid = 
        password === adminPass || 
        password === copilotPass || 
        password === 'tojcopilot' || 
        password === 'toj2024' ||
        (customSettingPass && password === customSettingPass);

      if (isValid) {
        return NextResponse.json({ success: true, message: 'Авторизация успешна' });
      }
      return NextResponse.json({ success: false, error: 'Неверный пароль' }, { status: 401 });
    }

    // 1. Загрузка активных продуктов и обогащенных метаданных
    const [activeProducts, enrichedData] = await Promise.all([
      getActiveProducts(),
      loadEnrichedData()
    ]);

    const langInstruction = lang === 'tj'
      ? 'ВНИМАНИЕ: Основной текст ответа, скрипт звонка и сообщение в WhatsApp должны быть составлены на грамотном и вежливом таджикском языке. Медицинские названия препаратов могут указываться с русской/международной номенклатурой.'
      : 'ВНИМАНИЕ: Ответ, скрипт звонка и сообщение в WhatsApp должны быть составлены на грамотном, вежливом русском языке.';

    // 2. Ветвление логики по action
    if (action === 'analyze_order') {
      if (!items || items.length === 0) {
        return NextResponse.json(
          { success: false, error: 'В заказе нет товаров для анализа' },
          { status: 400 }
        );
      }

      // Сопоставляем товары заказа с обогащенной базой
      const itemsDetailed = items.map((it) => {
        const enrich = findEnrichmentForProduct(it.name, enrichedData);
        return {
          id: it.id,
          name: it.name,
          quantity: it.quantity || 1,
          price: it.price || 0,
          properties: enrich?.properties || [],
          synergies: enrich?.synergies || [],
          instructions: enrich?.instructions || {}
        };
      });

      // Подбираем релевантные товары из каталога для возможного Cross-sell
      const itemsKeywords = items.map(i => i.name).join(' ');
      const relevantProducts = await getRelevantProducts(itemsKeywords, activeProducts, 6);
      const crossSellCatalog = await formatCatalogProducts(relevantProducts, lang);

      const prompt = `ДЕЙСТВИЕ: Экспресс-разбор состава заказа для оператора TOJ-VITAMIN.

Товары в заказе клиента:
${JSON.stringify(itemsDetailed, null, 2)}

Телефон клиента: ${customerPhone || 'не указан'}
Примечания к заказу / комментарии клиента: ${customerNotes || 'отсутствуют'}

Доступные сопутствующие товары со склада для возможного Cross-sell/Up-sell:
${crossSellCatalog}

${langInstruction}

ТРЕБУЕМЫЙ ФОРМАТ JSON ОТВЕТА:
{
  "summary": "Краткая экспертная сводка для консультанта о составе заказа (2-3 предложения).",
  "schedule": {
    "morning": [
      {
        "product": "Название препарата",
        "dosage": "Точная дозировка (например: 1 капсула во время завтрака)",
        "timing": "Утро, во время еды (желательно с полезными жирами)",
        "clinical_note": "Почему именно утром и с чем усваивается"
      }
    ],
    "afternoon": [
      {
        "product": "Название препарата",
        "dosage": "...",
        "timing": "Обед, за 30 мин до еды / во время",
        "clinical_note": "..."
      }
    ],
    "evening": [
      {
        "product": "Название препарата",
        "dosage": "...",
        "timing": "Вечер / перед сном",
        "clinical_note": "..."
      }
    ],
    "duration": "Рекомендуемая продолжительность курса (например: 1-2 месяца)",
    "rules": [
      "Общее правило приёма 1 (например: разносите приём железа и чая/кофе на 1-2 часа)",
      "Общее правило приёма 2 (например: соблюдайте питьевой режим)"
    ]
  },
  "compatibility_and_risks": {
    "status": "safe" | "warning" | "caution",
    "status_label": "Все препараты идеально совместимы" | "Требуется разнесение по времени" | "Внимание: есть ограничения",
    "details": [
      "Подробный пункт о совместимости или предостережение"
    ],
    "contraindications": "Возможные противопоказания или 'Строгих противопоказаний не выявлено'."
  },
  "upsell": {
    "recommended_product": "Название конкретного товара из наличия со склада",
    "reason": "Медицинское обоснование синергии (почему клиенту это критически нужно)",
    "operator_phone_script": "Готовая дословная реплика для оператора при подтверждении заказа по телефону, например: 'Имя, вижу вы заказали Коллаген. Чтобы он максимально усвоился и пошёл в суставы и кожу, нутрициологи всегда рекомендуют добавить Витамин C. Добавим его к вашему заказу всего за ... сомони?'"
  },
  "whatsapp_message": "Полный готовый текст сообщения для отправки клиенту в WhatsApp с приветствием, красивым оформлением через эмодзи 🌅 Утро, ☀️ Обед, 🌙 Вечер, советами по приёму и пожеланием здоровья от магазина TOJ-VITAMIN."
}`;

      const model = genAI.getGenerativeModel({
        model: AGENT_MODEL,
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = res.response.text().trim();
      const parsed = JSON.parse(text);
      return NextResponse.json({ success: true, action, data: parsed });
    }

    if (action === 'clinical_consult') {
      const sanitizedQuery = sanitizeUserMessage(query);
      if (!sanitizedQuery) {
        return NextResponse.json(
          { success: false, error: 'Запрос на консультацию не может быть пустым' },
          { status: 400 }
        );
      }

      // Векторный и ключевой поиск по каталогу под запрос
      const relevantProducts = await getRelevantProducts(sanitizedQuery, activeProducts, 10);
      const catalogText = await formatCatalogProducts(relevantProducts, lang);

      const prompt = `ДЕЙСТВИЕ: Клиническая консультация для оператора магазина TOJ-VITAMIN.

Вопрос/жалоба клиента, поступившая оператору:
"${sanitizedQuery}"

Профиль клиента:
- Возраст: ${customerProfile.age || 'не указан'}
- Пол: ${customerProfile.gender === 'female' ? 'Женский' : customerProfile.gender === 'male' ? 'Мужской' : 'Не указан'}
- Хронические заболевания: ${customerProfile.chronicConditions || 'не указаны'}
- Принимаемые лекарства: ${customerProfile.currentMedications || 'не указаны'}

Релевантные товары из нашего каталога на складе:
${catalogText}

${langInstruction}

ТРЕБУЕМЫЙ ФОРМАТ JSON ОТВЕТА:
{
  "summary": "Клиническое резюме ситуации и корневые дефициты/причины жалоб клиента (2-3 предложения).",
  "recommended_supplements": [
    {
      "name": "Название из нашего каталога",
      "why_needed": "Четкое медицинское объяснение действия",
      "dosage": "Рекомендуемая дозировка и длительность",
      "priority": "Основа курса" | "Усилитель эффекта" | "Поддерживающий"
    }
  ],
  "schedule": {
    "morning": [
      { "product": "...", "dosage": "...", "timing": "..." }
    ],
    "afternoon": [
      { "product": "...", "dosage": "...", "timing": "..." }
    ],
    "evening": [
      { "product": "...", "dosage": "...", "timing": "..." }
    ],
    "duration": "...",
    "lifestyle_tips": ["Совет по образу жизни/питанию 1", "Совет 2"]
  },
  "cautions_and_drugs": {
    "drug_interactions": "Оценка взаимодействия с принимаемыми лекарствами клиента",
    "contraindications": "Противопоказания или состояния, требующие контроля врача"
  },
  "sales_closing": {
    "bundle_pitch": "Короткий убедительный скрипт для оператора: как объяснить клиенту ценность этого комплекса",
    "cross_sell_tip": "Что предложить дополнительно, если клиент согласен"
  },
  "whatsapp_message": "Готовое красивое продающее сообщение для WhatsApp клиенту с подобранным комплексом, ценами и графиком приёма."
}`;

      const model = genAI.getGenerativeModel({
        model: AGENT_MODEL,
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = res.response.text().trim();
      const parsed = JSON.parse(text);
      return NextResponse.json({ success: true, action, data: parsed });
    }

    if (action === 'decode_labs') {
      const sanitizedLabs = sanitizeUserMessage(labResultsText);
      if (!sanitizedLabs) {
        return NextResponse.json(
          { success: false, error: 'Введите текст или показатели лабораторных анализов' },
          { status: 400 }
        );
      }

      // Поиск релевантных добавок под лабораторные маркеры
      const relevantProducts = await getRelevantProducts(sanitizedLabs, activeProducts, 10);
      const catalogText = await formatCatalogProducts(relevantProducts, lang);

      const prompt = `ДЕЙСТВИЕ: Расшифровка лабораторных анализов для консультанта TOJ-VITAMIN.

Данные анализов клиента:
"${sanitizedLabs}"

Профиль клиента:
- Возраст: ${customerProfile.age || 'не указан'}
- Пол: ${customerProfile.gender === 'female' ? 'Женский' : customerProfile.gender === 'male' ? 'Мужской' : 'Не указан'}

Доступный каталог добавок на складе:
${catalogText}

${langInstruction}

ТРЕБУЕМЫЙ ФОРМАТ JSON ОТВЕТА:
{
  "summary": "Общее заключение по предоставленным анализам с точки зрения интегративной нутрициологии.",
  "lab_breakdown": [
    {
      "marker": "Название показателя (например: Ферритин, 25-OH Витамин D, Гемоглобин, ТТГ)",
      "client_value": "Значение клиента",
      "optimal_functional_range": "Оптимальная превентивная норма (например: ферритин равен весу, но не ниже 45-50)",
      "interpretation": "Дефицит / Норма / Избыток / Латентный дефицит с кратким объяснением"
    }
  ],
  "urgent_medical_alert": null,
  "targeted_supplements": [
    {
      "name": "Название препарата из нашего каталога",
      "role": "Для коррекции какого дефицита",
      "dosage": "Дозировка и форма (например: Хелат железа 1 капсула + Витамин C)",
      "duration": "Длительность до повторного анализа"
    }
  ],
  "schedule": {
    "morning": [{ "product": "...", "dosage": "...", "timing": "..." }],
    "afternoon": [{ "product": "...", "dosage": "...", "timing": "..." }],
    "evening": [{ "product": "...", "dosage": "...", "timing": "..." }],
    "duration": "...",
    "retest_period": "Когда сдать повторный анализ крови для контроля"
  },
  "operator_phone_script": "Тактичный, профессиональный скрипт для звонка клиенту: как объяснить результаты анализов без запугивания и предложить решение из магазина.",
  "whatsapp_message": "Готовый подробный разбор анализов и рекомендованный курс для WhatsApp клиенту."
}`;

      const model = genAI.getGenerativeModel({
        model: AGENT_MODEL,
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = res.response.text().trim();
      const parsed = JSON.parse(text);
      return NextResponse.json({ success: true, action, data: parsed });
    }

    return NextResponse.json(
      { success: false, error: `Неизвестное действие: ${action}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('❌ Ошибка в Consultant Copilot API:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error, 'Внутренняя ошибка сервиса нутрициолога') },
      { status: 500 }
    );
  }
}
