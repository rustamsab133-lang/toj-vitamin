const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
    console.log('--- Checking 5-HTP and MSM ---');
    const { data, error } = await supabase
        .from('products')
        .select('id, name, synergy_product_id, synergy_reason')
        .or('name.ilike.%5-HTP%,name.ilike.%MSM%');
    
    if (error) {
        console.error(error);
        return;
    }

    for (const p of data) {
        const partner = p.synergy_product_id 
            ? (await supabase.from('products').select('name').eq('id', p.synergy_product_id).single()).data?.name
            : 'None';
        
        console.log(`\n[Product]: ${p.name}`);
        console.log(`[Partner]: ${partner} (ID: ${p.synergy_product_id})`);
        console.log(`[Reason]:  ${p.synergy_reason}`);
    }
}

check();
