import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, image_url')
    .or('name.ilike.%Витамин С%,name.ilike.%Витамин Д3%,name.ilike.%Аспарагиновая%');

  if (error) {
    console.error(error);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

findProducts();
