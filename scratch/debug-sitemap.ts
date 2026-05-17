import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugSitemap() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: products } = await supabase
    .from('products')
    .select('name, image_url, created_at')
    .order('name');

  const { data: articles } = await supabase
    .from('journal_articles')
    .select('slug')
    .eq('is_published', true);

  if (products) {
    const baseCount = 2; // home, journal
    const productCount = products.length;
    const articleCount = articles?.length || 0;
    const cities = ['dushanbe', 'khujand', 'kulob', 'bokhtar', 'vakhdat', 'hissar'];
    const pSEOCount = products.length * cities.length;

    console.log(`Products: ${productCount}`);
    console.log(`Articles: ${articleCount}`);
    console.log(`City pSEO: ${pSEOCount}`);
    console.log(`TOTAL PLANNED URLS: ${baseCount + productCount + articleCount + pSEOCount}`);
  }
}

debugSitemap().catch(console.error);
