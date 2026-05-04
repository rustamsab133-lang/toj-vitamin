
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

async function testGA4OAuth() {
  console.log("--- Testing GA4 OAuth2 Connection ---");
  
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  // 1. Create OAuth2 Client
  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // 2. Create Analytics Client with OAuth2
  const analyticsDataClient = new BetaAnalyticsDataClient({
    authClient: oauth2Client,
  });

  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '7daysAgo',
          endDate: 'today',
        },
      ],
      metrics: [
        {
          name: 'activeUsers',
        },
        {
          name: 'screenPageViews',
        }
      ],
      dimensions: [
        {
          name: 'date',
        },
      ],
    });

    console.log("🚀 SUCCESS! Data fetched from GA4:");
    console.log("------------------------------------");
    response.rows.forEach(row => {
      console.log(`Date: ${row.dimensionValues[0].value} | Users: ${row.metricValues[0].value} | Views: ${row.metricValues[1].value}`);
    });
    
    if (response.rows.length === 0) {
      console.log("Connected successfully, but no data found for the last 7 days.");
    }
  } catch (err) {
    console.error("❌ Connection failed!");
    console.error(err.message);
  }
}

testGA4OAuth();
