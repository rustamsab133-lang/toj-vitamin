const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const CITRULLINE_ID = '105';
const SYNERGY_REASON = 'Цитруллин расширяет сосуды и улучшает кровоток, ускоряя доставку креатина в мышечные волокна. Это сочетание дает максимальный "памп" и отодвигает порог мышечной усталости.';

async function fixCreatineSynergies() {
    console.log('Fetching Creatine products...');
    const { data: creatines, error } = await client
        .from('products')
        .select('id, name')
        .ilike('name', '%креатин%');
    
    if (error) {
        console.error('Error fetching creatines:', error);
        return;
    }

    console.log(`Found ${creatines.length} creatine products. Updating...`);
    
    for (const prod of creatines) {
        const { error: updateError } = await client
            .from('products')
            .update({
                synergy_product_id: CITRULLINE_ID,
                synergy_reason: SYNERGY_REASON
            })
            .eq('id', prod.id);
        
        if (updateError) {
            console.error(`Error updating ${prod.name}:`, updateError);
        } else {
            console.log(`[✓] ${prod.name}`);
        }
    }

    console.log('\n✅ All Creatine synergies have been corrected to Citrulline.');
}

fixCreatineSynergies();
