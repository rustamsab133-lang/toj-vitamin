import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Setup paths
const KEY_PATH = 'C:\\Users\\SALOM\\OneDrive\\seo-agent-v2.json';
const PROGRESS_PATH = path.resolve(process.cwd(), 'scratch', 'indexing-progress.json');

// Slugify function matching website logic
function slugify(text: string): string {
  const ru: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  return text
    .toLowerCase()
    .split('')
    .map(char => ru[char] || char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function runSeoBreakthrough() {
  console.log('🚀 Starting SEO Breakthrough (Google Indexing Automation)...');

  // 1. Verify credentials file
  if (!fs.existsSync(KEY_PATH)) {
    console.error(`❌ Credentials file not found at: ${KEY_PATH}`);
    return;
  }
  const keyFile = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));

  // 2. Initialize Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not configured in .env.local');
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 3. Construct all URLs
  const baseUrl = 'https://www.toj-vitamin.tj';
  const urls: { url: string; priority: number; type: string }[] = [];

  // Core URLs
  urls.push({ url: baseUrl, priority: 1, type: 'Core Home' });
  urls.push({ url: `${baseUrl}/journal`, priority: 1, type: 'Core Journal' });

  // Dynamic articles
  const { data: articles } = await supabase
    .from('journal_articles')
    .select('slug')
    .eq('is_published', true);
  
  if (articles) {
    articles.forEach(article => {
      urls.push({ url: `${baseUrl}/journal/${article.slug}`, priority: 2, type: 'Expert Article' });
    });
  }

  // Dynamic products
  const { data: products } = await supabase
    .from('products')
    .select('name');

  if (products) {
    products.forEach(product => {
      const slug = slugify(product.name);
      urls.push({ url: `${baseUrl}/product/${slug}`, priority: 3, type: 'Product Page' });
    });
  }

  // Localized pSEO pages
  const cities = ['dushanbe', 'khujand', 'kulob', 'bokhtar', 'vakhdat', 'hissar'];
  if (products) {
    cities.forEach(city => {
      products.forEach(product => {
        const slug = slugify(product.name);
        urls.push({ url: `${baseUrl}/buy/${city}/${slug}`, priority: 4, type: `City pSEO (${city})` });
      });
    });
  }

  console.log(`📊 Found total ${urls.length} URLs in the project catalog.`);

  // 4. Load indexing progress
  let progress: Record<string, { indexedAt: string; status: string }> = {};
  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    } catch (e) {
      console.warn('⚠️ Progress file was empty or corrupted, resetting progress.');
    }
  }

  // Count already indexed
  const alreadyIndexed = urls.filter(item => progress[item.url]?.status === 'success');
  console.log(`✅ Already indexed: ${alreadyIndexed.length} / ${urls.length} URLs.`);

  // Filter queue of unindexed URLs
  const queue = urls
    .filter(item => !progress[item.url] || progress[item.url].status !== 'success')
    .sort((a, b) => a.priority - b.priority); // Submit higher priority first

  if (queue.length === 0) {
    console.log('🎉 EXCELLENT! All 768 URLs have already been submitted successfully to Google Indexing API.');
    return;
  }

  // 5. Select batch (Google Indexing API daily quota limit is 200)
  const batchSize = Math.min(200, queue.length);
  const batch = queue.slice(0, batchSize);
  console.log(`📡 Selecting prioritized batch of ${batchSize} URLs to submit today...`);

  // 6. Setup Google API
  const auth = new google.auth.JWT({
    email: keyFile.client_email,
    key: keyFile.private_key,
    scopes: ['https://www.googleapis.com/auth/indexing']
  });
  const indexing = google.indexing('v3');

  // 7. Submit batch sequentially with a small delay to avoid rate limit spikes
  let successes = 0;
  let failures = 0;

  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    const percentage = Math.round(((i + 1) / batch.length) * 100);
    console.log(`[${percentage}%] (${i + 1}/${batch.length}) Sending ${item.type}: ${item.url}`);

    try {
      await indexing.urlNotifications.publish({
        auth,
        requestBody: {
          url: item.url,
          type: 'URL_UPDATED',
        },
      });

      progress[item.url] = {
        indexedAt: new Date().toISOString(),
        status: 'success'
      };
      successes++;
      
      // Save progress dynamically after each success to prevent loss if script crashes
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf8');

      // 150ms sleep between requests
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error: any) {
      console.error(`❌ Failed to index: ${item.url}. Error: ${error.response?.data?.error?.message || error.message}`);
      progress[item.url] = {
        indexedAt: new Date().toISOString(),
        status: 'failed'
      };
      failures++;
    }
  }

  // Final summary
  console.log('\n--- BATCH COMPLETE ---');
  console.log(`✅ Successfully submitted: ${successes}`);
  console.log(`❌ Failed: ${failures}`);
  console.log(`📈 New Overall Progress: ${alreadyIndexed.length + successes} / ${urls.length} (${Math.round(((alreadyIndexed.length + successes) / urls.length) * 100)}%)`);
  
  if (urls.length - (alreadyIndexed.length + successes) > 0) {
    console.log(`⏳ Remaining URLs for next batches: ${urls.length - (alreadyIndexed.length + successes)}`);
    console.log('👉 Run this script again tomorrow to submit the next batch of 200 URLs!');
  } else {
    console.log('🏆 CONGRATULATIONS! The entire website is now 100% indexed by Google!');
  }
}

runSeoBreakthrough().catch(console.error);
