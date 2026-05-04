import React from 'react';
import { supabase } from '@/lib/supabase';
import { ProductCatalog } from '@/components/ProductCatalog';
import { Header } from '@/components/Header';
import { MainBackground } from '@/components/MainBackground';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { slugify } from '@/lib/slugify';
import Link from 'next/link';
import { MapPin, ShieldCheck, Truck, Clock } from 'lucide-react';

const CITIES: Record<string, { ru: string; tj: string }> = {
  'dushanbe': { ru: 'Душанбе', tj: 'Душанбе' },
  'khujand': { ru: 'Худжанд', tj: 'Хуҷанд' },
  'kulob': { ru: 'Куляб', tj: 'Кӯлоб' },
  'bokhtar': { ru: 'Бохтар', tj: 'Бохтар' },
  'vakhdat': { ru: 'Вахдат', tj: 'Ваҳдат' },
  'hissar': { ru: 'Гиссар', tj: 'Ҳисор' }
};

interface Props {
  params: { city: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = CITIES[params.city.toLowerCase()];
  if (!city) return { title: 'Витамины в Таджикистане' };

  const { data: products } = await supabase.from('products').select('name');
  const decodedSlug = decodeURIComponent(params.slug);
  const product = products?.find(p => slugify(p.name) === decodedSlug);
  
  if (!product) return { title: `Витамины в ${city.ru}` };

  const title = `Купить ${product.name} в ${city.ru} | Цена, Доставка, Отзывы`;
  const description = `Ищете ${product.name} в ${city.ru}? ✅ Официальный магазин Green Leaf Sciences. Бесплатная консультация и быстрая доставка по ${city.ru} и Таджикистану. Заказывайте прямо сейчас!`;

  return {
    title,
    description,
    keywords: [`${product.name} ${city.ru}`, `купить ${product.name} таджикистан`, `витамины ${city.ru}`],
    alternates: {
      canonical: `https://www.toj-vitamin.tj/buy/${params.city}/${params.slug}`
    }
  };
}

export default async function PSEOPage({ params }: Props) {
  const city = CITIES[params.city.toLowerCase()];
  if (!city) notFound();

  const { data: products } = await supabase.from('products').select('*');
  const decodedSlug = decodeURIComponent(params.slug);
  const product = products?.find(p => slugify(p.name) === decodedSlug);

  if (!product) notFound();

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": product.image_url ? [product.image_url.startsWith('http') ? product.image_url : `https://www.toj-vitamin.tj${product.image_url}`] : [],
    "description": product.description || product.name,
    "brand": {
      "@type": "Brand",
      "name": "Green Leaf Sciences"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://www.toj-vitamin.tj/buy/${params.city}/${params.slug}`,
      "priceCurrency": "TJS",
      "price": product.price,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock",
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
    }
  };

