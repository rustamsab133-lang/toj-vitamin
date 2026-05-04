const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function getSearchStats() {
  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

  console.log(`--- Google Search Console Stats for ${siteUrl} ---`);

  try {
    const res = await searchconsole.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: '2026-04-01',
        endDate: '2026-05-03',
        dimensions: ['query'],
        rowLimit: 10
      }
    });

    if (res.data.rows) {
      console.log("Top Search Queries:");
      res.data.rows.forEach(row => {
        console.log(`- ${row.keys[0]}: ${row.clicks} clicks, ${row.impressions} impressions`);
      });
    } else {
      console.log("No search data found (site might not be indexed or no traffic).");
    }
  } catch (err) {
    console.error("❌ Search Console Error:", err.message);
  }
}

getSearchStats();
