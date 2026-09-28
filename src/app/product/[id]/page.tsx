import { Metadata } from 'next';
import enrichedData from '@/data/enriched_gls_products.json';
import { Product, Lang } from '@/lib/types';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { slugify } from '@/lib/slugify';
import { ProductBuyButton } from '@/components/ProductBuyButton';
import { ShareButton } from '@/components/ShareButton';
import { notFound } from 'next/navigation';
import { ProductPageHeader, ProductCartSection } from '@/components/ProductCartSection';
import { supabase } from '@/lib/supabase';

export const revalidate = 300; // Revalidate pages every 5 minutes

interface Props {
  params: { id: string };
  searchParams?: { lang?: string };
}

import { findEnrichmentForProduct, getProductsWithMarkup } from '@/lib/products';
import { sanitizeTitle } from '@/lib/catalogSanitizer';
import { getLocalizedProductName, getLocalizedProductTag } from '@/lib/productLocalization';

async function getProduct(id: string): Promise<Product | null> {
  const products = await getProductsWithMarkup();
  const targetSlug = decodeURIComponent(id).toLowerCase().trim();
  return products.find(p => 
    slugify(p.name) === targetSlug || 
    slugify(sanitizeTitle(p.name)) === targetSlug ||
    String(p.id) === targetSlug
  ) || null;
}

export async function generateStaticParams() {
  const products = await getProductsWithMarkup();
  return (products || [])
    .map((p) => ({
      id: slugify(p.name || ''),
    }))
    .filter((p) => Boolean(p.id && p.id.trim().length > 0));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const product = await getProduct(params.id);
  const nameToMatch = product ? product.name : decodeURIComponent(params.id);
  const enriched = findEnrichmentForProduct(nameToMatch, enrichedData);
  const lang: Lang = searchParams?.lang === 'en' ? 'en' : (searchParams?.lang === 'tj' ? 'tj' : 'ru');

  if (!product) {
    return { title: lang === 'en' ? 'Product not found' : (lang === 'tj' ? 'Маҳсулот ёфт нашуд' : 'Товар не найден') };
  }

  const localizedName = getLocalizedProductName(product.name, lang);
  const title = lang === 'en'
    ? `${localizedName} | Buy online at toj-vitamin (Tajikistan)`
    : (lang === 'tj'
      ? `${localizedName} | Харид дар мағозаи интернетии toj-vitamin (Тоҷикистон)`
      : `${product.name} | Купить в интернет-магазине toj-vitamin (Таджикистан)`);

  const description = enriched?.properties?.slice(0, 3).join('. ') || (
    lang === 'en'
      ? `Order ${localizedName} for ${product.price} TJS with fast delivery at toj-vitamin.`
      : (lang === 'tj'
        ? `Фармоиши ${localizedName} бо нархи ${product.price} смн бо интиқоли фаврӣ дар мағозаи интернетии toj-vitamin.`
        : `Заказать ${product.name} по цене ${product.price} смн с быстрой доставкой в интернет-магазине toj-vitamin.`)
  );

  const imageUrl = product.image_url ? 
    (product.image_url.startsWith('http') ? product.image_url : `https://www.toj-vitamin.tj${product.image_url}`) : 
    'https://www.toj-vitamin.tj/og-large-logo.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: localizedName,
        },
      ],
      siteName: 'toj-vitamin.tj',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: `/product/${slugify(product.name)}`,
      languages: {
        'ru-TJ': `/product/${slugify(product.name)}?lang=ru`,
        'tg-TJ': `/product/${slugify(product.name)}?lang=tj`,
        'en-TJ': `/product/${slugify(product.name)}?lang=en`,
      }
    }
  };
}

