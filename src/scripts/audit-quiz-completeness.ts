import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditQuiz() {
  console.log('--- Starting Quiz Data Audit ---');

  // 1. Get all categories
  const { data: categories, error: catError } = await supabase
    .from('quiz_categories')
    .select('id, title');

  if (catError) {
    console.error('Error fetching categories:', catError);
    return;
  }

  console.log(`Found ${categories.length} categories.`);

  // 2. Get all options
  const { data: options, error: optError } = await supabase
    .from('quiz_options')
    .select('id, category_id, text');

  if (optError) {
    console.error('Error fetching options:', optError);
    return;
  }

  console.log(`Found ${options.length} options.`);

  // 3. Get all synergies
  const { data: synergies, error: synError } = await supabase
    .from('quiz_synergies')
    .select('id, option_id, products_data');

  if (synError) {
    console.error('Error fetching synergies:', synError);
    return;
  }

  console.log(`Found ${synergies.length} synergies.`);

  console.log('\n--- ANALYSIS ---\n');

  // Check categories without options
  const catsWithNoOptions = categories.filter(c => !options.some(o => o.category_id === c.id));
  if (catsWithNoOptions.length > 0) {
    console.log(`[!] Categories with NO options (${catsWithNoOptions.length}):`);
    catsWithNoOptions.forEach(c => console.log(`  - ${c.title} (ID: ${c.id})`));
  } else {
    console.log('[✓] All categories have options.');
  }

  // Check options without synergies
  const optsWithNoSynergies = options.filter(o => !synergies.some(s => s.option_id === o.id));
  if (optsWithNoSynergies.length > 0) {
    console.log(`\n[!] Options with NO complexes/synergies (${optsWithNoSynergies.length}):`);
    optsWithNoSynergies.forEach(o => {
      const cat = categories.find(c => c.id === o.category_id);
      console.log(`  - [${cat?.title || 'Unknown'}] Question/Option: "${o.text}" (ID: ${o.id})`);
    });
  } else {
    console.log('[✓] All options have at least one synergy.');
  }

  // Check synergies with empty products
  const synergiesWithNoProducts = synergies.filter(s => !s.products_data || (Array.isArray(s.products_data) && s.products_data.length === 0));
  if (synergiesWithNoProducts.length > 0) {
    console.log(`\n[!] Synergies with NO products (${synergiesWithNoProducts.length}):`);
    synergiesWithNoProducts.forEach(s => {
      const opt = options.find(o => o.id === s.option_id);
      const cat = opt ? categories.find(c => c.id === opt.category_id) : null;
      console.log(`  - [${cat?.title || 'Unknown'} -> ${opt?.text || 'Unknown'}] Synergy ID: ${s.id}`);
    });
  } else {
    console.log('[✓] All synergies have product data.');
  }

  console.log('\n--- End of Audit ---');
}

auditQuiz();
