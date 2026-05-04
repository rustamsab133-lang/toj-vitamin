const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getStats() {
  console.log("--- Supabase Realtime Analytics ---");
  
  // 1. Total events
  const { count: totalEvents } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true });

  // 2. WhatsApp clicks
  const { count: waClicks } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', 'whatsapp_order_click');

  // 3. Quiz results
  const { count: quizResults } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', 'quiz_result_shown');

  // 4. Last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentEvents } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .gt('created_at', yesterday);

  console.log(`Total Events: ${totalEvents}`);
  console.log(`WhatsApp Clicks: ${waClicks}`);
  console.log(`Quiz Results: ${quizResults}`);
  console.log(`Events (Last 24h): ${recentEvents}`);
  
  // 5. Top pages
  const { data: topPages } = await supabase
    .from('analytics_events')
    .select('page_path')
    .limit(1000);
    
  const pageStats = topPages.reduce((acc, curr) => {
    acc[curr.page_path] = (acc[curr.page_path] || 0) + 1;
    return acc;
  }, {});
  
  console.log("\n--- Top Pages ---");
  Object.entries(pageStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([page, count]) => console.log(`${page}: ${count} views`));
}

getStats();
