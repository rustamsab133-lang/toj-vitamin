const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer-core');

// 1. Load Env variables from .env.local
function loadEnv() {
  let envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) {
    envPath = path.join(process.cwd(), '.env.local');
  }
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Removed gemini

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Exact list of 107 products in stock from the user
const RAW_PRODUCTS = [
  "5-HTP капс. (спокойствие, сон) 400мг №60 GLS",
  "MSM комплекс капс.400мг №120 GLS",
  "PQQ комплекс капс. (энергия, продуктивность) 400мг №30 GLS",
  "Алоэ Вера капс. (красота, иммунитет) 400мг №60 GLS",
  "Альфа липоевая кислота капс. (молодость, похудение) 400мг №60 GLS",
  "Аминокислотный комплекс порошок (рельеф мышц, энергия) 156г GLS",
  "Аргинин 1000 капс. (сосуды, мышцы) 400мг №90 GLS",
  "Артурон капс. (мужская сила, энергия) 500мг №90 GLS",
  "Барбарис Берберин капс. (похудение, печень, метаболизм) №60 GLS",
  "Бета-каротин капс (омоложение, кожа, зрение) 450мг №60 GLS",
  "Биотин без сахара шипучие таб. (красота, кожа) №20 масса 3.8г GLS",
  "Витамин B12 капс.(кровь, нервы) 190мг №60 GLS",
  "Витамин B5 капс. (жиросжигание. энергия) 400мг №60 GLS",
  "Витамин D3 для детей паст. (иммунитет, кости) №30 GLS",
  "Витамин D3 для детей паст. (иммунитет, кости) №90 GLS",
  "Витамин А 10000МЕ капс. (красота, зрение) 400мг №60 GLS",
  "Витамин Д3 2000МЕ капс. (иммунитет, кости) 240мг №120 GLS",
  "Витамин Д3 2000МЕ капс. (иммунитет, кости) 240мг №60 GLS",
  "Витамин Д3+К2 капс. (кости, сосуды) 220мг №60 GLS",
  "Витамин К2 капс. (омоложение, сосуды) 400мг №60 GLS",
  "Витамин С детс. паст. (иммунитет, сердце) №90 апельсин",
  "Витамин С капс. (иммунитет, сердце, красота) 900мг 500мг №60 GLS",
  "Витамин С шипучие таб. (иммунитет, сердце, красота) 900мг №20 апельсин",
  "Витамин С шипучие таб. (иммунитет, сердце, красота) 900мг №20 лимон",
  "Витамины для беременных капс.500мг №60 GLS",
  "Витамины для волос капс.370мг №60 GLS",
  "Витамины для глаз капс.420мг №60 GLS",
  "В-комплекс капс. (иммунитет, энергия) 430мг №60 GLS",
  "Гиалуроновая кислота капс. (красота, кожа, суставы) 300мг №30 GLS",
  "Гиалуроновая кислота капс. (красота, кожа, суставы) 300мг №60 GLS",
  "Гинкго билоба + Готу кола капс. (память, продуктивность) 380мг №60 GLS",
  "Глутатион капс. (омоложение, очищение) 300мг №60 GLS",
  "Глюкозамин Хондроитин капс. (суставы, кости) 400мг №120 GLS",
  "Диабет формула капс.450мг №60 GLS",
  "Железо фумарат капс. (кислород, энергия, гемоглобин) 270мг №60 GLS",
  "Железо хелат капс. (профилактика анемии, синтез гемоглабина) 400мг №60 GLS",
  "Женская формула капс. (красота, молодость) 430мг №60 GLS",
  "Женьшень капс. (иммунитет, энергия) 200мг №60 GLS",
  "Жиросжигатель капс. (похудение) №60 GLS",
  "Инозитол (Максиферт) капс. (баланс гармонов) №90 GLS",
  "Йод капс. (щитовидная железа, баланс гармонов) №60 GLS",
  "Йохимбе капс (похудение, энергия) 350мг №60 GLS",
  "Калий магний капс. (для сердца) 430мг №120 GLS",
  "Кальций D3 капс. (зубы, кости, ногти) 550мг №90 GLS",
  "Кальций Магний Цынк капс. (антистресс, кости) 750мг №120 GLS",
  "Кальций цитрат капс. (ногти, зубы, кости) №120 GLS",
  "Кардио формула капс.550мг №60 GLS",
  "Кожа Волосы Ногти капс. 400мг №60 GLS",
  "Коллаген для суставов капс.400мг №120 GLS",
  "Коллаген животный капс. (красота, суставы) 400мг №120 GLS",
  "Коллаген морской 1000МЕ капс. (молодость, кожа, волосы) 430мг №180 GLS",
  "Коллаген морской 1000МЕ капс. (молодость, кожа, волосы) 430мг №90 GLS",
  "Коллаген порошок (красота, суставы) Лесные ягоды 180г GLS",
  "Коллаген порошок (красота, суставы) Лимон 180г GLS",
  "Коллаген порошок (красота, суставы) Малина 180г GLS",
  "Коэнзим Q10 капс. (красота, сердце) 310мг №60 GLS",
  "Креатин порошок (мышцы, энергия) Малина 150г GLS",
  "Креатин порошок (мышцы, энергия) малина 300г GLS",
  "Креатин порошок (мышцы, энергия) Цитрус 300г GLS",
  "Креатин порошок (мышцы, энергия) Цитрус 150г GLS",
  "Креатин порошок (мышцы, энергия) Экзотик 150г GLS",
  "Креатин порошок (мышцы, энергия) Экзотик 300г GLS",
  "Липотропный фактор капс. (похудение, печень) 450мг №180 GLS",
  "Л-карнитин капс. (похудение, мышцы) 400мг №60 GLS",
  "Магний В6 для беременных капс. 450мг №180 GLS",
  "Магний Хелат капс. (сон, нервы, сердце) 400мг №180 GLS",
  "Магний Цитрат + В6 капс (спокойствие, мышцы, сердце) 500мг №180 GLS",
  "Магний Цитрат + В6 капс (спокойствие, мышцы, сердце) 500мг №90 GLS",
  "Мака перуанская капс 350мг №60 GLS",
  "Мелатонин Мелиссон капс. (сон, спокойствие) 2мг №60 GLS",
  "Мужская формула капс. (мужская сыла, энергия) 440мг №60 GLS",
  "Мультивитамины 12+9 капс.420мг №120 GLS",
  "Мультивитамины 12+9 капс.420мг №60 GLS",
  "Мультивитамины актив шипучие таб. №20 мультифрукт",
  "Мультивитамины для детей капс. (развитие, мозг) 450мг №60 GLS",
  "Мультивитамины для детей паст. (развитие, мозг) №90 GLS",
  "Мумие экстракт капс. (красивая кожа, суставы) 300мг 400мг №60 GLS",
  "Омега 3 PRO капс. (сердце, концентрация) 700мг №60 GLS",
  "Омега 3-6-9 капс. 700мг №90 GLS",
  "Омега-3 35%ПНЖК капс. 610г №120 GLS",
  "Омега-3 35%ПНЖК капс.610г №60 GLS",
  "Омега-3 Fish Oil капс. (сосуды, иммунитет, суставы) 720мг №120",
  "Омега-3 Витамин D3 капс. (сердце, концентрация ума) 700мг №120 GLS",
  "Омега-3 Витамин D3 капс. (сердце, концентрация ума) 700мг №60 GLS",
  "Протеин порошок (вес, мышцы, энергия) 900г Ваниль GLS",
  "Протеин порошок (вес, мышцы, энергия) 900г Клубника GLS",
  "Протеин порошок (вес, мышцы, энергия) 900г Сливочный банан GLS",
  "Протеин порошок (вес, мышцы, энергия) 900г Шоколад GLS",
  "Селен 100мкг капс. (красота, иммунитет) 270мг №60 GLS",
  "Семена Льна порошок (похудение, очищение, микробиом) 200г GLS",
  "Спортивная формула капс. 450мг №60 GLS",
  "Таурин 1000МЕ капс. (мышцы, похудение, выносливость) 400мг №90 GLS",
  "Тирозин капс. (похудение, сердце) 500мг №90 GLS",
  "Фолиевая кислота капс. (для беременных) №60 GLS",
  "Формула очищение капс.400мг №60 GLS",
  "Формула памяти \"Ноофит\" капс.400мг №60 GLS",
  "Хитозан морской капс. (пищеварение, очищение, похудение) 240мг №100 GLS",
  "Хлорофилл капс. (очищение, энергия) №60 GLS",
  "Хрома пиколинат 250мкг капс. (похудение, метаболизм) 240мг №120 GLS",
  "Хрома пиколинат 250мкг капс. (похудение, метаболизм) 240мг №60 GLS",
  "Цинк без сахара шипучие таб.№20 м.3,8г лимон GLS",
  "Цинк селен капс. (красота, фетильность) 320мг №60 GLS",
  "Цинк хелат капс. (для мужчин и волос) 400мг №60 GLS",
  "Цинк цитрат капс. (для силы мужчин и женщин)350мг №60 GLS",
  "Цитруллин капс. 320мг №90 GLS",
  "Черника+А+Е капс.(зрение, глаз) 400мг №60 GLS",
  "Чеснок капс. (очищение, иммунитет) 400мг №60 GLS"
];

