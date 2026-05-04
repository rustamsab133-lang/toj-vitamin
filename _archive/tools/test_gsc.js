
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function testSearchConsole() {
  console.log("--- Testing Google Search Console Connection ---");
  
  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL || 'https://www.toj-vitamin.tj';
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

  try {
    const res = await searchconsole.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: '2026-04-01',
        endDate: '2026-04-27',
        dimensions: ['query'],
        rowLimit: 10
      },
    });

    console.log("🚀 SUCCESS! Keywords found in Search Console:");
    console.log("-------------------------------------------");
    if (res.data.rows && res.data.rows.length > 0) {
      res.data.rows.forEach(row => {
        console.log(`Keyword: ${row.keys[0]} | Clicks: ${row.clicks} | Impressions: ${row.impressions} | Position: ${row.position.toFixed(1)}`);
      });
    } else {
      console.log("No keyword data found for this period. (Check if the site URL is exactly as in Search Console)");
    }
  } catch (err) {
    console.error("❌ Search Console failed!");
    console.error(err.message);
  }
}

testSearchConsole();
