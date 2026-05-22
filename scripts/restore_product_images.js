const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Env variables from .env.local
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

// Normalize name for matching
function getNormalizedKey(name) {
  return name.toLowerCase()
    .replace(/[^a-zа-я0-9]/g, '')
    .replace(/\s/g, '')
    .trim();
}

// Sleep helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function restore() {
  console.log("🚀 Starting sequential product image recovery in Supabase database...");

  // 2. Load products_db.json
  const jsonPath = path.join(process.cwd(), 'src/data/products_db.json');
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ Error: src/data/products_db.json file not found.");
    process.exit(1);
  }

  const backupProducts = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`📥 Loaded ${backupProducts.length} backup products with images from JSON.`);

  // 3. Load existing products from DB
  console.log("📥 Fetching products from Supabase DB...");
  const { data: dbProducts, error: selectErr } = await supabase
    .from('products')
    .select('id, name, image_url');

  if (selectErr) {
    console.error("❌ Error fetching database products:", selectErr);
    process.exit(1);
  }

  console.log(`📦 Database contains ${dbProducts.length} active products.`);

  let updatedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // 4. Match and update sequentially
  for (const dbProd of dbProducts) {
    const dbNorm = getNormalizedKey(dbProd.name);
    
    // Find matching product in backup
    const matchedBackup = backupProducts.find(bp => {
      return getNormalizedKey(bp.name) === dbNorm || 
             dbNorm.includes(getNormalizedKey(bp.name)) || 
             getNormalizedKey(bp.name).includes(dbNorm);
    });

    if (matchedBackup && matchedBackup.image_url) {
      // Retry logic (up to 3 times)
      let success = false;
      let retries = 3;
      while (!success && retries > 0) {
        try {
          const { error: updateErr } = await supabase
            .from('products')
            .update({ image_url: matchedBackup.image_url })
            .eq('id', dbProd.id);

          if (updateErr) {
            throw updateErr;
          }
          
          success = true;
          updatedCount++;
          console.log(`✅ Updated: "${dbProd.name}" -> Image: "${matchedBackup.image_url}"`);
        } catch (err) {
          retries--;
          console.warn(`⚠️ Error updating "${dbProd.name}", retries left: ${retries}. Msg: ${err.message || err}`);
          if (retries === 0) {
            errorCount++;
          } else {
            await sleep(250); // wait longer on failure
          }
        }
      }
      
      // Delay to avoid flooding the API
      await sleep(100);
    } else {
      console.warn(`⚠️  No image match found for database product: "${dbProd.name}"`);
      skippedCount++;
    }
  }

  console.log("\n=== IMAGE RESTORATION SUMMARY ===");
  console.log(`✅ Successfully updated: ${updatedCount} products`);
  console.log(`❌ Failed updates: ${errorCount}`);
  console.log(`⚠️  Skipped (no match): ${skippedCount}`);
  console.log("🎉 Recovery process finished!");
}

restore();
