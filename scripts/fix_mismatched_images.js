const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
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

// Sleep helper
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// List of targets to fix
const TARGETS = [
  {
    id: '16',
    name: 'Витамин А (ретинола ацетат)',
    queries: ['Витамин А', 'Ретинол'],
    checkMatch: (name) => {
      const n = name.toLowerCase();
      return n.includes('витамин а') && n.includes('60') && !n.includes('детс') && !n.includes(' d3') && !n.includes(' д3');
    }
  },
  {
    id: '17',
    name: 'Витамин D3 2000ME 120 капс.',
    queries: ['D3 2000', 'Витамин D3', 'Витамин Д3'],
    checkMatch: (name) => {
      const n = name.toLowerCase();
      return (n.includes('d3') || n.includes('д3')) && n.includes('2000') && n.includes('120') && !n.includes('детс');
    }
  },
  {
    id: '20',
    name: 'Витамин K2 60 капс.',
    queries: ['Витамин K2', 'Витамин К2'],
    checkMatch: (name) => {
      const n = name.toLowerCase();
      return (n.includes('k2') || n.includes('к2')) && !n.includes('d3') && !n.includes('д3');
    }
  },
  {
    id: '97',
    name: 'Хитозан морской 100 капс.',
    queries: ['Хитозан'],
    checkMatch: (name) => {
      const n = name.toLowerCase();
      return n.includes('хитозан') && n.includes('100');
    }
  },
  {
    id: '98',
    name: 'Хлорофилл 60 капс.',
    queries: ['Хлорофилл'],
    checkMatch: (name) => {
      const n = name.toLowerCase();
      return n.includes('хлорофилл') && n.includes('капсул');
    }
  }
];

async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ...options.headers
  };
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (err) {
      console.warn(`⚠️ Fetch failed (Attempt ${i + 1}/${retries}) for ${url}: ${err.message}`);
      if (i === retries - 1) throw err;
      await sleep(delay * (i + 1));
    }
  }
}

async function scrapeProductImage(target) {
  console.log(`\n🔍 Searching GLS for product: "${target.name}" (ID ${target.id})...`);
  
  let detailUrl = null;
  let matchedName = null;
  
  // Try each search query sequentially
  for (const query of target.queries) {
    try {
      const searchUrl = `https://gls.store/catalog/?q=${encodeURIComponent(query)}`;
      const response = await fetchWithRetry(searchUrl);
      const html = await response.text();
      
      // Parse links
      const links = Array.from(html.matchAll(/<a[^>]*href="(\/catalog\/[^"]+)"[^>]*class="dark_link[^"]*"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/gi));
      
      if (links.length === 0) {
        console.log(`   Query "${query}" returned no results.`);
        continue;
      }
      
      console.log(`   Found ${links.length} potential matches for query "${query}":`);
      for (const link of links) {
        const url = `https://gls.store${link[1]}`;
        const name = link[2].trim();
        console.log(`     - [${name}] -> ${url}`);
        
        if (target.checkMatch(name)) {
          detailUrl = url;
          matchedName = name;
          console.log(`     🎯 Perfect match found: "${name}"!`);
          break;
        }
      }
      
      if (detailUrl) break;
      
    } catch (err) {
      console.error(`   ❌ Search error for query "${query}":`, err.message);
    }
  }
  
  if (!detailUrl) {
    throw new Error(`Could not find product matching our filters on GLS for ${target.name}`);
  }
  
  console.log(`🔗 Navigating to details page: ${detailUrl}`);
  const response = await fetchWithRetry(detailUrl);
  const html = await response.text();
  
  // Find high-res image link
  let highResUrl = null;
  const highResMatch = html.match(/class="product-detail-gallery__link[^"]*"[^>]*href="([^"]+)"/);
  if (highResMatch) {
    highResUrl = highResMatch[1].startsWith('http') ? highResMatch[1] : `https://gls.store${highResMatch[1]}`;
  } else {
    // Fallback: iblock upload folder
    const fallbackMatch = html.match(/\/upload\/iblock\/[^"]+/);
    if (fallbackMatch) {
      highResUrl = `https://gls.store${fallbackMatch[0]}`;
    }
  }
  
  if (!highResUrl) {
    throw new Error(`Could not find high-res image on detail page for "${matchedName}"`);
  }
  
  console.log(`📸 Found high-res image URL: ${highResUrl}`);
  return { highResUrl, matchedName };
}

async function fixProduct(target) {
  try {
    const { highResUrl, matchedName } = await scrapeProductImage(target);
    
    // Download image
    console.log(`📥 Downloading image from ${highResUrl}...`);
    const imgRes = await fetchWithRetry(highResUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase Storage
    const fileName = `prod-${target.id}.jpg`;
    console.log(`📤 Uploading image to Supabase storage bucket "product-images" as "${fileName}"...`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });
      
    if (uploadError) {
      throw uploadError;
    }
    
    // Construct public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
      
    const publicUrl = urlData.publicUrl;
    console.log(`✅ Uploaded successfully! Public URL: ${publicUrl}`);
    
    // Update product in DB
    console.log(`💾 Updating product ID ${target.id} image_url in Supabase database...`);
    const { error: dbError } = await supabase
      .from('products')
      .update({ image_url: publicUrl })
      .eq('id', target.id);
      
    if (dbError) {
      throw dbError;
    }
    
    console.log(`🎉 Successfully fixed product ID ${target.id}: "${matchedName}"`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to fix product ID ${target.id} ("${target.name}"):`, err.message || err);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting program to fix mismatched product images (REFINED VERSION)...");
  
  let successCount = 0;
  for (const target of TARGETS) {
    const success = await fixProduct(target);
    if (success) successCount++;
    // Polite sleep between products to be kind to the GLS website
    await sleep(2000);
  }
  
  console.log(`\n==================================================`);
  console.log(`🏁 Done! Successfully fixed ${successCount}/${TARGETS.length} products.`);
  console.log(`==================================================`);
}

main();
