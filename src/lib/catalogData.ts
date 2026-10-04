import { supabase } from './supabase';
import { getMarkupSettings, applyMarkupToProduct } from './markup';
import { getHiddenProductIds, filterVisibleProducts } from './hiddenProducts';
import { getRetailOnlyProductIds } from './retailOnlyProducts';
import fs from 'fs';
import path from 'path';

export interface CatalogInstruction {
  usage: string;
  course: string;
  timing?: string;
  contraindications: string;
  age: string;
  fullText?: string;
}

export interface CatalogProduct {
  id: string;
  code: string; // e.g. "#01", "#02"
  name: string;
  fullName: string;
  brand: string;
  category: string;
  price: number;
  retailPrice: number;
  wholesalePrice: number;
  displayPrice: string;
  imageUrl: string;
  properties: string[];
  instructions: CatalogInstruction;
  waLink: string;
}

export interface CatalogDataResult {
  products: CatalogProduct[];
  categories: string[];
  totalCount: number;
  generatedAt: string;
  company: {
    name: string;
    tagline: string;
    phone: string;
    phoneFormatted: string;
    whatsapp: string;
    whatsappFormatted: string;
    website: string;
    email: string;
    cities: string[];
    logoUrl: string;
  };
}

const OFFICIAL_PHONE = '992176660707';
const OFFICIAL_PHONE_FORMATTED = '+992 17 666 07 07';

export function getProductCategory(name: string): string {
  const n = (name || '').toLowerCase();
  if (/мужск|тестостерон|бустер|йохимбе|артурон/i.test(n)) return 'Для мужчин';
  if (/женск|красот|коллаген|биотин|гиалурон|инозитол|максиферт|железо/i.test(n)) return 'Для женщин и красоты';
  if (/стресс|сон|5-htp|триптофан|магний|мелатонин|гамк|нерв/i.test(n)) return 'Антистресс и сон';
  if (/мозг|памят|ноофит|гинкго|в-комплекс|фолиев|b-комплекс|b1|b2|b6|b12|лецитин/i.test(n)) return 'Мозг и энергия';
  if (/сустав|кост|хондро|глюкозамин|мсм|msm|кальций|к2/i.test(n)) return 'Суставы и кости';
  if (/омега|omega|q10|коэнзим|сердц|сосуд|давлен/i.test(n)) return 'Сердце и Омега-3';
  if (/детск|для детей|малыш/i.test(n)) return 'Детские витамины';
  if (/иммун|витамин c|витамин с|d3|д3|цинк|селен|чеснок|прополис|бузин|эхинацея/i.test(n)) return 'Иммунитет и защита';
  if (/похуден|метаболизм|карнитин|хром|берберин|липотроп|детокс|очищен|семена льна|хитозан/i.test(n)) return 'Метаболизм и тонус';
  return 'Витамины и минералы';
}

