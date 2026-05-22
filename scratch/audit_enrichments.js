const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../src/data/products_db.json');
const enrichPath = path.join(__dirname, '../src/data/enriched_gls_products.json');

const products = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const enrichments = JSON.parse(fs.readFileSync(enrichPath, 'utf8'));

// Helper to normalize strings for robust comparison
function normalize(str) {
  return str.toLowerCase()
    .replace(/[^a-zа-я0-9]/g, '')
    .trim();
}

console.log(`📊 Total products in DB: ${products.length}`);
console.log(`📊 Total keys in enriched JSON: ${Object.keys(enrichments).length}`);

// We will map each enrichment key to its matches in products_db
const activeKeys = new Set();
const unmatchedEnrichKeys = [];
const matchedEnrichKeys = [];

for (const enrichKey of Object.keys(enrichments)) {
  const normEnrich = normalize(enrichKey);
  const entry = enrichments[enrichKey];
  const normEnrichName = normalize(entry.name || enrichKey);

  // Find a product in products_db that matches
  const match = products.find(p => {
    const normPName = normalize(p.name);
    return normPName.includes(normEnrich) || normPName.includes(normEnrichName) || 
           normEnrich.includes(normPName) || normEnrichName.includes(normPName);
  });

  if (match) {
    activeKeys.add(enrichKey);
    matchedEnrichKeys.push({ enrichKey, matchedDbProduct: match.name });
  } else {
    unmatchedEnrichKeys.push(enrichKey);
  }
}

console.log('\n✅ MATCHED ENRICHMENT KEYS (TO KEEP):', matchedEnrichKeys.length);
matchedEnrichKeys.forEach(m => console.log(` - "${m.enrichKey}" matches db: "${m.matchedDbProduct}"`));

console.log('\n❌ UNMATCHED ENRICHMENT KEYS (TO DELETE):', unmatchedEnrichKeys.length);
unmatchedEnrichKeys.forEach(k => console.log(` - "${k}"`));

// Create a cleaned enrichment object
const cleanedEnrichments = {};
for (const key of activeKeys) {
  cleanedEnrichments[key] = enrichments[key];
}

console.log(`\n🧹 Cleaned enriched JSON will contain ${Object.keys(cleanedEnrichments).length} keys.`);

// Save to scratch for verification first
const backupPath = path.join(__dirname, '../src/data/enriched_gls_products.json.bak');
fs.writeFileSync(backupPath, JSON.stringify(enrichments, null, 2), 'utf8');
fs.writeFileSync(enrichPath, JSON.stringify(cleanedEnrichments, null, 2), 'utf8');
console.log(`\n💾 Saved original backup to: src/data/enriched_gls_products.json.bak`);
console.log(`💾 Rewrote clean file at: src/data/enriched_gls_products.json`);

// Now let's see which products in products_db have NO entry in cleanedEnrichments
const missingProducts = [];
for (const p of products) {
  const normP = normalize(p.name);
  let found = false;
  for (const enrichKey of Object.keys(cleanedEnrichments)) {
    const normEnrich = normalize(enrichKey);
    const normEnrichName = normalize(cleanedEnrichments[enrichKey].name || enrichKey);
    if (normP.includes(normEnrich) || normP.includes(normEnrichName) || 
        normEnrich.includes(normP) || normEnrichName.includes(normP)) {
      found = true;
      break;
    }
  }
  if (!found) {
    missingProducts.push(p.name);
  }
}

console.log(`\n🔍 Active products lacking any enrichment data: ${missingProducts.length}`);
missingProducts.slice(0, 20).forEach(m => console.log(` - "${m}"`));
if (missingProducts.length > 20) console.log(` ... and ${missingProducts.length - 20} more.`);
