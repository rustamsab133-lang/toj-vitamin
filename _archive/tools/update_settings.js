const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateSettings() {
  console.log('Updating site settings to simpler versions...');

  const updates = [
    {
      key: 'hero_title',
      value: 'Здоровье и энергия каждый день'
    },
    {
      key: 'hero_subtitle',
      value: 'Простые решения для восстановления сил. Только проверенные составы, созданные природой и подтвержденные наукой.'
    }
  ];

  for (const item of updates) {
    const { error } = await supabase
      .from('site_settings')
      .update({ value: item.value })
      .eq('key', item.key);

    if (error) {
      console.error(`Error updating ${item.key}:`, error);
    } else {
      console.log(`Successfully updated ${item.key}`);
    }
  }
}

updateSettings();
