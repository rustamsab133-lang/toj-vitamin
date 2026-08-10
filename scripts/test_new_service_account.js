const { google } = require('googleapis');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
require('dotenv').config({ path: '.env.local' });
const path = require('path');

const keyFilePath = path.join(__dirname, '../google-key.json');

async function testGoogleConnections() {
  console.log("=================================================");
  console.log("🔍 TESTING GOOGLE SERVICE ACCOUNT CONNECTIONS");
  console.log("=================================================\n");

  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;
  const propertyId = process.env.GA4_PROPERTY_ID;

  console.log(`Site URL: ${siteUrl}`);
  console.log(`GA4 Property ID: ${propertyId}`);
  console.log(`Key file: ${keyFilePath}\n`);

  // 1. Test Search Console
  console.log("--- [1/2] Testing Google Search Console API ---");
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    // Let's get yesterday's date (3 days ago for reliable GSC latency)
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateStr = threeDaysAgo.toISOString().split('T')[0];

    const res = await searchconsole.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: '2026-06-01',
        endDate: dateStr,
        dimensions: ['query'],
        rowLimit: 5
      }
    });

    console.log("✅ Search Console Connection Successful!");
    if (res.data.rows) {
      console.log("Sample Queries:");
      res.data.rows.forEach(row => {
        console.log(`  - "${row.keys[0]}": ${row.clicks} clicks, ${row.impressions} impressions`);
      });
    } else {
      console.log("  ⚠️ Connection OK, but no search data returned (may be normal if site has no recent traffic).");
    }
  } catch (err) {
    console.error("❌ Search Console Error:", err.message);
    console.error("Make sure your service account email (found in google-key.json) is added as a user in GSC and Google Search Console API is enabled.");
  }

  console.log("\n--- [2/2] Testing Google Analytics 4 API ---");
  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: keyFilePath,
    });

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: '7daysAgo', endDate: 'today' },
      ],
      dimensions: [
        { name: 'eventName' }
      ],
      metrics: [
        { name: 'eventCount' }
      ],
    });

    console.log("✅ Google Analytics 4 Connection Successful!");
    if (response.rows && response.rows.length > 0) {
      console.log("Sample Events (last 7 days):");
      response.rows.slice(0, 5).forEach(row => {
        console.log(`  - ${row.dimensionValues[0].value}: ${row.metricValues[0].value} events`);
      });
    } else {
      console.log("  ⚠️ Connection OK, but no GA4 event data returned.");
    }
  } catch (err) {
    console.error("❌ Google Analytics 4 Error:", err.message);
    console.error("Make sure your service account email is added to GA4 property access and Google Analytics Data API is enabled.");
  }

  console.log("\n=================================================");
  console.log("🏁 TEST FINISHED");
  console.log("=================================================");
}

testGoogleConnections();
