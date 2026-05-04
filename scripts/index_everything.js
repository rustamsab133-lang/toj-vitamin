const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function indexEverything() {
  console.log("--- Starting Global Indexing (Google Indexing API) ---");

  const baseUrl = 'https://www.toj-vitamin.tj';
  const cities = ['dushanbe', 'khujand', 'kulob', 'bokhtar', 'vakhdat', 'hissar'];

  // 1. Get all products from Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: products } = await supabase.from('products').select('name');
  if (!products) {
    console.error("No products found in DB.");
    return;
  }

  // 2. Generate URLs
  const urls = [
    baseUrl,
    `${baseUrl}/quiz`,
    `${baseUrl}/journal`,
  ];

  const slugify = (text) => text.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

  products.forEach(p => {
    const slug = slugify(p.name);
    urls.push(`${baseUrl}/product/${slug}`);
    cities.forEach(city => {
      urls.push(`${baseUrl}/buy/${city}/${slug}`);
    });
  });

  console.log(`Generated ${urls.length} URLs to index.`);

  // 3. Setup Indexing API
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const indexing = google.indexing('v3');

  // 4. Send requests (limited batches to avoid API limits)
  // Google Indexing API limit is usually 200 URLs per day for new projects.
  const batch = urls.slice(0, 100); // Let's do the first 100 today

  for (const url of batch) {
    try {
      await indexing.urlNotifications.publish({
        auth: oauth2Client,
        requestBody: {
          url: url,
          type: 'URL_UPDATED'
        }
      });
      console.log(`✅ Indexed: ${url}`);
    } catch (err) {
      console.error(`❌ Failed: ${url} | ${err.message}`);
      if (err.message.includes('403')) {
        console.log("Stopping: Likely Indexing API is not enabled or quota exceeded.");
        break;
      }
    }
    // Small delay to be nice
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("--- Indexing Job Finished ---");
}

indexEverything();
