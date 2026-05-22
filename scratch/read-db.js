const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../src/data/products_db.json');
let content = fs.readFileSync(dbPath, 'utf16le');
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
console.log('First 100 chars:');
for (let i = 0; i < 100; i++) {
  console.log(`${i}: '${content[i]}' (code: ${content.charCodeAt(i)})`);
}
