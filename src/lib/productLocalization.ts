import { Lang } from './types';

export const TAG_TRANSLATIONS: Record<string, string> = {
  'Мозг': 'Brain',
  'Энергия': 'Energy',
  'Биохакинг': 'Biohacking',
  'Спорт': 'Sport',
  'Мышцы': 'Muscles',
  'Антистресс': 'Anti-Stress',
  'Суставы': 'Joints',
  'Здоровье': 'Health',
  'Иммунитет': 'Immunity',
  'Сердце': 'Heart',
  'Мужчинам': 'Men',
  'Репродукция': 'Reproduction',
  'Похудение': 'Weight Loss',
  'Детокс': 'Detox',
  'Красота': 'Beauty',
  'Волосы': 'Hair',
  'Ногти': 'Nails',
  'Anti-age': 'Anti-Age',
  'Сахар': 'Blood Sugar',
  'Метаболизм': 'Metabolism',
  'Мужское здоровье': "Men's Health",
  'Тестостерон': 'Testosterone',
  'Душанбе': 'Certified',
  'GLS': 'GLS',
  'Зрение': 'Vision',
  'Женское здоровье': "Women's Health",
  'Кровь': 'Blood',
  'Пищеварение': 'Digestion',
  'Печень': 'Liver',
  'Сон': 'Sleep',
  'Железо': 'Iron',
  'Анемия': 'Anemia',
  'Гемоглобин': 'Hemoglobin',
  'Фертильность': 'Fertility',
  'Планирование беременности': 'Pregnancy Planning',
  'СПКЯ': 'PCOS Support',
  'Детям': 'Kids',
  'Магний': 'Magnesium',
  'Купить витамины': 'Vitamins',
  'Коэнзим Q10': 'Coenzyme Q10',
  'Омега-3': 'Omega-3',
  'Рыбий жир': 'Fish Oil',
  'Витамины для женщин': "Women's Multivitamins",
  'Гормоны': 'Hormone Balance'
};

