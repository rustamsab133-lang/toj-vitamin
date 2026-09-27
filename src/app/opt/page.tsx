"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, ShieldCheck, Truck, Download, 
  HelpCircle, ChevronDown, MessageSquare, Star, ArrowRight, X,
  Globe, Lock, FileSpreadsheet, Award, Warehouse,
  ExternalLink, Check, Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Lang = 'ru' | 'en';

const CONTENT = {
  ru: {
    brandName: 'TOJ-VITAMIN',
    brandTagline: 'DISTRIBUTION',
    navAbout: 'О центре',
    navBrands: 'Бренды и прайсы',
    navPrincipals: 'Производителям',
    navReviews: 'Отзывы',
    navFaq: 'FAQ',
    navLogin: 'Вход в B2B кабинет',

    heroChip: 'Прямой импорт и дистрибьюция БАД в Республике Таджикистан',
    heroTitle: 'Оптово-дистрибьюторский центр TOJ-VITAMIN — Прямые поставки витаминов и БАД в аптечные сети Таджикистана',
    heroSubtitle: 'Официальный оптовый партнер фармацевтического ритейла. Прямые контракты с заводами-производителями, честное хранение на климатических складах и экспресс-доставка за 24 часа по всей стране.',
    heroBtnB2B: 'Войти в B2B кабинет / Заказать',
    heroBtnPrices: 'Скачать прайс-листы по брендам',
    heroBtnWhatsapp: 'WhatsApp для аптек',

    trustBadges: [
      {
        icon: 'building',
        title: '500+ аптек-партнеров',
        desc: 'Душанбе, Согд, Хатлон и Районы республиканского подчинения (РРП).'
      },
      {
        icon: 'shield',
        title: '100% оригинальная продукция',
        desc: 'Сертификаты качества Республики Таджикистан и стандарты Таможенного союза.'
      },
      {
        icon: 'warehouse',
        title: 'Современный складской комплекс',
        desc: 'Собственные современные склады с контролем температуры (15–25°C) и влажности для правильного хранения витаминов и БАД.'
      },
      {
        icon: 'truck',
        title: 'Экспресс-логистика',
        desc: 'Доставка день-в-день по Душанбе, до 24 часов в регионы Республики Таджикистан.'
      }
    ],

    brandsTitle: 'Оптовые прайс-листы по брендам',
    brandsSubtitle: 'Скачивайте официальные прайс-листы строго под каждым брендом с актуальными оптовыми ценами',
    allBrandsTag: 'Все бренды в наличии',
    downloadCsv: 'Скачать прайс (.CSV / Excel)',

    brands: [
      {
        id: 'gls',
        name: 'GLS Pharmaceuticals',
        country: 'Россия',
        status: 'Официальный дистрибьютор в РТ',
        desc: 'Премиальная линейка витаминов, микроэлементов и биоактивных комплексов. Более 80 востребованных SKU с сертификатами.',
        url: '/api/b2b/export-price?brand=gls',
        popular: 'D3, Омега-3, Магний B6, Цинк, Коллаген'
      },
      {
        id: 'now',
        name: 'NOW Foods',
        country: 'США (USA)',
        status: 'Прямые оптовые поставки',
        desc: 'Мировой лидер и золотой стандарт натуральных биологически активных добавок. 100% оригинальная продукция с заводов США.',
        url: '/api/b2b/export-price?brand=now',
        popular: 'Omega-3 Molecularly Distilled, D-3 5000 IU, Ultra Omega, Zinc Glycinate'
      },
      {
        id: 'all',
        name: 'Сводный B2B каталог TojVitamin',
        country: 'Все бренды',
        status: 'Единый реестр склада',
        desc: 'Полная складская номенклатура дистрибьюторского центра (GLS, NOW Foods, Solgar, Doppelherz) с оптовыми ценами в TJS.',
        url: '/api/b2b/export-price',
        popular: '500+ наименований витаминов и нутрицевтиков'
      }
    ],

    principalsTitle: 'Международным брендам и производителям (NOW Foods, Solgar, GLS)',
    principalsSubtitle: 'TojVitamin Distribution — авторизованный партнер для вывода и масштабирования фармацевтических брендов на рынке Таджикистана',
    principalsPoints: [
      {
        title: 'Регуляторный комплаенс и регистрация',
        desc: 'Полное юридическое сопровождение, нотификация и регистрация БАД в Службе государственного надзора за фармацевтической деятельностью МЗСЗН РТ.'
      },
      {
        title: 'Охват 500+ аптечных сетей',
        desc: 'Прямые договоры поставки с ведущими сетями аптек, частными клиниками и розничными пунктами по всем 4 регионам Таджикистана.'
      },
      {
        title: 'Климатические склады с термоконтролем',
        desc: 'Собственные складские помещения с непрерывным мониторингом температуры 15–25°C, соблюдением влажности и регламентов бережного хранения.'
      },
      {
        title: 'Антиконтрафакт и защита бренда',
        desc: 'Прямой импорт исключает появление нелегальных копий и серых поставок, гарантируя безупречную репутацию бренда на территории РТ.'
      },
      {
        title: 'Цифровой B2B портал',
        desc: 'Автоматизированный электронный документооборот, заказной бланк (Matrix Bulk Order) и мгновенная синхронизация складских остатков.'
      }
    ],

    reviewsTitle: 'Отзывы аптек-партнеров в Таджикистане',
    reviewsSubtitle: 'Более 500 аптек доверяют TojVitamin Distribution регулярное снабжение полок',
    reviews: [
      {
        name: 'Аптечная сеть «Шифо»',
        city: 'г. Душанбе',
        text: 'Сотрудничаем с TojVitamin более года. Очень радует быстрая доставка и то, что все документы и сертификаты всегда в порядке. Клиенты часто спрашивают именно бренд GLS, полки никогда не пустуют.',
        rating: 5
      },
      {
        name: 'ООО «Фарм-Альянс»',
        city: 'г. Худжанд',
        text: 'Надежный поставщик с кристально прозрачными оптовыми ценами. В Согдийскую область груз доходит стабильно на следующий день после подтверждения накладной.',
        rating: 5
      },
      {
        name: 'Аптека «Саломат»',
        city: 'г. Бохтар',
        text: 'Всегда свежие сроки годности, упаковки аккуратные, контроль температуры при доставке соблюдается. Работать через TojVitamin Distribution выгодно и спокойно.',
        rating: 5
      },
      {
        name: 'Аптечная сеть «Ориён-Фарм»',
        city: 'г. Куляб',
        text: 'Заказываем и линейку GLS, и американские витамины NOW Foods. Покупатели ценят 100% оригинальность, а для нас это отсутствие рекламаций и уверенность.',
        rating: 5
      },
      {
        name: 'Аптека «Сино»',
        city: 'г. Истаравшан',
        text: 'Отличный сервис и вежливые менеджеры. Очень удобно формировать оптовый заказ прямо через B2B кабинет сайта — накладные формируются моментально.',
        rating: 5
      },
      {
        name: '«Авиценна Плюс»',
        city: 'г. Турсунзаде / РРП',
        text: 'Главное преимущество TojVitamin — это легальность и честные сертификаты качества. Для лицензированной аптечной сети это решающий фактор.',
        rating: 5
      }
    ],

    faqTitle: 'Часто задаваемые вопросы (FAQ)',
    faqSubtitle: 'Условия работы с оптово-дистрибьюторским центром TojVitamin',
    faqs: [
      {
        q: 'Какова минимальная сумма оптового заказа?',
        a: 'Минимальная сумма оптового заказа составляет **1 000 сомони**. Это позволяет аптекам любого масштаба комфортно формировать закупки без избыточного давления на оборотный капитал.'
      },
      {
        q: 'Предоставляете ли вы сертификаты качества?',
        a: 'Да, на каждую партию товара мы предоставляем полный пакет официальных документов: сертификаты соответствия Республики Таджикистан, гигиенические заключения и сертификаты заводов-производителей.'
      },
      {
        q: 'Как быстро осуществляется доставка?',
        a: 'По Душанбе доставка осуществляется день-в-день при подтверждении заявки до 14:00. В регионы (Худжанд, Бохтар, Куляб, Истаравшан и др.) доставка занимает до 24 часов специализированным транспортом.'
      },
      {
        q: 'Есть ли у вас отсрочка платежа?',
        a: 'Условия отсрочки платежа **обсуждаются индивидуально** с постоянными надежными партнерами после успешного выполнения первых заказов и согласования кредитного лимита.'
      }
    ],

    modalTitle: 'Вход в B2B кабинет аптеки',
    modalSubtitle: 'Доступ к оптовым ценам, бланку быстрого заказа и истории поставок',
    modalPhoneLabel: 'Номер телефона аптеки (РТ):',
    modalNameLabel: 'Название вашей аптеки / сети:',
    modalNamePlaceholder: 'Например, Аптека «Саломат» или ИП Каримов',
    modalSubmitLogin: 'Войти в личный кабинет',
    modalSubmitRegister: 'Зарегистрироваться и войти',
    modalSearching: 'Проверка авторизации...',
    modalSuccessRedirect: 'Авторизация успешна! Перенаправляем в B2B кабинет...',
    modalHelpWhatsapp: 'Нужна помощь? Свяжитесь с куратором аптек в WhatsApp',
    footerRights: 'Все права защищены. Дистрибьюция витаминов и БАД в Таджикистане.'
  },
  en: {
    brandName: 'TOJ-VITAMIN',
    brandTagline: 'DISTRIBUTION',
    navAbout: 'About Hub',
    navBrands: 'Brands & Prices',
    navPrincipals: 'For Principals',
    navReviews: 'Reviews',
    navFaq: 'FAQ',
    navLogin: 'B2B Portal Login',

    heroChip: 'Direct Import & Distribution of Dietary Supplements in Tajikistan',
    heroTitle: 'TOJ-VITAMIN Distribution Hub — Direct Supply of Vitamins & Supplements to Tajikistan Pharmacies',
    heroSubtitle: 'Authorized wholesale partner for pharmacy retail across Central Asia. Direct brand contracts, climate-controlled warehousing (15–25°C), and express 24-hour fulfillment nationwide.',
    heroBtnB2B: 'Enter B2B Portal / Order',
    heroBtnPrices: 'Download Price Lists by Brand',
    heroBtnWhatsapp: 'Pharmacy WhatsApp Line',

    trustBadges: [
      {
        icon: 'building',
        title: '500+ Partner Pharmacies',
        desc: 'Active distribution network covering Dushanbe, Sughd, Khatlon, and RRP regions.'
      },
      {
        icon: 'shield',
        title: '100% Certified Authentic',
        desc: 'Fully compliant with Tajikistan MoH regulations and EAC quality standards.'
      },
      {
        icon: 'warehouse',
        title: 'Modern Climate-Controlled Storage',
        desc: 'Dedicated modern warehouses with strict 15–25°C thermal and humidity monitoring for optimal supplement preservation.'
      },
      {
        icon: 'truck',
        title: 'Express Logistics',
        desc: 'Same-day delivery in Dushanbe, under 24 hours across all provinces of Tajikistan.'
      }
    ],

    brandsTitle: 'Wholesale Price Lists by Brand',
    brandsSubtitle: 'Download official price lists segmented strictly by brand with real-time wholesale rates and inventory',
    allBrandsTag: 'Stock Available',
    downloadCsv: 'Download Price List (.CSV / Excel)',

    brands: [
      {
        id: 'gls',
        name: 'GLS Pharmaceuticals',
        country: 'Russia',
        status: 'Official Distributor in RT',
        desc: 'Premium range of vitamins, essential minerals, and bioactive formulas. Over 80 certified fast-moving SKUs.',
        url: '/api/b2b/export-price?brand=gls',
        popular: 'Vitamin D3, Omega-3, Magnesium B6, Zinc, Collagen'
      },
      {
        id: 'now',
        name: 'NOW Foods',
        country: 'USA (Illinois)',
        status: 'Direct Wholesale Importer',
        desc: 'Global benchmark in natural health and dietary supplements. 100% genuine products shipped directly from USA facilities.',
        url: '/api/b2b/export-price?brand=now',
        popular: 'Omega-3 Molecularly Distilled, D-3 5000 IU, Ultra Omega, Zinc Glycinate'
      },
      {
        id: 'all',
        name: 'TojVitamin Master B2B Directory',
        country: 'All Brands',
        status: 'Consolidated Inventory',
        desc: 'Complete wholesale directory (GLS, NOW Foods, Solgar, Doppelherz) with live wholesale pricing in TJS.',
        url: '/api/b2b/export-price',
        popular: '500+ supplement & vitamin items in stock'
      }
    ],

    principalsTitle: 'To Global Brand Principals & Executives (NOW Foods, Solgar, GLS)',
    principalsSubtitle: 'TojVitamin Distribution is the authorized gateway for international nutrition brands entering Tajikistan and Central Asia',
    principalsPoints: [
      {
        title: 'Regulatory Compliance & MoH Registration',
        desc: 'Full legal guidance, state notification, and product registration at the Service for State Supervision of Pharmaceutical Activities of the Republic of Tajikistan.'
      },
      {
        title: 'Access to 500+ Pharmacy Retail Chains',
        desc: 'Established commercial relationships with premier pharmacy chains, hospitals, and independent drugstores nationwide.'
      },
      {
        title: 'Climate-Controlled Warehousing',
        desc: 'Modern storage facilities with continuous 15–25°C thermal logs and relative humidity controls for supplement preservation.'
      },
      {
        title: 'Anti-Counterfeit & Brand Equity Protection',
        desc: 'Strict authorized direct channels eliminate illicit parallel trade and counterfeit goods, safeguarding your brand reputation.'
      },
      {
        title: 'Proprietary B2B Digital Infrastructure',
        desc: 'Seamless electronic order matrix, batch traceability, and automated B2B customer self-service.'
      }
    ],

    reviewsTitle: 'Verified Partner Pharmacy Reviews',
    reviewsSubtitle: 'Over 500 licensed pharmacies trust TojVitamin Distribution for steady stock fulfillment',
    reviews: [
      {
        name: 'Pharmacy Chain «Shifo»',
        city: 'Dushanbe',
        text: 'Partnering with TojVitamin for over a year. Outstanding delivery speed and meticulous compliance paperwork. Customers specifically seek the GLS line.',
        rating: 5
      },
      {
        name: 'Pharm-Alliance LLC',
        city: 'Khujand',
        text: 'Reliable supplier with transparent wholesale pricing. Shipments to Sughd Province reliably arrive the following morning.',
        rating: 5
      },
      {
        name: '«Salomat» Pharmacy',
        city: 'Bokhtar',
        text: 'Consistently fresh expiry dates, undamaged packaging, and temperature compliance during transport. A top-tier distribution partner.',
        rating: 5
      },
      {
        name: '«Oriyon-Pharm» Chain',
        city: 'Kulob',
        text: 'We order both GLS and US NOW Foods products. Customer demand is consistently high, and TojVitamin ensures zero stockouts.',
        rating: 5
      },
      {
        name: '«Sino» Pharmacy',
        city: 'Istaravshan',
        text: 'Superb service and attentive account managers. Placing wholesale orders online through the B2B portal is remarkably swift.',
        rating: 5
      },
      {
        name: '«Avicenna Plus»',
        city: 'Tursunzade / RRP',
        text: 'Zero counterfeit risk — only certified authentic products with complete laboratory certificates. Essential for our license reputation.',
        rating: 5
      }
    ],

    faqTitle: 'Frequently Asked Questions (FAQ)',
    faqSubtitle: 'Commercial terms and partnership details with TojVitamin Distribution',
    faqs: [
      {
        q: 'What is the minimum wholesale order amount?',
        a: 'The minimum wholesale order amount is **1,000 TJS** (~$95 USD). This allows pharmacies of any size to replenish stock comfortably without tying up working capital.'
      },
      {
        q: 'Do you provide authentic quality certificates?',
        a: 'Yes, every order includes full compliance documentation: Tajikistan State Certificates of Conformity, sanitary permits, and original manufacturer test reports.'
      },
      {
        q: 'What is the delivery turnaround time?',
        a: 'Same-day delivery in Dushanbe for orders confirmed by 2:00 PM. Regional delivery across Tajikistan takes under 24 hours via dedicated freight.'
      },
      {
        q: 'Are deferred payment terms available?',
        a: 'Credit and deferred payment terms are **discussed individually** with verified recurring partners following successful initial deliveries.'
      }
    ],

    modalTitle: 'B2B Pharmacy Portal Sign In',
    modalSubtitle: 'Direct access to wholesale prices, rapid bulk order matrix, and dispatch tracking',
    modalPhoneLabel: 'Pharmacy Phone Number (Tajikistan):',
    modalNameLabel: 'Pharmacy / Retail Chain Name:',
    modalNamePlaceholder: 'e.g. Salomat Pharmacy or Karimov LLC',
    modalSubmitLogin: 'Sign In to Portal',
    modalSubmitRegister: 'Register & Enter Portal',
    modalSearching: 'Verifying credentials...',
    modalSuccessRedirect: 'Authorized! Redirecting to your B2B workspace...',
    modalHelpWhatsapp: 'Need assistance? Reach out to our pharmacy account manager on WhatsApp',
    footerRights: 'All rights reserved. Wholesale dietary supplement distribution in Tajikistan.'
  }
};

