"use client";
import React, { useState, useEffect } from 'react';
import { Product, Lang } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Brain,
  Zap,
  Shield,
  Sparkles,
  Heart,
  Dumbbell,
  ShoppingBag,
  HeartPulse,
  ShieldCheck,
  Wind,
  Activity,
  ArrowRight
} from 'lucide-react';
import { ProductDetailModal } from './ProductDetailModal';
import { useCart } from '@/store/useCart';
import { useThemeStore } from '@/store/useTheme';
import { slugify } from '@/lib/slugify';
import { BackgroundGlow } from './BackgroundGlow';

const CATEGORIES = [
  { id: 'all', label: { ru: 'Все', tj: 'Ҳама' }, icon: ShoppingBag },
  { id: 'brain', label: { ru: 'Мозг и сон', tj: 'Мағзи сар ва хоб' }, icon: Brain },
  { id: 'energy', label: { ru: 'Энергия', tj: 'Энергия' }, icon: Zap },
  { id: 'immune', label: { ru: 'Иммунитет', tj: 'Иммунитет' }, icon: Shield },
  { id: 'joints', label: { ru: 'Кости и Суставы', tj: 'Устухон ва Буғумҳо' }, icon: Activity },
  { id: 'women', label: { ru: 'Женское здоровье', tj: 'Саломатии занон' }, icon: HeartPulse },
  { id: 'men', label: { ru: 'Мужское здоровье', tj: 'Саломатии мардон' }, icon: ShieldCheck },
  { id: 'beauty', label: { ru: 'Красота', tj: 'Зебоӣ' }, icon: Sparkles },
  { id: 'heart', label: { ru: 'Сердце', tj: 'Дил' }, icon: Heart },
  { id: 'sport', label: { ru: 'Спорт', tj: 'Варзиш' }, icon: Dumbbell },
  { id: 'detox', label: { ru: 'Похудение и Детокс', tj: 'Лоғаршавӣ ва Детокс' }, icon: Wind },
  { id: 'vitamins', label: { ru: 'Витамины и БАДы', tj: 'Витаминҳо ва БАД' }, icon: Sparkles },
];

const ICON_MAP: Record<string, string> = {
  'brain': 'brain',
  'energy': 'energy',
  'activity': 'energy',
  'zap': 'energy',
  'beauty': 'beauty',
  'sparkles': 'beauty',
  'detox': 'detox',
  'weight': 'detox',
  'sport': 'sport',
  'dumbbell': 'sport',
  'immune': 'immune',
  'joints': 'joints',
  'women': 'women',
  'men': 'men',
  'heart': 'heart',
  'vitamins': 'vitamins',
  'pill': 'vitamins',
  'capsule': 'vitamins',
  'tablet': 'vitamins'
};



