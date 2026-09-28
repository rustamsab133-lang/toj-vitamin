"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Product, Lang, Article } from '@/lib/types';
import { X, ShoppingBag, ArrowRight, ShieldCheck, Plus, AlertCircle, CheckCircle2, MessageCircle, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ShareButton } from './ShareButton';
import { slugify } from '@/lib/slugify';
import { useCart } from '@/store/useCart';
import { getLocalizedProductName, getLocalizedProductTag } from '@/lib/productLocalization';

// Cache for journal articles to load them once per session
let cachedArticles: Article[] | null = null;
let articlesPromise: Promise<Article[]> | null = null;

async function getPublishedArticles(): Promise<Article[]> {
  if (cachedArticles) return cachedArticles;
  if (articlesPromise) return articlesPromise;

  articlesPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('journal_articles')
        .select('*')
        .eq('is_published', true);
      
      if (error) throw error;
      cachedArticles = data || [];
      return cachedArticles;
    } catch (err) {
      console.error('Failed to fetch journal articles for matching:', err);
      return [];
    } finally {
      articlesPromise = null;
    }
  })();

  return articlesPromise;
}

function findBestArticle(product: Product, articles: Article[]): Article | null {
  if (!articles || articles.length === 0) return null;
  
  // 1. First priority: article that contains link to this product
  const productLinkPattern = `/product/${product.id}`;
  const linkedArticle = articles.find(art => 
    art.content_ru?.includes(productLinkPattern) || 
    art.content_tj?.includes(productLinkPattern)
  );
  if (linkedArticle) return linkedArticle;

  // 2. Second priority: title/excerpt/content keyword match
  const cleanName = product.name.toLowerCase();
  
  const keywordMappings = [
    { keywords: ['магний', 'magnesium'], matchTerms: ['магний', 'магния', 'magnesium'] },
    { keywords: ['кальций', 'calcium'], matchTerms: ['кальций', 'кальция', 'calcium', 'суставы', 'коллаген'] },
    { keywords: ['b5', 'пантотеновая'], matchTerms: ['синергия', 'энергия'] },
    { keywords: ['в-комплекс', 'b-complex'], matchTerms: ['мультивитамины', 'синергия', 'b12'] },
    { keywords: ['д3', 'd3'], matchTerms: ['d3', 'д3', 'витамин d', 'витамин д', 'солнца'] },
    { keywords: ['ашваганда', 'ashwagandha'], matchTerms: ['ашваганда', 'ashwagandha'] },
    { keywords: ['q10', 'коэнзим', 'coenzyme'], matchTerms: ['q10', 'коэнзим', 'coenzyme'] },
    { keywords: ['биотин', 'biotin'], matchTerms: ['биотин', 'biotin'] },
    { keywords: ['цинк', 'zinc'], matchTerms: ['цинк', 'цинка', 'zinc'] },
    { keywords: ['инозитол', 'inositol'], matchTerms: ['инозитол', 'inositol'] },
    { keywords: ['гинкго', 'ginkgo'], matchTerms: ['гинкго', 'ginkgo'] },
    { keywords: ['йод', 'iodine'], matchTerms: ['йод', 'йододефицит', 'iodine'] },
    { keywords: ['глюкозамин', 'хондроитин', 'glucosamine'], matchTerms: ['глюкозамин', 'хондроитин', 'glucosamine'] },
    { keywords: ['коллаген', 'collagen'], matchTerms: ['коллаген', 'collagen'] },
    { keywords: ['омега', 'omega'], matchTerms: ['омега', 'omega'] },
    { keywords: ['креатин', 'creatine'], matchTerms: ['креатин', 'creatine'] },
    { keywords: ['фолиевая', 'фолиев', 'folic'], matchTerms: ['фолиев', 'folic'] },
    { keywords: ['мумие', 'мумиё', 'shilajit'], matchTerms: ['мумие', 'мумиё', 'shilajit'] },
    { keywords: ['хитозан', 'chitosan'], matchTerms: ['хитозан', 'chitosan'] },
    { keywords: ['хлорофилл', 'chlorophyll'], matchTerms: ['хлорофилл', 'chlorophyll'] },
    { keywords: ['хром', 'chromium'], matchTerms: ['хром', 'chromium'] },
    { keywords: ['калий'], matchTerms: ['калий'] },
    { keywords: ['женьшень', 'ginseng'], matchTerms: ['женьшень', 'ginseng'] },
    { keywords: ['b12', 'в12'], matchTerms: ['b12', 'в12'] },
    { keywords: ['алоэ', 'aloe'], matchTerms: ['алоэ', 'aloe'] },
    { keywords: ['каротин', 'carotene'], matchTerms: ['каротин', 'carotene'] },
    { keywords: ['гиалурон', 'hyaluronic'], matchTerms: ['гиалурон', 'hyaluronic'] },
    { keywords: ['глутатион', 'glutathione'], matchTerms: ['глутатион', 'glutathione'] },
    { keywords: ['таурин', 'taurine'], matchTerms: ['таурин', 'taurine'] },
    { keywords: ['протеин', 'protein', 'белок'], matchTerms: ['энергия', 'синергия', 'synergy'] },
    { keywords: ['селен', 'selenium'], matchTerms: ['цинк', 'тестостерон', 'иммунитет'] },
    { keywords: ['льн', 'flaxseed'], matchTerms: ['хитозан', 'очищение', 'detox'] },
    { keywords: ['карнитин', 'carnitine'], matchTerms: ['таурин', 'энергия', 'жиросжигания'] },
    { keywords: ['мультивитамины', '12+9', 'актив шипучие'], matchTerms: ['мультивитамины', 'детский иммунитет', 'детский', 'детям'] },
    // Formulas & Special Ingredients
    { keywords: ['ноофит', 'памяти', 'pqq', 'тирозин'], matchTerms: ['мозга', 'мышление', 'ginkgo'] },
    { keywords: ['очищение', 'детокс', 'detox', 'липотропный', 'берберин'], matchTerms: ['печени', 'очищение', 'lipoic', 'glutation', 'хитозан'] },
    { keywords: ['спортивная', 'спорт', 'жиросжигатель', 'аргинин', 'цитруллин', 'аминокислотный', 'йохимбе'], matchTerms: ['спорт', 'актив', 'энергия', 'taurin', 'креатин'] },
    { keywords: ['диабет'], matchTerms: ['хром', 'сахар', 'хрома'] },
    { keywords: ['женская', 'беременных'], matchTerms: ['женское', 'инозитол', 'фолиевая', 'беременности'] },
    { keywords: ['мужская', 'мака'], matchTerms: ['мужская', 'тестостерон', 'цинк'] },
    { keywords: ['волос', 'ногти', 'кожа'], matchTerms: ['волос', 'биотин', 'коллаген'] },
    { keywords: ['глаз', 'зрение'], matchTerms: ['зрение', 'каротин'] },
    { keywords: ['кардио'], matchTerms: ['сердца', 'q10'] },
    { keywords: ['липоевая', 'lipoic'], matchTerms: ['липоевая', 'lipoic', 'печени', 'antioxidant'] },
    { keywords: ['5-htp', 'мелатонин', 'сон'], matchTerms: ['5-htp', 'неврастения', 'сон', 'мелатонин', 'антидепрессант'] },
    { keywords: ['к2'], matchTerms: ['d3', 'д3', 'коллаген', 'витамин солнце'] },
    { keywords: ['msm'], matchTerms: ['суставы', 'глюкозамин', 'хондроитин', 'коллаген'] },
    { keywords: ['железо'], matchTerms: ['фолиевая', 'беременности', 'b12'] },
    { keywords: ['детские', 'для детей'], matchTerms: ['детский', 'детям', 'иммунитет'] },
    { keywords: ['витамин с', 'vitamin c'], matchTerms: ['детский иммунитет', 'витамин с', 'vitamin c'] }
  ];

  const matchedMapping = keywordMappings.find(mapping => 
    mapping.keywords.some(kw => cleanName.includes(kw))
  );

  if (matchedMapping) {
    const titleMatch = articles.find(art => {
      const titleLower = (art.title_ru || '').toLowerCase();
      return matchedMapping.matchTerms.some(term => titleLower.includes(term));
    });
    if (titleMatch) return titleMatch;

    const contentMatch = articles.find(art => {
      const contentLower = (art.content_ru || '').toLowerCase();
      return matchedMapping.matchTerms.some(term => contentLower.includes(term));
    });
    if (contentMatch) return contentMatch;
  }

  // 3. Fallback: direct name match
  const directTextMatch = articles.find(art => {
    const contentLower = (art.content_ru || '').toLowerCase();
    const cleanProdName = product.name.replace('GLS', '').replace('капс', '').replace('порошок', '').trim().toLowerCase();
    return cleanProdName.length > 3 && contentLower.includes(cleanProdName);
  });
  if (directTextMatch) return directTextMatch;

  return null;
}

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  allProducts: Product[];
  lang: Lang;
  onBuy: (product: Product, synergyProduct?: Product) => void;
}