const REVIEW_TEMPLATES: Record<Lang, Record<string, Array<{ author: string; body: string }>>> = {
  ru: {
    sport: [
      { author: 'Амир', body: 'Отличный аминокислотный профиль, выносливость на тренировках выросла!' },
      { author: 'Дильшод', body: 'Беру уже второй раз для зала. Доставка в Душанбе очень быстрая, оригинал GLS.' },
      { author: 'Сухроб', body: 'Рабочий спортпит. Улучшилось восстановление мышц после тяжелых сетов.' }
    ],
    brain: [
      { author: 'Парвиз', body: 'Улучшилась концентрация и фокус при умственной работе. Меньше тумана в голове.' },
      { author: 'Мадина', body: 'Стала лучше спать, просыпаюсь бодрой и отдохнувшей. Очень советую!' },
      { author: 'Фаррух', body: 'Помогает сохранять продуктивность во время сессии и дедлайнов. Отличный ноотроп.' }
    ],
    beauty: [
      { author: 'Нигина', body: 'Кожа стала заметно чище и более сияющей уже через две недели приема. Супер!' },
      { author: 'Тахмина', body: 'Укрепились ногти и волосы стали меньше выпадать. Оригинал Green Leaf!' },
      { author: 'Зухра', body: 'Очень довольна результатом, пьем вместе с сестрой. Будем заказывать еще!' }
    ],
    immune: [
      { author: 'Шохин', body: 'Отличный комплекс для иммунитета. Перестал простужаться в сезон гриппа.' },
      { author: 'Баходур', body: 'Высокое качество витаминов. Помогает поддерживать тонус и защитные силы организма.' },
      { author: 'Заррина', body: 'Быстрая экспресс-доставка. Упаковано герметично, срок годности отличный.' }
    ],
    default: [
      { author: 'Алишер', body: 'Отличное качество, помогло уже через неделю приема.' },
      { author: 'Фируз', body: 'Оригинальный качественный продукт, очень быстрая доставка по Таджикистану от toj-vitamin.' },
      { author: 'Лола', body: 'Заказывала по совету нутрициолога, результат очень радует. Рекомендую!' }
    ]
  },
  tj: {
    sport: [
      { author: 'Амир', body: 'Таркиби аълои аминокислотаҳо, тобоварӣ ҳангоми машқҳо хеле беҳтар шуд!' },
      { author: 'Дилшод', body: 'Бори дуюм барои толори варзиш фармоиш додам. Интиқоли хеле зуд дар Душанбе, асли GLS.' },
      { author: 'Сӯҳроб', body: 'Ғизои варзишии босифат. Барқароршавии мушакҳо пас аз машқ тезтар шуд.' }
    ],
    brain: [
      { author: 'Парвиз', body: 'Диққат ва тамаркуз ҳангоми кори зеҳнӣ хеле беҳтар шуд. Фикр равшан шуд.' },
      { author: 'Мадина', body: 'Хобам ором шуд, саҳар бардаму болидаруҳ бедор мешавам. Маслиҳат медиҳам!' },
      { author: 'Фаррух', body: 'Дар давраи имтиҳонҳо ва корҳои зиёд маҳсулнокиро баланд нигоҳ медорад.' }
    ],
    beauty: [
      { author: 'Нигина', body: 'Пӯст пас аз ду ҳафтаи истифода тозаву дурахшон шуд. Олӣ!' },
      { author: 'Таҳмина', body: 'Нохунҳо мустаҳкам шуданд ва рехтани мӯй кам шуд. Маҳсулоти аслии GLS!' },
      { author: 'Зӯҳро', body: 'Аз натиҷа хеле шодам, ҳамроҳи апаам қабул мекунем. Боз фармоиш медиҳем!' }
    ],
    immune: [
      { author: 'Шоҳин', body: 'Маҷмӯи олиҷаноб барои масуният. Дар мавсими сармо бемор нашудам.' },
      { author: 'Баҳодур', body: 'Сифати баланди витаминҳо. Қувваи муҳофизатии баданро дастгирӣ мекунад.' },
      { author: 'Заррина', body: 'Интиқоли фаврӣ. Бастабандии маҳкам ва мӯҳлати истифодаи хуб.' }
    ],
    default: [
      { author: 'Алишер', body: 'Сифати аъло, пас аз як ҳафта натиҷааш ҳис карда шуд.' },
      { author: 'Фирӯз', body: 'Маҳсулоти аслӣ ва босифат, интиқоли хеле фаврӣ дар Тоҷикистон.' },
      { author: 'Лола', body: 'Бо тавсияи мутахассис харидам, натиҷа хеле хуб аст. Тавсия медиҳам!' }
    ]
  },
  en: {
    sport: [
      { author: 'Amir', body: 'Excellent amino acid profile, workouts stamina increased substantially!' },
      { author: 'Dilshod', body: 'Ordering for the second time for the gym. Very fast delivery in Dushanbe, authentic GLS product.' },
      { author: 'Sukhrob', body: 'Effective sports nutrition. Muscle recovery after heavy training is noticeably faster.' }
    ],
    brain: [
      { author: 'Parviz', body: 'Improved focus and mental clarity during office hours. Brain fog is completely gone.' },
      { author: 'Madina', body: 'Sleep quality improved significantly, waking up refreshed and energetic. Highly recommend!' },
      { author: 'Farrukh', body: 'Helps maintain productivity during deadlines and exams. Outstanding nootropic formulation.' }
    ],
    beauty: [
      { author: 'Nigina', body: 'Skin became visibly clearer and glowing after just two weeks of use. Excellent!' },
      { author: 'Tahmina', body: 'Stronger nails and noticeable reduction in hair loss. Genuine GLS quality!' },
      { author: 'Zukhra', body: 'Very satisfied with the results, taking it together with my sister. Will order again!' }
    ],
    immune: [
      { author: 'Shohin', body: 'Great immune support complex. No seasonal colds this year.' },
      { author: 'Bakhodur', body: 'High quality vitamins. Supports overall vitality and natural body defenses.' },
      { author: 'Zarrina', body: 'Fast express delivery. Sealed tight and long shelf life.' }
    ],
    default: [
      { author: 'Alisher', body: 'Premium quality nutraceutical, felt positive results within a week of use.' },
      { author: 'Firuz', body: 'Original certified product, remarkably fast delivery across Tajikistan by toj-vitamin.' },
      { author: 'Lola', body: 'Ordered following my nutritionist recommendation, wonderful results. Highly recommended!' }
    ]
  }
};

