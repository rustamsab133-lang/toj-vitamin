"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Lang } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Search,
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
  ArrowRight,
  MessageCircle
} from 'lucide-react';
import { ProductDetailModal } from './ProductDetailModal';
import enrichedData from '@/data/enriched_gls_products.json';
import { useCart } from '@/store/useCart';
import { useThemeStore } from '@/store/useTheme';
import { slugify } from '@/lib/slugify';
import { ZONE_THEMES } from '@/lib/theme';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { activeZone, setActiveZone, search } = useThemeStore();
  const { addItem, addMultiple, setIsOpen, setAllProducts, triggerAnimation } = useCart();

  useEffect(() => {
    loadProducts();
    
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
  }, []);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    
    if (data) {
      // Optimized lookup using the new Record structure (O(1) instead of O(n))
      const enrichedMap = enrichedData as Record<string, any>;

      const enrichedProducts = data.map(product => {
        const key = product.name?.toLowerCase().trim() || '';
        const enriched = enrichedMap[key];
        
        if (enriched) {
          return {
            ...product,
            description: enriched.description || product.description,
            marketing_hooks: enriched.marketing_hooks || product.marketing_hooks,
            tags: enriched.tags || product.tags,
            med_interactions: enriched.med_interactions || product.med_interactions,
            synergy_product_id: enriched.synergy_product_id || product.synergy_product_id,
            synergy_reason: enriched.synergy_reason || product.synergy_reason,
          };
        }
        return product;
      });
      
      setProducts(enrichedProducts);
      setAllProducts(enrichedProducts);
    }
    setLoading(false);
  };

  const handleBuy = (product: Product, synergyProduct?: Product) => {
    // ─── GA4 Tracking ───────────────────────────────────────────────────
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'whatsapp_order_click', {
        product_id: product.id,
        product_name: product.name,
        synergy_id: synergyProduct?.id,
        price: product.price + (synergyProduct?.price || 0)
      });
    }

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
  const currentTheme = ZONE_THEMES[activeZone] || ZONE_THEMES.default;

  const filteredProducts = products.filter(p => 
    search === '' || p.name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalFound = filteredProducts.length;

  return (
    <section
      id="catalog"
      className="w-full pb-32 relative"
    >
      <div
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-[1500ms] ease-in-out opacity-40"
        style={{
          boxShadow: `inset 0 0 150px ${currentTheme.glow}`
        }}
      />

      <div className="relative z-10">
        {loading ? (
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex flex-col space-y-4">
                  <div className="relative w-full aspect-[4/5] bg-white border border-[#1D1D1F]/5 rounded-[48px] overflow-hidden">
                    <motion.div
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1D1D1F]/[0.02] to-transparent"
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
            {search !== '' && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto px-6 mb-8 mt-4"
              >
                <div className="flex items-baseline gap-4">
                  <h2 className="text-[32px] md:text-[42px] font-bold tracking-tight text-[#1D1D1F] font-outfit">
                    {lang === 'ru' ? 'Результаты поиска' : 'Натиҷаҳои ҷустуҷӯ'}
                  </h2>
                  <span className="text-[18px] md:text-[22px] font-bold text-[#1E40AF]/40 font-outfit">
                    {totalFound}
                  </span>
                </div>
                <div className="h-px w-full bg-[#1D1D1F]/5 mt-4" />
              </motion.div>
            )}

            {totalFound === 0 && search !== '' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-6xl mx-auto px-6 py-20 text-center"
              >
                <div className="w-20 h-20 bg-[#1D1D1F]/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search size={32} className="text-[#1D1D1F]/20" />
                </div>
                <h3 className="text-[20px] font-bold text-[#1D1D1F] mb-2 font-outfit">
                  {lang === 'ru' ? 'Ничего не найдено' : 'Ҳеҷ чиз ёфт нашуд'}
                </h3>
                <p className="text-[#1D1D1F]/40 max-w-sm mx-auto">
                  {lang === 'ru' 
                    ? 'Попробуйте изменить запрос или поискать в других категориях.' 
                    : 'Кӯшиш кунед, ки дархостро иваз кунед ё дар категорияҳои дигар ҷустуҷӯ кунед.'}
                </p>
              </motion.div>
            )}

            {shelfCategories.map((category) => {
              const categoryProducts = products.filter(p => {
                const mappedCat = ICON_MAP[p.icon_type] || 'all';
                const matchesSearch = search === '' || p.name?.toLowerCase().includes(search.toLowerCase());
                return mappedCat === category.id && matchesSearch;
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
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={{
                          hidden: { opacity: 0, scale: 0.98 },
                          visible: { opacity: 1, scale: 1, transition: { duration: 0.6 } }
                        }}
                        whileHover={{
                          y: -12,
                          scale: 1.02,
                          transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }
                        }}
                        whileTap={{ scale: 0.96 }}
                        key={product.id}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedProduct(product);
                          window.history.pushState(null, '', `/product/${slugify(product.name || '')}`);
                        }}
                        className="apple-shelf-item group relative flex flex-col w-[230px] sm:w-[260px] cursor-pointer touch-manipulation block"
                        style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
                      >
                        <div className="relative flex flex-col p-6 rounded-[48px] bg-white border border-[#1D1D1F]/5 shadow-[0_15px_45px_rgba(0,0,0,0.03)] group-hover:shadow-[0_60px_120px_rgba(30,64,175,0.08)] transition-all duration-700 overflow-hidden h-full">

                          {/* 1. BACKGROUND EFFECTS */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 bg-gradient-to-tr from-[#1E40AF]/5 to-transparent pointer-events-none" />
                          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-all duration-1200 bg-gradient-to-r from-transparent via-white to-transparent translate-x-[-200%] group-hover:translate-x-[200%] z-20" />

                          {/* 2. TOP BADGES */}
                          <div className="absolute top-7 left-7 z-20 flex flex-wrap gap-1.5 pointer-events-none">
                            {(product as any).tags?.slice(0, 1).map((tag: string, idx: number) => (
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
                                  className="object-contain p-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.05)]"
                                />
                              </motion.div>
                            ) : (
                              <ShoppingBag size={42} strokeWidth={1} className="text-[#E2E8F0]" />
                            )}

                            <div className="absolute bottom-6 right-6">
                              <motion.div 
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                                transition={{ duration: 3, repeat: Infinity }}
                                className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md shadow-xl flex items-center justify-center border border-[#EDF2F7] text-[#1E40AF]"
                              >
                                <Sparkles size={16} />
                              </motion.div>
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
                                <motion.div 
                                  animate={{ x: [0, 3, 0] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  className="flex items-center gap-1 text-[#1E40AF] text-[10px] font-bold uppercase tracking-wider"
                                >
                                   {lang === 'ru' ? 'Инфо' : 'Инфо'}
                                   <ArrowRight size={12} />
                                </motion.div>
                              </div>

                              {/* Hover View: Add to Cart Button */}
                              <div className="absolute inset-0 flex items-center justify-center translate-y-full group-hover:translate-y-0 transition-all duration-500 opacity-0 group-hover:opacity-100 ease-[0.2,0.8,0.2,1]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBuy(product);
                                  }}
                                  className="w-full h-12 bg-[#1D1D1F] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl hover:bg-[#25D366] active:scale-95 transition-all duration-300"
                                >
                                  <MessageCircle size={16} fill="currentColor" />
                                  <span className="text-[14px]">{lang === 'ru' ? 'Заказать в WhatsApp' : 'Фармоиш дар WhatsApp'}</span>
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
            window.history.pushState(null, '', '/');
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