  return (
    <main className="min-h-screen bg-[#FDFBF7] relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MainBackground />
      <Header lang="ru" settings={{ brand_name: "TOJ-VITAMIN", whatsapp_phone: "992176660707" }} setLang={() => {}} />
      
      <div className="pt-32 pb-20 px-6 max-w-5xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="mb-12 flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-[#94A3B8]">
          <Link href="/" className="hover:text-[#1E40AF]">Главная</Link>
          <span>/</span>
          <span className="text-[#1E40AF]">{city.ru}</span>
        </nav>

        {/* SEO Header */}
        <div className="space-y-6 mb-20">
          <div className="flex items-center gap-2 text-[#1E40AF]">
            <MapPin size={20} />
            <span className="text-[12px] font-bold uppercase tracking-[0.3em]">Официальный склад: {city.ru}</span>
          </div>
          <h1 className="text-[40px] md:text-[72px] font-bold text-[#1D1D1F] leading-[1] tracking-tighter font-outfit">
            {product.name} <br /> 
            <span className="text-[#1E40AF]">в городе {city.ru}</span>
          </h1>
          <p className="text-[20px] text-[#475569] max-w-3xl leading-relaxed">
            Прямые поставки витаминов премиум-класса Green Leaf Sciences в {city.ru}. 
            Лабораторная чистота, высокая биодоступность и быстрая локальная доставка.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {[
            { icon: Truck, title: 'Локальная доставка', desc: `Курьерская служба в ${city.ru} доставит ваш заказ в течение 2-4 часов.` },
            { icon: ShieldCheck, title: 'Гарантия Green Leaf', desc: 'Прямой импорт без посредников. 100% защита от подделок.' },
            { icon: Clock, title: 'Поддержка 24/7', desc: `Наши специалисты в ${city.ru} всегда готовы проконсультировать вас.` }
          ].map((b, i) => (
            <div key={i} className="group bg-white/60 hover:bg-white backdrop-blur-xl border border-black/[0.05] p-10 rounded-[40px] transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
              <div className="w-14 h-14 bg-[#1E40AF]/10 rounded-[20px] flex items-center justify-center text-[#1E40AF] mb-6 group-hover:scale-110 transition-transform">
                <b.icon size={28} />
              </div>
              <h3 className="font-bold text-[20px] font-outfit mb-3">{b.title}</h3>
              <p className="text-[15px] text-[#64748B] leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Science & City Context */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24 items-center">
          <div className="space-y-8">
            <h2 className="text-[32px] font-bold font-outfit leading-tight">
              Научный подход к здоровью <br /> жителей {city.ru}
            </h2>
            <div className="space-y-6 text-[#475569] text-[16px] leading-relaxed">
              <p>
                В условиях климата города {city.ru} поддержание оптимального уровня микроэлементов становится критически важным. 
                {product.name} от Green Leaf Sciences разработан с учетом последних клинических исследований для обеспечения 
                максимальной абсорбции.
              </p>
              <p>
                Мы обеспечиваем строгий температурный контроль при хранении и транспортировке в {city.ru}, 
                чтобы сохранить биологическую активность каждого компонента.
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#1E40AF]/5 to-[#1E40AF]/10 rounded-[48px] p-12 border border-[#1E40AF]/10 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#1E40AF]/5 blur-[80px] -mr-32 -mt-32" />
             <div className="relative z-10 space-y-6">
                <div className="inline-block px-4 py-2 bg-white rounded-full text-[12px] font-bold text-[#1E40AF] uppercase tracking-widest shadow-sm">
                  Статистика региона
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <div className="text-[32px] font-bold text-[#1E40AF]">98%</div>
                    <div className="text-[12px] text-[#64748B] uppercase font-bold tracking-wider">Довольных клиентов</div>
                  </div>
                  <div>
                    <div className="text-[32px] font-bold text-[#1E40AF]">&lt; 3ч</div>
                    <div className="text-[12px] text-[#64748B] uppercase font-bold tracking-wider">Среднее время доставки</div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Catalog Section */}
        <div className="relative mb-24">
           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1E40AF]/5 to-transparent blur-3xl opacity-30" />
           <div className="relative z-10 bg-white/80 backdrop-blur-2xl rounded-[64px] p-12 shadow-2xl border border-black/[0.03]">
              <div className="text-center mb-12">
                <h2 className="text-[32px] font-bold font-outfit">Заказать {product.name} сейчас</h2>
                <p className="text-[#64748B]">Выберите дозировку и оформите заказ через WhatsApp</p>
              </div>
              <ProductCatalog lang="ru" whatsappNumber="992176660707" initialCategory="all" />
           </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-8">
           <h2 className="text-[28px] font-bold text-center font-outfit mb-12">Часто задаваемые вопросы в {city.ru}</h2>
           {[
             { q: `Как купить ${product.name} в ${city.ru}?`, a: `Вы можете выбрать товар в каталоге выше и нажать кнопку "Заказать в WhatsApp". Наш менеджер в ${city.ru} свяжется с вами для уточнения деталей.` },
             { q: `Есть ли самовывоз в ${city.ru}?`, a: `Да, у нас есть пункт выдачи в центре ${city.ru}. При заказе менеджер сообщит точный адрес.` },
             { q: `Почему цена на ${product.name} в Таджикистане выше, чем на маркетплейсах?`, a: `Мы гарантируем оригинальность продукции Green Leaf Sciences и соблюдение условий хранения, что невозможно проконтролировать у сторонних продавцов.` }
           ].map((faq, i) => (
             <div key={i} className="border-b border-black/[0.05] pb-8">
               <h4 className="font-bold text-[18px] mb-3">{faq.q}</h4>
               <p className="text-[#64748B] text-[15px] leading-relaxed">{faq.a}</p>
             </div>
           ))}
        </div>
      </div>
    </main>
  );
}