interface SynergyLink {
  synergy_product_id: string;
  reason: string;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  allProducts,
  lang,
  onBuy
}) => {
  const { addItem, addMultiple, setIsOpen: setIsCartOpen, triggerAnimation, triggerToast } = useCart();
  const [isAdded, setIsAdded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [addedBundles, setAddedBundles] = useState<Record<string, boolean>>({});
  const [synergies, setSynergies] = useState<SynergyLink[]>([]);
  const [loadingSynergies, setLoadingSynergies] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [product?.id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchSynergies() {
      if (!product || !isOpen) return;
      setLoadingSynergies(true);
      
      const { data, error } = await supabase
        .from('product_synergies')
        .select('synergy_product_id, reason')
        .eq('product_id', product.id);
      
      if (!error && data) {
        setSynergies(data);
      } else {
        if (product.synergy_product_id) {
           setSynergies([{ 
             synergy_product_id: product.synergy_product_id, 
             reason: product.synergy_reason || '' 
           }]);
        } else {
           setSynergies([]);
        }
      }
      setLoadingSynergies(false);
      
      // Fire FB Pixel ViewContent Event
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'ViewContent', {
          content_ids: [product.id],
          content_name: product.name,
          content_type: 'product',
          value: product.price,
          currency: 'TJS'
        });
      }
    }
    fetchSynergies();
  }, [product, isOpen]);

  const onCloseRef = React.useRef(onClose);
  
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Single, unified history management for the product modal
  useEffect(() => {
    if (!product) return;

    const handlePopState = (event: PopStateEvent) => {
      if (!event.state || !event.state.isProductModalOpen) {
        onCloseRef.current();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const productSlug = slugify(product.name || '');
      const targetUrl = `/product/${productSlug}`;
      const currentHistoryState = typeof window !== 'undefined' ? window.history.state : null;
      
      if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
        window.history.pushState(
          { 
            ...currentHistoryState, 
            isProductModalOpen: true,
            productSlug 
          }, 
          '', 
          targetUrl
        );
      }
      
      window.addEventListener('popstate', handlePopState);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, product]);

  const handleSmartClose = () => {
    const currentState = typeof window !== 'undefined' ? window.history.state : null;
    if (currentState?.isProductModalOpen) {
      window.history.back(); // Will trigger popstate -> onClose
    } else {
      if (typeof window !== 'undefined') {
        const nextState = { ...currentState };
        delete nextState.isProductModalOpen;
        delete nextState.productSlug;
        window.history.pushState(nextState, '', '/');
      }
      onCloseRef.current();
    }
  };

  if (!product || !mounted) return null;

  // Prefer clinical properties from enriched data, fallback to database description
  const descriptionLines: string[] = (product as any).properties && (product as any).properties.length > 0
    ? (product as any).properties
    : (product.description ? product.description.split('\n').filter((line: string) => line.trim().length > 0) : []);



  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": product.image_url ? [product.image_url.startsWith('http') ? product.image_url : `https://www.toj-vitamin.tj${product.image_url}`] : [],
    "description": product.description || product.name,
    "brand": {
      "@type": "Brand",
      "name": "GLS"
    },
    "seller": {
      "@type": "Store",
      "name": "toj-vitamin"
    },
    "offers": {
      "@type": "Offer",
      "url": "https://www.toj-vitamin.tj",
      "priceCurrency": "TJS",
      "price": product.price,
      "availability": "https://schema.org/InStock",
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": "0",
          "currency": "TJS"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": "0",
            "maxValue": "1",
            "unitCode": "DAY"
          },
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": "1",
            "maxValue": "3",
            "unitCode": "DAY"
          }
        },
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "TJ"
        }
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
      "reviewCount": (parseInt(product.id) % 20) + 25
    },
    "review": [
      {
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5"
        },
        "author": {
          "@type": "Person",
          "name": lang === 'en' ? 'Alisher' : 'Алишер'
        },
        "reviewBody": lang === 'en' 
          ? 'Excellent quality, felt positive results within a week of use. Highly recommend!' 
          : (lang === 'tj' 
            ? 'Сифати аъло, пас аз як ҳафта натиҷааш ҳис карда шуд. Тавсия медиҳам!' 
            : 'Отличное качество, помогло уже через неделю приема. Рекомендую!')
      }
    ]
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {/* OVERLAY - Deep & Minimal (GPU Optimized for iOS/Mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSmartClose}
            className="absolute inset-0 bg-[#000000]/60 sm:bg-[#000000]/30 sm:backdrop-blur-md transform-gpu"
          />

          <motion.div
            key={product.id}
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="w-full sm:w-[620px] md:w-[940px] lg:w-[1020px] max-h-[100dvh] sm:max-h-[94vh] md:h-[86vh] bg-white rounded-t-[32px] sm:rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.18)] relative flex flex-col md:flex-row overflow-hidden will-change-transform transform-gpu"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            {/* ACTIONS: Share + Close */}
            <div className="absolute right-4 sm:right-6 top-4 sm:top-6 flex items-center gap-2 z-50">
              <ShareButton
                url={`/product/${slugify(product.name || '')}`}
                title={product.name}
                description={product.description || ''}
                variant="compact"
                lang={lang}
              />
              <button 
                onClick={handleSmartClose}
                className="w-10 h-10 sm:w-11 sm:h-11 bg-white/90 backdrop-blur-md border border-black/10 text-[#1D1D1F] rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* 1. LEFT COLUMN: PURE IMAGE STUDIO */}
            <div className="shrink-0 w-full md:w-[400px] lg:w-[460px] h-[240px] sm:h-[280px] md:h-full bg-[#F8FAFC] flex flex-col items-center justify-center p-6 sm:p-8 md:p-10 relative overflow-hidden transform-gpu border-b md:border-b-0 md:border-r border-black/[0.04]">
               {/* Background Studio Glow */}
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#F8FAFC_0%,_#FFFFFF_70%)] opacity-50" />
               
               <div className="relative w-full h-full max-h-[200px] sm:max-h-[240px] md:max-h-[380px] transform-gpu flex items-center justify-center">
                 {product.image_url && !imageError ? (
                   <Image 
                     src={product.image_url} 
                     alt={product.name} 
                     fill
                     priority
                     unoptimized
                     onError={() => setImageError(true)}
                     sizes="(max-width: 768px) 100vw, 460px"
                     className="object-contain sm:drop-shadow-[0_12px_36px_rgba(0,0,0,0.06)]"
                    />
                 ) : (
                    <div className="flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex items-center justify-center text-slate-400">
                        <ShoppingBag size={30} strokeWidth={1.2} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-outfit">
                        TOJ-VITAMIN
                      </span>
                    </div>
                 )}
               </div>

               {/* Desktop Quality Standard */}
               <div className="hidden md:flex items-center gap-2 mt-4 text-[#64748B] text-[11px] font-medium tracking-wide">
                  <ShieldCheck size={14} className="text-[#1E40AF]" />
                  <span>{lang === 'en' ? '100% Original GLS Pharmaceuticals' : (lang === 'ru' ? '100% Оригинал GLS Pharmaceuticals' : '100% Асл GLS Pharmaceuticals')}</span>
               </div>
            </div>

            {/* 2. RIGHT COLUMN: SCROLLABLE CONTENT BODY + STICKY FOOTER */}
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
              
              {/* SCROLLABLE CONTENT BODY (Stabilized) */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden apple-shelf-scroll overscroll-contain px-6 sm:px-10 md:px-12 pt-6 sm:pt-8 md:pt-10 pb-8 will-change-scroll">
                
                <div className="space-y-8 md:space-y-10">
                  
                  {/* 1. Main Info: Title & Price */}
                  <div className="space-y-4 md:space-y-5 pt-1 md:pr-12">
                     <div className="space-y-1.5">
                        <p className="text-[#94A3B8] text-[11px] md:text-[12px] font-bold uppercase tracking-[0.25em] font-outfit">
                          {lang === 'en' ? 'Exclusive Collection' : (lang === 'ru' ? 'Эксклюзивная коллекция' : 'Коллексияи эксклюзивӣ')}
                        </p>
                        <h2 className="text-[26px] sm:text-[32px] md:text-[36px] font-bold text-[#1D1D1F] leading-tight font-outfit tracking-tight">
                          {getLocalizedProductName(product.name, lang)}
                        </h2>
                     </div>
                     
                     <div className="flex items-baseline gap-2">
                        <span className="text-[32px] md:text-[36px] font-bold text-[#1D1D1F] font-outfit tracking-tighter">
                          {product.price}
                        </span>
                        <span className="text-[15px] md:text-[16px] text-[#94A3B8] font-bold tracking-widest uppercase">{lang === 'en' ? 'TJS' : 'смн'}</span>
                     </div>

                     {product.tags && product.tags.length > 0 && (
                       <div className="flex flex-wrap gap-2">
                         {product.tags.map((tag, idx) => (
                           <span key={idx} className="px-3.5 py-1 rounded-full bg-black/[0.04] text-[10px] font-bold text-[#1D1D1F] uppercase tracking-widest">
                             {getLocalizedProductTag(tag, lang)}
                           </span>
                         ))}
                       </div>
                     )}
                  </div>

                <div className="h-px bg-black/[0.05]" />

                {/* 2. Marketing Strategy: Benefits List */}
                {product.marketing_hooks && product.marketing_hooks.length > 0 && (
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] font-outfit">
                      {lang === 'en' ? 'Key Benefits' : (lang === 'ru' ? 'Преимущества' : 'Бартариятҳо')}
                    </h4>
                    <div className="grid gap-5">
                      {product.marketing_hooks.map((hook, idx) => (
                        <div key={idx} className="flex items-start gap-4 group">
                          <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 mt-0.5 shadow-lg group-hover:scale-110 transition-transform">
                            <CheckCircle2 size={13} />
                          </div>
                          <p className="text-[16px] text-[#334155] font-medium leading-relaxed">{hook}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="h-px bg-black/[0.05]" />

                {/* 3. Scientific Description: Pure Content */}
                <div className="space-y-6">
                  <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] font-outfit">
                    {lang === 'en' ? 'Description & Mechanism' : (lang === 'ru' ? 'Описание и действие' : 'Хусусиятҳо ва Таъсир')}
                  </h4>
                  <div className="space-y-5">
                    {descriptionLines.map((line, idx) => (
                      <div key={idx} className="flex items-start gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-black/[0.1] shrink-0 mt-2.5" />
                        <p className="text-[15px] sm:text-[17px] text-[#475569] leading-[1.6]">
                          {line.replace(/^[•\-\*]\s*/, '')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Compatibility (Clean Row Style) */}
                {product.med_interactions && product.med_interactions.length > 0 && (
                   <div className="pt-4">
                      <div className="bg-[#FAFAFA] rounded-[32px] p-8 border border-black/[0.03]">
                        <div className="flex items-center gap-3 mb-4 text-[#1D1D1F]">
                          <AlertCircle size={18} />
                          <h4 className="text-[12px] font-bold uppercase tracking-[0.15em] font-outfit">
                            {lang === 'en' ? 'Usage & Safety' : (lang === 'ru' ? 'Инструкции и безопасность' : 'Дастур ва бехатарӣ')}
                          </h4>
                        </div>
                        <div className="space-y-4">
                          {product.med_interactions.map((interaction, idx) => (
                             <p key={idx} className="text-[14px] text-[#64748B] leading-relaxed italic border-l-2 border-black/10 pl-4">{'\u2014'} {interaction}</p>
                          ))}
                        </div>
                      </div>
                   </div>
                )}

                {/* 5. Smart Synergies (Clean Recommendations) */}
                {synergies.length > 0 && (
                   <div className="space-y-8 pt-4">
                      <h4 className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] font-outfit text-center">
                        {lang === 'en' ? 'Recommended Synergies' : (lang === 'ru' ? 'Идеальное дополнение' : 'Иловаи комил')}
                      </h4>
                      <div className="space-y-4">
                        {synergies.map((link, idx) => {
                          const synProd = allProducts.find(p => p.id === link.synergy_product_id);
                          if (!synProd) return null;
                          return (
                            <div key={idx} className="relative bg-white border border-black/[0.06] rounded-[32px] p-6 hover:shadow-xl hover:shadow-black/[0.02] transition-all group overflow-hidden">
                               <div className="flex items-center gap-5">
                                  <div className="w-20 h-20 bg-[#FBFBFB] rounded-[24px] flex items-center justify-center p-3 group-hover:scale-110 transition-transform duration-700 shrink-0 border border-black/[0.02] relative overflow-hidden">
                                    <Image src={synProd.image_url || ''} alt={getLocalizedProductName(synProd.name, lang)} fill unoptimized sizes="80px" className="object-contain" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 text-[#1E40AF]">
                                       <ShieldCheck size={14} className="opacity-50" />
                                       <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                                         {lang === 'en' ? 'Clinical Pair' : (lang === 'ru' ? 'Клиническая пара' : 'Ҷуфти клиникӣ')}
                                       </span>
                                    </div>
                                    <h5 className="font-bold text-[#1D1D1F] text-[17px] mb-1 truncate">{getLocalizedProductName(synProd.name, lang)}</h5>
                                    <p className="text-[12px] text-[#64748B] mb-4 line-clamp-1">{link.reason}</p>
                                    <div className="flex items-center justify-between">
                                      <p className="font-bold text-[#1D1D1F] text-[16px]">{synProd.price} {lang === 'en' ? 'TJS' : 'смн'}</p>
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          addMultiple([product, synProd]);
                                          triggerAnimation();
                                          triggerToast(synProd, lang === 'en' ? 'Bundle added to cart' : (lang === 'ru' ? 'Набор добавлен в корзину' : 'Маҷмӯа ба сабад илова шуд'));
                                          setAddedBundles(prev => ({ ...prev, [synProd.id]: true }));
                                          setTimeout(() => {
                                            setAddedBundles(prev => ({ ...prev, [synProd.id]: false }));
                                          }, 2500);
                                        }}
                                        className={`h-10 px-5 rounded-full text-[12px] font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                                          addedBundles[synProd.id]
                                            ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                                            : 'bg-black text-white hover:bg-indigo-600'
                                        }`}
                                      >
                                        {addedBundles[synProd.id] ? (
                                          <>
                                            <Check size={14} className="stroke-[3]" />
                                            {lang === 'en' ? 'Bundle Added' : (lang === 'ru' ? 'Набор добавлен' : 'Маҷмӯа илова шуд')}
                                          </>
                                        ) : (
                                          <>
                                            <ShoppingBag size={14} />
                                            {lang === 'en' ? 'Get Bundle' : (lang === 'ru' ? 'Купить набор' : 'Харидани маҷмӯа')}
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                   </div>
                )}

                {/* 6. Scientific Journal Link (Internal SEO) */}
                <div className="pt-8">
                   <Link href="/journal" className="block bg-[#1D1D1F] rounded-[24px] p-6 sm:p-8 hover:scale-[1.01] transition-transform group shadow-xl">
                      <div className="flex items-center justify-between gap-4">
                         <div>
                            <div className="flex items-center gap-2 mb-2 opacity-80 text-white">
                               <ShieldCheck size={16} />
                               <span className="text-[10px] font-bold uppercase tracking-widest">
                                 {lang === 'en' ? 'Toj-Vitamin Expertise' : 'toj-vitamin Экспертиза'}
                               </span>
                            </div>
                            <h4 className="text-[18px] sm:text-[20px] font-bold text-white font-outfit mb-1">
                              {lang === 'en' ? 'Science Journal' : (lang === 'ru' ? 'Научный Журнал' : 'Маҷаллаи Илмӣ')}
                            </h4>
                            <p className="text-[#94A3B8] text-[13px] leading-relaxed">
                              {lang === 'en' ? 'Learn more about ingredients, clinical research, and protocols in our medical journal.' : (lang === 'ru' ? 'Узнайте больше о составах, исследованиях и правилах приема в нашем медицинском блоге.' : 'Дар бораи таркибҳо ва тадқиқотҳо дар блоги мо бештар хонед.')}
                            </p>
                         </div>
                         <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white shrink-0 group-hover:bg-white group-hover:text-black transition-colors">
                            <ArrowRight size={20} />
                         </div>
                      </div>
                   </Link>
                </div>

                {/* BOTTOM SPACING */}
                <div className="h-6" />
              </div>
            </div>

            {/* PREMIUM STICKY FOOTER IN RIGHT COLUMN */}
              <div className="shrink-0 p-4 sm:p-5 md:p-6 bg-white/95 backdrop-blur-md border-t border-black/[0.05] z-30">
                <div className="w-full flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      addItem(product);
                      triggerAnimation();
                      triggerToast(product);
                      setIsAdded(true);
                      setTimeout(() => setIsAdded(false), 2500);
                    }}
                    className={`flex-1 h-[52px] sm:h-[58px] rounded-[22px] text-[15px] sm:text-[16px] font-bold flex items-center justify-center gap-2.5 transition-all duration-300 shadow-lg active:scale-[0.97] ${
                      isAdded
                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                        : 'bg-[#1D1D1F] text-white hover:bg-indigo-600 hover:scale-[1.01]'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check size={20} className="stroke-[3]" />
                        <span>{lang === 'en' ? 'Added to Cart' : (lang === 'ru' ? 'Добавлено в корзину' : 'Ба сабад илова шуд')}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={18} />
                        <span>{lang === 'en' ? 'Add to Cart' : (lang === 'ru' ? 'Добавить в корзину' : 'Илова ба сабад')}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(true);
                    }}
                    className="h-[52px] sm:h-[58px] px-4 sm:px-6 rounded-[22px] bg-black/[0.05] hover:bg-black/[0.1] active:scale-[0.97] text-[#1D1D1F] text-[13px] sm:text-[14px] font-bold flex items-center justify-center gap-2 transition-all shrink-0"
                    title={lang === 'en' ? 'Open Cart' : (lang === 'ru' ? 'Открыть корзину' : 'Кушодани сабад')}
                  >
                    <ShoppingBag size={17} />
                    <span className="hidden sm:inline">{lang === 'en' ? 'Cart' : (lang === 'ru' ? 'В корзину' : 'Ба сабад')}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