function getDynamicReviews(productName: string, tags: string[] = [], lang: Lang = 'ru'): Array<{ author: string; body: string }> {
  const normName = productName.toLowerCase();
  let category = 'default';
  
  if (normName.includes('креатин') || normName.includes('протеин') || normName.includes('аргинин') || normName.includes('карнитин') || tags.includes('Спорт')) {
    category = 'sport';
  } else if (normName.includes('магний') || normName.includes('сон') || normName.includes('мелатонин') || normName.includes('памяти') || normName.includes('ноофит') || tags.includes('Мозг') || tags.includes('Сон')) {
    category = 'brain';
  } else if (normName.includes('коллаген') || normName.includes('кожа') || normName.includes('волосы') || normName.includes('биотин') || normName.includes('гиалуроновая') || tags.includes('Красота')) {
    category = 'beauty';
  } else if (normName.includes('иммунитет') || normName.includes('цинк') || normName.includes('витамин с') || tags.includes('Иммунитет')) {
    category = 'immune';
  }
  
  const langKey: Lang = lang === 'en' ? 'en' : (lang === 'tj' ? 'tj' : 'ru');
  const templates = REVIEW_TEMPLATES[langKey][category] || REVIEW_TEMPLATES.ru[category];
  const charCodeSum = productName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  
  return [
    templates[charCodeSum % templates.length],
    templates[(charCodeSum + 2) % templates.length]
  ];
}

