import { NextRequest, NextResponse } from 'next/server';
import { genAI } from '@/lib/gemini';
import { VideoProject, VideoScene, SelectedProduct, HudOverlay } from '@/app/admin/components/video-studio/types';
import { MOA_ASSETS } from '@/app/admin/components/video-studio/moaAssets';

const SYSTEM_INSTRUCTION = `Ты — ведущий креативный AI-Режиссер и клинический биохимик проекта "TOJ-VITAMIN".
Твоя задача — создавать и редактировать сценарии и визуальные концепции коротких рекламных MoA-роликов (Mechanism of Action) в формате 9:16 (Reels/Shorts/TikTok).

КЛЮЧЕВЫЕ ПРАВИЛА РОЛИКОВ О ВИТАМИНАХ:
1. ФОРМУЛА РОЛИКА (обычно 4 сцены по 5-8 секунд, итого 25-35 сек):
   - Сцена 1 (HOOK): Сильный триггер симптома (бессонница, выпадение волос, боль в суставах, упадок сил). Пробивает баннерную слепоту в первые 2 секунды.
   - Сцена 2 (PROBLEM / ROOT CAUSE): Погружение на клеточный уровень (дефицит микроэлемента, разрушение коллагеновой сетки, воспаление эндотелия, истощение митохондрий).
   - Сцена 3 (MECHANISM OF ACTION / SYNERGY): Как именно препарат(ы) решают проблему внутри тела. Если выбрано 2-3 товара — ОБЯЗАТЕЛЬНО показать биохимическую синергию (например: D3 активирует белок остеокальцин, а K2 активирует его карбоксилирование, направляя кальций в кости, минуя сосуды).
   - Сцена 4 (OFFER & CTA): Демонстрация баночки/комбо, биодоступность, акция/бесплатная доставка, призыв к действию.

2. МЕДИЦИНСКАЯ HUD-ГРАФИКА:
   Каждая сцена должна содержать 1-2 научные плашки (HudOverlay):
   - type: 'pointer' | 'stat_badge' | 'formula' | 'gmp_seal' | 'synergy_bar'
   - label: конкретный термин (например: "Mg²⁺ Биодоступность 94%", "Карбоксилирование остеокальцина", "Фибробласты кожи")
   - position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'

3. ДОСТУПНЫЕ 3D-ВИЗУАЛЫ (visualAssetId):
   - 'bloodstream' (Кровоток, эритроциты, сосуды)
   - 'neurons' (Мозг, нейроны, синапсы, ГАМК)
   - 'collagen_dermis' (Кожа, коллагеновая сетка, фибробласты)
   - 'capsule_dissolve' (Желудок, растворение капсулы, ЖКТ)
   - 'mitochondria' (Митохондрия, синтез АТФ, энергия)
   - 'joint_cartilage' (Суставы, хрящи, синовия)
   - 'immunity_cells' (Т-киллеры, фагоциты, клеточный щит)

4. ВЗАИМОДЕЙСТВИЕ С ПОЛЬЗОВАТЕЛЕМ:
   Пользователь общается с тобой на естественном языке (например: "Сделай хук жестче", "Замени 2 сцену на нейроны", "Добавь в конце скидку 15%").
   Ты должен проанализировать пожелание пользователя, внести точечные изменения в проект ролика (или создать новый, если это старт) и вернуть ответ СТРОГО в формате JSON.

ОТВЕТ ДОЛЖЕН БЫТЬ ВАЛИДНЫМ JSON:
{
  "replyText": "Человечный ответ пользователю (на русском языке): что ты сделал, почему так эффективнее для продаж",
  "appliedActions": ["Список выполненных действий"],
  "suggestedPrompts": ["3 коротких варианта, что пользователь может попросить дальше"],
  "project": {
    "title": "Название ролика",
    "targetAudience": "Целевая аудитория",
    "focusAngle": "Главный фокус",
    "aspectRatio": "9:16",
    "voiceConfig": {
      "speaker": "doctor_male" | "expert_female" | "energetic_host",
      "speed": 1.0,
      "emotion": "authoritative" | "empathetic" | "dynamic"
    },
    "musicConfig": {
      "track": "deep_scientific" | "cinematic_ambient" | "biohack_pulse",
      "volume": 0.25
    },
    "subtitleStyle": {
      "preset": "hormozi" | "clean_medical" | "cyber_glow",
      "fontSize": "md",
      "highlightColor": "#10B981"
    },
    "scenes": [
      {
        "id": "scene-1",
        "index": 0,
        "type": "hook",
        "title": "Хук: Утреннее бессилие",
        "durationSeconds": 6,
        "voiceoverText": "...",
        "visualAssetId": "mitochondria",
        "visualPrompt": "3d macro shot of tired human cell lacking ATP energy",
        "productFocusIds": [],
        "accentColor": "#EF4444",
        "hudOverlays": [
          {
            "id": "hud-1",
            "type": "stat_badge",
            "label": "Синтез АТФ",
            "value": "-45%",
            "color": "#EF4444",
            "position": "top-right"
          }
        ]
      }
      ...
    ]
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      message, 
      action = 'create_project', 
      selectedProducts = [], 
      focusAngle = '', 
      currentProject = null 
    } = body;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const productsContext = selectedProducts.map((p: SelectedProduct, idx: number) => `