export default function OptDistributionPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ru');
  const [modalOpen, setModalOpen] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const t = CONTENT[lang];

  const handleOpenB2B = () => {
    if (typeof window !== 'undefined') {
      const existingToken = localStorage.getItem('toj_b2b_token');
      if (existingToken && existingToken.length > 5) {
        router.push(`/b2b/${existingToken}`);
        return;
      }
    }
    setModalOpen(true);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
    setPhoneDigits(val);
    setErrorMsg('');
  };

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneDigits.length < 9) {
      setErrorMsg(lang === 'ru' ? 'Введите полные 9 цифр номера (например, 900 12 3456)' : 'Please enter the complete 9-digit phone number');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const fullPhone = `+992${phoneDigits}`;

    try {
      const res = await fetch('/api/b2b/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fullPhone,
          pharmacy_name: pharmacyName.trim()
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        if (data.registered === false && !showNameInput) {
          setShowNameInput(true);
          setErrorMsg(lang === 'ru' 
            ? 'Номер не найден в базе. Введите название аптеки для мгновенного создания кабинета:' 
            : 'Number not found. Enter pharmacy name for instant registration:');
          setLoading(false);
          return;
        }
        throw new Error(data.error || (lang === 'ru' ? 'Ошибка входа' : 'Login failed'));
      }

      if (data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('toj_b2b_token', data.token);
          localStorage.setItem('toj_b2b_pharmacy_name', data.name || 'Партнерская аптека');
          document.cookie = `toj_b2b_token=${data.token}; path=/; max-age=2592000`;
        }
        setSuccessMsg(t.modalSuccessRedirect);
        setTimeout(() => {
          router.push(`/b2b/${data.token}`);
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'ru' ? 'Сбой при проверке данных' : 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      {/* Background radial ambient lights */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[500px] bg-teal-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 -left-40 w-[600px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Warehouse className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-xl text-white">TojVitamin</span>
                <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {t.brandTagline}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Tajikistan Wholesale Supply</p>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#trust" className="hover:text-emerald-400 transition-colors">{t.navAbout}</a>
            <a href="#brands" className="hover:text-emerald-400 transition-colors">{t.navBrands}</a>
            <a href="#principals" className="hover:text-emerald-400 transition-colors">{t.navPrincipals}</a>
            <a href="#reviews" className="hover:text-emerald-400 transition-colors">{t.navReviews}</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">{t.navFaq}</a>
          </nav>

          {/* Right actions: Lang switcher + B2B button */}
          <div className="flex items-center gap-3">
            {/* RU / EN switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold">
              <button
                onClick={() => setLang('ru')}
                className={`px-2.5 py-1 rounded-lg transition-all ${lang === 'ru' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                RU
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg transition-all ${lang === 'en' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </button>
            </div>

            {/* B2B Cabinet action */}
            <button
              onClick={handleOpenB2B}
              className="relative group overflow-hidden rounded-xl p-px font-bold text-xs sm:text-sm text-white"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-xl transition-all duration-300 group-hover:opacity-90" />
              <span className="relative px-4 py-2.5 rounded-[11px] bg-slate-950 flex items-center gap-2 group-hover:bg-opacity-80 transition-all">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.navLogin}</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-8 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t.heroChip}</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-5xl mx-auto mb-6"
          >
            {t.heroTitle}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed mb-10"
          >
            {t.heroSubtitle}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 max-w-xl mx-auto"
          >
            <button
              onClick={handleOpenB2B}
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Store className="w-5 h-5" />
              <span>{t.heroBtnB2B}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#brands"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{t.heroBtnPrices}</span>
            </a>

            <a
              href="https://wa.me/992900000000?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!%20%D0%98%D0%BD%D1%82%D0%B5%D1%80%D0%B5%D1%81%D1%83%D1%8E%D1%82%20%D0%BE%D0%BF%D1%82%D0%BE%D0%B2%D1%8B%D0%B5%20%D0%BF%D0%BE%D1%81%D1%82%D0%B0%D0%B2%D0%BA%D0%B8%20%D0%B2%20%D0%B0%D0%BF%D1%82%D0%B5%D0%BA%D1%83"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t.heroBtnWhatsapp}</span>
            </a>
          </motion.div>
        </section>

        {/* TRUST BADGES SECTION */}
        <section id="trust" className="py-12 border-y border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {t.trustBadges.map((badge, idx) => (
                <div 
                  key={idx}
                  className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                      {badge.icon === 'building' && <Building2 className="w-6 h-6" />}
                      {badge.icon === 'shield' && <ShieldCheck className="w-6 h-6" />}
                      {badge.icon === 'warehouse' && <Warehouse className="w-6 h-6" />}
                      {badge.icon === 'truck' && <Truck className="w-6 h-6" />}
                    </div>
                    <span className="text-xs font-mono font-semibold text-slate-500">0{idx + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                      {badge.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      {badge.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BRANDS & DOWNLOAD PRICE LIST SECTION */}
        <section id="brands" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-400 mb-3">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>B2B PRICE LISTS</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
              {t.brandsTitle}
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              {t.brandsSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.brands.map((b) => (
              <div 
                key={b.id}
                className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-7 flex flex-col justify-between hover:border-emerald-500/50 shadow-xl transition-all duration-300 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {b.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{b.country}</span>
                  </div>

                  <h3 className="text-2xl font-black text-white mb-3 group-hover:text-emerald-300 transition-colors">
                    {b.name}
                  </h3>

                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    {b.desc}
                  </p>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-6">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {lang === 'ru' ? 'Ключевые позиции:' : 'Key SKUs:'}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      {b.popular}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <a
                    href={b.url}
                    download
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-emerald-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.downloadCsv}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="text-lg font-bold text-white">
                {lang === 'ru' ? 'Нужен доступ к оптовым ценам и остаткам в реальном времени?' : 'Need live stock & wholesale ordering online?'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-400">
                {lang === 'ru' 
                  ? 'Авторизуйтесь по номеру вашей аптеки, чтобы открыть личный кабинет с матричным бланком быстрых заказов' 
                  : 'Log in with your pharmacy phone number to open your personal Matrix Bulk Order desk'}
              </p>
            </div>
            <button
              onClick={handleOpenB2B}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 shrink-0 transition-all"
            >
              <Store className="w-4 h-4" />
              <span>{t.navLogin}</span>
            </button>
          </div>
        </section>

        {/* FOR INTERNATIONAL PRINCIPALS (NOW FOODS AUDIT SECTION) */}
        <section id="principals" className="py-20 border-y border-slate-800/80 bg-slate-900/30 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
                <Globe className="w-3.5 h-3.5" />
                <span>FOR GLOBAL BRAND EXECUTIVES</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-4">
                {t.principalsTitle}
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {t.principalsSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {t.principalsPoints.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-teal-500/40 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-black text-sm mb-4 border border-teal-500/20">
                    0{idx + 1}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}

              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/30 flex flex-col justify-between">
                <div>
                  <Award className="w-8 h-8 text-emerald-400 mb-3" />
                  <h3 className="text-base font-bold text-white mb-2">
                    {lang === 'ru' ? 'Официальное партнерство' : 'Official Partnership Inquiry'}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {lang === 'ru'
                      ? 'Готовы предоставить аудиторские данные по каналам сбыта, логистическим мощностям и регуляторным заключениям.'
                      : 'Comprehensive sales audits, cold-chain verification records, and compliance dossiers are readily accessible.'}
                  </p>
                </div>
                <a
                  href="mailto:info@tojvitamin.tj?subject=Partnership%20Inquiry%20from%20Brand%20Principal"
                  className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  <span>info@tojvitamin.tj</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* VERIFIED REVIEWS FROM 6 AUTHENTIC PHARMACIES */}
        <section id="reviews" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-400 mb-3">
              <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
              <span>TESTIMONIALS</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
              {t.reviewsTitle}
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              {t.reviewsSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.reviews.map((rev, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {rev.city}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 italic">
                    «{rev.text}»
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                    {rev.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{rev.name}</h4>
                    <p className="text-[11px] text-emerald-400 font-medium">
                      {lang === 'ru' ? 'Проверенный B2B партнер' : 'Verified B2B Partner'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-20 border-t border-slate-800/80 bg-slate-900/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-400 mb-3">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>FREQUENTLY ASKED QUESTIONS</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
                {t.faqTitle}
              </h2>
              <p className="text-slate-400 text-sm sm:text-base">
                {t.faqSubtitle}
              </p>
            </div>

            <div className="space-y-4">
              {t.faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-emerald-300 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`w-5 h-5 text-emerald-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60">
                        <div dangerouslySetInnerHTML={{ 
                          __html: faq.a.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-300 font-bold">$1</strong>') 
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA BANNER */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-10 md:p-16 rounded-3xl bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/30 relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {lang === 'ru' 
                  ? 'Готовы начать поставки в вашу аптечную сеть?' 
                  : 'Ready to streamline supply for your pharmacy network?'}
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {lang === 'ru'
                  ? 'Войдите в B2B кабинет или свяжитесь с нашим отделом оптовых продаж для формирования индивидуального коммерческого предложения.'
                  : 'Log in to your B2B account or contact our distribution desk for customized terms and bulk replenishment.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <button
                  onClick={handleOpenB2B}
                  className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition-all"
                >
                  {t.heroBtnB2B}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              TV
            </div>
            <div>
              <p className="font-bold text-slate-300">TojVitamin Distribution</p>
              <p className="text-[11px] text-slate-500">Республика Таджикистан, г. Душанбе</p>
            </div>
          </div>

          <div className="text-center md:text-right space-y-1">
            <p>© {new Date().getFullYear()} TojVitamin Distribution. {t.footerRights}</p>
            <p className="text-[11px] text-slate-600">GLS Pharmaceuticals • NOW Foods • Solgar • Doppelherz</p>
          </div>
        </div>
      </footer>

      {/* B2B AUTH & REGISTRATION MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-slate-100"
            >
              <button 
                onClick={() => {
                  setModalOpen(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {t.modalTitle}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {t.modalSubtitle}
                </p>
              </div>

              <form onSubmit={handleSubmitAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {t.modalPhoneLabel}
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-950 border border-slate-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all overflow-hidden">
                    <div className="px-3.5 py-3 bg-slate-800/90 text-emerald-400 font-bold text-sm select-none border-r border-slate-700 flex items-center gap-1.5 shrink-0">
                      <span>🇹🇯</span>
                      <span>+992</span>
                    </div>
                    <input
                      type="tel"
                      autoFocus
                      required
                      placeholder="900 12 3456"
                      value={phoneDigits}
                      onChange={handlePhoneChange}
                      className="w-full bg-transparent px-3 py-3 text-white text-sm font-semibold tracking-wider placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {lang === 'ru' ? 'Введите 9 цифр номера аптеки без кода страны' : 'Enter 9 digits without country code'}
                  </p>
                </div>

                {showNameInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5 pt-1"
                  >
                    <label className="block text-xs font-semibold text-emerald-400">
                      {t.modalNameLabel}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t.modalNamePlaceholder}
                      value={pharmacyName}
                      onChange={(e) => setPharmacyName(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-3 text-white text-sm font-medium focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </motion.div>
                )}

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs">
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <span>{t.modalSearching}</span>
                  ) : showNameInput ? (
                    <span>{t.modalSubmitRegister}</span>
                  ) : (
                    <span>{t.modalSubmitLogin}</span>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-800 text-center space-y-2">
                <a
                  href="https://wa.me/992900000000?text=%D0%97%D0%B4%D1%80%D0%B0%D0%B2%D1%81%D1%82%D0%B2%D1%83%D0%B9%D1%82%D0%B5!%20%D0%9F%D0%BE%D0%BC%D0%BE%D0%B3%D0%B8%D1%82%D0%B5%20%D0%B2%D0%BE%D0%B9%D1%82%D0%B8%20%D0%B2%20B2B%20%D0%BA%D0%B0%D0%B1%D0%B8%D0%BD%D0%B5%D1%82"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.modalHelpWhatsapp}</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
