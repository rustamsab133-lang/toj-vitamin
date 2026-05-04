import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ==========================================
// HELPER FUNCTIONS
// ==========================================
const getProducts = async (ids: string[]) => {
  const { data } = await supabase.from('products').select('*').in('id', ids);
  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    image_url: p.image_url,
    marketing_hooks: p.marketing_hooks || [],
    tags: p.tags || [],
    expert_description: p.description || '',
    properties: p.tags || []
  }));
};

const upsertSynergy = async (id: string, data: object) => {
  const { error } = await supabase.from('quiz_synergies').upsert({ id, ...data }, { onConflict: 'id' });
  if (error) console.error(`❌ Synergy ${id}:`, error.message);
  else console.log(`✅ Synergy ${id} saved`);
};

const insertOption = async (option: object) => {
  const { error } = await supabase.from('quiz_options').upsert(option, { onConflict: 'id' });
  if (error) console.error(`❌ Option:`, error.message);
  else console.log(`✅ Option saved:`, (option as any).id);
};

// ==========================================
// MAIN FIX SCRIPT
// ==========================================
async function fixAllQuizIssues() {
  console.log('\n🔧 STARTING COMPREHENSIVE QUIZ FIX...\n');

  // =====================================================
  // STEP 1: ADD NEW QUESTIONS TO "МУЖСКОЕ ЗДОРОВЬЕ"
  // =====================================================
  console.log('📍 STEP 1: Adding Men\'s Health questions...');

  // Get current max sort_order for cat_men
  const { data: menOptions } = await supabase
    .from('quiz_options')
    .select('sort_order')
    .eq('category_id', 'cat_men')
    .order('sort_order', { ascending: false })
    .limit(1);
  
  const menBaseOrder = (menOptions?.[0]?.sort_order || 0) + 1;

  await insertOption({
    id: 'opt_men_libido',
    category_id: 'cat_men',
    text: 'Упала энергия, либидо и интерес к жизни',
    text_lang: {
      ru: 'Упала энергия, либидо и интерес к жизни',
      tj: 'Энергия, либидо ва шавқу ҳавас коҳиш ёфт'
    },
    sort_order: menBaseOrder
  });

  await insertOption({
    id: 'opt_men_testosterone',
    category_id: 'cat_men',
    text: 'Хочу поднять тестостерон и мышечную силу',
    text_lang: {
      ru: 'Хочу поднять тестостерон и мышечную силу',
      tj: 'Мехоҳам тестостерон ва қувватро баланд бардорам'
    },
    sort_order: menBaseOrder + 1
  });

  console.log('✅ Men\'s options added.\n');

  // =====================================================
  // STEP 2: ADD NEW QUESTION TO "ЖЕНСКОЕ ЗДОРОВЬЕ"
  // =====================================================
  console.log('📍 STEP 2: Adding Women\'s Health questions...');

  const { data: womenOptions } = await supabase
    .from('quiz_options')
    .select('sort_order')
    .eq('category_id', 'cat_women')
    .order('sort_order', { ascending: false })
    .limit(1);
  
  const womenBaseOrder = (womenOptions?.[0]?.sort_order || 0) + 1;

  await insertOption({
    id: 'opt_women_pms',
    category_id: 'cat_women',
    text: 'ПМС, нарушение цикла, гормональный дисбаланс',
    text_lang: {
      ru: 'ПМС, нарушение цикла, гормональный дисбаланс',
      tj: 'ПМС, ихтилоли давра, номутаносибии гормонӣ'
    },
    sort_order: womenBaseOrder
  });

  console.log('✅ Women\'s options added.\n');

  // =====================================================
  // STEP 3: CREATE SYNERGIES FOR NEW QUESTIONS
  // =====================================================
  console.log('📍 STEP 3: Creating synergies for new men\'s questions...');

  // Men - Libido & Energy
  // Products: Мака перуанская (69) + Йохимбе (42) + Цинк Хелат (103)
  const libidoProducts = await getProducts(['69', '42', '103']);
  await upsertSynergy(crypto.randomUUID(), {
    option_id: 'opt_men_libido',
    product_names: libidoProducts.map(p => p.name),
    products_data: libidoProducts,
    type: 'Энергия и Либидо',
    type_lang: { ru: 'Мужская Сила и Либидо', tj: 'Қувват ва либидои мардона' },
    dosage: '1 капс. Мака + 1 капс. Йохимбе + 1 капс. Цинк Хелат',
    dosage_lang: { ru: '', tj: '' },
    rule: 'Мака и Цинк — утром во время еды. Йохимбе — за 30 мин до физической активности.',
    rule_lang: { ru: '', tj: '' },
    sort_order: 1
  });

  // Men - Testosterone & Strength
  // Products: Мака (69) + Цинк+Селен (102) + Женьшень (38)
  const testoProd = await getProducts(['69', '102', '38']);
  await upsertSynergy(crypto.randomUUID(), {
    option_id: 'opt_men_testosterone',
    product_names: testoProd.map(p => p.name),
    products_data: testoProd,
    type: 'Тестостерон Комплекс',
    type_lang: { ru: 'Тестостерон Комплекс', tj: 'Комплекси тестостерон' },
    dosage: '1 капс. Мака + 1 капс. Цинк+Селен + 1 капс. Женьшень',
    dosage_lang: { ru: '', tj: '' },
    rule: 'Принимать утром вместе с завтраком. Курс 2-3 месяца для накопительного эффекта.',
    rule_lang: { ru: '', tj: '' },
    sort_order: 1
  });

  // Women - PMS
  // Products: Инозитол (40) + Магний Цитрат (68) + Железо Фумарат (35)
  const pmsProd = await getProducts(['40', '68', '35']);
  await upsertSynergy(crypto.randomUUID(), {
    option_id: 'opt_women_pms',
    product_names: pmsProd.map(p => p.name),
    products_data: pmsProd,
    type: 'Гормональный Баланс',
    type_lang: { ru: 'Гормональный Баланс', tj: 'Мувозинати гормонӣ' },
    dosage: '2 капс. Инозитол + 2 капс. Магний + 1 капс. Железа',
    dosage_lang: { ru: '', tj: '' },
    rule: 'Инозитол принимать натощак, Магний — вечером перед сном для снятия ПМС-боли.',
    rule_lang: { ru: '', tj: '' },
    sort_order: 1
  });

  console.log('✅ New synergies for new options created.\n');

  // =====================================================
  // STEP 4: FIX PREGNANCY SYNERGY (opt_mom_preg)
  // =====================================================
  console.log('📍 STEP 4: Fixing pregnancy synergy...');

  // Products: Витамины для беременных (25) + Магний Цитрат+B6 (68) + Вит D3 (18)
  const pregProd = await getProducts(['25', '68', '18']);

  // First, find the existing empty synergy for opt_mom_preg
  const { data: existingPregSyn } = await supabase
    .from('quiz_synergies')
    .select('id')
    .eq('option_id', 'opt_mom_preg')
    .limit(1);

  if (existingPregSyn && existingPregSyn.length > 0) {
    const { error } = await supabase
      .from('quiz_synergies')
      .update({
        product_names: pregProd.map(p => p.name),
        products_data: pregProd,
        type: 'Безопасная Поддержка',
        dosage: '1 капс. Витаминов + 1 капс. Магния + 1 капс. Д3',
        rule: 'Принимать во время еды. Безопасно для мамы и малыша. Курс весь период беременности.'
      })
      .eq('option_id', 'opt_mom_preg');
    if (error) console.error('❌ Pregnancy synergy update:', error.message);
    else console.log('✅ Pregnancy synergy updated.');
  } else {
    await upsertSynergy(crypto.randomUUID(), {
      option_id: 'opt_mom_preg',
      product_names: pregProd.map(p => p.name),
      products_data: pregProd,
      type: 'Безопасная Поддержка',
      type_lang: { ru: 'Безопасная Поддержка при Беременности', tj: 'Дастгирии бехатар ҳангоми ҳомиладорӣ' },
      dosage: '1 капс. Витаминов + 1 капс. Магния + 1 капс. Д3',
      dosage_lang: { ru: '', tj: '' },
      rule: 'Принимать во время еды. Безопасно для мамы и малыша. Курс весь период беременности.',
      rule_lang: { ru: '', tj: '' },
      sort_order: 1
    });
  }

  // =====================================================
  // STEP 5: FIX LACTATION SYNERGY - add Iodine
  // =====================================================
  console.log('\n📍 STEP 5: Fixing lactation synergy (add Iodine)...');

  // Products: Омега-3 (80) + Кальций Д3 (44) + Йод (41)
  const lactProd = await getProducts(['80', '44', '41']);
  const { error: lactErr } = await supabase
    .from('quiz_synergies')
    .update({
      product_names: lactProd.map(p => p.name),
      products_data: lactProd,
      type: 'Поддержка при ГВ',
      dosage: '1 капс. Омега-3 + 1 капс. Кальция + 1 капс. Йода',
      rule: 'Принимать во время еды. Критически важен Йод для развития мозга ребёнка при ГВ.'
    })
    .eq('option_id', 'opt_mom_lactation');

  if (lactErr) console.error('❌ Lactation fix:', lactErr.message);
  else console.log('✅ Lactation synergy fixed (Iodine added).');

  // =====================================================
  // STEP 6: ADD GLUTATHIONE SYNERGY TO DETOX
  // =====================================================
  console.log('\n📍 STEP 6: Adding Glutathione to Detox section...');

  // Check if there's already an option for "heavy/bloating" in detox or we need "general detox"
  const { data: detoxOptions } = await supabase
    .from('quiz_options')
    .select('sort_order')
    .eq('category_id', 'cat_detox')
    .order('sort_order', { ascending: false })
    .limit(1);

  const detoxBaseOrder = (detoxOptions?.[0]?.sort_order || 0) + 1;

  await insertOption({
    id: 'opt_detox_antioxidant',
    category_id: 'cat_detox',
    text: 'Хочу мощную антиоксидантную защиту и очистку клеток',
    text_lang: {
      ru: 'Хочу мощную антиоксидантную защиту и очистку клеток',
      tj: 'Мехоҳам муҳофизати антиоксидантии қавӣ ва тозакунии ҳуҷайраҳо'
    },
    sort_order: detoxBaseOrder
  });

  // Products: Глутатион (32) + Альфа-Липоевая Кислота (5) + Витамин С (22)
  const antioxProd = await getProducts(['32', '5', '22']);
  await upsertSynergy(crypto.randomUUID(), {
    option_id: 'opt_detox_antioxidant',
    product_names: antioxProd.map(p => p.name),
    products_data: antioxProd,
    type: 'Антиоксидантный Щит',
    type_lang: { ru: 'Антиоксидантный Щит', tj: 'Сипари антиоксидантӣ' },
    dosage: '1 капс. Глутатиона + 1 капс. АЛК + 1 капс. Вит C',
    dosage_lang: { ru: '', tj: '' },
    rule: 'Принимать утром натощак. Мощнейшая тройная защита клеток от окислительного стресса и старения.',
    rule_lang: { ru: '', tj: '' },
    sort_order: 1
  });

  console.log('✅ Glutathione detox synergy added.\n');

  // =====================================================
  // STEP 7: ADD EYE HEALTH COMBO for Brain Eyes quiz
  // =====================================================
  console.log('📍 STEP 7: Improving Brain-Eyes synergy with specialized products...');
  
  // Products: Витамины для глаз (27) + Черника+A+E (106) + Омега-3 (78)
  const eyeProd = await getProducts(['27', '106', '78']);
  const { error: eyeErr } = await supabase
    .from('quiz_synergies')
    .update({
      product_names: eyeProd.map(p => p.name),
      products_data: eyeProd,
      type: 'Защита и Восстановление Зрения',
      dosage: '1 капс. Витамины для глаз + 1 капс. Черника+A+E + 1 капс. Омега-3',
      rule: 'Принимать во время еды. Специализированный комплекс для людей, работающих за экранами.'
    })
    .eq('option_id', 'opt_brain_eyes');

  if (eyeErr) console.error('❌ Eye synergy fix:', eyeErr.message);
  else console.log('✅ Brain-Eyes synergy upgraded with eye-specific products.');

  // =====================================================
  // STEP 8: ADD CITRULLINE TO SPORT ENDURANCE
  // =====================================================
  console.log('\n📍 STEP 8: Upgrading Sport-Endurance with Citrulline...');

  // Products: Цитруллин (105) + Магний Цитрат (68) + Омега-3 PRO (78)
  const endurProd = await getProducts(['105', '68', '78']);
  const { error: sportErr } = await supabase
    .from('quiz_synergies')
    .update({
      product_names: endurProd.map(p => p.name),
      products_data: endurProd,
      type: 'Выносливость и Памп',
      dosage: '1 капс. Цитруллина + 2 капс. Магния + 1 капс. Омега-3',
      rule: 'Цитруллин принимать за 30-40 минут до тренировки. Магний — вечером для восстановления.'
    })
    .eq('id', 'syn_sport_3');

  if (sportErr) {
    // Try by option_id if ID doesn't match
    const { error: sportErr2 } = await supabase
      .from('quiz_synergies')
      .update({
        product_names: endurProd.map(p => p.name),
        products_data: endurProd,
        type: 'Выносливость и Памп',
        dosage: '1 капс. Цитруллина + 2 капс. Магния + 1 капс. Омега-3',
        rule: 'Цитруллин принимать за 30-40 минут до тренировки. Магний — вечером для восстановления.'
      })
      .eq('option_id', 'opt_sport_endurance');
    if (sportErr2) console.error('❌ Sport endurance fix:', sportErr2.message);
    else console.log('✅ Sport-Endurance upgraded with Citrulline.');
  } else {
    console.log('✅ Sport-Endurance upgraded with Citrulline.');
  }

  console.log('\n🎉 ALL QUIZ FIXES COMPLETE!\n');
}

fixAllQuizIssues().catch(console.error);