function cleanSearchQuery(name: string): string {
  return (name || '')
    .replace(/\([^)]+\)/g, ' ')
    .replace(/капс\.*|таб\.*|пор\.*|порошок|паст\.*|сироп|масса\s*[\d.,]+г*|лимон|апельсин/gi, ' ')
    .replace(/gls|pharm|№\d+|\d+\s*мг|\d+\s*г|\d+\s*ие|\d+\s*ме|\d+\s*мкг/gi, ' ')
    .replace(/[^\wа-яА-ЯёЁ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let cachedEnriched: Record<string, any> | null = null;

function loadEnrichedData(): Record<string, any> {
  if (cachedEnriched) return cachedEnriched;
  try {
    const filePath = path.join(process.cwd(), 'src/data/enriched_gls_products.json');
    if (fs.existsSync(filePath)) {
      cachedEnriched = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return cachedEnriched || {};
    }
  } catch (e) {
    console.warn('⚠️ Could not load enriched_gls_products.json:', e);
  }
  return {};
}

function findEnrichedProduct(name: string, enrichedData: Record<string, any>): any | null {
  const lower = (name || '').toLowerCase().trim();
  if (enrichedData[lower]) return enrichedData[lower];

  const cleaned = cleanSearchQuery(name).toLowerCase();
  if (enrichedData[cleaned]) return enrichedData[cleaned];

  // Specific overrides
  if (lower.includes('комплекс для мужчин') || lower.includes('мужская формула') || lower.includes('бустер')) {
    if (enrichedData['мужская формула']) return enrichedData['мужская формула'];
  }
  if (lower.includes('карнитин')) {
    for (const [k, v] of Object.entries(enrichedData)) {
      if (k.includes('карнитин')) return v;
    }
  }

  for (const [k, v] of Object.entries(enrichedData)) {
    if (lower.includes(k) || k.includes(cleaned) || (cleaned.length > 4 && cleaned.includes(k))) {
      return v;
    }
  }

  const words = cleaned.split(/\s+/).filter(w => w.length >= 3);
  for (const w of words) {
    if (enrichedData[w]) return enrichedData[w];
  }

  return null;
}

function parseInstructionDetails(rawUsage: string, fullText?: string): { usage: string; timing: string; course: string } {
  let usage = rawUsage || 'Взрослым по 1-2 капсулы в день во время еды';
  let timing = 'Во время приема пищи';
  let course = 'Курс 1 месяц (1 упаковка)';

  const lower = (rawUsage + ' ' + (fullText || '')).toLowerCase();

  if (lower.includes('в первой половине дня') || lower.includes('утром')) {
    timing = 'Утром / в первой половине дня';
  } else if (lower.includes('вечером') || lower.includes('перед сном')) {
    timing = 'Вечером за 30-40 минут до сна';
  } else if (lower.includes('до еды')) {
    timing = 'За 30 минут до еды';
  } else {
    timing = 'Во время приема пищи';
  }

  if (lower.includes('2-3 недели') || lower.includes('2–3 недели')) {
    course = '2–3 недели';
  } else if (lower.includes('1-2 месяца') || lower.includes('1–2 месяца')) {
    course = '1–2 месяца (1-2 упаковки)';
  } else if (lower.includes('3 месяца')) {
    course = 'Курс 3 месяца';
  } else {
    course = 'Курс 1 месяц (1 упаковка)';
  }

  return { usage, timing, course };
}

export async function getCatalogData(priceType: 'retail' | 'wholesale' | 'none' = 'retail'): Promise<CatalogDataResult> {
  const [{ data: rawProducts, error }, hiddenIds, markupSettings, retailOnlyIds] = await Promise.all([
    supabase.from('products').select('*').order('name'),
    getHiddenProductIds(),
    getMarkupSettings(),
    getRetailOnlyProductIds()
  ]);

  if (error || !rawProducts) {
    console.error('Error loading products for catalog:', error);
    return {
      products: [],
      categories: [],
      totalCount: 0,
      generatedAt: new Date().toLocaleDateString('ru-RU'),
      company: {
        name: 'TOJ-VITAMIN',
        tagline: 'Официальный дистрибьютор инновационных витаминов и БАД в Таджикистане',
        phone: OFFICIAL_PHONE,
        phoneFormatted: OFFICIAL_PHONE_FORMATTED,
        whatsapp: OFFICIAL_PHONE,
        whatsappFormatted: OFFICIAL_PHONE_FORMATTED,
        website: 'https://www.toj-vitamin.tj',
        email: 'ceo@toj-vitamin.tj',
        cities: ['Душанбе', 'Худжанд'],
        logoUrl: '/logo.webp'
      }
    };
  }

  // Filter visible
  let visible = filterVisibleProducts(rawProducts, hiddenIds);
  // Если запрашивается оптовый каталог — исключаем товары "Только для розницы"
  if (priceType === 'wholesale') {
    visible = visible.filter(p => !retailOnlyIds.includes(String(p.id)));
  }
  const enriched = loadEnrichedData();

  // Sort alphabetically
  const collator = new Intl.Collator(['ru', 'tg', 'en'], { sensitivity: 'base', numeric: true });
  visible.sort((a, b) => collator.compare((a.name || '').trim(), (b.name || '').trim()));

  const categorySet = new Set<string>();

  const catalogProducts: CatalogProduct[] = visible.map((prod, index) => {
    const codeNum = index + 1;
    const code = `#${codeNum < 10 ? '0' + codeNum : codeNum}`;
    const category = getProductCategory(prod.name);
    categorySet.add(category);

    const wholesalePrice = Number(prod.price) || 0;
    const withMarkup = applyMarkupToProduct(prod, markupSettings);
    const retailPrice = Number(withMarkup.price) || wholesalePrice;

    let finalPrice = retailPrice;
    let displayPrice = `${retailPrice} смн`;

    if (priceType === 'wholesale') {
      finalPrice = wholesalePrice;
      displayPrice = `${wholesalePrice} смн (опт)`;
    } else if (priceType === 'none') {
      finalPrice = 0;
      displayPrice = 'Цена по запросу';
    }

    // Enrichment
    const enrichObj = findEnrichedProduct(prod.name, enriched);
    const rawUsage = enrichObj?.instructions?.usage || 'Взрослым по 1-2 капсулы в день во время еды';
    const rawCourse = enrichObj?.instructions?.course || '1 месяц';
    const fullText = enrichObj?.instructions?.full_text || '';
    const contra = enrichObj?.instructions?.contraindications || 'Индивидуальная непереносимость компонентов, беременность, кормление грудью';
    const age = enrichObj?.instructions?.age || '18+';

    const { usage, timing, course } = parseInstructionDetails(rawUsage, fullText);

    const properties = (enrichObj?.properties && enrichObj.properties.length > 0)
      ? enrichObj.properties.slice(0, 3)
      : [
          'Поддержка общего тонуса и укрепление защитных сил организма',
          'Высокая биодоступность и чистота действующих компонентов',
          'Сертифицированное качество по международным стандартам'
        ];

    // WhatsApp quick link
    const waText = encodeURIComponent(
      `Здравствуйте! Хочу заказать товар из каталога TOJ-VITAMIN:\nКод: ${code}\nНаименование: ${prod.name}\n${priceType !== 'none' ? `Цена: ${displayPrice}` : ''}`
    );
    const waLink = `https://wa.me/${OFFICIAL_PHONE}?text=${waText}`;

    // Clean image with optimized thumbnail if available
    const thumbFile = path.join(process.cwd(), `public/catalog-thumbs/prod-${prod.id}.png`);
    const imageUrl = fs.existsSync(thumbFile) ? `/catalog-thumbs/prod-${prod.id}.png` : (prod.image_url || '/logo.webp');

    return {
      id: String(prod.id),
      code,
      name: prod.name,
      fullName: prod.full_name || prod.name,
      brand: 'GLS Pharmaceuticals',
      category,
      price: finalPrice,
      retailPrice,
      wholesalePrice,
      displayPrice,
      imageUrl,
      properties,
      instructions: {
        usage,
        course: rawCourse && rawCourse.length < 30 ? rawCourse : course,
        timing,
        contraindications: contra.replace(/^противопоказания:?\s*/i, ''),
        age: age.replace(/^возрастные ограничения:?\s*/i, ''),
        fullText
      },
      waLink
    };
  });

  return {
    products: catalogProducts,
    categories: Array.from(categorySet),
    totalCount: catalogProducts.length,
    generatedAt: new Date().toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }),
    company: {
      name: 'TOJ-VITAMIN',
      tagline: 'Официальный дистрибьютор инновационных витаминов и БАД в Таджикистане',
      phone: OFFICIAL_PHONE,
      phoneFormatted: OFFICIAL_PHONE_FORMATTED,
      whatsapp: OFFICIAL_PHONE,
      whatsappFormatted: OFFICIAL_PHONE_FORMATTED,
      website: 'https://www.toj-vitamin.tj',
      email: 'ceo@toj-vitamin.tj',
      cities: ['Душанбе', 'Худжанд'],
      logoUrl: '/logo.webp'
    }
  };
}
