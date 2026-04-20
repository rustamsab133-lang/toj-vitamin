import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function fullAudit() {
  // Fetch everything
  const { data: products } = await supabase.from('products').select('id, name, price, tags, description, marketing_hooks').order('id');
  const { data: categories } = await supabase.from('quiz_categories').select('*').order('sort_order');
  const { data: options } = await supabase.from('quiz_options').select('*').order('sort_order');
  const { data: synergies } = await supabase.from('quiz_synergies').select('*').order('sort_order');

  console.log('=== FULL QUIZ AUDIT DATA ===');
  console.log('\n--- PRODUCTS (107 total) ---');
  console.log(JSON.stringify(products, null, 2));
  
  console.log('\n--- CATEGORIES ---');
  console.log(JSON.stringify(categories, null, 2));
  
  console.log('\n--- OPTIONS ---');
  console.log(JSON.stringify(options, null, 2));
  
  console.log('\n--- SYNERGIES ---');
  console.log(JSON.stringify(synergies, null, 2));
}

fullAudit();
