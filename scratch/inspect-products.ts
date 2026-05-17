import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

async function inspectProducts() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const enrichedPath = path.join(__dirname, '../src/data/enriched_gls_products.json');
  const enrichedData = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('id');

  if (error) {
    console.error('Supabase error:', error);
    return;
  }

  console.log(`Successfully fetched ${products?.length} products.`);

  const enrichedMap = enrichedData as Record<string, any>;
  const enrichedProducts = products.map(p => ({
    ...p,
    ...(enrichedMap[p.id] || {})
  }));

  let errorCount = 0;
  let missingTagsCount = 0;
  enrichedProducts.forEach((p, index) => {
    console.log(`Product ID: ${p.id}, Name: ${p.name}, Tags:`, JSON.stringify(p.tags));
    // Check tags
    if (p.tags === undefined || p.tags === null) {
      missingTagsCount++;
    } else {
      if (!Array.isArray(p.tags)) {
        console.error(`ERROR: Product ID "${p.id}" ("${p.name}") has tags that is NOT an array. Type: ${typeof p.tags}, Value:`, p.tags);
        errorCount++;
      } else {
        p.tags.forEach((t: any, i: number) => {
          if (typeof t !== 'string') {
            console.error(`ERROR: Product ID "${p.id}" ("${p.name}") has a tag at index ${i} that is NOT a string. Type: ${typeof t}, Value:`, t);
            errorCount++;
          }
        });
      }
    }

    // Check properties, synergies, marketing_hooks, med_interactions
    ['properties', 'synergies', 'marketing_hooks', 'med_interactions'].forEach(field => {
      const val = p[field];
      if (val !== undefined && val !== null) {
        if (!Array.isArray(val)) {
          console.error(`ERROR: Product ID "${p.id}" ("${p.name}") has ${field} that is NOT an array. Type: ${typeof val}`);
          errorCount++;
        }
      }
    });
  });

  console.log(`Products missing "tags" array: ${missingTagsCount}`);
  if (errorCount === 0) {
    console.log('All product fields validated successfully! No malformed fields found.');
  } else {
    console.log(`Validation finished. Found ${errorCount} errors.`);
  }
}

inspectProducts();