const DIRECT_TERMS: [RegExp, string][] = [
  [/Формула памяти ["«]Ноофит["»]/gi, 'Memory Formula "Noofit"'],
  [/Формула очищение/gi, 'Cleansing Formula (Detox)'],
  [/Спортивная формула/gi, 'Sport Formula'],
  [/Кардио формула/gi, 'Cardio Formula'],
  [/Диабет формула/gi, 'Diabetes Formula'],
  [/ЖЕНСКАЯ ФОРМУЛА/gi, "Women's Formula"],
  [/МУЖСКАЯ ФОРМУЛА/gi, "Men's Formula"],
  [/Аминокислотный комплекс/gi, 'Amino Acid Complex'],
  [/В-комплекс/gi, 'B-Complex'],
  [/Глюкозамин Хондроитин/gi, 'Glucosamine Chondroitin'],
  [/Витамин Д3\+К2/gi, 'Vitamin D3 + K2'],
  [/Витамин D3\+K2/gi, 'Vitamin D3 + K2'],
  [/Витамин D3 для детей/gi, 'Kids Vitamin D3'],
  [/Витамин Д3 для детей/gi, 'Kids Vitamin D3'],
  [/Витамин D3/gi, 'Vitamin D3'],
  [/Витамин Д3/gi, 'Vitamin D3'],
  [/Витамины для волос/gi, 'Hair Vitamins'],
  [/Витамины для глаз/gi, 'Eye Vitamins'],
  [/Витамины для беременных/gi, 'Prenatal Multivitamins'],
  [/Витамин для детей/gi, 'Kids Vitamin'],
  [/Витамин B12/gi, 'Vitamin B12'],
  [/Витамин B5/gi, 'Vitamin B5'],
  [/Витамин А/gi, 'Vitamin A'],
  [/Витамин С детс\./gi, 'Kids Vitamin C'],
  [/Витамин С/gi, 'Vitamin C'],
  [/Витамин К2/gi, 'Vitamin K2'],
  [/Йохимбе/gi, 'Yohimbe'],
  [/Женьшень/gi, 'Ginseng'],
  [/Альфа липоевая кислота/gi, 'Alpha Lipoic Acid'],
  [/Гинкго билоба \+ Готу кола/gi, 'Ginkgo Biloba + Gotu Kola'],
  [/Биотин/gi, 'Biotin'],
  [/Калий магний/gi, 'Potassium Magnesium'],
  [/Омега 3-6-9/gi, 'Omega 3-6-9'],
  [/Омега-3 35% ПНЖК/gi, 'Omega-3 35% PUFA'],
  [/Омега-3 Fish Oil/gi, 'Omega-3 Fish Oil'],
  [/Омега-3 Витамин D3/gi, 'Omega-3 + Vitamin D3'],
  [/Омега 3 PRO/gi, 'Omega 3 PRO'],
  [/Омега-3/gi, 'Omega-3'],
  [/Омега/gi, 'Omega'],
  [/Цитруллин/gi, 'Citrulline'],
  [/Глутатион/gi, 'Glutathione'],
  [/Кальций цитрат/gi, 'Calcium Citrate'],
  [/Кальций D3/gi, 'Calcium D3'],
  [/Кальций Магний Цынк/gi, 'Calcium Magnesium Zinc'],
  [/Фолиевая кислота/gi, 'Folic Acid'],
  [/Черника\+А\+Е/gi, 'Bilberry + A + E'],
  [/Барбарис Берберин/gi, 'Barberry Berberine'],
  [/Липотропный фактор/gi, 'Lipotropic Factor'],
  [/Мелатонин Мелиссон/gi, 'Melatonin Melisson'],
  [/Железо Хелат/gi, 'Iron Chelate'],
  [/Железо фумарат/gi, 'Iron Fumarate'],
  [/Кожа Волосы Ногти/gi, 'Skin, Hair & Nails'],
  [/Магний Цитрат \+ В6/gi, 'Magnesium Citrate + B6'],
  [/Магний В6 для беременных/gi, 'Magnesium B6 Prenatal'],
  [/Магний Хелат/gi, 'Magnesium Chelate'],
  [/МАКСИФЕРТ/gi, 'MAXIFERT'],
  [/Мио-инозитол/gi, 'Myo-Inositol'],
  [/Мумие экстракт/gi, 'Shilajit (Mumijo) Extract'],
  [/Аргинин/gi, 'L-Arginine'],
  [/Таурин/gi, 'Taurine'],
  [/Цинк цитрат/gi, 'Zinc Citrate'],
  [/Цинк хелат/gi, 'Zinc Chelate'],
  [/Цинк селен/gi, 'Zinc Selenium'],
  [/Цинк/gi, 'Zinc'],
  [/Коллаген животный/gi, 'Bovine Collagen'],
  [/Коллаген для суставов/gi, 'Joint Collagen'],
  [/Коллаген морской/gi, 'Marine Collagen'],
  [/Коллаген/gi, 'Collagen'],
  [/Креатин/gi, 'Creatine'],
  [/Мультивитамины актив/gi, 'Multivitamin Active'],
  [/Мультивитамины для детей/gi, 'Kids Multivitamins'],
  [/Мультивитамины 12\+9/gi, 'Multivitamins 12+9'],
  [/Гиалуроновая кислота/gi, 'Hyaluronic Acid'],
  [/Артурон/gi, 'Arturon'],
  [/Тирозин/gi, 'Tyrosine'],
  [/Протеин/gi, 'Protein'],
  [/Хлорофилл/gi, 'Chlorophyll'],
  [/Алоэ Вера/gi, 'Aloe Vera'],
  [/MSM комплекс/gi, 'MSM Complex'],
  [/Хитозан морской/gi, 'Marine Chitosan'],
  [/Коэнзим Q10/gi, 'Coenzyme Q10'],
  [/PQQ комплекс/gi, 'PQQ Complex'],
  [/Семена Льна/gi, 'Flax Seeds'],
  [/Хрома пиколинат/gi, 'Chromium Picolinate'],
  [/Бета-каротин/gi, 'Beta-Carotene'],
  [/Жиросжигатель/gi, 'Fat Burner Formula'],
  [/Йод/gi, 'Iodine'],
  [/Л-карнитин/gi, 'L-Carnitine'],
  [/Чеснок/gi, 'Garlic Extract'],
  [/Мака перуанская/gi, 'Peruvian Maca'],
  [/Селен/gi, 'Selenium']
];

const GOAL_MAP: [RegExp, string][] = [
  [/рельеф мышц/gi, 'Muscle Tone'],
  [/красивая кожа/gi, 'Radiant Skin'],
  [/выносливость/gi, 'Endurance'],
  [/энергия сердца и молодость/gi, 'Heart Energy & Youth'],
  [/антистресс и сон/gi, 'Anti-stress & Sleep'],
  [/энергия/gi, 'Energy'],
  [/иммунитет/gi, 'Immunity'],
  [/суставы/gi, 'Joints'],
  [/кости/gi, 'Bones'],
  [/сосуды/gi, 'Blood Vessels'],
  [/похудение/gi, 'Weight Loss'],
  [/молодость/gi, 'Youth'],
  [/память/gi, 'Memory'],
  [/продуктивность/gi, 'Productivity'],
  [/красота/gi, 'Beauty'],
  [/кожа/gi, 'Skin'],
  [/для сердца/gi, 'Heart Support'],
  [/сердце/gi, 'Heart'],
  [/омоложение/gi, 'Rejuvenation'],
  [/очищение/gi, 'Detox'],
  [/ногти/gi, 'Nails'],
  [/зубы/gi, 'Teeth'],
  [/для беременных/gi, 'Prenatal'],
  [/зрение/gi, 'Vision'],
  [/глаз/gi, 'Eyes'],
  [/печень/gi, 'Liver'],
  [/метаболизм/gi, 'Metabolism'],
  [/спокойствие/gi, 'Calm'],
  [/сон/gi, 'Sleep'],
  [/антистресс/gi, 'Anti-Stress'],
  [/мышцы/gi, 'Muscles'],
  [/для силы мужчин и женщин/gi, 'Vitality for Men & Women'],
  [/развитие/gi, 'Development'],
  [/мозг/gi, 'Brain'],
  [/для мужчин и волос/gi, 'Men & Hair Support'],
  [/мужская сила/gi, "Men's Vitality"],
  [/вес/gi, 'Weight Support'],
  [/пищеварение/gi, 'Digestion'],
  [/кровь/gi, 'Blood'],
  [/нервы/gi, 'Nervous System'],
  [/кислород/gi, 'Oxygen'],
  [/гемоглобин/gi, 'Hemoglobin'],
  [/микробиом/gi, 'Microbiome'],
  [/жиросжигание/gi, 'Fat Burning'],
  [/концентрация ума/gi, 'Focus'],
  [/концентрация/gi, 'Focus'],
  [/щитовидная железа/gi, 'Thyroid'],
  [/баланс гармонов/gi, 'Hormonal Balance'],
  [/волосы/gi, 'Hair'],
  [/фетильность/gi, 'Fertility']
];

