const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function cleanDBName(name) {
   let lower = name.toLowerCase();
   // remove common trailing info
   return lower.split(' капс.')[0].split(' порошок')[0].split(' шипучие')[0].split(' паст.')[0].replace(' gls', '').trim();
}

async function syncDb() {
    const pdfData = JSON.parse(fs.readFileSync('pdf_extracted_catalog.json', 'utf8'));
    
    const { data: dbProducts, error } = await client.from('products').select('*');
    if (error) throw error;
    
    let updatedCount = 0;
    
    for (let product of dbProducts) {
        let cleanName = cleanDBName(product.name);
        
        let match = null;
        for(let pdfKey in pdfData) {
            let cleanPdf = pdfKey.toLowerCase().replace(' gls', '').trim();
            if(cleanPdf.includes(cleanName) || cleanName.includes(cleanPdf)) {
                match = pdfData[pdfKey];
                break;
            }
        }
        
        if (match) {
            // we found a match from the PDF!
            let newDesc = [...match.properties].join('. ');
            let newHooks = match.hooks.length > 0 ? match.hooks : match.properties;
            
            // Only update if it's currently a duplicate or missing
            // Wait, we just want to force the perfect PDF text to replace whatever was there.
            await client.from('products').update({ 
                description: newDesc,
                marketing_hooks: newHooks
            }).match({ id: product.id });
            
            updatedCount++;
            console.log(`Updated: ${product.name}`);
        }
    }
    console.log(`Successfully Updated ${updatedCount} products from local PDF.`);
}

syncDb();
