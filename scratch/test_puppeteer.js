const puppeteer = require('puppeteer-core');

async function scrapeTest() {
  const searchTerm = 'Максиферт';
  console.log(`🔍 Starting scraper test for: "${searchTerm}"...`);
  
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
    
    const page = await browser.newPage();
    
    // Evade detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    const searchUrl = `https://gls.store/catalog/?q=${encodeURIComponent(searchTerm)}`;
    console.log(`Loading search URL: ${searchUrl}`);
    
    // Go to search page and wait for the results container to load
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    try {
      // Wait for either product links or a "not found" message
      await page.waitForSelector('a[href*="/catalog/"], .search-result-none', { timeout: 45000 });
    } catch (e) {
      console.log('Timeout waiting for search results selector:', e.message);
      await page.screenshot({ path: 'scratch/search_timeout.png' });
    }

    const data = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const catalogLinks = links
        .map(a => ({ href: a.getAttribute('href'), text: a.innerText.trim() }))
        .filter(link => link.href && link.href.includes('/catalog/') && link.href.split('/').filter(Boolean).length > 2);
      
      return {
        url: window.location.href,
        title: document.title,
        catalogLinks,
      };
    });
    
    if (!data.catalogLinks || data.catalogLinks.length === 0) {
      console.log('❌ Failed to find catalog links on search page.');
      return;
    }
    
    console.log('Page Title:', data.title);
    console.log('Current Page URL:', data.url);
    console.log('Found catalog links count:', data.catalogLinks.length);
    console.log('Found catalog links:', data.catalogLinks.slice(0, 5));
    
    // Find the first valid product link (skip category links if possible)
    let bestLink = data.catalogLinks.find(l => l.text && l.text.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!bestLink) bestLink = data.catalogLinks[0];
    
    const detailUrl = bestLink.href.startsWith('http') ? bestLink.href : 'https://gls.store' + bestLink.href;
    console.log(`🔗 Navigating to detail page: ${detailUrl}`);
    
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    try {
      // Wait for the h1 to appear, meaning the detail page is rendered
      await page.waitForSelector('h1', { timeout: 45000 });
    } catch (e) {
      console.log('Timeout waiting for h1 on detail page:', e.message);
      await page.screenshot({ path: 'scratch/detail_timeout.png' });
    }
    
    const htmlContent = await page.evaluate(() => document.body.innerHTML);
    require('fs').writeFileSync('scratch/product_detail.html', htmlContent);

    const productInfo = await page.evaluate(() => {
      const h1 = document.querySelector('h1') ? document.querySelector('h1').innerText.trim() : '';
      
      const descEl = document.querySelector('#desc .content');
      const descText = descEl ? descEl.innerText.trim() : '';
      
      const compEl = document.querySelector('#custom_tab .content');
      const composition = compEl ? compEl.innerText.trim() : '';

      const buyEl = document.querySelector('#buy .content');
      const usageText = buyEl ? buyEl.innerText.trim() : '';
      
      return {
        h1,
        descText,
        composition,
        usageText,
        htmlLength: document.body.innerHTML.length
      };
    });
    
    console.log('\n📊 Scraped Data:', JSON.stringify(productInfo, null, 2));
    
  } catch (err) {
    console.error('❌ Error during test scrape:', err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

scrapeTest();