const FLAVORS: [RegExp, string][] = [
  [/экзотик/gi, 'Exotic'],
  [/ваниль/gi, 'Vanilla'],
  [/шоколад/gi, 'Chocolate'],
  [/малина/gi, 'Raspberry'],
  [/лимон/gi, 'Lemon'],
  [/апельсин/gi, 'Orange'],
  [/клубника/gi, 'Strawberry'],
  [/сливочный банан/gi, 'Creamy Banana'],
  [/лесные ягоды/gi, 'Wild Berries'],
  [/мультифрукт/gi, 'Multifruit'],
  [/цитрус/gi, 'Citrus']
];

export function getLocalizedProductName(name: string, lang: Lang): string {
  if (lang !== 'en' || !name) return name;

  let res = name;

  // Cleanup marketing / location suffixes
  res = res.replace(/\s*—\s*(Купить в Душанбе|Витамины в Душанбе|Душанбе|Комплекс витаминов для женщин в Душанбе|Витамины для мужской силы и энергии)/gi, '');
  res = res.replace(/\(Прощай Анемия\)/gi, '(Anemia Support)');
  res = res.replace(/—\s*Здоровье яичников и Фертильность/gi, '- Ovarian Health & Fertility');
  res = res.replace(/—\s*Комплекс витаминов для женщин/gi, "- Women's Multivitamin Complex");

  // Direct active terms
  for (const [re, repl] of DIRECT_TERMS) {
    res = res.replace(re, repl);
  }

  // Dosage Forms
  res = res.replace(/капс\./gi, 'Caps.');
  res = res.replace(/капс/gi, 'Caps.');
  res = res.replace(/шипучие таб\./gi, 'Effervescent Tabs');
  res = res.replace(/таб\./gi, 'Tabs');
  res = res.replace(/порошок/gi, 'Powder');
  res = res.replace(/паст\./gi, 'Gummies');
  res = res.replace(/для детей/gi, 'Kids');
  res = res.replace(/детс\./gi, 'Kids');
  res = res.replace(/без сахара/gi, 'Sugar-Free');
  res = res.replace(/масса/gi, 'wt.');
  res = res.replace(/\bм\./gi, 'wt.');
  res = res.replace(/м\.(\d)/gi, 'wt. $1');

  // Purposes in parentheses
  for (const [re, repl] of GOAL_MAP) {
    res = res.replace(re, repl);
  }

  // Flavors
  for (const [re, repl] of FLAVORS) {
    res = res.replace(re, repl);
  }

  // Dosage Units
  res = res.replace(/(\d+)\s*мг/gi, '$1mg');
  res = res.replace(/(\d+)\s*мкг/gi, '$1mcg');
  res = res.replace(/(\d+)\s*г\b/gi, '$1g');
  res = res.replace(/(\d+)\s*г(?=\s|$)/gi, '$1g');
  res = res.replace(/№\s*(\d+)/gi, '#$1');
  res = res.replace(/(\d+)\s*МЕ/gi, '$1 IU');

  // Spacing fix
  res = res.replace(/Caps\.(\d)/g, 'Caps. $1');
  res = res.replace(/(\d+)mg#(\d+)/g, '$1mg #$2');
  res = res.replace(/(\d+)mg\s*#(\d+)/g, '$1mg #$2');
  res = res.replace(/\s+/g, ' ').trim();

  return res;
}

export function getLocalizedProductTag(tag: string, lang: Lang): string {
  if (lang !== 'en' || !tag) return tag;
  return TAG_TRANSLATIONS[tag.trim()] || tag;
}
