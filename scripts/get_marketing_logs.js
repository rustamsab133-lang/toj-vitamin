const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getMarketingLogs() {
  console.log("--- Marketing Logs Summary ---");
  const { data, error } = await supabase
    .from('marketing_logs')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No marketing logs found.");
    return;
  }

  data.forEach(log => {
    console.log(`${log.date}: GA4 Users: ${log.ga4_users}, Meta Spend: ${log.meta_spend}$, WA Leads: ${log.total_whatsapp_leads}`);
  });
}

getMarketingLogs();
