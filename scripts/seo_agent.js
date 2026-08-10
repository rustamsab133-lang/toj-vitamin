const { google } = require('googleapis');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Force Node.js to prefer IPv4 over IPv6 when resolving addresses (critical for Windows environments)
if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config({ path: '.env.local' });

const { GoogleGenerativeAI } = require('@google/generative-ai');

const keyFilePath = path.join(__dirname, '../google-key.json');

async function runSeoAgent() {
  console.log("=================================================");
  console.log("🤖 STARTING AUTONOMOUS SEO AGENT ANALYSIS");
  console.log("=================================================\n");

  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL;
  const propertyId = process.env.GA4_PROPERTY_ID;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!siteUrl || !propertyId || !geminiApiKey) {
    console.error("❌ Error: Missing configuration. Ensure SEARCH_CONSOLE_SITE_URL, GA4_PROPERTY_ID, and GEMINI_API_KEY are in .env.local.");
    return;
  }

  // 1. Fetch Search Console Data
  console.log("📡 Fetching data from Google Search Console...");
  let gscQueries = [];
  let gscPages = [];

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    // Calculate date range (last 30 days)
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 3); // GSC data latency (usually 2-3 days)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 33);

    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    console.log(`   Range: ${startDateStr} to ${endDateStr}`);

    // Fetch queries
    const resQueries = await searchconsole.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: startDateStr,
        endDate: endDateStr,
        dimensions: ['query'],
        rowLimit: 50
      }
    });
    gscQueries = resQueries.data.rows || [];

    // Fetch pages
    const resPages = await searchconsole.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate: startDateStr,
        endDate: endDateStr,
        dimensions: ['page'],
        rowLimit: 50
      }
    });
    gscPages = resPages.data.rows || [];

    console.log(`   ✅ Fetched ${gscQueries.length} search queries and ${gscPages.length} pages.`);

  } catch (err) {
    console.error("❌ Search Console fetch failed:", err.message);
    return;
  }

  // 2. Fetch Google Analytics 4 Data
  console.log("📡 Fetching traffic data from Google Analytics 4...");
  let ga4Pages = [];

  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: keyFilePath,
    });

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: '30daysAgo', endDate: 'today' },
      ],
      dimensions: [
        { name: 'pagePath' }
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' }
      ],
    });

    ga4Pages = response.rows || [];
    console.log(`   ✅ Fetched traffic stats for ${ga4Pages.length} active pages.`);

  } catch (err) {
    console.error("❌ Google Analytics 4 fetch failed:", err.message);
    return;
  }

  // 3. Compile Data for Gemini
  console.log("📊 Structuring data for AI analysis...");

  const formattedQueries = gscQueries.map(row => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: (row.ctr * 100).toFixed(2) + "%",
    position: row.position.toFixed(1)
  }));

  const formattedPages = gscPages.map(row => ({
    page: row.keys[0].replace(siteUrl, '/'), // make paths relative for easier reading
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: (row.ctr * 100).toFixed(2) + "%",
    position: row.position.toFixed(1)
  }));

  const formattedGA4 = ga4Pages.map(row => ({
    path: row.dimensionValues[0].value,
    pageviews: row.metricValues[0].value,
    users: row.metricValues[1].value
  }));

  // Limit data sizes to prevent token bloat while giving rich context
  const dataForAI = {
    topQueries: formattedQueries,
    topSearchPages: formattedPages.slice(0, 30),
    topTrafficPages: formattedGA4.slice(0, 30)
  };

  // 4. Generate SEO Recommendations with Gemini
  console.log("🧠 Consulting Gemini 3.5 Flash (Senior SEO Specialist)...");
  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `
You are a Senior SEO Specialist and Marketing Analyst for "toj-vitamin.tj", a premium online vitamin and health supplement marketplace in Tajikistan.
Your goal is to analyze the following organic search and traffic data from Google Search Console and Google Analytics 4, identify "quick wins", optimization opportunities, and issues, and provide actionable recommendations.

Here is the data from the last 30 days:
---------------------------------------------
SEARCH QUERIES (Search Console - Top 50):
${JSON.stringify(dataForAI.topQueries, null, 2)}

TOP SEARCH PAGES (Search Console - Top 30):
${JSON.stringify(dataForAI.topSearchPages, null, 2)}

TOP TRAFFIC PAGES (GA4 - Top 30):
${JSON.stringify(dataForAI.topTrafficPages, null, 2)}
---------------------------------------------

Analyze this data and write a detailed markdown report in Russian. The report should include:
1. **Общий обзор видимости (SEO Executive Summary)**:
   - Краткий вывод о текущей эффективности сайта (популярные запросы, общая динамика).
2. **Точки роста и "Быстрые победы" (Quick Wins)**:
   - Найдите ключевые запросы с высокими показами (impressions), но средними позициями (от 5 до 15), где небольшое улучшение контента/заголовков может вывести страницу в топ-3.
   - Найдите страницы с высоким показателем CTR или наоборот, с высоким числом показов, но критически низким CTR (менее 1-2%), требующие изменения Title/Description.
3. **Анализ расхождения трафика (Search vs Traffic)**:
   - Есть ли страницы, которые получают много просмотров по GA4, но мало кликов по Search Console (например, если трафик идет из Instagram, но не из Google), и как повысить их органический трафик.
4. **Конкретные рекомендации по страницам и тегам (Actionable SEO Action Plan)**:
   - Дайте конкретные рекомендации для 3-5 ключевых страниц сайта (например, главная, категории, карточки популярных товаров). Предложите оптимизированные Title, Description и заголовки H1 на русском и/или таджикском языках (с учетом специфики рынка Таджикистана).
5. **Технический чек-лист для разработчиков**:
   - На основе анализа, что программисты должны сделать на сайте прямо сейчас (например, микроразметка Schema.org для карточек товаров, XML sitemap, канонические теги и т.д.).

Keep the report extremely professional, based strictly on the provided numbers, and directly applicable. Do not write generic SEO tips. Focus on specific products (like GLS, Arginine, vitamins, etc.) if they appear in the query list.
`;

    const result = await model.generateContent(prompt);
    const reportText = result.response.text();

    // Write report to file
    const reportPath = path.join(__dirname, '../seo_audit_report.md');
    fs.writeFileSync(reportPath, reportText, 'utf8');

    console.log(`\n✅ SEO Audit Report successfully generated and saved to: ${reportPath}`);

  } catch (err) {
    console.error("❌ Gemini API Error:", err.message);
  }

  console.log("\n=================================================");
  console.log("🏁 SEO AGENT RUN COMPLETED");
  console.log("=================================================");
}

runSeoAgent();
