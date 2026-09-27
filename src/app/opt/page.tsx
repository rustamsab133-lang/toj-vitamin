"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Building2, ShieldCheck, Truck, Download, 
  HelpCircle, ChevronDown, Star, ArrowRight, X,
  Lock, FileSpreadsheet, Warehouse,
  Check, Store, Sparkles, UserPlus, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Lang = 'ru' | 'en';
type AuthMode = 'register' | 'login';

const CONTENT = {
  ru: {
    brandName: 'TOJ-VITAMIN',
    brandTagline: 'DISTRIBUTION',
    navAbout: 'О центре',
    navBrands: 'Прайс-лист GLS',
    navAdvantages: 'Преимущества',
    navReviews: 'Отзывы',
    navFaq: 'FAQ',
    navRegister: 'Регистрация аптеки',
    navLogin: 'Вход',

    heroChip: 'Официальный дистрибьютор GLS Pharmaceuticals в Таджикистане',
    heroTitle: 'Прямые оптовые поставки витаминов и БАД GLS в аптечные сети Таджикистана',
    heroSubtitle: 'Дистрибьюторский центр TOJ-VITAMIN — надежный поставщик фармацевтического ритейла. Прямые поставки с завода, свежие сроки годности, собственные климатические склады и оперативная доставка по всей республике.',
    heroBtnRegister: 'Регистрация аптеки / Вход в B2B',
    heroBtnPrice: 'Скачать оптовый прайс GLS (.CSV)',

    trustBadges: [
      {
        icon: 'building',
        title: '500+ аптек-партнеров',
        desc: 'Регулярное снабжение аптечных сетей в Душанбе, Согде, Хатлоне и РРП.'
      },
      {
        icon: 'shield',
        title: '100% официальная продукция',
        desc: 'Сертификаты соответствия Службы надзора за фармацевтической деятельностью Минздрава Республики Таджикистан.'
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

    brandSectionTitle: 'Официальный прайс-лист GLS Pharmaceuticals',
    brandSectionSubtitle: 'Скачайте актуальный оптовый прайс-лист с ценами в сомони (TJS) и описанием форм выпуска',
    glsTitle: 'GLS Pharmaceuticals — Инновационные витамины и нутрицевтики',
    glsDesc: 'Один из самых востребованных брендов витаминов и БАД в аптеках Таджикистана. Более 80 сертифицированных позиций: Витамин D3, Омега-3 высокой концентрации, Магний B6, Цинк, Коллаген, детские комплексы и специализированные добавки.',
    glsTag: 'Эксклюзивный ассортимент',
    downloadPriceBtn: 'Скачать прайс-лист GLS (.CSV / Excel)',

    advantagesTitle: 'Почему аптечные сети выбирают TOJ-VITAMIN',
    advantagesSubtitle: 'Обеспечиваем аптекам максимальную рентабельность и бесперебойную доступность товара на полках',
    advantages: [
      {
        num: '01',
        title: 'Прямые цены от завода GLS',
        desc: 'Работа без посредников дает аптекам максимальную торговую наценку и высокую доходность с каждой проданной упаковки.'
      },
      {
        num: '02',
        title: 'Постоянный запас на складе в Душанбе',
        desc: 'Никаких перебоев и ожидания поставок. Популярные сезонные позиции (D3, Омега, Цинк, Магний) всегда есть в наличии в нужном объеме.'
      },
      {
        num: '03',
        title: 'Полный комплект документов в каждой поставке',
        desc: 'К каждому заказу прилагаются официальные сертификаты соответствия МЗСЗН РТ, накладные и счета-фактуры. 100% готовность к любым проверкам.'
      },
      {
        num: '04',
        title: 'Табличный Matrix-заказ в личном кабинете',
        desc: 'Экономьте время: удобный бланк быстрого ввода количества по всему ассортименту без долгих поисков по каталогу.'
      }
    ],

    reviewsTitle: 'Отзывы аптек-партнеров',
    reviewsSubtitle: 'Более 500 аптек доверяют TojVitamin регулярное снабжение полок продукцией GLS',
    reviews: [
      {
        name: 'Аптечная сеть «Шифо»',
        city: 'г. Душанбе',
        text: 'Сотрудничаем с TojVitamin более года. Очень радует быстрая доставка и то, что все документы и сертификаты всегда в порядке. Покупатели часто спрашивают именно витамины GLS — полки не пустуют.',
        rating: 5
      },
      {
        name: 'ООО «Фарм-Альянс»',
        city: 'г. Худжанд',
        text: 'Надежный поставщик с честными оптовыми ценами. В Согдийскую область поставка приходит стабильно на следующий день после оформления заказа.',
        rating: 5
      },
      {
        name: 'Аптека «Саломат»',
        city: 'г. Бохтар',
        text: 'Всегда свежие сроки годности, аккуратные упаковки и соблюдение терморежима при транспортировке. Работать через TojVitamin выгодно и надежно.',
        rating: 5
      },
      {
        name: 'Аптечная сеть «Ориён-Фарм»',
        city: 'г. Куляб',
        text: 'Линейка GLS у наших покупателей пользуется огромным спросом. Благодаря TojVitamin у нас всегда есть в наличии весь топ продаж.',
        rating: 5
      },
      {
        name: 'Аптека «Сино»',
        city: 'г. Истаравшан',
        text: 'Отличный сервис и внимательное отношение к аптекам. Очень удобно делать оптовый заказ прямо через сайт — накладные формируются моментально.',
        rating: 5
      },
      {
        name: '«Авиценна Плюс»',
        city: 'г. Турсунзаде / РРП',
        text: 'Главный приоритет для нас — легальность и официальные сертификаты Минздрава РТ. У TojVitamin идеальный пакет документов к каждой поставке.',
        rating: 5
      }
    ],

    faqTitle: 'Часто задаваемые вопросы (FAQ)',
    faqSubtitle: 'Условия оптового сотрудничества с дистрибьюторским центром TojVitamin',
    faqs: [
      {
        q: 'Какова минимальная сумма оптового заказа?',
        a: 'Минимальная сумма оптового заказа составляет **1 000 сомони**. Это позволяет аптекам любого масштаба комфортно формировать закупки без избыточного давления на оборотный капитал.'
      },
      {
        q: 'Предоставляете ли вы сертификаты качества?',
        a: 'Да, на каждую партию товара предоставляется полный комплект официальных документов: сертификаты соответствия Службы государственного надзора за фармацевтической деятельностью Республики Таджикистан и паспорта завода GLS.'
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

    modalRegTitle: 'Регистрация аптеки в B2B кабинете',
    modalRegSubtitle: 'Заполните данные для мгновенного доступа к оптовым ценам и бланку заказа',
    modalLoginTitle: 'Вход в B2B кабинет аптеки',
    modalLoginSubtitle: 'Введите номер телефона вашей зарегистрированной аптеки',
    modalFieldPharmName: 'Название аптеки / сети:',
    modalPlaceholderPharmName: 'Например, Аптека «Саломат» или ИП Каримов',
    modalFieldCity: 'Город / Район:',
    modalPlaceholderCity: 'Например, Душанбе, Худжанд, Бохтар...',
    modalFieldContact: 'Контактное лицо (провизор / управляющий):',
    modalPlaceholderContact: 'ФИО контактного лица',
    modalFieldPhone: 'Номер телефона (WhatsApp):',
    modalPhoneNote: 'Введите 9 цифр номера без кода страны',
    modalBtnRegister: 'Зарегистрировать аптеку и открыть каталог',
    modalBtnLogin: 'Войти в личный кабинет',
    modalSwitchToLogin: 'Уже зарегистрированы? Войти по номеру телефона',
    modalSwitchToReg: 'Новая аптека? Пройти быструю регистрацию',
    modalRedirecting: 'Успешно! Открываем личный B2B кабинет...',

    footerRights: 'Все права защищены. Официальная дистрибьюция GLS Pharmaceuticals в Республике Таджикистан.'
  },
  en: {
    brandName: 'TOJ-VITAMIN',
    brandTagline: 'DISTRIBUTION',
    navAbout: 'About Hub',
    navBrands: 'GLS Price List',
    navAdvantages: 'Advantages',
    navReviews: 'Reviews',
    navFaq: 'FAQ',
    navRegister: 'Pharmacy Registration',
    navLogin: 'Sign In',

    heroChip: 'Official GLS Pharmaceuticals Distributor in Tajikistan',
    heroTitle: 'Direct Wholesale Supply of GLS Vitamins & Supplements to Tajikistan Pharmacies',
    heroSubtitle: 'TOJ-VITAMIN Distribution Hub is the premier wholesale partner for licensed retail pharmacies. Direct factory supply, continuous stock availability, modern climate-controlled warehouses, and rapid nationwide delivery.',
    heroBtnRegister: 'Pharmacy Registration / B2B Portal',
    heroBtnPrice: 'Download GLS Wholesale Price (.CSV)',

    trustBadges: [
      {
        icon: 'building',
        title: '500+ Partner Pharmacies',
        desc: 'Consistent wholesale fulfillment for pharmacy chains across Dushanbe, Sughd, Khatlon, and RRP.'
      },
      {
        icon: 'shield',
        title: '100% Certified Authentic',
        desc: 'Official Certificates of Conformity from the Ministry of Health and Social Protection of Tajikistan.'
      },
      {
        icon: 'warehouse',
        title: 'Modern Climate-Controlled Storage',
        desc: 'Dedicated modern warehouses with strict 15–25°C thermal and humidity monitoring for supplement preservation.'
      },
      {
        icon: 'truck',
        title: 'Express Logistics',
        desc: 'Same-day delivery in Dushanbe, under 24 hours across all provinces of Tajikistan.'
      }
    ],

    brandSectionTitle: 'Official GLS Pharmaceuticals Price List',
    brandSectionSubtitle: 'Download the current wholesale price list in Tajik Somoni (TJS) with product specifications',
    glsTitle: 'GLS Pharmaceuticals — Premium Health & Nutrition',
    glsDesc: 'A top-selling dietary supplement brand across Central Asia. Over 80 certified SKUs including Vitamin D3, high-potency Omega-3, Magnesium B6, Zinc Glycinate, Collagen, and pediatric formulas.',
    glsTag: 'Direct Factory Allocation',
    downloadPriceBtn: 'Download GLS Price Sheet (.CSV / Excel)',

    advantagesTitle: 'Why Pharmacy Chains Partner with TOJ-VITAMIN',
    advantagesSubtitle: 'Delivering superior retail margins, steady stock reliability, and seamless compliance',
    advantages: [
      {
        num: '01',
        title: 'Direct Factory Pricing',
        desc: 'Eliminating intermediaries ensures maximum retail profit margins on every single pack sold.'
      },
      {
        num: '02',
        title: 'Permanent Stock in Dushanbe',
        desc: 'Zero fulfillment delays. High-velocity seasonal essentials (D3, Omega, Zinc, Magnesium) are always in stock.'
      },
      {
        num: '03',
        title: 'Full Regulatory Documentation',
        desc: 'Every dispatch is accompanied by official MoH Tajikistan conformity certificates, invoices, and lab release records.'
      },
      {
        num: '04',
        title: 'Fast Matrix Bulk Order Portal',
        desc: 'Save time with our rapid tabular order entry form tailored specifically for high-volume pharmacy replenishment.'
      }
    ],

    reviewsTitle: 'Partner Pharmacy Testimonials',
    reviewsSubtitle: 'Over 500 pharmacies rely on TojVitamin Distribution for regular GLS inventory supply',
    reviews: [
      {
        name: 'Pharmacy Chain «Shifo»',
        city: 'Dushanbe',
        text: 'Partnering with TojVitamin for over a year. Rapid dispatch, impeccable paperwork, and steady patient demand for GLS vitamins.',
        rating: 5
      },
      {
        name: 'Pharm-Alliance LLC',
        city: 'Khujand',
        text: 'Reliable supplier with transparent wholesale terms. Shipments to Sughd arrive reliably the morning following the order.',
        rating: 5
      },
      {
        name: '«Salomat» Pharmacy',
        city: 'Bokhtar',
        text: 'Consistently fresh batches, undamaged boxes, and cold-chain compliance during delivery. A truly professional distributor.',
        rating: 5
      },
      {
        name: '«Oriyon-Pharm» Chain',
        city: 'Kulob',
        text: 'The GLS line has very strong patient loyalty. TojVitamin ensures we never experience stock shortages on top sellers.',
        rating: 5
      },
      {
        name: '«Sino» Pharmacy',
        city: 'Istaravshan',
        text: 'Exceptional service and supportive account managers. Ordering directly through the B2B portal takes under two minutes.',
        rating: 5
      },
      {
        name: '«Avicenna Plus»',
        city: 'Tursunzade / RRP',
        text: 'Authentic products backed by official Tajikistan MoH laboratory registrations are non-negotiable for our pharmacy license.',
        rating: 5
      }
    ],

    faqTitle: 'Frequently Asked Questions (FAQ)',
    faqSubtitle: 'Commercial partnership guidelines with TojVitamin Distribution',
    faqs: [
      {
        q: 'What is the minimum wholesale order amount?',
        a: 'The minimum wholesale order amount is **1,000 TJS** (~$95 USD). This allows pharmacies of any scale to replenish stock smoothly without tying up capital.'
      },
      {
        q: 'Do you provide authentic quality certificates?',
        a: 'Yes, every dispatch includes complete regulatory documentation: Certificates of Conformity from the Ministry of Health of Tajikistan and manufacturer batch release reports.'
      },
      {
        q: 'What is the delivery turnaround time?',
        a: 'Same-day delivery in Dushanbe for orders placed by 2:00 PM. Regional delivery across Tajikistan takes under 24 hours via dedicated freight.'
      },
      {
        q: 'Are deferred payment terms available?',
        a: 'Credit and deferred payment terms are **discussed individually** with verified recurring partners following initial deliveries.'
      }
    ],

    modalRegTitle: 'B2B Pharmacy Portal Registration',
    modalRegSubtitle: 'Submit your pharmacy details for instant access to wholesale rates and order matrix',
    modalLoginTitle: 'B2B Pharmacy Portal Sign In',
    modalLoginSubtitle: 'Enter your registered pharmacy phone number to enter',
    modalFieldPharmName: 'Pharmacy / Retail Chain Name:',
    modalPlaceholderPharmName: 'e.g. Salomat Pharmacy or Karimov LLC',
    modalFieldCity: 'City / Region:',
    modalPlaceholderCity: 'e.g. Dushanbe, Khujand, Bokhtar...',
    modalFieldContact: 'Contact Person (Pharmacist / Manager):',
    modalPlaceholderContact: 'Full name of contact person',
    modalFieldPhone: 'Phone Number (WhatsApp):',
    modalPhoneNote: 'Enter 9 digits without country code',
    modalBtnRegister: 'Register Pharmacy & Enter Portal',
    modalBtnLogin: 'Sign In to Portal',
    modalSwitchToLogin: 'Already registered? Sign in with phone number',
    modalSwitchToReg: 'New pharmacy? Quick registration',
    modalRedirecting: 'Authorized! Opening your B2B workspace...',

    footerRights: 'All rights reserved. Official GLS Pharmaceuticals distribution in the Republic of Tajikistan.'
  }
};

export default function OptDistributionPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('ru');
  const [modalOpen, setModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('register'); // По умолчанию сначала РЕГИСТРАЦИЯ!

  // Form fields
  const [pharmacyName, setPharmacyName] = useState('');
  const [city, setCity] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const t = CONTENT[lang];

  // Проверяем, есть ли уже сохраненный токен B2B
  const handleOpenB2B = (initialMode: AuthMode = 'register') => {
    if (typeof window !== 'undefined') {
      const existingToken = localStorage.getItem('toj_b2b_token');
      if (existingToken && existingToken.length > 5) {
        router.push(`/b2b/${existingToken}`);
        return;
      }
    }
    setAuthMode(initialMode);
    setErrorMsg('');
    setSuccessMsg('');
    setModalOpen(true);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
    setPhoneDigits(val);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phoneDigits.length < 9) {
      setErrorMsg(lang === 'ru' 
        ? 'Введите полные 9 цифр номера (например, 900 12 3456)' 
        : 'Please enter the complete 9-digit phone number');
      return;
    }

    if (authMode === 'register' && !pharmacyName.trim()) {
      setErrorMsg(lang === 'ru' ? 'Укажите название вашей аптеки' : 'Please provide pharmacy name');
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
          pharmacy_name: authMode === 'register' ? pharmacyName.trim() : undefined,
          contact_person: authMode === 'register' ? contactPerson.trim() : undefined,
          address: authMode === 'register' ? city.trim() : undefined
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        if (data.not_found && authMode === 'login') {
          setErrorMsg(lang === 'ru' 
            ? 'Номер не найден в базе. Пожалуйста, пройдите регистрацию аптеки.' 
            : 'Phone number not registered. Please sign up first.');
          setAuthMode('register');
          setLoading(false);
          return;
        }
        throw new Error(data.error || (lang === 'ru' ? 'Ошибка обработки запроса' : 'Request failed'));
      }

      if (data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('toj_b2b_token', data.token);
          localStorage.setItem('toj_b2b_pharmacy_name', data.name || pharmacyName || 'Партнерская аптека');
          document.cookie = `toj_b2b_token=${data.token}; path=/; max-age=2592000`;
        }
        setSuccessMsg(t.modalRedirecting);
        setTimeout(() => {
          router.push(`/b2b/${data.token}`);
        }, 600);
      }
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'ru' ? 'Ошибка связи с сервером' : 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      {/* Soft Light Ambient Gradient Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-b from-emerald-200/50 to-teal-100/30 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[550px] h-[450px] bg-emerald-100/40 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 -left-32 w-[550px] h-[450px] bg-teal-100/40 rounded-full blur-[130px]" />
      </div>

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-slate-200/80 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-xl text-slate-900">TOJ-VITAMIN</span>
                <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {t.brandTagline}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Официальный дистрибьютор GLS Pharmaceuticals в РТ</p>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#trust" className="hover:text-emerald-700 transition-colors">{t.navAbout}</a>
            <a href="#brands" className="hover:text-emerald-700 transition-colors">{t.navBrands}</a>
            <a href="#advantages" className="hover:text-emerald-700 transition-colors">{t.navAdvantages}</a>
            <a href="#reviews" className="hover:text-emerald-700 transition-colors">{t.navReviews}</a>
            <a href="#faq" className="hover:text-emerald-700 transition-colors">{t.navFaq}</a>
          </nav>

          {/* Right actions: Lang switcher + Registration button */}
          <div className="flex items-center gap-3">
            {/* RU / EN switcher */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs font-bold">
              <button
                onClick={() => setLang('ru')}
                className={`px-2.5 py-1 rounded-lg transition-all ${lang === 'ru' ? 'bg-white text-emerald-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-900'}`}
              >
                RU
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg transition-all ${lang === 'en' ? 'bg-white text-emerald-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-900'}`}
              >
                EN
              </button>
            </div>

            {/* Registration & Login button */}
            <button
              onClick={() => handleOpenB2B('register')}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t.navRegister}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10">
        {/* HERO SECTION (Light, Fresh, Ultra-Modern) */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* Top chip */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs sm:text-sm font-bold mb-8 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{t.heroChip}</span>
          </motion.div>

          {/* Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.18] max-w-5xl mx-auto mb-6"
          >
            {lang === 'ru' ? (
              <>
                Прямые оптовые поставки витаминов и БАД{' '}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  GLS Pharmaceuticals
                </span>{' '}
                в аптечные сети Таджикистана
              </>
            ) : (
              t.heroTitle
            )}
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed mb-10"
          >
            {t.heroSubtitle}
          </motion.p>

          {/* Action buttons (Registration first!) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 max-w-lg mx-auto"
          >
            <button
              onClick={() => handleOpenB2B('register')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/25 active:scale-[0.98] transition-all"
            >
              <Store className="w-5 h-5" />
              <span>{t.heroBtnRegister}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#brands"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>{t.heroBtnPrice}</span>
            </a>
          </motion.div>
        </section>

        {/* TRUST BADGES SECTION (Clean, Honest, No fake Customs Union) */}
        <section id="trust" className="py-14 border-y border-slate-200/80 bg-white/70 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {t.trustBadges.map((badge, idx) => (
                <div 
                  key={idx}
                  className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                      {badge.icon === 'building' && <Building2 className="w-6 h-6" />}
                      {badge.icon === 'shield' && <ShieldCheck className="w-6 h-6" />}
                      {badge.icon === 'warehouse' && <Warehouse className="w-6 h-6" />}
                      {badge.icon === 'truck' && <Truck className="w-6 h-6" />}
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">0{idx + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
                      {badge.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {badge.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GLS PHARMACEUTICALS BRAND & PRICE SECTION (Dedicated to GLS) */}
        <section id="brands" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 mb-3">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>OFFICIAL B2B CATALOGUE</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
              {t.brandSectionTitle}
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              {t.brandSectionSubtitle}
            </p>
          </div>

          {/* Showcase Card for GLS Pharmaceuticals */}
          <div className="max-w-4xl mx-auto rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30">
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {t.glsTag}
                  </span>
                  <span className="text-xs font-bold text-slate-500">Производство: Россия • Стандарты GMP/ISO</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  {t.glsTitle}
                </h3>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  {t.glsDesc}
                </p>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {lang === 'ru' ? 'Топ продаж в аптеках:' : 'Top Pharmacy Best-Sellers:'}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-800 font-semibold">
                    D3 2000/5000 ME • Омега-3 35% и 70% • Магний B6 • Цинк Хелат • Морской Коллаген • Селен • Железо
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
                <a
                  href="/api/b2b/export-price"
                  download
                  className="px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-center"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.downloadPriceBtn}</span>
                </a>

                <button
                  onClick={() => handleOpenB2B('register')}
                  className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all text-center"
                >
                  <Store className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'ru' ? 'Открыть Matrix-бланк заказа' : 'Open Matrix Bulk Order'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ADVANTAGES SECTION (Clean, Solid, No fake email boxes) */}
        <section id="advantages" className="py-20 border-y border-slate-200/80 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
                {t.advantagesTitle}
              </h2>
              <p className="text-slate-600 text-sm sm:text-base">
                {t.advantagesSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {t.advantages.map((adv, idx) => (
                <div 
                  key={idx}
                  className="p-6 rounded-2xl bg-slate-50 border border-slate-200/90 hover:border-emerald-300 hover:bg-white hover:shadow-lg transition-all duration-300"
                >
                  <span className="text-2xl font-black text-emerald-600 block mb-3">{adv.num}</span>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {adv.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {adv.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* REVIEWS FROM REAL PHARMACIES */}
        <section id="reviews" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 mb-3">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>VERIFIED REVIEWS</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
              {t.reviewsTitle}
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              {t.reviewsSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.reviews.map((rev, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {rev.city}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-6 italic">
                    «{rev.text}»
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs">
                    {rev.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{rev.name}</h4>
                    <p className="text-[11px] text-emerald-700 font-semibold">
                      {lang === 'ru' ? 'Аптека-партнер' : 'Partner Pharmacy'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ SECTION (Min Order 1000 TJS & Individual Deferred Payment) */}
        <section id="faq" className="py-20 border-t border-slate-200/80 bg-slate-100/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 mb-3 shadow-sm">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>FAQ</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
                {t.faqTitle}
              </h2>
              <p className="text-slate-600 text-sm sm:text-base">
                {t.faqSubtitle}
              </p>
            </div>

            <div className="space-y-4">
              {t.faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-emerald-700 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown className={`w-5 h-5 text-emerald-600 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                        <div dangerouslySetInnerHTML={{ 
                          __html: faq.a.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-700 font-bold">$1</strong>') 
                        }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-10 md:p-16 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                {lang === 'ru' 
                  ? 'Подключите вашу аптеку к прямым поставкам GLS' 
                  : 'Connect your pharmacy to direct GLS fulfillment'}
              </h2>
              <p className="text-sm sm:text-base text-emerald-100 leading-relaxed">
                {lang === 'ru'
                  ? 'Пройдите быструю регистрацию для открытия доступа к оптовым ценам, бланку быстрого заказа и истории поставок.'
                  : 'Register your pharmacy now to unlock wholesale pricing, Matrix Bulk Order desks, and continuous inventory fulfillment.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => handleOpenB2B('register')}
                  className="px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-950 font-black text-sm sm:text-base shadow-lg active:scale-95 transition-all"
                >
                  {t.heroBtnRegister}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              TV
            </div>
            <div>
              <p className="font-bold text-slate-800">TOJ-VITAMIN DISTRIBUTION</p>
              <p className="text-[11px] text-slate-500">Республика Таджикистан, г. Душанбе</p>
            </div>
          </div>

          <div className="text-center md:text-right space-y-1">
            <p>© {new Date().getFullYear()} TOJ-VITAMIN DISTRIBUTION. {t.footerRights}</p>
            <p className="text-[11px] text-slate-400">Официальный дистрибьютор продукции GLS Pharmaceuticals</p>
          </div>
        </div>
      </footer>

      {/* MODAL: REGISTRATION FIRST / LOGIN (Hardcoded +992) */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 text-slate-900"
            >
              {/* Close button */}
              <button 
                onClick={() => {
                  setModalOpen(false);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Mode Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all ${authMode === 'register' ? 'bg-white text-emerald-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {lang === 'ru' ? 'Регистрация аптеки' : 'New Registration'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all ${authMode === 'login' ? 'bg-white text-emerald-800 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {lang === 'ru' ? 'Вход по номеру' : 'Sign In'}
                </button>
              </div>

              {/* Modal Header */}
              <div className="mb-5">
                <h3 className="text-xl font-black text-slate-900 mb-1">
                  {authMode === 'register' ? t.modalRegTitle : t.modalLoginTitle}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {authMode === 'register' ? t.modalRegSubtitle : t.modalLoginSubtitle}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {authMode === 'register' && (
                  <>
                    {/* Pharmacy Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.modalFieldPharmName} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t.modalPlaceholderPharmName}
                        value={pharmacyName}
                        onChange={(e) => setPharmacyName(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-slate-900 text-sm font-medium focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.modalFieldCity}
                      </label>
                      <input
                        type="text"
                        placeholder={t.modalPlaceholderCity}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-slate-900 text-sm font-medium focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    {/* Contact Person */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.modalFieldContact}
                      </label>
                      <input
                        type="text"
                        placeholder={t.modalPlaceholderContact}
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-slate-900 text-sm font-medium focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </>
                )}

                {/* Phone with hardcoded +992 */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.modalFieldPhone} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all overflow-hidden">
                    <div className="px-3.5 py-2.5 bg-slate-100 text-slate-900 font-bold text-sm select-none border-r border-slate-200 flex items-center gap-1.5 shrink-0">
                      <span>🇹🇯</span>
                      <span>+992</span>
                    </div>
                    <input
                      type="tel"
                      required
                      placeholder="900 12 3456"
                      value={phoneDigits}
                      onChange={handlePhoneChange}
                      className="w-full bg-transparent px-3 py-2.5 text-slate-900 text-sm font-semibold tracking-wider placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t.modalPhoneNote}
                  </p>
                </div>

                {/* Error message */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Success message */}
                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <span>Подождите...</span>
                  ) : authMode === 'register' ? (
                    <span>{t.modalBtnRegister}</span>
                  ) : (
                    <span>{t.modalBtnLogin}</span>
                  )}
                </button>
              </form>

              {/* Mode switch link */}
              <div className="mt-5 pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'register' ? 'login' : 'register');
                    setErrorMsg('');
                  }}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors"
                >
                  {authMode === 'register' ? t.modalSwitchToLogin : t.modalSwitchToReg}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
