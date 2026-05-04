
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function testIndexingAPI() {
  console.log("--- Testing Google Indexing API ---");
  
  const siteUrl = 'https://www.toj-vitamin.tj';
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const indexing = google.indexing({ version: 'v3', auth: oauth2Client });

  try {
    const res = await indexing.urlNotifications.publish({
      requestBody: {
        url: siteUrl,
        type: 'URL_UPDATED',
      },
    });

    console.log("🚀 SUCCESS! Indexing notification sent for:", siteUrl);
    console.log("Response:", res.data);
  } catch (err) {
    console.error("❌ Indexing API failed!");
    console.error(err.message);
  }
}

testIndexingAPI();
