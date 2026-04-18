import { Metadata } from 'next';
import enrichedData from '@/data/enriched_gls_products.json';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  params: { id: string };
}

export async function generateStaticParams() {
  return Object.keys(enrichedData).map((key) => ({
    id: key,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeURIComponent(params.id);
  const productData = (enrichedData as Record<string, any>)[id];

  if (!productData) {
    return { title: 'Товар не найден' };
  }

  const title = `${productData.name} | Премиальные витамины GLS в Таджикистане`;
  const description = productData.properties?.join('. ') || `Заказать ${productData.name} с бесплатной доставкой от Green Leaf Sciences.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    alternates: {
      canonical: `/product/${params.id}`,
    }
  };
}

export default function ProductPage({ params }: Props) {
  const id = decodeURIComponent(params.id);
  const productData = (enrichedData as Record<string, any>)[id];

  if (!productData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-[#FDFBF7]">
        <h1 className="text-3xl font-bold font-outfit">Товар не найден</h1>
        <Link href="/" className="mt-4 text-[#1E40AF] underline font-medium">Вернуться в каталог</Link>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": productData.name,
    "description": productData.properties?.join('. ') || productData.name,
    "brand": {
      "@type": "Brand",
      "name": "Green Leaf Sciences"
    },
    "category": productData.tags?.[0] || "Health & Beauty",
    "offers": {
      "@type": "Offer",
      "url": `https://www.toj-vitamin.tj/product/${encodeURIComponent(id)}`,
      "priceCurrency": "TJS",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "tojvitamin"
      }
    }
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

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <div className="space-y-4">
          <p className="text-[#94A3B8] text-[12px] font-bold uppercase tracking-[0.25em]">
            Green Leaf Sciences
          </p>
          <h1 className="text-[40px] md:text-[56px] font-bold text-[#1D1D1F] leading-[1.1] tracking-tight font-outfit">
            {productData.name}
          </h1>
          
          {productData.tags && (
             <div className="flex gap-2 flex-wrap pt-2">
               {productData.tags.map((tag: string, i: number) => (
                 <span key={i} className="px-4 py-1.5 rounded-full bg-[#1E40AF]/10 text-[11px] font-bold text-[#1E40AF] uppercase tracking-widest">
                   {tag}
                 </span>
               ))}
             </div>
          )}
        </div>

        {productData.properties && productData.properties.length > 0 && (
          <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-[0_20px_40px_rgba(0,0,0,0.03)] border border-black/[0.03]">
             <h2 className="text-[20px] font-bold text-[#1D1D1F] mb-8 flex items-center gap-3 font-outfit">
               <ShieldCheck className="text-[#1E40AF]" size={28} />
               Свойства и клиническое действие
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {productData.properties.map((prop: string, i: number) => (
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

        {productData.marketing_hooks && productData.marketing_hooks.length > 0 && (
          <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-[0_20px_40px_rgba(0,0,0,0.03)] border border-black/[0.03]">
             <h2 className="text-[20px] font-bold text-[#1D1D1F] mb-8 font-outfit uppercase tracking-widest text-sm text-[#94A3B8]">
               Для кого это важно
             </h2>
             <div className="space-y-4">
               {productData.marketing_hooks.map((hook: string, i: number) => (
                 <p key={i} className="text-[17px] text-[#1D1D1F] font-medium leading-relaxed pl-4 border-l-4 border-black/10">
                   {hook}
                 </p>
               ))}
             </div>
          </div>
        )}

        {productData.med_interactions && productData.med_interactions.length > 0 && (
          <div className="bg-[#FFF7ED] rounded-[40px] p-8 md:p-12 border border-[#FB923C]/20 shadow-sm">
             <h2 className="text-[20px] font-bold text-[#C2410C] mb-8 flex items-center gap-3 font-outfit">
               <AlertCircle size={24} />
               Медицинские взаимодействия
             </h2>
             <div className="space-y-4">
               {productData.med_interactions.map((interaction: string, i: number) => (
                 <p key={i} className="text-[15px] text-[#9A3412] leading-relaxed flex items-start gap-3">
                   <span className="shrink-0 mt-1 block w-1.5 h-1.5 rounded-full bg-[#FB923C]" />
                   {interaction}
                 </p>
               ))}
             </div>
          </div>
        )}
        
        <div className="w-full flex justify-center pt-8">
           <Link href="/" className="h-[64px] px-12 bg-[#1D1D1F] text-white rounded-full font-bold text-[18px] shadow-xl hover:bg-[#1E40AF] active:scale-[0.97] transition-all flex items-center justify-center gap-3">
             Заказать на главной странице
           </Link>
        </div>

      </main>
    </div>
  );
}
