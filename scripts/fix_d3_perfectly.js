const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Verified correct D3 image URL from products_db.json backup
  const verifiedD3Url = 'https://azbseceyovktqztjslup.supabase.co/storage/v1/object/public/product-images/18-1775833702134.jpg';
  
  console.log(`📥 Downloading verified D3 image from: ${verifiedD3Url}...`);
  const response = await fetch(verifiedD3Url);
  if (!response.ok) {
    console.error("❌ Failed to download verified D3 image!");
    return;
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload for ID 17
  console.log(`📤 Uploading as prod-17.jpg...`);
  await supabase.storage
    .from('product-images')
    .upload('prod-17.jpg', buffer, { contentType: 'image/jpeg', upsert: true });

  const { data: urlData17 } = supabase.storage
    .from('product-images')
    .getPublicUrl('prod-17.jpg');

  console.log(`💾 Updating product 17 DB image_url to: ${urlData17.publicUrl}...`);
  await supabase
    .from('products')
    .update({ image_url: urlData17.publicUrl })
    .eq('id', '17');

  // Upload for ID 18
  console.log(`📤 Uploading as prod-18.jpg...`);
  await supabase.storage
    .from('product-images')
    .upload('prod-18.jpg', buffer, { contentType: 'image/jpeg', upsert: true });

  const { data: urlData18 } = supabase.storage
    .from('product-images')
    .getPublicUrl('prod-18.jpg');

  console.log(`💾 Updating product 18 DB image_url to: ${urlData18.publicUrl}...`);
  await supabase
    .from('products')
    .update({ image_url: urlData18.publicUrl })
    .eq('id', '18');

  console.log("🎉 Successfully fixed Vitamin D3 images for both product 17 and 18!");
}

run();
