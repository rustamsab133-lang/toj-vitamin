import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateQuiz() {
  console.log('--- Populating Quiz Data ---');

  // Helper to fetch product data
  const getProductData = async (ids: string[]) => {
    const { data } = await supabase.from('products').select('*').in('id', ids);
    return data?.map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      image_url: p.image_url,
      marketing_hooks: p.marketing_hooks || [],
      tags: p.tags || [],
      expert_description: p.description || '',
      properties: p.tags || []
    })) || [];
  };

  // 1. Update Sport Synergies (syn_sport_1, syn_sport_2, syn_sport_3)
  const sportData = [
    { id: 'syn_sport_1', products: ['57', '86'], type: 'Взрывная сила', dosage: '1 порция креатина + 1 порция протеина', rule: 'Креатин перед тренировкой, протеин после.' },
    { id: 'syn_sport_2', products: ['64', '39', '13'], type: 'Жиросжигание', dosage: '1 капс. Л-карнитина + 1 капс. жиросжигателя', rule: 'Утром натощак и за 30 мин до кардио.' },
    { id: 'syn_sport_3', products: ['68', '78', '91'], type: 'Выносливость', dosage: '1 капс. Магния + 1 капс. Омега-3', rule: 'После еды, магний лучше вечером.' }
  ];

  for (const item of sportData) {
    const products = await getProductData(item.products);
    const productNames = products.map(p => p.name);
    const { error } = await supabase
      .from('quiz_synergies')
      .update({
        products_data: products,
        product_names: productNames,
        type: item.type,
        dosage: item.dosage,
        rule: item.rule
      })
      .eq('id', item.id);
    if (error) console.error(`Error updating ${item.id}:`, error);
    else console.log(`Updated ${item.id}`);
  }

  // 2. Create missing synergies
  const newSynergies = [
    // Kids Health
    { option_id: 'opt_kids_immune', products: ['21', '18'], type: 'Крепкий иммунитет', dosage: '1 пастилка Вит С + 1 капс. Д3', rule: 'Утром после завтрака.' },
    { option_id: 'opt_kids_focus', products: ['78', '68'], type: 'Концентрация и память', dosage: '1 капс. Омега-3 + 1 капс. Магния', rule: 'Омега утром, Магний вечером.' },
    { option_id: 'opt_kids_growth', products: ['44', '18'], type: 'Рост и кости', dosage: '1 капс. Кальция + 1 капс. Д3', rule: 'Во время еды.' },
    { option_id: 'opt_kids_energy', products: ['73', '13'], type: 'Энергия и баланс', dosage: '1 капс. Мультивитаминов + 1 капс. B5', rule: 'Утром после еды.' },
    
    // Brain & Productivity
    { option_id: 'opt_brain_fog', products: ['78', '68', '13'], type: 'Ясный ум', dosage: '1 капс. Омега-3 + 1 капс. Магния + 1 капс. B5', rule: 'Комплексная поддержка в течение дня.' },
    { option_id: 'opt_brain_eyes', products: ['73', '78'], type: 'Защита зрения', dosage: '1 капс. Мультивитаминов + 1 капс. Омега-3', rule: 'После завтрака.' },

    // Motherhood
    { option_id: 'opt_mom_plan', products: ['41', '80', '73'], type: 'Подготовка к зачатию', dosage: '1 капс. Йода + 1 капс. Омега-3 + 1 капс. Мультивитаминов', rule: 'Ежедневно после еды.' },
    { option_id: 'opt_mom_recovery', products: ['53', '37', '44'], type: 'Восстановление', dosage: '1 порция Коллагена + 1 капс. Женской формулы', rule: 'Коллаген утром натощак.' },
    { option_id: 'opt_mom_lactation', products: ['82', '44'], type: 'Поддержка ГВ', dosage: '1 капс. Омега-3 + 1 капс. Кальция', rule: 'После еды.' },

    // Weight & Detox
    { option_id: 'opt_weight_slow', products: ['99', '64'], type: 'Метаболизм Плюс', dosage: '1 капс. Хрома + 1 капс. Л-карнитина', rule: 'Хром для снижения тяги к сладкому.' },
    { option_id: 'opt_detox_heavy', products: ['107', '23'], type: 'Легкий детокс', dosage: '1 капс. Чеснока + 1 таб. Вит С', rule: 'Курс 30 дней.' }
  ];

  for (const item of newSynergies) {
    const products = await getProductData(item.products);
    const productNames = products.map(p => p.name);
    const { error } = await supabase
      .from('quiz_synergies')
      .insert({
        id: crypto.randomUUID(),
        option_id: item.option_id,
        products_data: products,
        product_names: productNames,
        type: item.type,
        dosage: item.dosage,
        rule: item.rule,
        sort_order: 1
      });
    if (error) console.error(`Error inserting for ${item.option_id}:`, error);
    else console.log(`Inserted synergy for ${item.option_id}`);
  }

  console.log('--- Population Finished ---');
}

populateQuiz();
