const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\wа-яё\-]+/gi, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function pushToGoogleIndexing(url) {
  try {
    const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
    const indexing = google.indexing({ version: 'v3', auth: oauth2Client });
    await indexing.urlNotifications.publish({
      requestBody: { url, type: 'URL_UPDATED' },
    });
    console.log(`✅ Indexed: ${url}`);
  } catch (err) {
    console.error(`❌ Error indexing ${url}:`, err.message);
  }
}

async function indexEverything() {
  console.log('🚀 ЗАПУСК ПОЛНОЙ ИНДЕКСАЦИИ...');

  const { data: products } = await supabase.from('products').select('name');
  if (products) {
    for (const p of products) {
      const url = `https://www.toj-vitamin.tj/product/${slugify(p.name)}`;
      await pushToGoogleIndexing(url);
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const { data: articles } = await supabase.from('articles').select('slug');
  if (articles) {
    for (const a of articles) {
      const url = `https://www.toj-vitamin.tj/journal/${a.slug}`;
      await pushToGoogleIndexing(url);
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log('🏁 ИНДЕКСАЦИЯ ЗАВЕРШЕНА.');
}

indexEverything();
