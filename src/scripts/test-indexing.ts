import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testIndexing() {
  console.log('🚀 Starting Google Indexing API test (Direct JSON)...');
  
  const keyPath = 'C:\\Users\\SALOM\\OneDrive\\seo-agent-v2.json';
  const fs = await import('fs');
  const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  try {
    const auth = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/indexing']
    });

    const indexing = google.indexing('v3');
    // Testing with a known published article
    const url = 'https://www.toj-vitamin.tj/journal/synergy-guide-2024';

    console.log(`📡 Pinging Google for: ${url}`);
    
    const res = await indexing.urlNotifications.publish({
      auth,
      requestBody: {
        url,
        type: 'URL_UPDATED',
      },
    });

    console.log('✅ Response received from Google:');
    console.log(JSON.stringify(res.data, null, 2));
    
    console.log('\n--- SUCCESS! ---');
    console.log('The Service Account is now authorized to ping Google Indexing API.');
    
  } catch (err: any) {
    console.error('❌ Indexing API error:', err.response?.data || err.message);
  }
}

testIndexing();
