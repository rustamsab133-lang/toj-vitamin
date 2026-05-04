
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnalytics() {
  console.log("--- Analytics Check ---");
  
  // 1. Check for orders today
  const today = new Date().toISOString().split('T')[0];
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', `${today}T00:00:00Z`);

  if (ordersError) {
    console.error("Error fetching orders:", ordersError);
  } else {
    console.log(`Orders today (${today}):`, orders.length);
    if (orders.length > 0) {
      console.log("Recent orders:", orders.map(o => ({ id: o.id, status: o.status, total: o.total_amount })));
    }
  }

  // 2. Check for any 'events' or 'analytics' table
  const { data: tables, error: tablesError } = await supabase
    .from('pg_catalog.pg_tables')
    .select('tablename')
    .eq('schemaname', 'public');
    
  // Note: above might not work via supabase-js for pg_catalog.
  // Let's just try to select from likely names.
  
  const likelyTables = ['events', 'analytics', 'visits', 'tracking_events'];
  for (const table of likelyTables) {
    const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`Table '${table}' exists. Count:`, data.length || 0);
      if (data.length > 0) {
         const { data: recent } = await supabase.from(table).select('*').limit(5).order('created_at', { ascending: false });
         console.log(`Recent ${table}:`, recent);
      }
    }
  }
}

checkAnalytics();
