const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 1. MASTER EXPERT MAPPINGS (Product Key -> [Partner Search Name, Reason])
const expertSynergies = {
    '5-HTP': {
        partner: 'Магний',
        reason: 'Магний Хелат расслабляет мышцы, создавая идеальный фон для работы гормонов сна.'
    },
    'ТРИПТОФАН': {
        partner: 'Магний',
        reason: 'Магний способствует спокойствию ЦНС, усиливая антидепрессивный эффект триптофана.'
    },
    'MSM': {
        partner: 'Омега 3',
        reason: 'Омега-3 снижает воспаление в оболочке клеток, позволяя MSM быстрее проникать и восстанавливать ткани суставов.'
    },
    'КРЕАТИН': {
        partner: 'Цитруллин',
        reason: 'Цитруллин расширяет сосуды, ускоряя доставку креатина в мышцы для максимального пампа.'
    },
    'ЖЕЛЕЗО': {
        partner: 'Витамин С',
        reason: 'Витамин С создает кислую среду, в которой железо усваивается в 2-3 раза эффективнее.'
    },
    'ВИТАМИН D3': {
        partner: 'Витамин K2',
        reason: 'Витамин К2 направляет кальций (усвоенный с помощью D3) точно в кости, а не в сосуды.'
    },
    'КАЛЬЦИЙ': {
        partner: 'Витамин D3',
        reason: 'Витамин D3 — жирорастворимый ключ, который открывает "ворота" для всасывания кальция в кишечнике.'
    },
    'ЦИНК': {
        partner: 'Селен',
        reason: 'Синергия цинка и селена — двойная защита для иммунитета и репродуктивной системы.'
    },
    'ГИАЛУРОНОВАЯ': {
        partner: 'Коллаген',
        reason: 'Коллаген создает каркас, а гиалуроновая кислота наполняет его влагой — идеальное комбо для кожи.'
    },
    'B-КОМПЛЕКС': {
        partner: 'Магний',
        reason: 'Витамины группы B и Магний работают вместе для глубокого восстановления нервной системы.'
    },
    'ИНОЗИТОЛ': {
        partner: 'Фолиевая',
        reason: 'Комбинация инозитола и фолиевой кислоты — золотой стандарт для женского гормонального здоровья.'
    },
    'МАКСИФЕРТ': {
        partner: 'Фолиевая',
        reason: 'Инозит в составе Максиферта и фолиевая кислота — идеальная пара для подготовки к зачатию.'
    },
    'КОЛЛАГЕН': {
        partner: 'Витамин С',
        reason: 'Витамин С необходим организму для синтеза собственного коллагена из поступивших аминокислот.'
    }
};

async function restoreSynergies() {
    console.log('--- SYNERGY RESTORATION STARTED ---');

    // 1. Fetch all products
    const { data: allProducts, error } = await supabase.from('products').select('id, name');
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }

    console.log(`Analyzing ${allProducts.length} products...`);
    let updatedCount = 0;
    let clearedCount = 0;

    for (const product of allProducts) {
        let found = false;
        
        // Find matching expert synergy
        for (const [key, config] of Object.entries(expertSynergies)) {
            if (product.name.toUpperCase().includes(key)) {
                // Find potential partner
                const partnerProduct = allProducts.find(p => 
                    p.id !== product.id && 
                    p.name.includes(config.partner)
                );

                if (partnerProduct) {
                    await supabase.from('products').update({
                        synergy_product_id: partnerProduct.id,
                        synergy_reason: config.reason
                    }).eq('id', product.id);
                    
                    console.log(`[✓] ${product.name} -> ${partnerProduct.name}`);
                    updatedCount++;
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            // Clear synergy if no expert mapping found (per user request)
            await supabase.from('products').update({
                synergy_product_id: null,
                synergy_reason: null
            }).eq('id', product.id);
            clearedCount++;
        }
    }

    console.log(`\n--- SUMMARY ---`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Cleared: ${clearedCount}`);
    console.log(`Total:   ${allProducts.length}`);
}

restoreSynergies();
