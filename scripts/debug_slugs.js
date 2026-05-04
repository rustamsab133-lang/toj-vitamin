const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const slugify = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[<>:"/\\|?*#%&()[\]]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debug() {
  const { data: products } = await supabase.from('products').select('name').limit(5);
  products.forEach(p => {
    console.log(`Name: ${p.name}`);
    console.log(`Slug: ${slugify(p.name)}`);
    console.log(`Encoded Slug: ${encodeURIComponent(slugify(p.name))}`);
    console.log("-------------------");
  });
}

debug();
