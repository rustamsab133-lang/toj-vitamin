import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name');

  if (error) {
    console.error(error);
    return;
  }

  const ids = new Set<string>();
  const names = new Set<string>();
  const dupIds: string[] = [];
  const dupNames: string[] = [];

  data.forEach((p: any) => {
    if (ids.has(p.id)) dupIds.push(p.id);
    ids.add(p.id);
    
    if (names.has(p.name)) dupNames.push(p.name);
    names.add(p.name);
  });

  console.log('Duplicate IDs:', dupIds);
  console.log('Duplicate Names:', dupNames);
  console.log('Total Products:', data.length);
}

checkDuplicates();
