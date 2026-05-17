import { Metadata } from 'next';
import enrichedData from '@/data/enriched_gls_products.json';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { slugify } from '@/lib/slugify';
import { ProductBuyButton } from '@/components/ProductBuyButton';
import { ShareButton } from '@/components/ShareButton';

interface Props {
  params: { id: string };
}

async function getProduct(id: string): Promise<Product | null> {
  // 1. Fetch only id and name to find the match efficiently without pulling the whole DB
  const { data: nameList } = await supabase.from('products').select('id, name');
  if (!nameList) return null;
  
  const targetSlug = decodeURIComponent(id).toLowerCase().trim();
  const match = nameList.find(p => slugify(p.name) === targetSlug);
  
  if (!match) return null;

  // 2. Fetch the full product data using the matching ID
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', match.id)
    .single();

  return product;
}

export async function generateStaticParams() {
  const { data: products } = await supabase.from('products').select('name');
  return (products || []).map((p) => ({
    id: slugify(p.name),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.id);
  const enriched = (enrichedData as Record<string, any>)[decodeURIComponent(params.id).toLowerCase().trim()];

  if (!product) {
    return { title: 'Товар не найден' };
  }

  const title = `${product.name} | Премиальные витамины GLS в Таджикистане`;
  const description = enriched?.properties?.slice(0, 3).join('. ') || `Заказать ${product.name} по цене ${product.price} смн с бесплатной доставкой от Green Leaf Sciences.`;
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
          alt: product.name,
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
      canonical: `/product/${params.id}`,
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.id);
  const id = decodeURIComponent(params.id).toLowerCase().trim();
  const enriched = (enrichedData as Record<string, any>)[product?.name?.toLowerCase().trim() || ''];

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-[#FDFBF7]">
        <h1 className="text-3xl font-bold font-outfit">Товар не найден</h1>
        <Link href="/" className="mt-4 text-[#1E40AF] underline font-medium">Вернуться в каталог</Link>
      </div>
    );
  }

  const description = enriched?.properties?.slice(0, 3).join('. ') || `Заказать ${product.name} по цене ${product.price} смн с бесплатной доставкой от Green Leaf Sciences.`;

  const jsonLd = [
    {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "image": product.image_url ? [product.image_url.startsWith('http') ? product.image_url : `https://www.toj-vitamin.tj${product.image_url}`] : [],
      "description": enriched?.properties?.join('. ') || product.description || product.name,
      "brand": {
        "@type": "Brand",
        "name": "Green Leaf Sciences"
      },
      "sku": product.id,
      "category": enriched?.tags?.[0] || "Health & Beauty",
      "offers": {
        "@type": "Offer",
        "url": `https://www.toj-vitamin.tj/product/${encodeURIComponent(id)}`,
        "priceCurrency": "TJS",
        "price": product.price,
        "itemCondition": "https://schema.org/NewCondition",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "tojvitamin"
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
      "review": [{
        "@type": "Review",
        "reviewRating": { "@type": "Rating", "ratingValue": "5" },
        "author": { "@type": "Person", "name": "Алишер" },
        "reviewBody": "Отличное качество, помогло уже через неделю приема."
      }]
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Главная",
          "item": "https://www.toj-vitamin.tj"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Каталог",
          "item": "https://www.toj-vitamin.tj#catalog"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": product.name,
          "item": `https://www.toj-vitamin.tj/product/${encodeURIComponent(id)}`
        }
      ]
    }
  ];

  const displayProduct = {
    ...product,
    ...(enriched || {})
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      <div className="w-full h-[80px] bg-white/80 backdrop-blur-md border-b border-black/[0.05] sticky top-0 z-50 flex items-center px-6 sm:px-12">
        <div className="max-w-6xl mx-auto w-full">
          <Link href="/" className="inline-flex items-center gap-2 text-[#1D1D1F] font-bold hover:text-[#1E40AF] transition-colors bg-white border border-black/5 px-4 py-2 rounded-full shadow-sm hover:shadow-md">
            <ArrowLeft size={18} />
            <span className="text-sm">Вернуться в каталог</span>
          </Link>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Two-column Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left: Premium Glassmorphic Image Container */}
          <div className="relative group bg-white rounded-[40px] p-8 md:p-12 shadow-[0_20px_40px_rgba(0,0,0,0.02)] border border-black/[0.03] flex items-center justify-center min-h-[350px] md:min-h-[420px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/[0.01]" />
            {product.image_url ? (
              <img
                src={product.image_url.startsWith('http') ? product.image_url : `https://www.toj-vitamin.tj${product.image_url}`}
                alt={product.name}
                className="w-full max-h-[320px] object-contain group-hover:scale-[1.03] transition-transform duration-700 ease-out relative z-10"
              />
            ) : (
              <div className="text-[#94A3B8] text-sm">Изображение товара</div>
            )}
          </div>

          {/* Right: Product Details & Purchase Actions */}
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[#94A3B8] text-[12px] font-bold uppercase tracking-[0.25em]">
                Green Leaf Sciences
              </p>
              <h1 className="text-[36px] md:text-[48px] font-bold text-[#1D1D1F] leading-[1.1] tracking-tight font-outfit">
                {product.name}
              </h1>
            </div>

            {displayProduct.tags && (
               <div className="flex gap-2 flex-wrap pt-1">
                 {displayProduct.tags.map((tag: string, i: number) => (
                   <span key={i} className="px-4 py-1.5 rounded-full bg-[#1E40AF]/10 text-[11px] font-bold text-[#1E40AF] uppercase tracking-widest">
                     {tag}
                   </span>
                 ))}
               </div>
            )}

            {/* Price, Status & Short Info */}
            <div className="pt-6 border-t border-black/[0.05] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-[36px] font-bold text-[#1D1D1F] font-outfit">{product.price}</span>
                  <span className="text-[16px] text-[#475569] font-medium">TJS / сомони</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8F5E9] text-[#2E7D32] rounded-full text-[13px] font-bold w-fit">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4CAF50] animate-pulse" />
                  В наличии. Оригинал GLS
                </div>
              </div>
              <p className="text-[15px] text-[#64748B] leading-relaxed">
                Сертифицированные нутрицевтики высочайшей биологической ценности. Бесплатная консультация нашего эксперта и экспресс-доставка по всему Таджикистану.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="pt-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-auto [&_a]:w-full">
                <ProductBuyButton product={product} lang="ru" />
              </div>
              <ShareButton
                url={`/product/${params.id}`}
                title={product.name}
                description={description}
                variant="primary"
                lang="ru"
              />
            </div>
          </div>
        </div>

        {displayProduct.properties && displayProduct.properties.length > 0 && (
          <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-[0_20px_40px_rgba(0,0,0,0.03)] border border-black/[0.03]">
             <h2 className="text-[20px] font-bold text-[#1D1D1F] mb-8 flex items-center gap-3 font-outfit">
               <ShieldCheck className="text-[#1E40AF]" size={28} />
               Свойства и клиническое действие
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
               Для кого это важно
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
               Медицинские взаимодействия
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


      </main>
    </div>
  );
}
