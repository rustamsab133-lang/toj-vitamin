const fs = require('fs');
const path = 'src/components/ProductDetailModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add unoptimized and shadow
content = content.replace(
  /priority\s*sizes="\(max-width: 640px\) 100vw, 500px"\s*className="object-contain"\s*/,
  'priority\n                      unoptimized\n                      sizes="(max-width: 640px) 100vw, 500px"\n                      className="object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.05)]"\n                    '
);

fs.writeFileSync(path, content);
console.log('File updated successfully');
