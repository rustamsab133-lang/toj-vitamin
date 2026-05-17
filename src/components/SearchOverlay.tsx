"use client";
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ShoppingBag, ArrowRight } from 'lucide-react';
import { Product, Lang } from '@/lib/types';
import { useThemeStore } from '@/store/useTheme';
import { useCart } from '@/store/useCart';
import { slugify } from '@/lib/slugify';
import Image from 'next/image';
import { ProductDetailModal } from './ProductDetailModal';

interface SearchOverlayProps {
  lang: Lang;
  whatsappNumber: string;
}

// --- Levenshtein Distance & Fuzzy Search Helpers ---
function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  let i, j;
  for (i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // Deletion
        tmp[i][j - 1] + 1, // Insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // Substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

function isFuzzyMatch(query: string, target: string): boolean {
  const cleanTarget = target.toLowerCase().trim();
  if (cleanTarget.includes(query)) return true;
  
  if (query.length < 4) return false;
  
  const words = cleanTarget.split(/[^a-zа-яё0-9+]+/i).filter(w => w.length >= 3);
  const maxDistance = query.length >= 7 ? 2 : 1;
  
  return words.some(word => {
    if (word.includes(query) || query.includes(word)) return true;
    
    if (Math.abs(word.length - query.length) > maxDistance) {
      if (word.length > query.length) {
        const wordPrefix = word.slice(0, query.length);
        if (getLevenshteinDistance(query, wordPrefix) <= maxDistance) return true;
      }
      return false;
    }
    
    return getLevenshteinDistance(query, word) <= maxDistance;
  });
}

import { trackSearch, trackWhatsAppClick } from '@/lib/analytics';

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ lang, whatsappNumber }) => {
  const search = useThemeStore(state => state.search);
  const setSearch = useThemeStore(state => state.setSearch);
  const isSearchOpen = useThemeStore(state => state.isSearchOpen);
  const setIsSearchOpen = useThemeStore(state => state.setIsSearchOpen);
  const allProducts = useCart(state => state.allProducts);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Track search query with debounce
  React.useEffect(() => {
    if (!search.trim() || search.length < 3) return;
    const timer = setTimeout(() => {
      trackSearch(search.trim());
    }, 1000);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredProducts = useMemo(() => {
    if (!search.trim() || allProducts.length === 0) return [];
    const query = search.toLowerCase().trim();
    
    // 1. Filter products using typo-tolerant fuzzy matching
    const matches = allProducts.filter(p => {
      const name = p.name || '';
      const fullName = p.full_name || '';
      const tags = Array.isArray(p.tags) 
        ? p.tags.map(t => typeof t === 'string' ? t : '') 
        : [];
      const description = p.description || '';
      
      return isFuzzyMatch(query, name) || 
             isFuzzyMatch(query, fullName) || 
             isFuzzyMatch(query, description) ||
             tags.some(t => isFuzzyMatch(query, t));
    });

    // 2. Sort: prioritizing direct matches (3), then fuzzy name matches (2), then description matches (1)
    return matches.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const aFullName = (a.full_name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const bFullName = (b.full_name || '').toLowerCase();

      // Priority scores for A
      let aScore = 1;
      if (aName.includes(query) || aFullName.includes(query)) {
        aScore = 3;
      } else if (isFuzzyMatch(query, aName) || isFuzzyMatch(query, aFullName)) {
        aScore = 2;
      }

      // Priority scores for B
      let bScore = 1;
      if (bName.includes(query) || bFullName.includes(query)) {
        bScore = 3;
      } else if (isFuzzyMatch(query, bName) || isFuzzyMatch(query, bFullName)) {
        bScore = 2;
      }

      return bScore - aScore; // Descending order
    });
  }, [search, allProducts]);

  const isOpen = isSearchOpen && search.trim().length > 0;
  const isLoading = isSearchOpen && search.trim().length > 0 && allProducts.length === 0;

  const handleClose = () => {
    setIsSearchOpen(false);
    setSearch('');
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    // URL is managed by ProductDetailModal
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-[#FDFBF7]/95 backdrop-blur-2xl flex flex-col pt-24 sm:pt-32"
          >
            <div className="flex-1 overflow-y-auto px-6 pb-20 custom-scrollbar">
              <div className="max-w-6xl mx-auto w-full">
                <div className="flex items-baseline justify-between mb-8">
                  <div className="flex items-baseline gap-4">
                    <h2 className="text-[28px] md:text-[48px] font-bold tracking-tight text-[#1D1D1F] font-outfit">
                      {lang === 'ru' ? 'Результаты поиска' : 'Натиҷаҳои ҷустуҷӯ'}
                    </h2>
                    <span className="text-[18px] md:text-[24px] font-bold text-[#1E40AF]/40 font-outfit">
                      {filteredProducts.length}
                    </span>
                  </div>
                  <button 
                    onClick={handleClose}
                    className="text-[#1D1D1F]/40 hover:text-[#1D1D1F] transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] md:text-[11px]"
                  >
                    <span>{lang === 'ru' ? 'Закрыть' : 'Пӯшидан'}</span>
                    <X size={20} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="py-20 flex flex-col items-center text-center">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 border-4 border-[#1E40AF]/10 border-t-[#1E40AF] rounded-full mb-4"
                    />
                    <p className="text-[#1D1D1F]/40 font-bold uppercase tracking-widest text-[11px]">
                      {lang === 'ru' ? 'Загрузка данных...' : 'Дар ҳоли боргирӣ...'}
                    </p>
                  </div>
                ) : filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {filteredProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -8 }}
                        onClick={() => handleProductClick(product)}
                        className="group relative flex flex-col rounded-[40px] bg-white border border-[#1D1D1F]/5 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden cursor-pointer h-full"
                      >
                        {/* Image area */}
                        <div className="aspect-[4/5] relative bg-[#F8FAFC] flex items-center justify-center p-8">
                           {product.image_url ? (
                            <Image 
                              src={product.image_url} 
                              alt={product.name} 
                              fill 
                              unoptimized
                              className="object-contain p-6 transition-transform duration-700 group-hover:scale-110" 
                            />
                          ) : (
                            <ShoppingBag size={48} className="text-[#E2E8F0]" />
                          )}
                          <div className="absolute top-6 left-6 flex flex-wrap gap-1.5">
                            {product.tags && Array.isArray(product.tags) && product.tags.slice(0, 1).map((tag, i) => (
                              <span key={i} className="px-3 py-1 rounded-lg bg-[#1D1D1F] text-white text-[8px] font-bold uppercase tracking-wider">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="text-[17px] font-bold text-[#1D1D1F] mb-4 font-outfit line-clamp-2 h-[44px] group-hover:text-[#1E40AF] transition-colors">
                            {product.name}
                          </h3>
                          
                          <div className="mt-auto pt-4 border-t border-black/5 flex items-center justify-between">
                            <div>
                               <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest block mb-0.5">
                                 {lang === 'ru' ? 'Цена' : 'Нарх'}
                               </span>
                               <p className="text-[20px] font-bold text-[#1D1D1F] font-outfit">
                                 {product.price} <span className="text-sm font-medium">смн</span>
                               </p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-[#1E40AF]/5 text-[#1E40AF] flex items-center justify-center group-hover:bg-[#1E40AF] group-hover:text-white transition-all">
                              <ArrowRight size={18} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-[#1D1D1F]/5 rounded-full flex items-center justify-center mb-6">
                      <Search size={32} className="text-[#1D1D1F]/20" />
                    </div>
                    <h3 className="text-[24px] font-bold text-[#1D1D1F] mb-2 font-outfit">
                      {lang === 'ru' ? 'Ничего не найдено' : 'Ҳеҷ чиз ёфт нашуд'}
                    </h3>
                    <p className="text-[#1D1D1F]/40 max-w-sm">
                      {lang === 'ru' 
                        ? 'Попробуйте изменить запрос или поискать по названию бренда.' 
                        : 'Кӯшиш кунед, ки дархостро иваз кунед ё аз рӯи номи бренд ҷустуҷӯ кунед.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductDetailModal
        isOpen={!!selectedProduct}
        onClose={() => {
          setSelectedProduct(null);
          // URL restoration is handled by ProductDetailModal
        }}
        product={selectedProduct}
        allProducts={allProducts}
        lang={lang}
        onBuy={async (product, synergy) => {
          await trackWhatsAppClick(product);
          if (synergy) await trackWhatsAppClick(synergy);

          const message = synergy 
            ? (lang === 'ru' 
                ? `Здравствуйте! Хочу заказать набор: ${product.name} + ${synergy.name}. Цена: ${product.price + synergy.price} смн.`
                : `Салом! Ман мехоҳам маҷмӯаро фармоиш диҳам: ${product.name} + ${synergy.name}. Нарх: ${product.price + synergy.price} смн.`)
            : (lang === 'ru' 
                ? `Здравствуйте! Хочу заказать: ${product.name}. Цена: ${product.price} смн.`
                : `Салом! Ман мехоҳам фармоиш диҳам: ${product.name}. Нарх: ${product.price} смн.`);
          
          window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
        }}
      />
    </>
  );
};
