const fs = require('fs');
const path = require('path');
const { getProductsWithMarkup } = require('../src/lib/products');

async function verify() {
  console.log('🔍 Запуск полной проверки описаний, свойств и инструкций каталога...');

  const products = await getProductsWithMarkup();
  console.log(`📦 Загружено продуктов через getProductsWithMarkup: ${products.length}`);

  let errors = [];
  const samples = [];

  for (const p of products) {
    const name = p.name;
    const desc = p.description || '';
    const props = p.properties || [];
    const inst = p.instructions || {};

    if (!desc || desc.length < 30) {
      errors.push(`[${p.id}] "${name}": Описание пустое или слишком короткое (${desc.length} симв.)`);
    }

    if (desc.includes('Премиальный продукт GLS для укрепления здоровья')) {
      errors.push(`[${p.id}] "${name}": Содержит старую заглушку вместо реального описания!`);
    }

    if (!props || props.length === 0) {
      errors.push(`[${p.id}] "${name}": Свойства (properties) отсутствуют!`);
    }

    if (!inst.usage || inst.usage.length < 5) {
      errors.push(`[${p.id}] "${name}": Отсутствует способ применения (usage)!`);
    }

    // Check specific products
    if (['1', '9', '21', '22', '28', '53', '70', '114'].includes(String(p.id))) {
      samples.push({
        id: p.id,
        name: p.name,
        descSnippet: desc.slice(0, 160) + '...',
        propertiesCount: props.length,
        propertiesSample: props.slice(0, 2),
        usage: inst.usage,
        course: inst.course
      });
    }
  }

  console.log(`\n❌ Найдено ошибок: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach(e => console.log('  ' + e));
  } else {
    console.log('🎉 100% ВСЕХ ТОВАРОВ ИМЕЮТ ПОЛНОЕ ОФИЦИАЛЬНОЕ ОПИСАНИЕ, СВОЙСТВА И ИНСТРУКЦИИ!');
  }

  console.log('\n--- ПРИМЕРЫ ПРОВЕРЕННЫХ ТОВАРОВ ---');
  samples.forEach(s => {
    console.log(`\n[ID ${s.id}] ${s.name}`);
    console.log(`  📝 Описание: ${s.descSnippet}`);
    console.log(`  🔬 Свойства (${s.propertiesCount}):`);
    s.propertiesSample.forEach((pr, i) => console.log(`     ${i + 1}. ${pr.slice(0, 120)}...`));
    console.log(`  💊 Прием: ${s.usage}`);
    console.log(`  ⏱️ Курс: ${s.course}`);
  });
}

verify();
