const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function auditSEO() {
  console.log("--- STARTING SEO VALIDATION AUDIT ---");
  
  const baseUrl = 'http://localhost:3001'; // Проверяем на локальном сервере
  const cities = ['dushanbe', 'khujand'];
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: products } = await supabase.from('products').select('name').limit(2);
  const slugify = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/[<>:"/\\|?*#%&()[\]]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // 1. Проверка robots.txt
  console.log("\n[1/4] Checking robots.txt...");
  try {
    const res = await axios.get(`${baseUrl}/robots.txt`);
    if (res.data.includes('Sitemap:')) {
      console.log("✅ robots.txt is present and points to sitemap.");
    } else {
      console.log("❌ robots.txt is missing sitemap link.");
    }
  } catch (e) {
    console.log("❌ robots.txt is inaccessible (Is the server running?)");
  }

  // 2. Проверка случайной региональной страницы
  if (products && products.length > 0) {
    const testUrl = encodeURI(`${baseUrl}/buy/${cities[0]}/${slugify(products[0].name)}`);
    console.log(`\n[2/4] Auditing Regional Page: ${testUrl}`);
    
    try {
      const res = await axios.get(testUrl);
      const html = res.data;
      
      // Проверка H1
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
      const hasCity = h1Match && h1Match[1].includes('Душанбе');
      console.log(hasCity ? "✅ H1 contains the correct city name." : "❌ H1 is incorrect.");

      // Проверка Canonical
      const hasCanonical = html.includes(`rel="canonical" href="https://www.toj-vitamin.tj/buy/${cities[0]}`);
      console.log(hasCanonical ? "✅ Canonical tag is correct." : "❌ Canonical tag is missing or wrong.");

      // Проверка JSON-LD
      const hasJsonLd = html.includes('application/ld+json');
      console.log(hasJsonLd ? "✅ JSON-LD Structured Data found." : "❌ JSON-LD is missing.");

    } catch (e) {
      console.log(`❌ Failed to fetch page: ${e.message}`);
    }
  }

  // 3. Проверка Sitemap
  console.log("\n[3/4] Checking sitemap.xml structure...");
  try {
    const res = await axios.get(`${baseUrl}/sitemap.xml`);
    const count = (res.data.match(/<url>/g) || []).length;
    console.log(`✅ Sitemap is active. Found ${count} URLs.`);
  } catch (e) {
    console.log("❌ sitemap.xml is missing or failed to generate.");
  }

  console.log("\n--- AUDIT FINISHED ---");
}

auditSEO();