Товар ${idx + 1}:
- Название: ${p.name}
- Цена: ${p.price} TJS
- Категория: ${p.category || 'Витамины'}
- Активные вещества: ${(p.activeIngredients || []).join(', ') || p.name}
- Дозировка: ${p.dosage || 'Стандарт'}
`).join('\n');

    let prompt = '';

    if (action === 'create_project' || !currentProject) {
      prompt = `
ДЕЙСТВИЕ: Создать новый рекламный MoA-ролик с нуля.

ВЫБРАННЫЕ ТОВАРЫ (${selectedProducts.length} шт):
${productsContext || 'Товары не выбраны, используй топовый комплекс Магний B6 + Омега-3'}

ЖЕЛАЕМЫЙ ФОКУС / АКЦЕНТ ОТ ПОЛЬЗОВАТЕЛЯ:
"${focusAngle || message || 'Максимальная энергия, снижение стресса и биохимическая синергия'}"

ДОПОЛНИТЕЛЬНЫЕ ПОЖЕЛАНИЯ:
"${message || 'Создай захватывающий 4-сценарный MoA ролик с глубоким погружением в клетку'}"

Создай идеальный проект из 4 сцен (Hook, Problem, MoA Synergy, Offer) с точным текстом диктора, 3D ассетами и научными HUD плашками.`;
    } else {
      prompt = `
ДЕЙСТВИЕ: Редактирование существующего проекта ролика по запросу пользователя.

ТЕКУЩИЙ ПРОЕКТ (JSON):
${JSON.stringify(currentProject, null, 2)}

ТОВАРЫ В ПРОЕКТЕ:
${productsContext}

КОМАНДА / ПОЖЕЛАНИЕ ПОЛЬЗОВАТЕЛЯ НА ЕСТЕСТВЕННОМ ЯЗЫКЕ:
"${message}"

Скорректируй проект в соответствии с пожеланием пользователя. Если просят изменить конкретную сцену — измени именно её, сохранив общую целостность. Верни обновленный объект проекта.`;
    }

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      // Fallback cleanup if markdown formatting was included
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    // Attach selected products to the returned project if missing
    if (parsedData.project && (!parsedData.project.selectedProducts || parsedData.project.selectedProducts.length === 0)) {
      parsedData.project.selectedProducts = selectedProducts;
    }

    // Ensure valid IDs on scenes
    if (parsedData.project && parsedData.project.scenes) {
      parsedData.project.scenes = parsedData.project.scenes.map((s: any, idx: number) => ({
        ...s,
        id: s.id || `scene-${idx + 1}`,
        index: idx,
        hudOverlays: (s.hudOverlays || []).map((h: any, hIdx: number) => ({
          ...h,
          id: h.id || `hud-${idx}-${hIdx}`
        }))
      }));
    }

    return NextResponse.json({
      success: true,
      replyText: parsedData.replyText || 'Проект ролика успешно сформирован!',
      appliedActions: parsedData.appliedActions || ['Сформирован сценарий', 'Настроены 3D-ассеты'],
      suggestedPrompts: parsedData.suggestedPrompts || [
        'Сделай хук в первой сцене жестче',
        'Добавь стрелку на молекулу во 2 сцене',
        'Сделай акцент на бесплатной доставке'
      ],
      project: parsedData.project
    });

  } catch (error: any) {
    console.error('Error in video studio chat route:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Ошибка генерации сценария. Попробуйте снова.',
    }, { status: 500 });
  }
}
