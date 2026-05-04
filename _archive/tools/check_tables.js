
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSql() {
  const sql = fs.readFileSync('tools/create_analytics_tables.sql', 'utf8');
  
  // Supabase-js doesn't have a direct 'sql' method for raw queries.
  // We usually have to use an RPC or just create the tables manually.
  // However, I can check if the tables already exist.
  
  console.log("Checking for tables...");
  
  const { data: existing, error } = await supabase
    .from('analytics_events')
    .select('id')
    .limit(1);

  if (error && error.code === 'PGRST116') {
     console.log("Table 'analytics_events' does not exist. Please run the SQL in Supabase Dashboard.");
  } else if (error) {
     console.error("Error checking table:", error);
  } else {
     console.log("Table 'analytics_events' already exists.");
  }
}

runSql();