export const ProductCatalog: React.FC<{ lang: Lang; whatsappNumber: string }> = ({ lang, whatsappNumber }) => {
  const allProducts = useCart(state => state.allProducts);
  const products = allProducts;
  const loading = allProducts.length === 0;
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const setActiveZone = useThemeStore(state => state.setActiveZone);
  const { addItem, addMultiple, setIsOpen, triggerAnimation } = useCart();

  // Zone theme observer — created once, cleaned up on unmount
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const zone = entry.target.getAttribute('data-zone') || 'default';
          setActiveZone(zone);
        }
      });
    }, { threshold: 0.3 });
    
    const timer = setTimeout(() => {
      document.querySelectorAll('[data-zone]').forEach(el => observer.observe(el));
    }, 1500);
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [setActiveZone]);

  // Product loading is handled centrally by HomeClient via useCart().setAllProducts.
  // No duplicate data fetching needed here.

  const handleBuy = async (product: Product, synergyProduct?: Product) => {
    // ─── Unified Tracking (GA4 + Meta CAPI + DB) ────────────────────────
    const { trackEvent } = await import('@/lib/analytics');
    await trackEvent({
      event_name: 'whatsapp_order_click',
      data: {
        product_id: product.id,
        product_name: product.name,
        synergy_id: synergyProduct?.id,
        price: product.price + (synergyProduct?.price || 0)
      }
    });

    const message = synergyProduct 
      ? (lang === 'ru' 
          ? `Здравствуйте! Хочу заказать набор: ${product.name} + ${synergyProduct.name}. Цена: ${product.price + synergyProduct.price} смн.`
          : `Салом! Ман мехоҳам маҷмӯаро фармоиш диҳам: ${product.name} + ${synergyProduct.name}. Нарх: ${product.price + synergyProduct.price} смн.`)
      : (lang === 'ru' 
          ? `Здравствуйте! Хочу заказать: ${product.name}. Цена: ${product.price} смн.`
          : `Салом! Ман мехоҳам фармоиш диҳам: ${product.name}. Нарх: ${product.price} смн.`);
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    setSelectedProduct(null);
  };

  const shelfCategories = CATEGORIES.filter(c => c.id !== 'all');

  return (
    <section
      id="catalog"
      className="w-full pb-32 relative"
    >
      <BackgroundGlow />

      <div className="relative z-10">
        {loading ? (
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col space-y-4">
                  <div className="relative w-full aspect-[4/5] bg-white border border-[#1D1D1F]/5 rounded-[48px] overflow-hidden">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1D1D1F]/[0.03] to-transparent animate-[shimmer_1.5s_linear_infinite]"
                      style={{ backgroundSize: '200% 100%' }}
                    />
                  </div>
                  <div className="h-6 w-3/4 bg-[#1D1D1F]/5 rounded-full" />
                  <div className="h-4 w-1/2 bg-[#1D1D1F]/5 rounded-full opacity-60" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            className="space-y-4"
          >

            {shelfCategories.map((category) => {
              const categoryProducts = products.filter(p => {
                const mappedCat = ICON_MAP[p.icon_type] || 'all';
                return mappedCat === category.id;
              });

              if (categoryProducts.length === 0) return null;

              return (
                <motion.div
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { duration: 0.8, ease: [0.2, 0.8, 0.2, 1] } }
                  }}
                  key={category.id}
                  data-zone={category.id}
                  className="w-full relative"
                >
                  <div className="max-w-6xl mx-auto px-6 mb-2 flex items-end justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 opacity-40">
                        <category.icon size={14} className="text-[#1D1D1F]" />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase font-outfit">
                          {lang === 'ru' ? 'Комплекс' : 'Маҷмӯа'}
                        </span>
                      </div>
                      <h2 className="text-[32px] md:text-[42px] font-bold tracking-tight text-[#1D1D1F] font-outfit leading-none">
                        {category.label[lang]}
                      </h2>
                    </div>
                  </div>

                  <div className="apple-shelf-scroll px-8 pb-6">
                    {categoryProducts.map((product) => (
                      <motion.a
                        href={`/product/${slugify(product.name || '')}`}
                        key={`${category.id}-${product.id}`}
                        whileHover={{
                          y: -12,
                          scale: 1.02,
                          transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }
                        }}
                        whileTap={{ scale: 0.96 }}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedProduct(product);
                        }}
                        className="apple-shelf-item group relative flex flex-col w-[230px] sm:w-[260px] cursor-pointer touch-manipulation block"
                      >
                        <div className="relative flex flex-col p-6 rounded-[48px] bg-white border border-[#1D1D1F]/5 shadow-[0_15px_45px_rgba(0,0,0,0.03)] group-hover:shadow-[0_60px_120px_rgba(30,64,175,0.08)] transition-all duration-700 overflow-hidden h-full">

                          {/* 1. BACKGROUND EFFECTS */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 bg-gradient-to-tr from-[#1E40AF]/5 to-transparent pointer-events-none" />
                          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-all duration-1200 bg-gradient-to-r from-transparent via-white to-transparent translate-x-[-200%] group-hover:translate-x-[200%] z-20" />

                          {/* 2. TOP BADGES */}
                          <div className="absolute top-7 left-7 z-20 flex flex-wrap gap-1.5 pointer-events-none">
                             {product.tags && Array.isArray(product.tags) && product.tags.slice(0, 1).map((tag: string, idx: number) => (
                               <span key={idx} className="px-3 py-1 rounded-lg bg-[#1D1D1F] text-white text-[8px] font-bold uppercase tracking-[0.2em] shadow-lg">
                                 {tag}
                               </span>
                             ))}
                           </div>
                          <div className="absolute top-7 right-7 z-20 flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                             <div className="w-1.5 h-1.5 rounded-full bg-[#1E40AF] animate-pulse" />
                             <span className="text-[8px] font-bold uppercase tracking-widest text-[#94A3B8]">
                               {lang === 'ru' ? 'Подробно' : 'Тафсилот'}
                             </span>
                          </div>

                          {/* 3. PRODUCT IMAGE STUDIO */}
                          <div className="mb-6 aspect-[4/5] relative bg-gradient-to-b from-[#FBFDFF] to-white rounded-[40px] overflow-hidden flex items-center justify-center p-6 transition-all duration-700 border border-[#EDF2F7] group-hover:border-[#1E40AF]/10">
                            {/* Inner Aura Glow */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,64,175,0.03)_0%,transparent_70%)] group-hover:opacity-100 transition-opacity" />
                            
                            {product.image_url ? (
                              <motion.div 
                                className="relative w-full h-full"
                                whileHover={{ y: -8 }}
                                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                              >
                                <Image
                                  src={product.image_url}
                                  alt={product.name}
                                  fill
                                  sizes="(max-width: 640px) 250px, 300px"
                                  className="object-contain p-4"
                                />
                              </motion.div>
                            ) : (
                              <ShoppingBag size={42} strokeWidth={1} className="text-[#E2E8F0]" />
                            )}

                            <div className="absolute bottom-6 right-6">
                              <div 
                                className="w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center border border-[#EDF2F7] text-[#1E40AF]"
                              >
                                <Sparkles size={16} />
                              </div>
                            </div>
                          </div>

                          {/* 4. CONTENT & ACTIONS */}
                          <div className="flex-1 flex flex-col relative z-10 px-1 text-[#1D1D1F]">
                            <h3 className="text-[17px] font-bold leading-[1.3] mb-4 font-outfit line-clamp-2 h-[44px] group-hover:text-[#1E40AF] transition-colors duration-500">
                              {product.name}
                            </h3>

                            <div className="mt-auto pt-5 border-t border-[#F1F5F9] relative h-16 overflow-hidden">
                              {/* Standard View: Price & Clinical Info */}
                              <div className="absolute inset-0 flex items-center justify-between gap-3 transition-all duration-500 ease-[0.2,0.8,0.2,1] group-hover:-translate-y-full opacity-100 group-hover:opacity-0">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5 mb-1">
                                     <ShieldCheck size={10} className="text-[#1E40AF]" />
                                     <span className="text-[9px] text-[#94A3B8] uppercase font-bold tracking-[0.15em]">
                                       {lang === 'ru' ? 'Клинический стандарт' : 'Стандарти клиникӣ'}
                                     </span>
                                  </div>
                                  <p className="text-[20px] font-bold font-outfit tracking-tight text-[#1D1D1F]">
                                    {product.price} <span className="text-[12px] font-medium text-[#94A3B8]">{'смн'}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 text-[#1E40AF] text-[10px] font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                                   {lang === 'ru' ? 'Инфо' : 'Инфо'}
                                   <ArrowRight size={12} />
                                </div>
                              </div>

                              {/* Hover View: Add to Cart Button */}
                              <div className="absolute inset-0 flex items-center justify-center translate-y-full group-hover:translate-y-0 transition-all duration-500 opacity-0 group-hover:opacity-100 ease-[0.2,0.8,0.2,1]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProduct(product);
                                    }}
                                    className="w-full h-12 bg-[#1D1D1F] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl hover:bg-[#1E40AF] active:scale-95 transition-all duration-300"
                                  >
                                    <ArrowRight size={16} />
                                    <span className="text-[14px]">{lang === 'ru' ? 'Подробнее' : 'Маълумоти бештар'}</span>
                                  </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.a>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <ProductDetailModal
          isOpen={!!selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          allProducts={products}
          lang={lang}
          onBuy={handleBuy}
        />
      </div>
    </section>
  );
};
