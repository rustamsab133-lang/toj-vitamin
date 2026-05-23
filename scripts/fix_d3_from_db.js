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
  console.log("🔍 Fetching product 18 from database...");
  const { data: prod18, error: err18 } = await supabase
    .from('products')
    .select('id, name, image_url')
    .eq('id', '18')
    .single();

  if (err18) {
    console.error("Error fetching product 18:", err18);
    return;
  }

  console.log(`Product 18: [${prod18.name}] -> Image: ${prod18.image_url}`);

  if (!prod18.image_url) {
    console.error("Product 18 has no image URL!");
    return;
  }

  console.log(`📥 Downloading image from ${prod18.image_url}...`);
  const response = await fetch(prod18.image_url);
  if (!response.ok) {
    console.error("Failed to download image from product 18 URL");
    return;
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileName = 'prod-17.jpg';
  console.log(`📤 Uploading image to Supabase Storage as ${fileName}...`);
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(fileName, buffer, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return;
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;
  console.log(`✅ Uploaded successfully! Public URL: ${publicUrl}`);

  console.log("💾 Updating product 17 in database...");
  const { error: dbError } = await supabase
    .from('products')
    .update({ image_url: publicUrl })
    .eq('id', '17');

  if (dbError) {
    console.error("Database update error:", dbError);
    return;
  }

  console.log("🎉 Successfully fixed product 17 D3 image using product 18 photo!");
}

run();
