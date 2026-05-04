const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function getReport() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const analyticsDataClient = new BetaAnalyticsDataClient({
    authClient: oauth2Client,
  });

  console.log(`--- Google Analytics 4 Report (Property: ${propertyId}) ---`);

  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: 'yesterday', endDate: 'today' },
      ],
      dimensions: [
        { name: 'date' },
        { name: 'eventName' }
      ],
      metrics: [
        { name: 'eventCount' },
        { name: 'activeUsers' }
      ],
    });

    const stats = {};
    response.rows.forEach(row => {
      const date = row.dimensionValues[0].value;
      const event = row.dimensionValues[1].value;
      const count = parseInt(row.metricValues[0].value);
      
      if (!stats[date]) stats[date] = { events: {}, users: 0 };
      stats[date].events[event] = (stats[date].events[event] || 0) + count;
    });

    Object.keys(stats).sort().reverse().forEach(date => {
      console.log(`\n📅 Date: ${date}`);
      console.log(`  Page Views: ${stats[date].events['page_view'] || 0}`);
      console.log(`  WhatsApp Clicks: ${stats[date].events['whatsapp_order_click'] || 0}`);
      console.log(`  Quiz Results: ${stats[date].events['quiz_result_shown'] || 0}`);
      console.log(`  Total Events: ${Object.values(stats[date].events).reduce((a, b) => a + b, 0)}`);
    });

    if (response.rows.length === 0) {
      console.log("No data found for the selected period.");
    }

  } catch (err) {
    console.error("❌ Error fetching GA4 data:", err.message);
  }
}

getReport();
