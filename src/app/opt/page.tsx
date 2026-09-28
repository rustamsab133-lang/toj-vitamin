"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, ShieldCheck, Truck,
  HelpCircle, ChevronDown, Star, ArrowRight, X,
  Warehouse, Store, Sparkles, CheckCircle2, AlertCircle,
  MessageCircle, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Lang = 'ru' | 'en';

const CONTENT = {
  ru: {
    brandName: 'TOJ-VITAMIN',
    brandTagline: 'DISTRIBUTION',
    navAbout: 'О центре',
    navBrands: 'Ассортимент GLS',
    navAdvantages: 'Преимущества',
    navReviews: 'Отзывы',
    navFaq: 'Вопросы и ответы',
    navPartnerBtn: 'Стать партнером',

    heroChip: 'Официальный дистрибьютор GLS Pharmaceuticals в Таджикистане',
    heroTitle: 'Прямые оптовые поставки витаминов и БАД GLS в аптечные сети Таджикистана',
    heroSubtitle: 'Дистрибьюторский центр TOJ-VITAMIN (холдинг ООО «Саховати Истаравшан») — надежный национальный поставщик фармацевтического ритейла. Прямые поставки с завода, свежие сроки годности, собственные климатические склады GDP/GSP и оперативная доставка по всей республике.',
    heroBtnPartner: 'Стать партнером',

    trustBadges: [
      {
        icon: 'building',
        title: '700+ аптек-партнеров',
        desc: 'Регулярное снабжение аптечных сетей в Душанбе, Согде, Хатлоне и РРП.'
      },
      {
        icon: 'shield',
        title: '100% официальная продукция',
        desc: 'Сертификаты соответствия Службы надзора за фармацевтической деятельностью Минздрава Республики Таджикистан.'
      },
      {
        icon: 'warehouse',
        title: 'Склады стандартов GDP/GSP',
        desc: 'Собственные климатические складские комплексы в Худжанде и Душанбе с постоянным термоконтролем (15–25°C).'
      },
      {
        icon: 'truck',
        title: 'Экспресс-логистика по РТ',
        desc: 'Доставка день-в-день по Душанбе и Худжанду, до 24 часов в регионы Республики Таджикистан.'
      }
    ],

    brandSectionTitle: 'Официальный ассортимент GLS Pharmaceuticals',
    brandSectionSubtitle: 'Сертифицированная линейка инновационных витаминов и нутрицевтиков с подтвержденной эффективностью',
    glsTitle: 'GLS Pharmaceuticals — Премиальное качество и доказанный спрос',
    glsDesc: 'Один из самых востребованных брендов витаминов и БАД в аптеках Таджикистана. Более 80 сертифицированных позиций: Витамин D3, Омега-3 высокой концентрации, Магний B6, Цинк Хелат, Морской Коллаген, детские комплексы и специализированные добавки.',
    glsTag: 'Официальный контракт',
    glsBestSellersTitle: 'Топ продаж в партнерских аптеках:',
    glsBestSellers: 'D3 2000/5000 ME • Омега-3 35% и 70% • Магний B6 • Цинк Хелат • Морской Коллаген • Селен • Железо Хелат',
    brandCtaBtn: 'Стать партнером и получить оптовые условия',
    brandCtaNotice: 'Оптовые прайс-листы и специальные коммерческие условия предоставляются сертифицированным аптекам и медицинским центрам по запросу.',

    advantagesTitle: 'Почему аптечные сети выбирают TOJ-VITAMIN',
    advantagesSubtitle: 'Обеспечиваем аптекам высокую рентабельность, бесперебойную доступность товара на полках и безупречную юридическую чистоту',
    advantages: [
      {
        num: '01',
        title: 'Прямые цены от завода GLS',
        desc: 'Работа без посредников дает аптекам максимальную торговую наценку и высокую доходность с каждой проданной упаковки.'
      },
      {
        num: '02',
        title: 'Постоянный неснижаемый остаток на складах',
        desc: 'Никаких перебоев и задержек. Топовые сезонные позиции (D3, Омега, Цинк, Магний) всегда есть в наличии на складах в Душанбе и Худжанде.'
      },
      {
        num: '03',
        title: 'Полный комплект документов к каждой партии',
        desc: 'К каждой поставке прилагаются официальные сертификаты соответствия МЗСЗН РТ, накладные и электронные счета-фактуры. 100% готовность к любым проверкам.'
      },
      {
        num: '04',
        title: 'Персональный менеджер и быстрая обработка',
        desc: 'Индивидуальное сопровождение, помощь в формировании оптимальной аптечной матрицы и оперативное оформление отгрузок.'
      }
    ],

    reviewsTitle: 'Отзывы аптек-партнеров',
    reviewsSubtitle: 'Более 700 аптек доверяют TojVitamin регулярное снабжение полок продукцией GLS',
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
        text: 'Отличный сервис и внимательное отношение к аптекам. Заявки обрабатываются моментально, накладные соответствуют всем требованиям.',
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
    faqSubtitle: 'Условия оптового сотрудничества, поставки и расчеты с дистрибьюторским центром TojVitamin',
    faqs: [
      {
        q: 'Какова минимальная сумма оптового заказа?',
        a: 'Минимальная сумма оптового заказа составляет **1 000 сомони**. Это позволяет аптекам любого масштаба комфортно формировать закупки без избыточного давления на оборотный капитал.'
      },
      {
        q: 'Предоставляете ли вы сертификаты качества и регистрационные документы?',
        a: 'Да, на каждую партию товара предоставляется полный комплект официальных документов: сертификаты соответствия Службы государственного надзора за фармацевтической деятельностью Республики Таджикистан, паспорта завода GLS, товарно-транспортные накладные и счета-фактуры.'
      },
      {
        q: 'Как получить актуальный оптовый прайс-лист?',
        a: 'В целях защиты коммерческих интересов наших партнеров-аптек оптовые цены не публикуются в открытом доступе. Нажмите кнопку **«Стать партнером»** на этой странице и оставьте краткую анкету, либо напишите нам в WhatsApp. Наш менеджер оптового отдела свяжется с вами и предоставит персонализированный оптовый прайс-лист в сомони (TJS).'
      },
      {
        q: 'Как быстро осуществляется доставка по городам и регионам?',
        a: 'По Душанбе и Худжанду доставка осуществляется **день-в-день** при согласовании заявки до 14:00. В регионы РТ (Бохтар, Куляб, Истаравшан, Исфара, Канибадам, Турсунзаде и др.) доставка занимает **до 24 часов** специализированным транспортом холдинга.'
      },
      {
        q: 'Есть ли у вас отсрочка платежа для аптек?',
        a: 'Да, условия отсрочки платежа **обсуждаются индивидуально** с постоянными надежными партнерами после успешного выполнения первых заказов и согласования кредитного лимита.'
      },
      {
        q: 'Какие температурные условия соблюдаются при хранении и доставке?',
        a: 'Холдинг располагает современными складскими комплексами стандартов **GDP/GSP** в Худжанде и Душанбе с непрерывным контролем температуры (15–25°C) и влажности. Транспортировка осуществляется с соблюдением всех нормативов холодовой и климатической цепи.'
      },
      {
        q: 'Какие формы оплаты доступны?',
        a: 'Мы работаем полностью официально: безналичный расчет на банковский расчетный счет с предоставлением всех бухгалтерских документов (счета-фактуры, акты, накладные), а также иные согласованные формы расчетов в национальной валюте (сомони).'
      },
      {
        q: 'Каков остаточный срок годности поставляемых витаминов?',
        a: 'Вся продукция поступает напрямую с завода свежими партиями. Остаточный срок годности на момент отгрузки составляет **от 75% до 100%** (как правило, 1,5–3 года), что гарантирует спокойную реализацию в аптечной рознице.'
      },
      {
        q: 'Предоставляете ли вы маркетинговые материалы и консультации провизоров?',
        a: 'Да. Мы снабжаем аптеки фирменными POS-материалами (подставки, рекламные буклеты, каталоги для покупателей), а наши медицинские представители проводят презентации и консультации фармацевтов по особенностям состава и преимуществам линейки GLS.'
      },
      {
        q: 'Что делать при обнаружении повреждения упаковки или брака при приемке?',
        a: 'При приеме товара составляется стандартный акт. В случае обнаружения дефекта упаковки или боя мы производим **100% замену позиции за наш счет** со следующей доставкой либо производим мгновенную корректировку накладной.'
      }
    ],

    bottomCtaTitle: 'Подключите вашу аптеку к прямым поставкам GLS',
    bottomCtaSubtitle: 'Заполните простую анкету партнера для получения оптовых цен, персонального прайс-листа и закрепления персонального менеджера.',
    bottomCtaBtn: 'Стать партнером',

    modalTitle: 'Анкета оптового партнера',
    modalSubtitle: 'Заполните краткую информацию о вашей аптеке или клинике. Наш менеджер оптового отдела свяжется с вами и предоставит персональные коммерческие условия и каталог.',
    modalFieldPharmName: 'Название аптеки или сети:',
    modalPlaceholderPharmName: 'Например, Аптека «Саломат» или Сеть «Шифо»',
    modalFieldCity: 'Город / Регион:',
    modalPlaceholderCity: 'Душанбе, Худжанд, Бохтар, Куляб, Истаравшан...',
    modalFieldContact: 'Контактное лицо (провизор / управляющий):',
    modalPlaceholderContact: 'ФИО контактного лица',
    modalFieldPhone: 'Номер телефона (WhatsApp):',
    modalPhoneNote: 'Введите 9 цифр номера без кода страны (например, 900 12 3456)',
    modalFieldComment: 'Комментарий или интересующие позиции (необязательно):',
    modalPlaceholderComment: 'Укажите количество точек, потребность или пожелания...',
    modalBtnSubmit: 'Отправить анкету',
    modalSuccessTitle: 'Анкета успешно принята!',
    modalSuccessDesc: 'Благодарим за интерес к сотрудничеству! Наш менеджер по работе с аптеками свяжется с вами в течение рабочего дня с индивидуальным предложением и каталогом.',
    modalDirectWhatsApp: 'Написать напрямую в WhatsApp',
    modalClose: 'Закрыть',

    footerRights: 'Все права защищены. Официальная дистрибьюция сертифицированной фармацевтической продукции и БАД в Республике Таджикистан.'
  },
  en: {
    brandName: 'TOJ-VITAMIN',
    brandTagline: 'DISTRIBUTION',
    navAbout: 'About Hub',
    navBrands: 'GLS Portfolio',
    navAdvantages: 'Advantages',
    navReviews: 'Reviews',
    navFaq: 'FAQ',
    navPartnerBtn: 'Become a Partner',

    heroChip: 'Official GLS Pharmaceuticals Distributor in Tajikistan',
    heroTitle: 'Direct Wholesale Supply of GLS Vitamins & Supplements to Tajikistan Pharmacies',
    heroSubtitle: 'TOJ-VITAMIN Distribution Hub (part of LLC Sakhovati Istaravshan holding) is the leading national wholesale supplier for licensed retail pharmacies. Direct factory contracts, verified batch freshness, GDP/GSP climate warehouses, and express delivery nationwide.',
    heroBtnPartner: 'Become a Partner',

    trustBadges: [
      {
        icon: 'building',
        title: '700+ Partner Pharmacies',
        desc: 'Consistent wholesale fulfillment for pharmacy chains across Dushanbe, Sughd, Khatlon, and RRP.'
      },
      {
        icon: 'shield',
        title: '100% Certified Authentic',
        desc: 'Official Certificates of Conformity from the Ministry of Health and Social Protection of Tajikistan.'
      },
      {
        icon: 'warehouse',
        title: 'GDP/GSP Climate Storage',
        desc: 'Dedicated warehouse complexes in Khujand and Dushanbe with strict 15–25°C thermal and humidity monitoring.'
      },
      {
        icon: 'truck',
        title: 'Express Nationwide Logistics',
        desc: 'Same-day delivery in Dushanbe and Khujand, under 24 hours across all provinces of Tajikistan.'
      }
    ],

    brandSectionTitle: 'Official GLS Pharmaceuticals Portfolio',
    brandSectionSubtitle: 'Certified line of innovative vitamins and premium nutraceuticals with proven market demand',
    glsTitle: 'GLS Pharmaceuticals — Premium Quality & High Retail Margin',
    glsDesc: 'A top-selling dietary supplement brand across Central Asia. Over 80 certified SKUs including Vitamin D3, high-potency Omega-3, Magnesium B6, Zinc Glycinate, Marine Collagen, and pediatric formulas.',
    glsTag: 'Official Master Contract',
    glsBestSellersTitle: 'Top Pharmacy Best-Sellers:',
    glsBestSellers: 'D3 2000/5000 IU • Omega-3 35% & 70% • Magnesium B6 • Zinc Chelate • Marine Collagen • Selenium • Iron Chelate',
    brandCtaBtn: 'Become a Partner & Request Wholesale Rates',
    brandCtaNotice: 'Wholesale price lists and commercial agreements are provided to licensed pharmacies and clinics upon request.',

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
        title: 'Permanent Stock in Dushanbe & Khujand',
        desc: 'Zero fulfillment delays. High-velocity seasonal essentials (D3, Omega, Zinc, Magnesium) are always in stock.'
      },
      {
        num: '03',
        title: 'Full Regulatory Documentation',
        desc: 'Every dispatch is accompanied by official MoH Tajikistan conformity certificates, invoices, and lab release records.'
      },
      {
        num: '04',
        title: 'Dedicated Account Manager',
        desc: 'Personalized support, assortment recommendations, and swift replenishment processing.'
      }
    ],

    reviewsTitle: 'Partner Pharmacy Testimonials',
    reviewsSubtitle: 'Over 700 pharmacies rely on TojVitamin Distribution for regular GLS inventory supply',
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
        text: 'Exceptional service and supportive account managers. Order processing and official documentation are always prompt.',
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
    faqSubtitle: 'Commercial partnership guidelines, order fulfillment, and logistics with TojVitamin',
    faqs: [
      {
        q: 'What is the minimum wholesale order amount?',
        a: 'The minimum wholesale order amount is **1,000 TJS**. This allows pharmacies of any scale to replenish stock smoothly without tying up excess capital.'
      },
      {
        q: 'Do you provide authentic quality certificates?',
        a: 'Yes, every dispatch includes complete regulatory documentation: Certificates of Conformity from the Ministry of Health of Tajikistan, factory batch release sheets, and invoices.'
      },
      {
        q: 'How can I obtain the current wholesale price list?',
        a: 'To safeguard our retail pharmacy partners commercial interests, wholesale pricing is not published openly. Click **«Become a Partner»** on this page to submit a brief inquiry or contact us via WhatsApp to receive the complete price sheet in TJS.'
      },
      {
        q: 'What is the delivery turnaround time across Tajikistan?',
        a: 'Same-day delivery in Dushanbe and Khujand for orders confirmed by 2:00 PM. Regional delivery across Tajikistan takes **under 24 hours** via dedicated fleet.'
      },
      {
        q: 'Are deferred payment terms available?',
        a: 'Credit and deferred payment terms are **discussed individually** with verified recurring partners following initial deliveries and credit evaluation.'
      },
      {
        q: 'What storage conditions are maintained?',
        a: 'We operate modern **GDP/GSP compliant** warehouses in Khujand and Dushanbe featuring 24/7 climate and humidity control (15–25°C).'
      },
      {
        q: 'What payment methods are accepted?',
        a: 'All transactions are conducted legally via official bank wire transfer with full accounting records (invoices, acceptance certificates) in Tajik Somoni (TJS).'
      },
      {
        q: 'What is the shelf life of dispatched products?',
        a: 'Shipments come directly from the manufacturer with **75% to 100%** remaining shelf life (typically 1.5 to 3 years).'
      },
      {
        q: 'Do you provide marketing and pharmacist training materials?',
        a: 'Yes, we supply partner pharmacies with branded POS displays, product leaflets, and consumer guides, alongside medical representative training sessions.'
      },
      {
        q: 'What happens if a damaged box is detected during handover?',
        a: 'A standard receipt inspection act is signed upon arrival. Any defective item is **replaced 100% at our expense** or instantly credited.'
      }
    ],

    bottomCtaTitle: 'Connect your pharmacy to direct GLS fulfillment',
    bottomCtaSubtitle: 'Submit a simple partner application to receive wholesale rates, personalized catalog, and dedicated manager assistance.',
    bottomCtaBtn: 'Become a Partner',

    modalTitle: 'Partner Application Form',
    modalSubtitle: 'Please provide brief details about your pharmacy or healthcare organization. Our wholesale division will reach out promptly with tailored terms and pricing.',
    modalFieldPharmName: 'Pharmacy / Healthcare Entity Name:',
    modalPlaceholderPharmName: 'e.g. Salomat Pharmacy or Shifo Chain',
    modalFieldCity: 'City / Region:',
    modalPlaceholderCity: 'Dushanbe, Khujand, Bokhtar, Kulob, Istaravshan...',
    modalFieldContact: 'Contact Person (Pharmacist / Director):',
    modalPlaceholderContact: 'Full name of contact person',
    modalFieldPhone: 'Phone Number (WhatsApp):',
    modalPhoneNote: 'Enter 9 digits without country code (e.g. 900 12 3456)',
    modalFieldComment: 'Additional notes or requirements (optional):',
    modalPlaceholderComment: 'Number of locations, requested items, or questions...',
    modalBtnSubmit: 'Submit Application',
    modalSuccessTitle: 'Application Successfully Received!',
    modalSuccessDesc: 'Thank you for your interest in partnering with TojVitamin. Our regional wholesale representative will contact you within business hours.',
    modalDirectWhatsApp: 'Message Directly on WhatsApp',
    modalClose: 'Close',

    footerRights: 'All rights reserved. Official distribution of certified pharmaceuticals and dietary supplements in the Republic of Tajikistan.'
  }
};

