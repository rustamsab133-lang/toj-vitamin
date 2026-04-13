const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function getCleanSearchTerm(name) {
    let clean = name.toLowerCase().replace(' gls', '').replace(/капс\./g, '').replace(/шипучие таб\./g, '').trim().split(' (')[0];
    return clean;
}

async function run() {
    console.log('Fetching database products...');
    const { data: products } = await client.from('products').select('id, name, description');
    
    // Find descriptions that appear more than once (duplicates)
    const descCounts = {};
    products.forEach(p => {
        descCounts[p.description] = (descCounts[p.description] || 0) + 1;
    });
    
    // Target products that still have generic duplicated texts
    const targets = products.filter(p => descCounts[p.description] > 1);
    console.log(`Found ${targets.length} products with duplicated descriptions requiring scraping.`);
    
    if(targets.length === 0) return;

    console.log('Launching headless browser...');
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    // Prevent loading images and fonts to speed up crawling
    await page.setRequestInterception(true);
    page.on('request', req => {
        if (req.resourceType() === 'image' || req.resourceType() === 'font' || req.resourceType() === 'stylesheet') {
            req.abort();
        } else {
            req.continue();
        }
    });

    let updatedCount = 0;
    
    // Process up to 50 items
    for (let i = 0; i < targets.length; i++) {
        const prod = targets[i];
        const term = getCleanSearchTerm(prod.name);
        console.log(`\n[${i+1}/${targets.length}] Searching for: ${term}`);

        try {
            await page.goto(`https://gls.store/search/?q=${encodeURIComponent(term)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
            
            // Wait for React to render search results
            try {
                await page.waitForSelector('.catalog-list .product-item-title a, .search-result a', { timeout: 5000 });
            } catch (e) {
                console.log(' -> No search results loaded in time.');
                continue;
            }

            const href = await page.evaluate(() => {
                const link = document.querySelector('.catalog-list .product-item-title a') || document.querySelector('.search-result a');
                return link ? link.getAttribute('href') : null;
            });

            if (!href) {
                console.log(' -> No product link found in results.');
                continue;
            }

            const prodUrl = href.startsWith('http') ? href : 'https://gls.store' + href;
            console.log(` -> Found product page: ${prodUrl}`);
            
            await page.goto(prodUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            
            // Wait for description render
            try {
                await page.waitForSelector('.product-item-detail-preview-text, .detail-desc', { timeout: 5000 });
            } catch(e) {}
            
            const scraped = await page.evaluate(() => {
                let desc = '';
                const previewEl = document.querySelector('.product-item-detail-preview-text');
                if (previewEl) desc += previewEl.innerText + '\\n';
                const descEl = document.querySelector('.detail-desc');
                if (descEl) desc += descEl.innerText;
                
                // Try grabbing list items as hooks
                let hooks = [];
                const listItems = document.querySelectorAll('.product-item-detail-preview-text ul li, .detail-desc ul li');
                listItems.forEach(li => {
                    const text = li.innerText.trim();
                    if(text && text.length > 5) hooks.push(text);
                });
                
                return { description: desc.trim().replace(/\\n/g, ' '), hooks };
            });

            if (scraped && scraped.description.length > 20) {
                console.log(` -> Successfully pulled data: ${scraped.description.substring(0, 50)}...`);
                // Format for Supabase
                const finalHooks = scraped.hooks.length > 0 ? scraped.hooks : [scraped.description.split('.')[0]];
                
                // Update DB
                await client.from('products').update({ 
                    description: scraped.description,
                    marketing_hooks: finalHooks
                }).match({ id: prod.id });
                
                updatedCount++;
            } else {
                 console.log(' -> Data was empty on product page.');
            }

        } catch (err) {
            console.log(` -> Error navigating: ${err.message}`);
        }
    }

    await browser.close();
    console.log(`\n✅ Finished! Scraped and updated ${updatedCount} products from gls.store`);
}

run();
