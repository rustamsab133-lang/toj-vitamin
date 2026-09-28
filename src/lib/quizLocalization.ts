import { Lang, QuizCategory, QuizOption, QuizSynergy } from './types';
import { getLocalizedProductName } from './productLocalization';

export const QUIZ_CATEGORIES_EN: Record<string, { title: string; question: string }> = {
  cat_women: {
    title: "Women's Health & Balance",
    question: "What is currently your primary health focus or symptom?"
  },
  cat_men: {
    title: "Men's Health & Vitality",
    question: "Which aspect of your vitality and health requires reinforcement?"
  },
  cat_weight: {
    title: "Weight & Appetite Control",
    question: "What do you feel is currently the biggest obstacle to your healthy weight?"
  },
  cat_joints: {
    title: "Joints, Bones & Mobility",
    question: "What specific joint or bone discomfort are you experiencing?"
  },
  cat_sleep: {
    title: "Sleep Quality & Stress Relief",
    question: "At what time of day or night do you feel the greatest discomfort?"
  },
  cat_sport: {
    title: "Athletic Performance & Muscle Tone",
    question: "What is your main athletic target right now?"
  },
  cat_brain: {
    title: "Cognitive Focus & Memory",
    question: "What type of mental load or fatigue drains your energy most?"
  },
  cat_detox: {
    title: "Digestive Balance & Detox",
    question: "What digestive or systemic discomfort is bothering you?"
  },
  cat_mom: {
    title: "Maternity & Prenatal Care",
    question: "Which stage of your motherhood journey are you currently in?"
  },
  cat_kids: {
    title: "Children's Growth & Immunity",
    question: "What type of developmental support does your child need most?"
  }
};

