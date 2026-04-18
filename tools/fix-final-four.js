const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function fixFinalFour() {
  console.log('Fixing the final 4 specific duplicates...');

  const updates = [
    {
      id: '29',
      description: "Гиалуроновая кислота 300мг в упаковке 30 капсул. Идеальный стартовый курс на 1 месяц для быстрого восполнения уровня увлажненности кожи и поддержки эластичности суставов.",
      marketing_hooks: ["Быстрое увлажнение кожи изнутри", "Поддержка эластичности суставной жидкости", "Удобный формат на 30 дней", "Профилактика первых возрастных изменений"]
    },
    {
      id: '30',
      description: "Гиалуроновая кислота 300мг (60 капсул). Расширенный двухмесячный курс для стойкого накопительного эффекта: глубокое омоложение дермы и физиологическая поддержка хрящевой ткани.",
      marketing_hooks: ["Накопительный омолаживающий эффект", "Глубокое восстановление тургора кожи", "Стойкая поддержка здоровья суставов", "Экономичная упаковка на 2 месяца"]
    },
    {
      id: '75',
      description: "Детские мультивитамины в капсулах (для детей с 3 лет). Классический формат для точного восполнения 13 ключевых витаминов и минералов, необходимых для активного роста и развития интеллекта.",
      marketing_hooks: ["Традиционный формат для точного дозирования", "Комплексная поддержка растущего организма", "Стимулирует когнитивное развитие", "Укрепляет иммунитет в период нагрузок"]
    },
    {
      id: '76',
      description: "Детские мультивитамины в форме пастилок (90 шт). Вкусный и удобный формат, который нравится детям. Обеспечивает ребенка энергией, укрепляет защиту организма и поддерживает здоровье глаз.",
      marketing_hooks: ["Вкусные пастилки — дети едят с удовольствием", "Повышенная дозировка для активного сезона", "Защита зрения и укрепление костей", "Максимальная упаковка на 3 месяца приёма"]
    }
  ];

  for (let u of updates) {
    await client.from('products').update({
      description: u.description,
      marketing_hooks: u.marketing_hooks
    }).match({ id: u.id });
    console.log(`[✓] Specific Fix applied to ID: ${u.id}`);
  }

  console.log('Final verification...');
  const { data: ver } = await client.from('products').select('description');
  const d = ver.map(x => x.description);
  const dupes = ver.filter(x => d.indexOf(x.description) !== d.lastIndexOf(x.description));
  console.log(`📊 TOTAL REMAINING DUPLICATES: ${dupes.length}`);
}

fixFinalFour();
