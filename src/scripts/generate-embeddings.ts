import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Загружаем переменные окружения из .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const geminiApiKey = process.env.GEMINI_API_KEY || '';

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
  console.error('❌ Ошибка: Убедитесь, что все переменные окружения заданы в .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Функция для сопоставления продуктов с базой знаний (RAG)
function findEnrichmentForProduct(pName: string, enrichedData: Record<string, any>) {
  if (!pName) return {};
  const name = pName.toLowerCase().trim();
  if (enrichedData[name]) return enrichedData[name];

  let cleaned = name
    .replace(/\([^)]+\)/g, ' ')
    .replace(/капс\.*|таб\.*|порошок|экстракт|комплекс|сироп/gi, ' ')
    .replace(/gls|pharm|№\d+|\d+\s*мг|\d+\s*г|\d+\s*ие|\d+\s*ме/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (enrichedData[cleaned]) return enrichedData[cleaned];

  const keys = Object.keys(enrichedData).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return enrichedData[key];
    }
  }
  return {};
}

async function run() {
  console.log('🚀 Запуск генерации векторных эмбеддингов для каталога товаров...');

  // 1. Получаем все активные товары
  const { data: dbProducts, error: prodError } = await supabase
    .from('products')
    .select('*')
    .gt('price', 0);

  if (prodError || !dbProducts) {
    console.error('❌ Ошибка загрузки товаров из БД:', prodError);
    process.exit(1);
  }

  const activeProducts = dbProducts.filter((p: any) => !p.name.includes('[УДАЛЕН]'));
  console.log(`📦 Всего товаров в каталоге: ${activeProducts.length}`);

  // 2. Загружаем обогащенные данные
  let enrichedData: Record<string, any> = {};
  const { data: enrichedSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'enriched_gls_products_data')
    .single();

  if (enrichedSetting?.value) {
    try {
      enrichedData = JSON.parse(enrichedSetting.value);
    } catch (e) {
      console.warn("⚠️ Ошибка парсинга enriched_gls_products_data из Supabase:", e);
    }
  }

  if (Object.keys(enrichedData).length === 0) {
    try {
      const jsonPath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');
      if (fs.existsSync(jsonPath)) {
        enrichedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        console.log('📚 Загружены локальные обогащенные данные из enriched_gls_products.json');
      }
    } catch (err) {
      console.warn('⚠️ Не удалось загрузить локальный файл обогащения:', err);
    }
  }

  // 3. Создаем модель для эмбеддингов
  const embedder = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  const embeddingsCache: Record<string, { embedding: number[]; text: string }> = {};

  console.log('📡 Начинаем генерацию векторов через Gemini text-embedding-004...');

  for (let i = 0; i < activeProducts.length; i++) {
    const p = activeProducts[i];
    const enrich = findEnrichmentForProduct(p.name, enrichedData);
    const props = enrich.properties ? enrich.properties.join(', ') : 'Общее оздоровление';
    const tags = enrich.tags ? enrich.tags.join(', ') : 'Витамины';
    const synergies = enrich.synergies ? enrich.synergies.join('; ') : 'Отсутствует';

    // Формируем текстовое описание товара, по которому будет осуществляться семантический поиск
    const productText = `Название: ${p.name} (${p.full_name}). Описание: ${p.description || ''}. Свойства: [${props}]. Теги: [${tags}]. Синергия: [${synergies}]`.trim();

    try {
      console.log(`[${i + 1}/${activeProducts.length}] Генерируем вектор для: "${p.name}"`);
      
      const result = await embedder.embedContent(productText);
      const values = result.embedding.values;

      embeddingsCache[p.id] = {
        embedding: values,
        text: productText
      };

      // Небольшая задержка 150 мс для защиты от лимитов (rate limits)
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (err) {
      console.error(`❌ Ошибка генерации для товара ID: ${p.id} ("${p.name}"):`, err);
    }
  }

  // 4. Записываем результат в JSON файл
  const outputDir = path.join(process.cwd(), 'src/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'product_embeddings.json');
  fs.writeFileSync(outputPath, JSON.stringify(embeddingsCache, null, 2), 'utf-8');

  console.log(`\n✅ УСПЕХ! Векторы сгенерированы и сохранены в: ${outputPath}`);
}

run().catch(console.error);
