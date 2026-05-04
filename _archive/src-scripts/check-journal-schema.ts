import { supabase } from '../lib/supabase';

async function checkSchema() {
  const { data, error } = await supabase
    .from('journal_articles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching journal articles:', error);
  } else {
    console.log('Sample article structure:', data[0] ? Object.keys(data[0]) : 'No articles found');
  }
}

checkSchema();
