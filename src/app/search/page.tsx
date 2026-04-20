import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';
import { Search, ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ProductBuyButton } from '@/components/ProductBuyButton';
import { slugify } from '@/lib/slugify';

interface Props {
  searchParams: { q?: string };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = searchParams.q || '';
  return {
    title: query ? `Результаты поиска: ${query} | TOJ-VITAMIN` : 'Поиск витаминов | TOJ-VITAMIN',
    description: `Результаты поиска витаминов и БАДов по запросу "${query}" в Таджикистане.`,
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const query = searchParams.q || '';
  
  let products: Product[] = [];
  if (query) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name');
    products = data || [];
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-32">
      {/* Header */}
      <div className="w-full h-[80px] bg-white/80 backdrop-blur-md border-b border-black/[0.05] sticky top-0 z-50 flex items-center px-6 sm:px-12">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-[#1D1D1F] font-bold hover:text-[#1E40AF] transition-colors bg-white border border-black/5 px-4 py-2 rounded-full shadow-sm hover:shadow-md">
            <ArrowLeft size={18} />
            <span className="text-sm">На главную</span>
          </Link>
          
          <div className="hidden sm:flex items-center gap-3 opacity-30">
             <img src="/logo.webp" alt="Logo" className="w-8 h-8 object-contain scale-[2.5]" />
             <span className="font-bold text-[14px] font-outfit tracking-widest uppercase">TOJ-VITAMIN</span>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12 space-y-4">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#1E40AF]/10 rounded-2xl flex items-center justify-center text-[#1E40AF]">
                <Search size={24} />
             </div>
             <h1 className="text-[32px] md:text-[48px] font-bold text-[#1D1D1F] font-outfit tracking-tight leading-none">
                {query ? (
                  <>Результаты для <span className="text-[#1E40AF]">«{query}»</span></>
                ) : (
                  'Поиск витаминов'
                )}
             </h1>
          </div>
          <p className="text-[#1D1D1F]/40 font-medium">
            Найдено товаров: <span className="text-[#1D1D1F]">{products.length}</span>
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product) => (
              <div key={product.id} className="group relative flex flex-col rounded-[40px] bg-white border border-[#1D1D1F]/5 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
                <Link href={`/product/${slugify(product.name)}`} className="block">
                  <div className="aspect-[4/5] relative bg-[#F8FAFC] flex items-center justify-center p-8 overflow-hidden">
                    {product.image_url ? (
                      <Image 
                        src={product.image_url} 
                        alt={product.name} 
                        fill 
                        className="object-contain p-6 transition-transform duration-700 group-hover:scale-110" 
                      />
                    ) : (
                      <ShoppingBag size={48} className="text-[#E2E8F0]" />
                    )}
                  </div>
                </Link>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-[17px] font-bold text-[#1D1D1F] mb-4 font-outfit line-clamp-2 h-[44px]">
                    {product.name}
                  </h3>
                  
                  <div className="mt-auto flex items-center justify-between gap-4 pt-4 border-t border-black/5">
                    <div>
                       <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest block mb-0.5">Цена</span>
                       <p className="text-[20px] font-bold text-[#1D1D1F] font-outfit">{product.price} <span className="text-sm font-medium">смн</span></p>
                    </div>
                    
                    <ProductBuyButton product={product} lang="ru" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center text-center">
             <div className="w-24 h-24 bg-[#1D1D1F]/5 rounded-full flex items-center justify-center mb-6">
                <Search size={40} className="text-[#1D1D1F]/20" />
             </div>
             <h2 className="text-[24px] font-bold text-[#1D1D1F] mb-2 font-outfit">Ничего не найдено</h2>
             <p className="text-[#1D1D1F]/40 max-w-sm">
                Попробуйте изменить запрос или вернитесь в каталог для подбора по категориям.
             </p>
             <Link href="/" className="mt-8 text-[#1E40AF] font-bold hover:underline">
                Вернуться в каталог
             </Link>
          </div>
        )}
      </main>
    </div>
  );
}
