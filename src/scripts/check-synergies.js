const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSynergies() {
    const { data: products } = await client.from('products').select('id, name, synergy_product_id, synergy_reason');
    products.forEach(p => {
        if (p.synergy_reason) {
            console.log(`[${p.name}] -> Reason: ${p.synergy_reason}`);
        }
    });
}

checkSynergies();
