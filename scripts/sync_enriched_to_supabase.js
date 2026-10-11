const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const enriched = fs.readFileSync(path.join(__dirname, '../src/data/enriched_gls_products.json'), 'utf8');
  console.log('Size of enriched JSON:', enriched.length);

  const { data, error } = await sb.from('site_settings').upsert({
    key: 'enriched_gls_products_data',
    value: enriched
  });

  if (error) {
    console.error('Error updating site_settings:', error);
  } else {
    console.log('✅ Successfully updated site_settings in Supabase!');
  }
}

run();
