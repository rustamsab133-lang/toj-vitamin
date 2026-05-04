const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function autoLink() {
  console.log('🔗 Запуск двигателя перелинковки...');

  const { data: products } = await supabase.from('products').select('id, name');
  const { data: articles } = await supabase.from('journal_articles').select('id, content_ru, title_ru');

  if (!products || !articles) return;

  for (const article of articles) {
    let newContent = article.content_ru;
    let modified = false;

    for (const product of products) {
      // Create a keyword from product name (remove brand and generic words)
      const keyword = product.name
        .replace('GLS', '')
        .replace('капс', '')
        .replace('порошок', '')
        .trim();

      if (keyword.length < 4) continue;

      // Regex to find keyword but NOT inside an existing <a> tag or <h2>
      const regex = new RegExp(`(?<!<[^>]*)${keyword}(?![^<]*>)`, 'gi');
      
      if (newContent.includes(keyword) && !newContent.includes(`/product/${product.id}`)) {
        newContent = newContent.replace(regex, `<a href="/product/${product.id}" class="text-[#1E40AF] font-bold underline">${keyword}</a>`);
        modified = true;
      }
    }

    if (modified) {
      const { error } = await supabase
        .from('journal_articles')
        .update({ content_ru: newContent })
        .eq('id', article.id);
      
      if (!error) {
        console.log(`✅ Перелинковка выполнена для: ${article.title_ru}`);
      } else {
        console.error(`❌ Ошибка для ${article.title_ru}:`, error.message);
      }
    }
  }
  console.log('🏁 Перелинковка завершена!');
}

autoLink();
