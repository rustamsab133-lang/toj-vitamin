const fs = require('fs');

function extractProducts(filename) {
    const text = fs.readFileSync(filename, 'utf8');
    const pages = text.split('---PAGE_BREAK---');
    
    let catalog = {};
    
    pages.forEach(page => {
        // Simple heuristic: If page has "Свойства" and "Действие" it usually describes a product.
        if (page.includes('Свойства') && page.includes('Действие') && page.includes('Состав')) {
            const lines = page.split('\n').map(l => l.trim()).filter(l => l !== '');
            // Find the product name: usually before "Биологически активная добавка" or after asterisks.
            let nameIndex = lines.findIndex(l => l.includes('Биологически активная добавка'));
            let name = "";
            if (nameIndex > 0) {
               // The name is usually the element directly preceding this.
               name = lines[nameIndex - 1];
               if(name.includes('*')) {
                   name = lines[nameIndex - 2] || name; 
               }
            } else {
               name = lines[0];
            }
            
            // Extract Properties
            let propsStart = lines.findIndex(l => l.includes('Свойства'));
            let propsEnd = lines.findIndex(l => l.includes('Действие'));
            let props = [];
            if (propsStart !== -1 && propsEnd !== -1) {
                for (let i = propsStart + 1; i < propsEnd; i++) {
                    let prop = lines[i].replace(/^•\s*/, '').trim();
                    if (prop) props.push(prop);
                }
            }
            
            // Extract Actions (Marketing hooks)
            let hooksStart = propsEnd;
            let hooks = [];
            if (hooksStart !== -1) {
                for (let i = hooksStart + 1; i < lines.length; i++) {
                    if(lines[i].includes('*')) break; // End of hooks usually
                    let hook = lines[i].replace(/^•\s*/, '').trim();
                    if (hook) hooks.push(hook);
                }
            }

            if(name) {
                catalog[name.toLowerCase()] = {
                    name,
                    properties: props,
                    hooks: hooks
                };
            }
        }
    });
    
    console.log(`Extracted ${Object.keys(catalog).length} products from PDF.`);
    fs.writeFileSync('pdf_extracted_catalog.json', JSON.stringify(catalog, null, 2));
}

extractProducts('catalog_new_50_21.01.25_dump.txt');