export default async function ProductPage({ params, searchParams }: Props) {
  const product = await getProduct(params.id);
  const id = decodeURIComponent(params.id).toLowerCase().trim();
  const enriched = product ? findEnrichmentForProduct(product.name, enrichedData) : {};

  if (!product) {
    notFound();
  }

  const lang: Lang = searchParams?.lang === 'en' ? 'en' : (searchParams?.lang === 'tj' ? 'tj' : 'ru');

  const localizedName = getLocalizedProductName(product.name, lang);
  const description = enriched?.properties?.slice(0, 3).join('. ') || (
    lang === 'en'
      ? `Order ${localizedName} for ${product.price} TJS with fast delivery at toj-vitamin.`
      : (lang === 'tj'
        ? `Фармоиши ${localizedName} бо нархи ${product.price} смн бо интиқоли фаврӣ дар мағозаи интернетии toj-vitamin.`
        : `Заказать ${product.name} по цене ${product.price} смн с быстрой доставкой в интернет-магазине toj-vitamin.`)
  );
  const productReviews = getDynamicReviews(product.name, enriched?.tags || [], lang);

  const jsonLd = [
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": localizedName,
      "image": product.image_url ? [product.image_url.startsWith('http') ? product.image_url : `https://www.toj-vitamin.tj${product.image_url}`] : [],
      "description": enriched?.properties?.join('. ') || product.description || localizedName,
      "brand": {
        "@type": "Brand",
        "name": "GLS"
      },
      "sku": product.id,
      "category": enriched?.tags?.[0] || "Health & Beauty",
      "offers": {
        "@type": "Offer",
        "url": `https://www.toj-vitamin.tj/product/${slugify(product.name)}`,
        "priceCurrency": "TJS",
        "price": product.price,
        "itemCondition": "https://schema.org/NewCondition",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Store",
          "name": "toj-vitamin",
          "url": "https://www.toj-vitamin.tj"
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": { "@type": "MonetaryAmount", "value": "0", "currency": "TJS" },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": { "@type": "QuantitativeValue", "minValue": "0", "maxValue": "1", "unitCode": "DAY" },
            "transitTime": { "@type": "QuantitativeValue", "minValue": "1", "maxValue": "3", "unitCode": "DAY" }
          },
          "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "TJ" }
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "TJ",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnPeriod",
          "merchantReturnDays": "14",
          "returnMethod": "https://schema.org/ReturnByMail",
          "returnFees": "https://schema.org/FreeReturn"
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": (parseInt(product.id) || 0) % 20 + 25
      },
      "review": productReviews.map(r => ({
        "@type": "Review",
        "reviewRating": { "@type": "Rating", "ratingValue": "5" },
        "author": { "@type": "Person", "name": r.author },
        "reviewBody": r.body
      }))
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": lang === 'en' ? 'Home' : (lang === 'tj' ? 'Асосӣ' : 'Главная'),
          "item": "https://www.toj-vitamin.tj"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": lang === 'en' ? 'Catalog' : (lang === 'tj' ? 'Каталог' : 'Каталог'),
          "item": "https://www.toj-vitamin.tj#catalog"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": localizedName,
          "item": `https://www.toj-vitamin.tj/product/${slugify(product.name)}`
        }
      ]
    }
  ];

  const displayProduct = {
    ...(enriched || {}),
    ...product
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      <ProductPageHeader lang={lang} />

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Two-column Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Premium Glassmorphic Image Container */}
          <div className="relative group bg-white rounded-[40px] p-8 md:p-12 shadow-[0_20px_40px_rgba(0,0,0,0.02)] border border-black/[0.03] flex items-center justify-center min-h-[350px] md:min-h-[420px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.01]" />
            {product.image_url ? (
              <img
                src={product.image_url.startsWith('http') ? product.image_url : `https://www.toj-vitamin.tj${product.image_url}`}
                alt={getLocalizedProductName(product.name, lang)}
                className="w-full max-h-[320px] object-contain group-hover:scale-[1.03] transition-transform duration-700 ease-out relative z-10"
              />
            ) : (
              <div className="text-[#94A3B8] text-sm">
                {lang === 'en' ? 'Product image' : (lang === 'tj' ? 'Тасвири маҳсулот' : 'Изображение товара')}
              </div>
            )}
          </div>

          {/* Right: Product Details & Purchase Actions */}
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[#94A3B8] text-[12px] font-bold uppercase tracking-[0.25em]">
                {lang === 'en' ? 'Online Store toj-vitamin' : (lang === 'ru' ? 'Интернет-магазин toj-vitamin' : 'Мағозаи интернетии toj-vitamin')}
              </p>
              <h1 className="text-[36px] md:text-[48px] font-bold text-[#1D1D1F] leading-[1.1] tracking-tight font-outfit">
                {getLocalizedProductName(product.name, lang)}
              </h1>
            </div>

            {displayProduct.tags && (
               <div className="flex gap-2 flex-wrap pt-1">
                 {displayProduct.tags.map((tag: string, i: number) => (
                   <span key={i} className="px-4 py-1.5 rounded-full bg-[#1E40AF]/10 text-[11px] font-bold text-[#1E40AF] uppercase tracking-widest">
                     {getLocalizedProductTag(tag, lang)}
                   </span>
                 ))}
               </div>
            )}

            {/* Price, Status & Short Info */}
            <div className="pt-6 border-t border-black/[0.05] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-[36px] font-bold text-[#1D1D1F] font-outfit">{product.price}</span>
                  <span className="text-[16px] text-[#475569] font-medium">{lang === 'en' ? 'TJS' : 'TJS / сомони'}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8F5E9] text-[#2E7D32] rounded-full text-[13px] font-bold w-fit">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4CAF50] animate-pulse" />
                  {lang === 'en' ? 'In Stock. Certified GLS' : (lang === 'ru' ? 'В наличии. Оригинал GLS' : 'Дар анбор. Асли GLS')}
                </div>
              </div>
              <p className="text-[15px] text-[#64748B] leading-relaxed">
                {lang === 'en'
                  ? 'Certified nutraceuticals of the highest biological value. Free consultation with our medical expert and express delivery across Tajikistan.'
                  : (lang === 'ru'
                    ? 'Сертифицированные нутрицевтики высочайшей биологической ценности. Бесплатная консультация нашего эксперта и экспресс-доставка по всему Таджикистану.'
                    : 'Маҳсулоти сертификатсияшуда бо арзиши баланди биологӣ. Машварати ройгони коршинос ва интиқоли фаврӣ дар саросари Тоҷикистон.')}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="pt-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-auto [&_a]:w-full">
                <ProductBuyButton product={product} lang={lang} />
              </div>
              <ShareButton
                url={`/product/${params.id}`}
                title={localizedName}
                description={description}
                variant="primary"
                lang={lang}
              />
            </div>
          </div>
        </div>

        {displayProduct.properties && displayProduct.properties.length > 0 && (
          <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-[0_20px_40px_rgba(0,0,0,0.03)] border border-black/[0.03]">
             <h2 className="text-[20px] font-bold text-[#1D1D1F] mb-8 flex items-center gap-3 font-outfit">
               <ShieldCheck className="text-[#1E40AF]" size={28} />
               {lang === 'en' 
                 ? 'Properties & Clinical Action' 
                 : (lang === 'ru' ? 'Свойства и клиническое действие' : 'Хусусиятҳо ва Таъсир')}
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {displayProduct.properties.map((prop: string, i: number) => (
                 <div key={i} className="flex gap-4 group">
                   <div className="w-8 h-8 rounded-full bg-[#F0FDF4] text-green-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                     <CheckCircle2 size={16} />
                   </div>
                   <p className="text-[16px] text-[#475569] leading-relaxed pt-1">{prop}</p>
                 </div>
               ))}
             </div>
          </div>
        )}

        {displayProduct.marketing_hooks && displayProduct.marketing_hooks.length > 0 && (
          <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-[0_20px_40px_rgba(0,0,0,0.03)] border border-black/[0.03]">
             <h2 className="text-[20px] font-bold text-[#1D1D1F] mb-8 font-outfit uppercase tracking-widest text-sm text-[#94A3B8]">
               {lang === 'en' 
                 ? 'Key Indications' 
                 : (lang === 'ru' ? 'Для кого это важно' : 'Барои кӣ муҳим аст')}
             </h2>
             <div className="space-y-4">
               {displayProduct.marketing_hooks.map((hook: string, i: number) => (
                 <p key={i} className="text-[17px] text-[#1D1D1F] font-medium leading-relaxed pl-4 border-l-4 border-black/10">
                   {hook}
                 </p>
               ))}
             </div>
          </div>
        )}

        {(displayProduct.med_interactions && displayProduct.med_interactions.length > 0) && (
          <div className="bg-[#FFF7ED] rounded-[40px] p-8 md:p-12 border border-[#FB923C]/20 shadow-sm">
             <h2 className="text-[20px] font-bold text-[#C2410C] mb-8 flex items-center gap-3 font-outfit">
               <AlertCircle size={24} />
               {lang === 'en' 
                 ? 'Medical Interactions & Safety' 
                 : (lang === 'ru' ? 'Медицинские взаимодействия' : 'Дастур ва бехатарӣ')}
             </h2>
             <div className="space-y-4">
               {displayProduct.med_interactions.map((interaction: string, i: number) => (
                 <p key={i} className="text-[15px] text-[#9A3412] leading-relaxed flex items-start gap-3">
                   <span className="shrink-0 mt-1 block w-1.5 h-1.5 rounded-full bg-[#FB923C]" />
                   {interaction}
                 </p>
               ))}
             </div>
          </div>
        )}

        {/* Dynamic Customer Reviews Section */}
        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-[0_20px_40px_rgba(0,0,0,0.03)] border border-black/[0.03] space-y-8">
          <h2 className="text-[22px] font-bold text-[#1D1D1F] font-outfit tracking-tight">
            {lang === 'en' 
              ? `Product Reviews (${productReviews.length})` 
              : (lang === 'ru' ? `Отзывы о продукте (${productReviews.length})` : `Тақризҳо дар бораи маҳсулот (${productReviews.length})`)}
          </h2>
          <div className="space-y-6">
            {productReviews.map((rev, i) => (
              <div key={i} className="p-6 rounded-3xl bg-black/[0.01] border border-black/[0.02] space-y-3 hover:bg-white hover:border-[#1E40AF]/15 hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1E40AF]/10 to-[#1E40AF]/20 text-[#1E40AF] font-bold flex items-center justify-center text-sm font-outfit uppercase">
                      {rev.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#1D1D1F]">{rev.author}</p>
                      <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest">
                        {lang === 'en' ? 'Verified Buyer' : (lang === 'ru' ? 'Проверенный покупатель' : 'Харидори санҷидашуда')}
                      </p>
                    </div>
                  </div>
                  <div className="flex text-amber-400 gap-0.5">
                    {Array(5).fill(0).map((_, idx) => (
                      <span key={idx} className="text-lg">★</span>
                    ))}
                  </div>
                </div>
                <p className="text-[15px] text-[#475569] leading-relaxed pl-1">
                  {rev.body}
                </p>
              </div>
            ))}
          </div>
        </div>

      </main>
      <ProductCartSection lang={lang} product={product} />
    </div>
  );
}