export const QUIZ_OPTIONS_EN: Record<string, string> = {
  // cat_brain
  "Тяжело сосредоточиться, всё время отвлекаюсь": "Difficulty focusing, constantly distracted",
  "Нет сил и желания что-то делать (апатия и лень)": "Lack of motivation, lethargy, mental exhaustion",
  "Стал(а) часто всё забывать (память подводит)": "Frequent forgetfulness, declining short-term memory",
  "Хочу соображать быстрее и лучше (базовая поддержка)": "Want sharper memory and faster cognitive processing",
  "Нужен рывок перед дедлайном или экзаменом": "Need peak focus boost for upcoming deadline or exams",
  "Горит голова от работы и стресса (хочу спокойствия)": "Overwhelmed by work stress and burnout, need calm",
  "Туман в голове, плохая память, умственное выгорание": "Brain fog, sluggish recall, cognitive burnout",
  "Усталость глаз от экрана, сухость, падение зрения": "Screen eye fatigue, dry eyes, declining acuity",

  // cat_detox
  "Лишний вес и отеки (хочу легкость)": "Fluid retention and puffiness, seeking bodily lightness",
  "Высыпания на коже и прыщи": "Skin breakouts, acne, and clogged pores",
  "Не могу жить без сладкого (сахарная зависимость)": "Sugar cravings and post-meal energy slumps",
  "Тяжесть, вздутие, нерегулярный стул": "Digestive heaviness, bloating, irregular bowel movements",
  "Хочу мощную антиоксидантную защиту и очистку клеток": "Seeking robust antioxidant protection & cellular cleansing",
  "Тяжесть в боку и поддержка печени": "Right-side abdominal heaviness, need liver detox support",
  "Дискомфорт в животе и вздутие": "Abdominal discomfort, gas, and digestive sluggishness",

  // cat_joints
  "Занимаюсь спортом или бегом (нужна защита связок)": "Active in running/fitness, need ligament & cartilage defense",
  "Нужны плотные и крепкие кости (кальций)": "Require stronger, denser bones & calcium support",
  "Хрустят колени и спина, хочу вернуть гибкость": "Cracking knees and stiff back, want youthful flexibility",
  "Есть боль или дискомфорт при движении": "Joint stiffness or movement-related discomfort",
  "Нужно восстановиться после травмы или перелома": "Post-injury or fracture rehabilitation support",

  // cat_kids
  "Часто болеет в садике или школе (иммунитет)": "Frequently gets sick at school/kindergarten (immunity)",
  "Устает, капризничает, плохо спит": "Easily fatigued, moody, restless sleep",
  "Активно растет (зубки, кости, рост)": "Active growth spurts (teeth, bone density, height)",
  "Нужна помощь в учебе (память и внимание)": "Needs learning support (concentration & memory)",
  "Частые простуды, адаптация к школе": "Frequent seasonal colds, school adaptation challenges",

  // cat_men
  "Поддержка сердца и сосудов (при нагрузках)": "Cardiovascular stamina and healthy blood pressure support",
  "Падение общей энергии и физическая усталость": "Declining baseline energy and physical exhaustion",
  "Хочу прогресс в тренировках и быстрое восстановление": "Want workout gains and faster muscular recovery",
  "Высокие нагрузки на работе и концентрация": "Heavy professional workloads and prolonged focus",
  "Базовая мужская поддержка и иммунитет (30+ / 40+)": "Comprehensive male wellness and vitality (age 30+ / 40+)",
  "Упала энергия, либидо и интерес к жизни": "Depleted energy, low libido, and reduced drive",
  "Хочу поднять тестостерон и мышечную силу": "Seeking healthy testosterone optimization & muscle strength",

  // cat_mom
  "Планируем малыша (готовим организм)": "Planning for pregnancy (preparing maternal reserves)",
  "Я в ожидании (поддержка при беременности)": "Currently pregnant (gentle maternal & fetal support)",
  "Планирование (подготовка организма к зачатию)": "Pre-conception planning & maternal nutrient readiness",
  "Беременность (безопасная поддержка)": "Pregnancy wellness (safe, essential micronutrients)",
  "Кормлю грудью (безопасно для двоих)": "Breastfeeding (nourishing mother and baby safely)",
  "Восстановление после родов (энергия и волосы)": "Postpartum recovery (restoring energy, skin & hair density)",

  // cat_sleep
  "Постоянно на нервах, всё раздражает и чувствую тревогу": "Chronically stressed, irritable, high anxiety levels",
  "Долго ворочаюсь в постели и не могу уснуть": "Tossing and turning, difficult sleep onset",
  "Сплю чутко, часто просыпаюсь по ночам и не высыпаюсь": "Light sleeper, frequent night waking, unrefreshing sleep",

  // cat_sport
  "Выносливость и защита сердца при высоких нагрузках": "High-intensity aerobic stamina & cardiovascular defense",
  "Пробить плато, нужна взрывная сила и энергия": "Overcoming training plateaus, explosive strength & power",
  "Сушка, сжигание жира и красивый рельеф": "Lean muscle cutting, accelerated fat burn & definition",

  // cat_weight
  "Хочу уменьшить порции и блокировать лишние калории": "Desire smaller portions & natural carbohydrate blocking",
  "Постоянно хочется кушать, особенно когда нервничаю": "Emotional eating & continuous snacking under stress",
  "Хочу максимум эффекта от тренировок (жиросжигание)": "Maximize workout calorie expenditure & metabolic burn",
  "Вес стоит на месте, хочу разогнать обмен веществ": "Weight loss plateau, want to reboot basal metabolism",
  "Медленный обмен веществ, вес «стоит»": "Sluggish metabolism, stubborn fat deposits",
  "Тянет на сладкое и мучное, не могу остановиться": "Irresistible cravings for sugars, baked goods & sweets",
  "Отеки и тяжесть (хочу убрать объемы)": "Morning fluid retention & bloating, seeking leaner waistline",

  // cat_women
  "Эмоциональные качели, стресс и плохой сон": "Mood swings, chronic tension, and poor sleep quality",
  "Хочу здоровые волосы, ногти и сияющую кожу": "Seeking thick glossy hair, strong nails & radiant skin",
  "Планирую беременность или поддержка при ГВ": "Preparing for conception or gentle lactation support",
  "ПМС, нарушение цикла, гормональный дисбаланс": "PMS symptoms, irregular cycles, hormonal fluctuation",
  "Слабость, бледность, сильная усталость (особенно после цикла)": "Pale skin, weakness, fatigue (iron & blood support)",
  "Лишний вес и неконтролируемая тяга к сладкому": "Weight gain and uncontrollable sweet tooth"
};

