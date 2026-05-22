const axios = require('axios');
const fs = require('fs');

async function test() {
  try {
    const url = 'https://gls.store/catalog/?q=' + encodeURIComponent('5-HTP');
    console.log('Fetching search URL:', url);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Search response status:', response.status);
    fs.writeFileSync('scratch/search_result.html', response.data);
    console.log('Saved to scratch/search_result.html');

    // Let's try to find links to product pages
    // Usually they look like: <a href="/catalog/gormony-stress/5_htp_5_gidroksitriptofan_kapsuly_60_sht_gls/" ...
    const matches = Array.from(response.data.matchAll(/href="(\/catalog\/[^"]+)"/g));
    const catalogLinks = [...new Set(matches.map(m => m[1]))].filter(l => l.split('/').length > 3);
    console.log('Found catalog links:', catalogLinks);
  } catch (err) {
    console.error('Error fetching:', err.message);
  }
}
test();