export default function OptDistributionPage() {
  const [lang, setLang] = useState<Lang>('ru');
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form fields
  const [pharmacyName, setPharmacyName] = useState('');
  const [city, setCity] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [comment, setComment] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const t = CONTENT[lang];

  const handleOpenPartnerModal = () => {
    setErrorMsg('');
    setIsSubmitted(false);
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

    if (!pharmacyName.trim()) {
      setErrorMsg(lang === 'ru' ? 'Укажите название вашей аптеки' : 'Please provide pharmacy name');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const fullPhone = `+992${phoneDigits}`;
    const fullAddress = comment.trim() 
      ? `${city.trim()} [Инфо: ${comment.trim()}]`
      : city.trim();

    try {
      const res = await fetch('/api/b2b/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fullPhone,
          name: pharmacyName.trim(),
          contact_person: contactPerson.trim() || undefined,
          address: fullAddress || undefined
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || (lang === 'ru' ? 'Ошибка отправки заявки' : 'Submission failed'));
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'ru' ? 'Ошибка связи с сервером' : 'Server communication error'));
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

          {/* Right actions: Lang switcher + Single 'Стать партнером' button */}
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

            {/* ONLY ONE BUTTON: 'Стать партнером' */}
            <button
              onClick={handleOpenPartnerModal}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Store className="w-4 h-4" />
              <span>{t.navPartnerBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10">
        {/* HERO SECTION */}
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

          {/* Action button: ONLY ONE CTA 'Стать партнером' */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center max-w-md mx-auto"
          >
            <button
              onClick={handleOpenPartnerModal}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/25 active:scale-[0.98] transition-all"
            >
              <Store className="w-5 h-5" />
              <span>{t.heroBtnPartner}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </section>

        {/* TRUST BADGES SECTION (700+ аптек-партнеров) */}
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

        {/* GLS PHARMACEUTICALS BRAND SECTION (No public price download, only 'Стать партнером') */}
        <section id="brands" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 mb-3">
              <Warehouse className="w-3.5 h-3.5 text-emerald-600" />
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
                    {t.glsBestSellersTitle}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-800 font-semibold">
                    {t.glsBestSellers}
                  </span>
                </div>
              </div>

              {/* Single CTA: 'Стать партнером и запросить оптовый прайс' */}
              <div className="flex flex-col gap-3 w-full md:w-auto shrink-0 max-w-xs text-center">
                <button
                  onClick={handleOpenPartnerModal}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-center"
                >
                  <Store className="w-5 h-5" />
                  <span>{t.brandCtaBtn}</span>
                </button>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {t.brandCtaNotice}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ADVANTAGES SECTION */}
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

        {/* REVIEWS FROM REAL PHARMACIES (700+ аптек) */}
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

        {/* EXPANDED FAQ SECTION (10 In-Depth Questions) */}
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
                      <span className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-xs flex items-center justify-center font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <span>{faq.q}</span>
                      </span>
                      <ChevronDown className={`w-5 h-5 text-emerald-600 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 ml-9">
                        <div dangerouslySetInnerHTML={{ 
                          __html: faq.a.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-800 font-bold">$1</strong>') 
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
                {t.bottomCtaTitle}
              </h2>
              <p className="text-sm sm:text-base text-emerald-100 leading-relaxed">
                {t.bottomCtaSubtitle}
              </p>
              <div className="pt-2">
                <button
                  onClick={handleOpenPartnerModal}
                  className="px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-950 font-black text-sm sm:text-base shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2.5 mx-auto"
                >
                  <Store className="w-5 h-5 text-emerald-600" />
                  <span>{t.bottomCtaBtn}</span>
                  <ArrowRight className="w-4 h-4 text-slate-900" />
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
              <p className="font-bold text-slate-800">TOJ-VITAMIN DISTRIBUTION / ООО «Саховати Истаравшан»</p>
              <p className="text-[11px] text-slate-500">Республика Таджикистан, г. Худжанд | г. Душанбе</p>
            </div>
          </div>

          <div className="text-center md:text-right space-y-1">
            <p>© {new Date().getFullYear()} TOJ-VITAMIN DISTRIBUTION. {t.footerRights}</p>
            <p className="text-[11px] text-slate-400">Официальный дистрибьютор продукции GLS Pharmaceuticals в Таджикистане</p>
          </div>
        </div>
      </footer>

      {/* MODAL: SIMPLE PARTNER QUESTIONNAIRE (АНКЕТА СТАТЬ ПАРТНЕРОМ) */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 text-slate-900 max-h-[90vh] overflow-y-auto"
            >
              {/* Close button */}
              <button 
                onClick={() => {
                  setModalOpen(false);
                  setErrorMsg('');
                  setIsSubmitted(false);
                }}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {isSubmitted ? (
                /* SUCCESS STATE */
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">
                    {t.modalSuccessTitle}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                    {t.modalSuccessDesc}
                  </p>

                  <div className="pt-4 flex flex-col gap-3 max-w-xs mx-auto">
                    <a
                      href="https://wa.me/992176660707"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>{t.modalDirectWhatsApp}</span>
                    </a>
                    <button
                      onClick={() => {
                        setModalOpen(false);
                        setIsSubmitted(false);
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-all"
                    >
                      {t.modalClose}
                    </button>
                  </div>
                </div>
              ) : (
                /* QUESTIONNAIRE FORM */
                <div>
                  {/* Modal Header */}
                  <div className="mb-6 pr-6">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold mb-2">
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      <span>B2B PARTNERSHIP</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {t.modalTitle}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                      {t.modalSubtitle}
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                        {t.modalFieldCity} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t.modalPlaceholderCity}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-slate-900 text-sm font-medium focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    {/* Contact Person */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.modalFieldContact} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t.modalPlaceholderContact}
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-slate-900 text-sm font-medium focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    {/* Phone with hardcoded +992 */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.modalFieldPhone} <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center rounded-xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all overflow-hidden">
                        <div className="px-3 py-2.5 bg-slate-100 text-slate-900 font-bold text-sm select-none border-r border-slate-200 flex items-center gap-1.5 shrink-0">
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

                    {/* Comment (Optional) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.modalFieldComment}
                      </label>
                      <textarea
                        rows={2}
                        placeholder={t.modalPlaceholderComment}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-slate-900 text-sm font-medium focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                      />
                    </div>

                    {/* Error message */}
                    {errorMsg && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
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
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>{t.modalBtnSubmit}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
