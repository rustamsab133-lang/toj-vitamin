import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMapping() {
  const enrichedPath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');
  const enrichedMap = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
  
  const { data: products, error } = await supabase.from('products').select('name');
  if (error) {
    console.error(error);
    return;
  }

  let matches = 0;
  const unmatched = [];

  products.forEach(p => {
    const name = p.name?.toLowerCase().trim() || '';
    let found = false;
    
    // Test current exact match
    if (enrichedMap[name]) {
      found = true;
    } else {
      // Test "starts with" match or similar
      for (const key in enrichedMap) {
        if (name.includes(key)) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      matches++;
    } else {
      unmatched.push(p.name);
    }
  });

  console.log(`Matched: ${matches}/${products.length}`);
  console.log('Unmatched samples:', unmatched.slice(0, 10));
}

testMapping();
