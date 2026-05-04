const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function checkUrl(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { timeout: 10000 }, (res) => {
      const elapsed = Date.now() - start;
      const contentLength = res.headers['content-length'];
      const contentType = res.headers['content-type'];
      // Consume data to get accurate timing
      let size = 0;
      res.on('data', (chunk) => { size += chunk.length; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          time: elapsed,
          size: size,
          contentType,
          sizeKB: Math.round(size / 1024)
        });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', time: 10000, size: 0 }); });
    req.on('error', (e) => { resolve({ status: 'ERROR', error: e.message, time: Date.now() - start, size: 0 }); });
  });
}

async function audit() {
  console.log("=== IMAGE LOADING AUDIT ===\n");
  
  const { data: products } = await supabase.from('products').select('name, image_url');
  
  let ok = 0, broken = 0, slow = 0, missing = 0, totalSize = 0;
  const issues = [];

  for (const p of products) {
    if (!p.image_url) {
      missing++;
      issues.push({ name: p.name, problem: 'NO_IMAGE_URL' });
      continue;
    }

    const result = await checkUrl(p.image_url);
    
    const symbol = result.status === 200 ? (result.time > 3000 ? '🐢' : '✅') : '❌';
    console.log(`${symbol} ${p.name.substring(0, 50).padEnd(50)} | ${String(result.status).padEnd(7)} | ${result.sizeKB}KB | ${result.time}ms`);
    
    if (result.status === 200) {
      ok++;
      totalSize += result.size;
      if (result.time > 3000) {
        slow++;
        issues.push({ name: p.name, problem: 'SLOW', time: result.time });
      }
      if (result.sizeKB > 500) {
        issues.push({ name: p.name, problem: 'TOO_LARGE', sizeKB: result.sizeKB });
      }
    } else {
      broken++;
      issues.push({ name: p.name, problem: 'BROKEN', status: result.status, url: p.image_url });
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Total products: ${products.length}`);
  console.log(`✅ Working: ${ok}`);
  console.log(`❌ Broken/Missing: ${broken + missing}`);
  console.log(`🐢 Slow (>3s): ${slow}`);
  console.log(`📦 Avg size: ${Math.round(totalSize / ok / 1024)}KB per image`);
  
  if (issues.length > 0) {
    console.log("\n=== ISSUES ===");
    issues.forEach(i => {
      if (i.problem === 'BROKEN') console.log(`❌ BROKEN: ${i.name} → ${i.status} → ${i.url}`);
      if (i.problem === 'NO_IMAGE_URL') console.log(`⚠️  NO URL: ${i.name}`);
      if (i.problem === 'SLOW') console.log(`🐢 SLOW: ${i.name} → ${i.time}ms`);
      if (i.problem === 'TOO_LARGE') console.log(`📦 BIG: ${i.name} → ${i.sizeKB}KB`);
    });
  }
}

audit();
