const axios = require('axios');
const cheerio = require('cheerio');

async function testScrape() {
  try {
    const searchTerm = 'Магний Хелат';
    console.log('Fetching', 'https://gls.store/search/?q=' + encodeURIComponent(searchTerm));
    const res = await axios.get('https://gls.store/search/?q=' + encodeURIComponent(searchTerm));
    const $ = cheerio.load(res.data);
    
    const links = [];
    $('a').each((i, el) => {
      const h = $(el).attr('href');
      // Look for product detail links
      if(h && h.includes('/catalog/') && h.split('/').length > 3) links.push(h);
    });
    
    console.log('Found catalog links:', [...new Set(links)]);
    
    const targetLink = [...new Set(links)].find(l => l.includes('magniy') || l.includes('khelat') || l.length > 20);
    
    if (targetLink) {
      console.log('Targeting:', targetLink);
      const prodUrl = targetLink.startsWith('http') ? targetLink : 'https://gls.store' + targetLink;
      const prodRes = await axios.get(prodUrl);
      const $$ = cheerio.load(prodRes.data);
      console.log('Product Name on page:', $$('h1').text().trim());
      console.log('Product Description (preview):', $$('.product-item-detail-preview-text').text().trim().substring(0, 150));
      console.log('Product Description (full):', $$('.detail-desc').text().trim().substring(0, 150));
      console.log('Tabs:', $$('.catalog-detail-tabs').text().trim().substring(0, 150));
      console.log('HTML Dump of main div classes:', $$('h1').parent().parent().attr('class'));
    }
  } catch (err) {
    console.error(err.message);
  }
}

testScrape();