export const QUIZ_SYNERGY_TYPES_EN: Record<string, string> = {
  'Жиросжигание': 'Metabolic Fat-Burning Protocol',
  'Быстрое засыпание': 'Rapid Sleep Onset Protocol',
  'Глубокая регенерация': 'Deep Cellular Regeneration Protocol',
  'Спокойствие и Антистресс': 'Calm & Anti-Stress Protocol',
  'Кроветворение и Энергия': 'Blood Building & Vitality Protocol',
  'Восстановление': 'Tissue Recovery Protocol',
  'Гормональный Баланс': 'Hormonal Balance Protocol',
  'Сияние и Лифтинг': 'Radiance & Skin Lift Protocol',
  'Эмоциональный Дзен': 'Emotional Zen Protocol',
  'Материнская база': 'Maternal Foundation Protocol',
  'Метаболическая легкость': 'Metabolic Lightness Protocol',
  'Тестостерон и Энергия': 'Testosterone & Energy Protocol',
  'Пиковая работоспособность': 'Peak Productivity Protocol',
  'Спорт и Восстановление': 'Athletic Recovery Protocol',
  'Когнитивный драйв': 'Cognitive Drive Protocol',
  'Кардио Поддержка': 'Cardiovascular Defense Protocol',
  'Мужской Иммунный Щит': "Men's Immune Shield Protocol",
  'Клинический Детокс Печени': 'Clinical Liver Detox Protocol',
  'Генеральная уборка организма': 'Full-Body Cellular Cleansing Protocol',
  'Контроль аппетита и сахара': 'Appetite & Blood Sugar Control Protocol',
  'Лимфодренаж и Легкость': 'Lymphatic Drainage & Anti-Bloat Protocol',
  'Система Чистой Кожи': 'Clear Skin Purification Protocol',
  'Комплексное Обновление': 'Complete Vitality Reset Protocol',
  'Пиковая Эффективность': 'Peak Efficiency Protocol',
  'Когнитивный Спринт': 'Cognitive Sprint Protocol',
  'Антистресс Энергия': 'Anti-Stress Energy Protocol',
  'Ментальный Драйв': 'Mental Drive Protocol',
  'Реновация Памяти': 'Memory Renovation Protocol',
  'Базовая Интеллектуальная Поддержка': 'Baseline Nootropic Support Protocol',
  'Контроль Сахара и Аппетита': 'Glycemic & Appetite Control Protocol',
  'Разгон Метаболизма': 'Metabolic Acceleration Protocol',
  'Активное Жиросжигание': 'Active Thermogenic Protocol',
  'Защита от срывов (Zen-Metabolism)': 'Cravings Defense Protocol (Zen-Metabolism)',
  'Блокатор Калорий': 'Natural Calorie Absorption Blocker',
  'Подготовка к материнству': 'Pre-Conception Readiness Protocol',
  'Бережное ожидание': 'Gentle Prenatal Support Protocol',
  'Детский Иммунный Щит': "Children's Immune Shield Protocol",
  'Гибкость и Смазка': 'Joint Lubrication & Flexibility Protocol',
  'Интенсивное Восстановление': 'Intensive Cartilage Repair Protocol',
  'Крепкие Кости (PRO)': 'Strong Bones PRO Protocol',
  'Защита при нагрузках': 'Joint Impact Defense Protocol',
  'Гибкость и Эластичность': 'Flexibility & Connective Tissue Protocol',
  'Регенерация после травм': 'Post-Injury Rehabilitation Protocol',
  'Выносливость и Памп': 'Aerobic Endurance & Muscle Pump Protocol',
  'Взрывная сила': 'Explosive Power & Strength Protocol',
  'Крепкий иммунитет': 'Immune Defense Protocol',
  'Концентрация и память': 'Focus & School Memory Protocol',
  'Рост и кости': 'Growth & Skeletal Support Protocol',
  'Энергия и баланс': 'Daily Balance & Energy Protocol',
  'Ясный ум': 'Mental Clarity Protocol',
  'Подготовка к зачатию': 'Conception Readiness Protocol',
  'Метаболизм Плюс': 'Metabolism Plus Protocol',
  'Легкий детокс': 'Gentle Daily Detox Protocol',
  'Энергия и Либидо': 'Energy & Libido Boost Protocol',
  'Тестостерон Комплекс': 'Testosterone Vitality Stack',
  'Антиоксидантный Щит': 'Antioxidant Shield Protocol',
  'Безопасная Поддержка': 'Safe Maternal Support Protocol',
  'Поддержка при ГВ': 'Lactation Care Protocol',
  'Защита и Восстановление Зрения': 'Vision Recovery & Screen Defense Protocol'
};

