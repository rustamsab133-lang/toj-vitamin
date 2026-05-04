
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentActivity() {
  console.log("--- Activity Report ---");
  
  // 1. Recent Orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (ordersError) {
    console.error("Error fetching orders:", ordersError);
  } else {
    console.log("Recent 10 orders:");
    orders.forEach(o => {
      console.log(`- ID: ${o.id}, Status: ${o.status}, Date: ${o.created_at}, Amount: ${o.total_amount}`);
    });
  }

  // 2. Check for potential tracking table (if any)
  // Let's try 'analytics_events' just in case
  const { data: events, error: eventsError } = await supabase
    .from('analytics_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (!eventsError && events) {
    console.log("\nRecent Analytics Events:");
    events.forEach(e => {
       console.log(`- Event: ${e.event_name}, Date: ${e.created_at}`);
    });
  } else {
    console.log("\nNo 'analytics_events' table found or it is empty.");
  }
}

checkRecentActivity();
