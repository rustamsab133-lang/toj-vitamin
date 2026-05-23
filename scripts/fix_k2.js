const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const k2ImageUrl = 'https://gls.store/upload/iblock/60b/e06ku2bew4ta6b1u7e1kn31l5083b12s/7441c544-09da-11ed-bc2c-000c292ea74f_71b885d5-ae60-11f0-aa25-00505601451c.jpg';
  const tempFile = path.join(process.cwd(), 'temp_k2.jpg');
  
  console.log(`📥 Downloading K2 image via curl.exe to ${tempFile}...`);
  try {
    execSync(`curl.exe -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -o "${tempFile}" "${k2ImageUrl}"`, { stdio: 'inherit' });
    
    if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0) {
      throw new Error("Downloaded file is empty or does not exist!");
    }
    
    console.log("✅ Image downloaded successfully!");
    const buffer = fs.readFileSync(tempFile);
    
    const fileName = 'prod-20.jpg';
    console.log(`📤 Uploading image to Supabase Storage as ${fileName}...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });
      
    if (uploadError) {
      throw uploadError;
    }
    
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
      
    const publicUrl = urlData.publicUrl;
    console.log(`✅ Uploaded successfully! Public URL: ${publicUrl}`);
    
    console.log("💾 Updating product 20 DB image_url in Supabase...");
    const { error: dbError } = await supabase
      .from('products')
      .update({ image_url: publicUrl })
      .eq('id', '20');
      
    if (dbError) {
      throw dbError;
    }
    
    console.log("🎉 Successfully fixed Vitamin K2 image (ID 20)!");
  } catch (err) {
    console.error("❌ Failed to download or upload K2 image:", err.message || err);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      console.log("🧹 Cleaned up temporary file.");
    }
  }
}

run();