export function getLocalizedQuizCategory(cat: QuizCategory, lang: Lang): QuizCategory {
  if (lang !== 'en') return cat;
  const en = QUIZ_CATEGORIES_EN[cat.id];
  if (!en) return cat;
  return {
    ...cat,
    title: en.title || cat.title,
    question: en.question || cat.question
  };
}

export function getLocalizedQuizOption(opt: QuizOption, lang: Lang): QuizOption {
  if (lang !== 'en') return opt;
  const enText = QUIZ_OPTIONS_EN[opt.text.trim()];
  return {
    ...opt,
    text: enText || opt.text
  };
}

export function getLocalizedSynergyType(type: string, lang: Lang): string {
  if (lang !== 'en' || !type) return type;
  return QUIZ_SYNERGY_TYPES_EN[type.trim()] || type;
}

export function getLocalizedDosage(dosage: string, lang: Lang): string {
  if (lang !== 'en' || !dosage) return dosage;

  let res = dosage;
  res = res.replace(/(\d+)\s*капс\./gi, '$1 cap.');
  res = res.replace(/(\d+)\s*капс/gi, '$1 cap.');
  res = res.replace(/(\d+)\s*порция/gi, '$1 serving');
  res = res.replace(/(\d+)\s*порции/gi, '$1 servings');
  res = res.replace(/1 порция/gi, '1 serving');
  res = res.replace(/утром/gi, 'morning');
  res = res.replace(/вечером/gi, 'evening');
  res = res.replace(/днем/gi, 'afternoon');
  res = res.replace(/перед сном/gi, 'before bed');
  res = res.replace(/во время еды/gi, 'with meal');
  res = res.replace(/после еды/gi, 'after meal');
  res = res.replace(/до еды/gi, 'before meal');
  res = res.replace(/в первой половине дня/gi, 'in the first half of the day');
  res = res.replace(/за 30 минут до сна/gi, '30 min before bed');
  res = res.replace(/за 30 мин до тренировки/gi, '30 min before workout');
  res = res.replace(/после тренировки/gi, 'post-workout');
  res = res.replace(/курс\s*[-—]\s*(\d+)\s*месяца?/gi, 'Course: $1 month(s)');
  res = res.replace(/1 раз в день/gi, 'once daily');
  res = res.replace(/2 раза в день/gi, 'twice daily');

  // Specific common ingredients in dosage strings
  res = res.replace(/Мелатонин/gi, 'Melatonin');
  res = res.replace(/Магний/gi, 'Magnesium');
  res = res.replace(/Железо/gi, 'Iron');
  res = res.replace(/Витамин С/gi, 'Vitamin C');
  res = res.replace(/Коллаген/gi, 'Collagen');
  res = res.replace(/Инозитол/gi, 'Inositol');
  res = res.replace(/Цинк/gi, 'Zinc');
  res = res.replace(/Биотин/gi, 'Biotin');
  res = res.replace(/Селен/gi, 'Selenium');
  res = res.replace(/Вит\.комплекс/gi, 'Vitamin Complex');
  res = res.replace(/Омега/gi, 'Omega');
  res = res.replace(/Иод/gi, 'Iodine');
  res = res.replace(/Д3/gi, 'D3');

  return res;
}
