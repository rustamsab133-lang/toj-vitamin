
const { google } = require('googleapis');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { OAuth2Client } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runFullVerification() {
  console.log("🚀 ЗАПУСК ГЕНЕРАЛЬНОЙ ПРОВЕРКИ GOOGLE & DATA STACK\n");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const propertyId = process.env.GA4_PROPERTY_ID;
  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;

  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // --- 1. ПРОВЕРКА ANALYTICS ---
  try {
    const analyticsClient = new BetaAnalyticsDataClient({ authClient: oauth2Client });
    const [gaRes] = await analyticsClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: 'today', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
    });
    console.log("✅ GOOGLE ANALYTICS: Связь установлена. (Сегодняшние пользователи: " + (gaRes.rows?.[0]?.metricValues?.[0]?.value || 0) + ")");
  } catch (e) { console.log("❌ GOOGLE ANALYTICS: Ошибка - " + e.message); }

  // --- 2. ПРОВЕРКА SEARCH CONSOLE ---
  try {
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });
    const gscRes = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: '2026-04-01', endDate: '2026-04-27', rowLimit: 1 },
    });
    console.log("✅ SEARCH CONSOLE: Доступ подтвержден. (Сайт верифицирован)");
  } catch (e) { console.log("❌ SEARCH CONSOLE: Ошибка - " + e.message); }

  // --- 3. ПРОВЕРКА INDEXING API ---
  try {
    const indexing = google.indexing({ version: 'v3', auth: oauth2Client });
    await indexing.urlNotifications.publish({
      requestBody: { url: siteUrl, type: 'URL_UPDATED' },
    });
    console.log("✅ INDEXING API: Тестовый сигнал отправлен успешно.");
  } catch (e) { console.log("❌ INDEXING API: Ошибка - " + e.message); }

  // --- 4. ПРОВЕРКА SUPABASE (БАЗА ДАННЫХ) ---
  try {
    const { data, error } = await supabase.from('analytics_events').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log("✅ SUPABASE DB: Таблицы найдены. Всего событий в базе: " + (data || 0));
  } catch (e) { 
    console.log("⚠️ SUPABASE DB: " + e.message);
    console.log("   (Убедись, что ты выполнил SQL-скрипт в Supabase Dashboard!)");
  }

  console.log("\n--- ПРОВЕРКА ЗАВЕРШЕНА ---");
}

runFullVerification();
