import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function findByImage() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, image_url');

  if (error) {
    console.error(error);
    return;
  }

  const matches = data.filter(p => p.image_url?.includes('prod-17') || p.name.includes('Аспарагиновая'));
  console.log(JSON.stringify(matches, null, 2));
}

findByImage();