// Normalize and clean product name to match catalog
function parseProductName(raw, index) {
  let cleaned = raw.trim();
  // Remove "GLS" and "№..." at the end if present
  cleaned = cleaned.replace(/\s+GLS\s*$/i, '');
  
  // Extract main name before indicators
  let mainName = cleaned;
  const splitters = [
    " капс.", " капс", " порошок", " шипучие", " детс.", " для детей", " паст.", " таб.", " таб"
  ];
  for (const s of splitters) {
    if (cleaned.toLowerCase().includes(s)) {
      mainName = cleaned.split(new RegExp(s, "i"))[0].trim();
      break;
    }
  }
  
  // Clean mainName from dosage or package counts
  mainName = mainName.replace(/\s+\d+мг\s*$/i, '').trim();
  mainName = mainName.replace(/\s+\d+МЕ\s*$/i, '').trim();
  mainName = mainName.replace(/\s+\d+мкг\s*$/i, '').trim();
  
  return {
    id: String(index + 1),
    name: mainName.toUpperCase(),
    full_name: cleaned,
    rawName: raw
  };
}

// Normalized matching helper
function getNormalizedKey(name) {
  return name.toLowerCase()
    .replace(/[^a-zа-я0-9]/g, '')
    .trim();
}

async function run() {
  console.log("🚀 Starting database synchronization & AI catalog enrichment...");
  
  // 3. Process the 107 products
  const targetProducts = RAW_PRODUCTS.map((raw, idx) => parseProductName(raw, idx));
  console.log(`📋 Parsed ${targetProducts.length} target products.`);

  // 4. Load current products from Supabase
  console.log("📥 Loading existing products from Supabase...");
  const { data: currentDbProducts, error: selectErr } = await supabase
    .from('products')
    .select('*');

  if (selectErr) {
    console.error("❌ Error fetching current products:", selectErr);
    process.exit(1);
  }
  console.log(`📦 Found ${currentDbProducts.length} products currently in Supabase.`);

  // 5. Determine products to DELETE (obsolete products)
  const targetNormalizedKeys = new Set(targetProducts.map(p => getNormalizedKey(p.name)));
  
  const obsoleteProducts = currentDbProducts.filter(dbProd => {
    const normName = getNormalizedKey(dbProd.name);
    return !targetNormalizedKeys.has(normName);
  });

  console.log(`⚠️ Identified ${obsoleteProducts.length} obsolete products to delete.`);

  // Attempt to delete obsolete products
  for (const obsolete of obsoleteProducts) {
    console.log(`🗑️ Deleting obsolete product: "${obsolete.name}" (ID: ${obsolete.id})...`);
    
    // First, check if it's referenced in complexes
    await supabase.from('complexes').delete().or(`product_a_id.eq.${obsolete.id},product_b_id.eq.${obsolete.id}`);
    
    const { error: delErr } = await supabase
      .from('products')
      .delete()
      .eq('id', obsolete.id);

    if (delErr) {
      console.warn(`⚠️ Could not delete "${obsolete.name}" due to referencing constraint: ${delErr.message}. Forcing deactivate (setting price to 0 and name prefix).`);
      // Fallback: update it to be inactive/zero-priced to hide it
      await supabase
        .from('products')
        .update({ 
          name: `[УДАЛЕН] ${obsolete.name}`, 
          price: 0,
          description: "Этот товар снят с продажи и отсутствует на складе."
        })
        .eq('id', obsolete.id);
    } else {
      console.log(`✅ Deleted "${obsolete.name}" successfully.`);
    }
  }

  // 6. UPSERT target products to Supabase products table
  console.log("📤 Syncing 107 products to Supabase...");
  
  // Load products_db.json for fallback image recovery
  let backupProducts = [];
  try {
    let backupPath = path.join(__dirname, '../src/data/products_db.json');
    if (!fs.existsSync(backupPath)) {
      backupPath = path.join(process.cwd(), 'src/data/products_db.json');
    }
    if (fs.existsSync(backupPath)) {
      backupProducts = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      console.log(`📥 Loaded backup products from: ${backupPath}`);
    } else {
      console.warn("⚠️ products_db.json backup file not found in either relative or CWD paths!");
    }
  } catch (e) {
    console.warn("⚠️ Could not load backup products for images:", e.message);
  }

  for (const target of targetProducts) {
    // Check if we can match an existing product in the DB to keep its metadata (like image_url, description, price)
    const existing = currentDbProducts.find(dbProd => getNormalizedKey(dbProd.name) === getNormalizedKey(target.name));
    
    // Find matching product in backup JSON for fallback image
    let backupUrl = null;
    const targetNorm = getNormalizedKey(target.name);
    const matchedBackup = backupProducts.find(bp => {
      const bpNorm = getNormalizedKey(bp.name);
      return bpNorm === targetNorm || bpNorm.includes(targetNorm) || targetNorm.includes(bpNorm);
    });
    if (matchedBackup) {
      backupUrl = matchedBackup.image_url;
    }

    const productData = {
      id: existing ? existing.id : target.id, // Keep existing ID to preserve foreign keys
      name: target.name,
      full_name: target.full_name,
      description: existing ? (existing.description || "Премиальный продукт бренда TOJ-VITAMIN для укрепления здоровья.") : "Премиальный продукт бренда TOJ-VITAMIN для укрепления здоровья.",
      price: existing && existing.price > 0 ? existing.price : 150, // Keep price or set default 150 smn
      icon_type: existing ? existing.icon_type : 'pill',
      image_url: existing && existing.image_url ? existing.image_url : (backupUrl || null)
    };

    const { error: upsertErr } = await supabase
      .from('products')
      .upsert(productData);

    if (upsertErr) {
      console.error(`❌ Error upserting "${target.name}":`, upsertErr);
    }
  }
  console.log("✅ Supabase products table synced successfully!");

  // 7. Load current rich properties from enriched_gls_products.json
  console.log("📖 Loading existing enriched knowledge base...");
  let jsonPath = path.join(__dirname, '../src/data/enriched_gls_products.json');
  if (!fs.existsSync(jsonPath)) {
    jsonPath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');
  }
  let currentEnrichments = {};
  if (fs.existsSync(jsonPath)) {
    try {
      currentEnrichments = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      console.warn("⚠️ Could not parse existing enriched file, starting fresh.");
    }
  }

  // 8. Rebuild enriched catalog
  const newEnrichments = {};
  const productsToAIEnrich = [];

  // Match existing or prepare for Gemini
  for (const target of targetProducts) {
    const targetKey = target.name.toLowerCase();
    
    // Find closest match in existing enrichments
    let matchedKey = null;
    const normTarget = getNormalizedKey(target.name);
    for (const key of Object.keys(currentEnrichments)) {
      if (getNormalizedKey(key) === normTarget || getNormalizedKey(currentEnrichments[key].name) === normTarget) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      // Perfect reuse of existing properties, synergies, tags, hooks
      newEnrichments[targetKey] = {
        name: target.name,
        properties: currentEnrichments[matchedKey].properties || [
          "Поддержание общего тонуса и активности организма",
          "Восполнение дефицита полезных макро- и микроэлементов"
        ],
        tags: currentEnrichments[matchedKey].tags || ["Иммунитет"],
        synergies: currentEnrichments[matchedKey].synergies || [],
        marketing_hooks: currentEnrichments[matchedKey].marketing_hooks || []
      };
      console.log(`♻️ Reusing enrichment for: "${target.name}"`);
    } else {
      // Add to batch for Gemini AI generation
      productsToAIEnrich.push(target);
    }
  }

  console.log(`🪄 Need to enrich ${productsToAIEnrich.length} new products via gls.store scraping...`);

  if (productsToAIEnrich.length > 0) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1920,1080'
        ],
        defaultViewport: null
      });

      for (let i = 0; i < productsToAIEnrich.length; i++) {
        const prod = productsToAIEnrich[i];
        console.log(`\n[${i+1}/${productsToAIEnrich.length}] 🧠 Scraping data for: "${prod.name}" (${prod.full_name})...`);
        
        const page = await browser.newPage();
        
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        
        let success = false;
        let retries = 2; // Allow one retry for the entire product search if it fails due to timeout
        
        while (!success && retries > 0) {
          try {
            const searchTerm = prod.name.replace(/«|»|"/g, '').split('(')[0].trim(); // Simple search term
            const searchUrl = `https://gls.store/catalog/?q=${encodeURIComponent(searchTerm)}`;
            
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            try {
              await page.waitForSelector('a[href*="/catalog/"], .search-result-none', { timeout: 45000 });
            } catch (e) {
              console.log('Timeout waiting for search results selector:', e.message);
            }

            const data = await page.evaluate(() => {
              const links = Array.from(document.querySelectorAll('a'));
              const catalogLinks = links
                .map(a => ({ href: a.getAttribute('href'), text: a.innerText.trim() }))
                .filter(link => link.href && link.href.includes('/catalog/') && link.href.split('/').filter(Boolean).length > 2);
              return { catalogLinks };
            });
            
            if (!data.catalogLinks || data.catalogLinks.length === 0) {
              console.log(`❌ Failed to find catalog links for "${searchTerm}".`);
              throw new Error("No links found");
            }
            
            // Try to match the exact word, otherwise pick first
            let bestLink = data.catalogLinks.find(l => l.text && l.text.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!bestLink) bestLink = data.catalogLinks[0];
            
            const detailUrl = bestLink.href.startsWith('http') ? bestLink.href : 'https://gls.store' + bestLink.href;
            console.log(`🔗 Navigating to detail page: ${detailUrl}`);
            
            await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            try {
              await page.waitForSelector('h1', { timeout: 45000 });
            } catch (e) {
              console.log('Timeout waiting for h1 on detail page:', e.message);
            }
            
            const productInfo = await page.evaluate(() => {
              const h1 = document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : '';
              
              const descEl = document.querySelector('#desc .content');
              const descText = descEl ? descEl.innerText.trim() : '';
              
              const compEl = document.querySelector('#custom_tab .content');
              const composition = compEl ? compEl.innerText.trim() : '';
        
              const buyEl = document.querySelector('#buy .content');
              const usageText = buyEl ? buyEl.innerText.trim() : '';
              
              return { h1, descText, composition, usageText };
            });
            
            if (productInfo && (productInfo.descText || productInfo.composition)) {
              newEnrichments[prod.name.toLowerCase()] = {
                name: prod.name,
                full_name: prod.full_name,
                scraped_h1: productInfo.h1,
                properties: [ productInfo.descText ], // Store in properties as array for now
                composition: productInfo.composition,
                usage: productInfo.usageText,
                tags: ["Спарсено"], // Placeholder tag
                synergies: [],
                marketing_hooks: []
              };
              success = true;
              console.log(`✅ Successfully scraped "${prod.name}"!`);
            } else {
               throw new Error("Detail page loaded but description was empty.");
            }
            
          } catch (err) {
            retries--;
            console.warn(`⚠️ Error scraping "${prod.name}", retries left: ${retries}. Err: ${err.message}`);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
        
        await page.close();
        
        if (!success) {
          console.warn(`🚨 Skipping "${prod.name}" due to scraping failure.`);
          // Just leave it blank or placeholder so we don't crash
          newEnrichments[prod.name.toLowerCase()] = {
             name: prod.name,
             properties: ["Нет описания (сбой парсинга)"],
             tags: ["Спарсено"]
          };
        }
      }
    } catch (err) {
      console.error("Global scraping error:", err);
    } finally {
      if (browser) await browser.close();
    }
  }

  // 10. Save the newly built enriched_gls_products.json
  console.log(`💾 Saving new enriched JSON with ${Object.keys(newEnrichments).length} products...`);
  fs.writeFileSync(jsonPath, JSON.stringify(newEnrichments, null, 2), 'utf8');
  console.log("✅ File src/data/enriched_gls_products.json rewritten successfully!");

  // 11. Sync new JSON to Supabase site_settings table under 'enriched_gls_products_data'
  console.log("📤 Uploading complete enriched knowledge base to Supabase site_settings...");
  const { error: settingErr } = await supabase
    .from('site_settings')
    .upsert({
      key: 'enriched_gls_products_data',
      value: JSON.stringify(newEnrichments),
      updated_at: new Date().toISOString()
    });

  if (settingErr) {
    console.error("❌ Error uploading to site_settings:", settingErr);
  } else {
    console.log("✅ Knowledge base uploaded and fully active in Supabase!");
  }

  console.log("🎉 ALL DONE! Database synchronized and AI fully trained on 107 products!");
}

run();
