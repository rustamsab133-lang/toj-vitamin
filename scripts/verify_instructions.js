const fs = require('fs');
const path = require('path');

const enrichedData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/enriched_gls_products.json'), 'utf8')
);

const byId = enrichedData.by_product_id || {};
const ids = Object.keys(byId);

console.log('Total verified products in by_product_id:', ids.length);

let errors = [];
let sampleChecks = [];

for (const id of ids) {
  const item = byId[id];
  const name = item.name.toLowerCase();
  const inst = item.instructions || {};
  const usage = (inst.usage || '').toLowerCase();
  const contra = (inst.contraindications || '').toLowerCase();

  if (!inst.usage) {
    errors.push(`[${id}] ${item.name}: Missing usage`);
    continue;
  }

  // 1. Powder vs Capsule
  if (name.includes('порошок') && (usage.includes('капсул') || usage.includes('таблет'))) {
    errors.push(`[${id}] ${item.name} is powder but usage says capsules/tablets: ${inst.usage}`);
  }
  if (!name.includes('порошок') && !name.includes('шипуч') && !name.includes('пастилк') && !name.includes('семена') && usage.includes('растворить')) {
    errors.push(`[${id}] ${item.name} is capsule/tablet but usage says dissolve: ${inst.usage}`);
  }

  // 2. Effervescent
  if (name.includes('шипуч') && !usage.includes('растворив')) {
    errors.push(`[${id}] ${item.name} is effervescent but usage does not mention dissolving: ${inst.usage}`);
  }

  // 3. Pastilles
  if (name.includes('пастилк') && !usage.includes('разжевыва')) {
    errors.push(`[${id}] ${item.name} is pastilles but usage does not mention chewing: ${inst.usage}`);
  }

  // 4. Pregnancy
  if ((name.includes('для беременных') || name.includes('для кормящих')) && contra.includes('беременнос')) {
    errors.push(`[${id}] ${item.name} pregnancy product forbids pregnancy: ${inst.contraindications}`);
  }

  // Sample check for interesting products
  if (name.includes('b-complex') || name.includes('в-комплекс') || name.includes('берберин') || name.includes('селен') || name.includes('креатин') || name.includes('шипуч') || name.includes('коллаген')) {
    sampleChecks.push({ id, name: item.name, usage: inst.usage, contra: inst.contraindications });
  }
}

console.log('Validation Errors count:', errors.length);
if (errors.length > 0) {
  console.log('Errors:', errors);
} else {
  console.log('✅ 100% of products passed validation checks!');
}

console.log('\n--- Sample Verified Products ---');
sampleChecks.slice(0, 10).forEach(s => {
  console.log(`[${s.id}] ${s.name}`);
  console.log(`   Usage: ${s.usage}`);
});
