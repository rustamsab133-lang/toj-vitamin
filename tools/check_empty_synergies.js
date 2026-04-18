const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
    const { data, error } = await supabase
        .from('products')
        .select('name, category_id, description')
        .is('synergy_product_id', null);
    
    if (error) {
        console.error(error);
        return;
    }

    // Group by category to see what's left
    const categories = {};
    for (const p of data) {
        if (!categories[p.category_id]) categories[p.category_id] = [];
        categories[p.category_id].push(p.name);
    }

    console.log(JSON.stringify(categories, null, 2));
}

check();
