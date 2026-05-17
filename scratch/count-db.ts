import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkCounts() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { count: productsCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  const { count: articlesCount } = await supabase
    .from('journal_articles')
    .select('*', { count: 'exact', head: true });

  console.log(`DB Products: ${productsCount}`);
  console.log(`DB Articles: ${articlesCount}`);
}

checkCounts();
