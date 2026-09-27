"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Building2, ShieldCheck, Truck, Warehouse, Globe, 
  CheckCircle2, ArrowRight, Phone, Mail, MapPin, 
  ExternalLink, FileText, Award, Users, ChevronRight,
  TrendingUp, Layers, Check, ArrowUpRight, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Lang = 'en' | 'ru' | 'tj';

const CONTENT = {
  en: {
    metaTitle: "National Pharmaceutical & Dietary Supplements Distribution | Toj-Vitamin (LLC Sakhovati Istaravshan)",
    metaDesc: "Specialized dietary supplements division of pharmaceutical holding LLC 'Sakhovati Istaravshan' (est. 2003). Official GDP-compliant warehousing, logistics, and distribution across Tajikistan.",
    badge: "Official National Distributor in the Republic of Tajikistan",
    heroTitle: "National Pharmaceutical & Dietary Supplements Distribution",
    heroSubtitle: "A specialized division and digital ecosystem of the licensed pharmaceutical holding LLC 'Sakhovati Istaravshan' (operating since 2003). Direct supply to 500+ pharmacies, healthcare facilities, and consumers nationwide.",
    ctaB2B: "For Pharmacies & B2B Partners",
    ctaCatalog: "Explore Product Catalog",
    ctaContact: "Contact Distribution Desk",

    langLabel: "Language",

    // Section 1: Facts & Infrastructure
    infraTag: "SCALE & OPERATIONAL CAPABILITY",
    infraTitle: "Pharmaceutical Infrastructure & Logistics (GDP / GSP)",
    infraDesc: "We provide global manufacturers with transparent, fully licensed, and audit-ready supply chain operations across the Republic of Tajikistan.",
    
    stats: [
      { number: "20+", label: "Years on Market", sub: "Established in 2003" },
      { number: "500+", label: "Partner Pharmacies", sub: "Nationwide retail reach" },
      { number: "2", label: "GDP Warehouses", sub: "Khujand & Dushanbe" },
      { number: "100%", label: "Batch Inspection", sub: "Strict climate control" }
    ],

    infraPillars: [
      {
        icon: Warehouse,
        title: "Licensed GDP/GSP Warehousing",
        desc: "Equipped pharmaceutical warehouse complexes in Khujand and Dushanbe featuring 24/7 temperature (15–25°C) and humidity data-logging, certified for sensitive nutraceutical storage."
      },
      {
        icon: Truck,
        title: "Dedicated Logistics Fleet",
        desc: "In-house temperature-controlled vehicle fleet ensuring scheduled delivery routes across Dushanbe, Sughd region, Khatlon region, and Regions of Republican Subordination (RRP)."
      },
      {
        icon: Users,
        title: "Specialized Field Team",
        desc: "Over 50 experienced medical representatives, licensed pharmacists, and account managers conducting ongoing product education and pharmacy merchandising."
      },
      {
        icon: ShieldCheck,
        title: "Comprehensive Quality Control",
        desc: "Zero tolerance for counterfeits: 100% inbound batch verification, inspection of analytical certificates, and compliance with the Ministry of Health of Tajikistan."
      }
    ],

    // Section 2: Holding Ecosystem
    ecosystemTag: "SYNERGY & OMNICHANNEL PRESENCE",
    ecosystemTitle: "Integrated Holding Ecosystem",
    ecosystemDesc: "Combining wholesale reach, brick-and-mortar retail presence, and proprietary digital healthcare technology.",
    
    ecosystemItems: [
      {
        name: "Sakhovati Istaravshan LLC",
        role: "Parent Pharmaceutical Holding",
        period: "Since 2003",
        desc: "Licensed national pharmaceutical importer and distributor supplying medicines, medical equipment, and health products across Tajikistan for over two decades.",
        linkText: "Parent Entity",
        badge: "Holding HQ"
      },
      {
        name: "Sakhovat Apteka",
        role: "Retail Pharmacy Chain",
        period: "Retail Network",
        desc: "Modern chain of neighborhood pharmacies providing patient consultations, certified drug dispensing, and prime shelf placement for partner brands.",
        url: "https://sakhovatapteka.tj",
        linkText: "Visit sakhovatapteka.tj",
        badge: "Brick & Mortar"
      },
      {
        name: "ASLPHARM",
        role: "Digital Pharmaceutical Platform",
        period: "Tech Ecosystem",
        desc: "Proprietary digital mobile and web application connecting patients with pharmaceutical availability, transparent pricing, and instant drug reservations.",
        url: "https://aslpharm.tj",
        linkText: "Visit aslpharm.tj",
        badge: "Digital App"
      },
      {
        name: "TOJ-VITAMIN",
        role: "Vitamins & D2C Marketplace",
        period: "Digital Flagship",
        desc: "E-commerce storefront and B2B ordering portal providing direct-to-consumer educational marketing, algorithmic health quizzes, and brand visibility.",
        url: "https://www.toj-vitamin.tj",
        linkText: "Current Platform",
        badge: "E-Commerce"
      }
    ],

    // Section 3: For Global Brands & Manufacturers (NOW Foods compliance)
    partnerTag: "INTERNATIONAL COMPLIANCE & EXPANSION",
    partnerTitle: "Full-Cycle Services for Global Brands & Manufacturers",
    partnerSubtitle: "Tailored to international compliance standards. We act as your reliable authorized importer, regulatory sponsor, and national brand builder in Tajikistan.",
    
    partnerServices: [
      {
        title: "State Registration & Regulatory Compliance",
        desc: "Full legal sponsorship and dossier submission for dietary supplements registration, notification, and state certification with the State Service for Pharmaceutical Surveillance under the Ministry of Health of Tajikistan."
      },
      {
        title: "Turnkey Customs Clearance & Foreign Trade (FEA)",
        desc: "Direct official importation under international contracts, compliant customs declaration, tariff classification, bank compliance, and complete legal chain of custody."
      },
      {
        title: "Product Localization & Labeling Compliance",
        desc: "Design and application of compliant consumer stickers and package inserts in Tajik and Russian languages adhering to national consumer protection and labeling legislation."
      },
      {
        title: "Multi-Channel Marketing & Pharmacy Placement",
        desc: "Medical representative visits, training webinars for pharmacists, prime shelf positioning across 500+ pharmacies, targeted digital marketing, and influencer partnerships."
      }
    ],

    authTitle: "100% Genuine & Certified Guarantee",
    authDesc: "We never compromise on product integrity. Every unit in our portfolio has an unbroken chain of custody directly from the manufacturer to the customer.",

    // Section 5: Legal Information & Contacts
    contactTitle: "Official Corporate Credentials & Contacts",
    contactSubtitle: "For foreign audit inquiries, vendor onboarding, or B2B contracts, contact our executive team directly.",
    legalEntityLabel: "Legal Entity",
    legalEntityVal: "LLC 'Sakhovati Istaravshan' (ООО «Саховати Истаравшан»)",
    hqAddressLabel: "Headquarters & Central Hub",
    hqAddressVal: "63/3 K. Khujandi Street, Khujand, Sughd Region, Republic of Tajikistan, 735700",
    dushanbeHubLabel: "Dushanbe Distribution Hub",
    dushanbeHubVal: "Dushanbe Logistics Center, Republic of Tajikistan",
    emailLabel: "Corporate Email (Executive & Compliance)",
    phoneLabel: "Distribution & B2B Phone",
    licenseLabel: "Pharmaceutical License",
    licenseVal: "State License for Pharmaceutical Activity No. 0001859 (issued by the Ministry of Health of RT)",
    whatsappBtn: "Chat via WhatsApp",
    callBtn: "Call Reception",
    backHome: "Back to Home",
    b2bPortalBtn: "Open B2B Ordering Portal"
  },

  ru: {
    metaTitle: "Национальная дистрибуция фармацевтической продукции и БАД | Toj-Vitamin (ООО «Саховати Истаравшан»)",
    metaDesc: "Специализированное подразделение фармацевтического холдинга ООО «Саховати Истаравшан» (с 2003 г.). Собственные склады GDP/GSP, лицензированная логистика и прямые поставки по Таджикистану.",
    badge: "Официальный национальный дистрибьютор в Республике Таджикистан",
    heroTitle: "Официальная дистрибуция сертифицированных витаминов, БАД и товаров для здоровья",
    heroSubtitle: "Специализированное подразделение и цифровая платформа фармацевтического холдинга ООО «Саховати Истаравшан» (на рынке с 2003 года). Прямые поставки в аптечные сети, медицинские учреждения и розничным клиентам по всей стране.",
    ctaB2B: "Для аптек и оптовых партнеров (B2B)",
    ctaCatalog: "Каталог продукции",
    ctaContact: "Связаться с отделом дистрибуции",

    langLabel: "Язык",

    infraTag: "МАСШТАБ И ОПЕРАЦИОННАЯ БАЗА",
    infraTitle: "Фармацевтическая инфраструктура и логистика (GDP / GSP)",
    infraDesc: "Мы предоставляем международным производителям прозрачные, полностью лицензированные и готовые к международному аудиту цепочки поставок по всему Таджикистану.",

    stats: [
      { number: "20+ лет", label: "На рынке РТ", sub: "Основана в 2003 году" },
      { number: "500+", label: "Аптек-партнеров", sub: "Поставка по всей республике" },
      { number: "2 хаба", label: "Склады GDP/GSP", sub: "Худжанд и Душанбе" },
      { number: "100%", label: "Входной контроль", sub: "Температурный мониторинг" }
    ],

    infraPillars: [
      {
        icon: Warehouse,
        title: "Лицензированные фармацевтические склады",
        desc: "Складские комплексы в Худжанде и Душанбе с круглосуточным климат-контролем (15–25°C), автоматическим мониторингом влажности и стандартами надлежащей складской практики (GSP)."
      },
      {
        icon: Truck,
        title: "Собственный логистический автопарк",
        desc: "Специализированный транспорт с температурным контролем, обеспечивающий регулярные маршруты доставки по Душанбе, Согдийской области, Хатлонской области и РРП."
      },
      {
        icon: Users,
        title: "Квалифицированный штат специалистов",
        desc: "Команда медицинских представителей, провизоров, фармацевтов и логистов, обеспечивающих постоянное обучение персонала аптек и продвижение брендов."
      },
      {
        icon: ShieldCheck,
        title: "Строгий контроль качества партий",
        desc: "100% входной контроль, проверка сертификатов анализов и соответствия требованиям Государственной службы надзора за фармацевтической деятельностью Минздрава РТ."
      }
    ],

    ecosystemTag: "СИНЕРГИЯ И ОХВАТ",
    ecosystemTitle: "Собственная экосистема холдинга",
    ecosystemDesc: "Объединение масштабного оптового распределения, собственной аптечной розницы и современных IT-решений в медицине.",

    ecosystemItems: [
      {
        name: "ООО «Саховати Истаравшан»",
        role: "Материнский фармацевтический холдинг",
        period: "С 2003 года",
        desc: "Национальный импортер и дистрибьютор лекарственных средств, медицинских изделий и нутрицевтиков с непрерывным стажем работы на рынке Таджикистана более 20 лет.",
        linkText: "Головная компания",
        badge: "Холдинг"
      },
      {
        name: "Саховат Аптека",
        role: "Собственная аптечная розница",
        period: "Розничная сеть",
        desc: "Сеть современных аптек шаговой доступности с профессиональными провизорами, прямым отпуском препаратов и приоритетным размещением продукции брендов-партнеров.",
        url: "https://sakhovatapteka.tj",
        linkText: "Перейти на sakhovatapteka.tj",
        badge: "Аптечная розница"
      },
      {
        name: "ASLPHARM",
        role: "Цифровая фармацевтическая экосистема",
        period: "IT-платформа",
        desc: "Инновационная экосистема и мобильное приложение для поиска медикаментов, мониторинга наличия в аптеках Таджикистана и быстрого онлайн-бронирования.",
        url: "https://aslpharm.tj",
        linkText: "Перейти на aslpharm.tj",
        badge: "Приложение & Web"
      },
      {
        name: "TOJ-VITAMIN",
        role: "Платформа витаминов и добавок",
        period: "Флагман D2C / B2B",
        desc: "Специализированная интернет-платформа с экспертным подбором витаминов, образовательным контентом и цифровым кабинетом для оптовых аптек-партнеров.",
        url: "https://www.toj-vitamin.tj",
        linkText: "Текущий сайт",
        badge: "E-Commerce"
      }
    ],

    partnerTag: "МЕЖДУНАРОДНЫМ ПРОИЗВОДИТЕЛЯМ",
    partnerTitle: "Услуги для мировых брендов и производителей БАД",
    partnerSubtitle: "Специально разработано для комплаенс-требований глобальных партнеров. Мы выступаем вашим официальным импортером, регуляторным спонсором и оператором рынка в РТ.",

    partnerServices: [
      {
        title: "Государственная регистрация и комплаенс",
        desc: "Полное юридическое сопровождение, формирование регистрационных досье, сертификация и нотификация биологически активных добавок в уполномоченных органах Минздрава РТ."
      },
      {
        title: "Таможенное оформление и прямой ВЭД-импорт",
        desc: "Прямые внешнеэкономические контракты, декларирование 'под ключ', валютный контроль, соблюдение таможенных регламентов и прозрачная белая цепочка поставок."
      },
      {
        title: "Локализация упаковки и маркировка",
        desc: "Разработка и нанесение стикеров с переводом на таджикский и русский языки в строгом соответствии с Законом РТ «О защите прав потребителей»."
      },
      {
        title: "Комплексное маркетинговое продвижение",
        desc: "Работа с врачебным сообществом, обучение фармацевтов, мерчандайзинг на лучших полках 500+ аптек, digital-кампании и e-commerce продажи."
      }
    ],

    authTitle: "100% Оригинальная продукция без компромиссов",
    authDesc: "Мы гарантируем абсолютную подлинность каждой упаковки. Прямые поставки от заводов-изготовителей исключают серые схемы и фальсификат.",

    contactTitle: "Официальные реквизиты и контакты",
    contactSubtitle: "Для аудиторских проверок, заключения дистрибьюторских соглашений и B2B-закупок.",
    legalEntityLabel: "Юридическое лицо",
    legalEntityVal: "ООО «Саховати Истаравшан» / LLC 'Sakhovati Istaravshan'",
    hqAddressLabel: "Головной офис и складской комплекс",
    hqAddressVal: "Республика Таджикистан, г. Худжанд, ул. К. Худжанди 63/3, 735700",
    dushanbeHubLabel: "Логистический хаб в г. Душанбе",
    dushanbeHubVal: "Логистический центр Душанбе, Республика Таджикистан",
    emailLabel: "Корпоративный email (приемная / комплаенс)",
    phoneLabel: "Отдел оптовых продаж и дистрибуции",
    licenseLabel: "Лицензия на фармацевтическую деятельность",
    licenseVal: "Государственная лицензия на фармацевтическую деятельность № 0001859 (выдана Минздравом РТ)",
    whatsappBtn: "Написать в WhatsApp",
    callBtn: "Позвонить в приемную",
    backHome: "На главную страницу",
    b2bPortalBtn: "Открыть B2B-портал для аптек"
  },

  tj: {
    metaTitle: "Дистрибутсияи миллии маҳсулоти фарматсевтӣ ва иловаҳои биологӣ | Toj-Vitamin (ҶДММ «Саховати Истаравшан»)",
    metaDesc: "Бахши тахассусии холдинги фарматсевтии ҶДММ «Саховати Истаравшан» (аз соли 2003). Анборҳои GDP/GSP, логистика ва интиқоли мустақим дар саросари Тоҷикистон.",
    badge: "Дистрибютори расмии миллӣ дар Ҷумҳурии Тоҷикистон",
    heroTitle: "Дистрибутсияи расмии витаминҳо ва иловаҳои биологӣ дар Тоҷикистон",
    heroSubtitle: "Бахши тахассусӣ ва платформаи рақамии ширкати фарматсевтии ҶДММ «Саховати Истаравшан» (дар бозор аз соли 2003). Интиқоли мустақим ба шабакаҳои дорухонаҳо, муассисаҳои тиббӣ ва мизоҷон дар саросари кишвар.",
    ctaB2B: "Барои дорухонаҳо ва шарикони яклухт (B2B)",
    ctaCatalog: "Каталоги маҳсулот",
    ctaContact: "Тамос бо шуъбаи дистрибутсия",

    langLabel: "Забон",

    infraTag: "МИҚЁС ВА БАЗАИ АМАЛИЁТӢ",
    infraTitle: "Инфрасохтори фарматсевтӣ ва логистика (GDP / GSP)",
    infraDesc: "Мо ба истеҳсолкунандагони ҷаҳонӣ занҷири таъминоти шаффоф, комилан литсензияшуда ва омодаи аудити байналмилалиро дар саросари Тоҷикистон пешниҳод менамоем.",

    stats: [
      { number: "20+ сол", label: "Дар бозор", sub: "Аз соли 2003" },
      { number: "500+", label: "Дорухонаҳои шарик", sub: "Дар саросари кишвар" },
      { number: "2 марказ", label: "Анборҳои GDP/GSP", sub: "Хуҷанд ва Душанбе" },
      { number: "100%", label: "Назорати сифат", sub: "Мониторинги ҳарорат" }
    ],

    infraPillars: [
      {
        icon: Warehouse,
        title: "Анборҳои литсензияшудаи фарматсевтӣ",
        desc: "Маҷмааҳои анборӣ дар Хуҷанд ва Душанбе бо назорати шабонарӯзии ҳарорат (15–25°C) ва намии ҳаво мувофиқи стандартҳои GDP/GSP."
      },
      {
        icon: Truck,
        title: "Автопарки махсуси логистикӣ",
        desc: "Нақлиёти махсусгардонидашуда бо назорати ҳарорат, ки интиқоли мунтазамро ба Душанбе, вилояти Суғд, вилояти Хатлон ва НТҶ таъмин менамояд."
      },
      {
        icon: Users,
        title: "Ҳайати баландихтисоси мутахассисон",
        desc: "Дастаи намояндагони тиббӣ, дорусозон ва логистҳо, ки омӯзиши пайвастаи кормандони дорухонаҳоро таъмин менамоянд."
      },
      {
        icon: ShieldCheck,
        title: "Назорати қатъии сифати маҳсулот",
        desc: "100% санҷиши ҳар як партия, сертификатҳои мутобиқат ва риояи талаботи Хадамоти назорати давлатии фаъолияти фарматсевтии Вазорати тандурустии ҶТ."
      }
    ],

    ecosystemTag: "СИНЕРГИЯ ВА МАСОҲАТИ БОЗОР",
    ecosystemTitle: "Экосистемаи холдинг",
    ecosystemDesc: "Якҷоя кардани дистрибутсияи яклухт, шабакаи дорухонаҳо ва технологияҳои муосири тиббии рақамӣ.",

    ecosystemItems: [
      {
        name: "ҶДММ «Саховати Истаравшан»",
        role: "Холдинги фарматсевтии асосӣ",
        period: "Аз соли 2003",
        desc: "Воридкунанда ва паҳнкунандаи миллии доруворӣ ва маҳсулоти солимӣ бо таҷрибаи зиёда аз 20-сола дар бозори Тоҷикистон.",
        linkText: "Ширкати асосӣ",
        badge: "Холдинг"
      },
      {
        name: "Саховат Аптека",
        role: "Шабакаи чаканаи дорухонаҳо",
        period: "Шабакаи дорухона",
        desc: "Шабакаи дорухонаҳои муосир бо мутахассисони касбӣ ва пешниҳоди аввалиндараҷаи маҳсулоти шарикон.",
        url: "https://sakhovatapteka.tj",
        linkText: "Гузариш ба sakhovatapteka.tj",
        badge: "Дорухонаҳо"
      },
      {
        name: "ASLPHARM",
        role: "Экосистемаи рақамии фарматсевтӣ",
        period: "Платформаи IT",
        desc: "Барномаи мобилӣ барои дарёфти доруворӣ, тафтиши мавҷудият дар дорухонаҳо ва фармоиши фаврӣ.",
        url: "https://aslpharm.tj",
        linkText: "Гузариш ба aslpharm.tj",
        badge: "Барнома & Web"
      },
      {
        name: "TOJ-VITAMIN",
        role: "Платформаи витаминҳо ва иловаҳо",
        period: "Флагмани D2C / B2B",
        desc: "Мағозаи расмии интернетӣ бо интихоби инфиродӣ, маълумоти илмӣ ва бахши яклухт барои дорухонаҳо.",
        url: "https://www.toj-vitamin.tj",
        linkText: "Сомонаи ҷорӣ",
        badge: "E-Commerce"
      }
    ],

    partnerTag: "БАРОИ ИСТЕҲСОЛКУНАНДАГОНИ БАЙНАЛМИЛАЛӢ",
    partnerTitle: "Хизматрасониҳо барои брендҳои ҷаҳонӣ",
    partnerSubtitle: "Мувофиқи стандартҳои комплаенси байналмилалӣ. Мо воридкунандаи расмӣ ва намояндаи боэътимоди шумо дар Тоҷикистон мебошем.",

    partnerServices: [
      {
        title: "Бақайдгирии давлатӣ ва комплаенс",
        desc: "Дастгирии пурраи ҳуқуқӣ, омодасозии ҳуҷҷатҳо ва сертификатсия дар мақомоти Вазорати тандурустии ҶТ."
      },
      {
        title: "Барасмиятдарории гумрукӣ ва воридоти мустақим",
        desc: "Шартномаҳои мустақими хориҷӣ, эъломияи гумрукӣ ва занҷири комилан қонунии интиқол."
      },
      {
        title: "Маҳалликунонии банду баст ва нишонагузорӣ",
        desc: "Омодасозӣ ва часпонидани тамғакоғазҳо бо забонҳои тоҷикӣ ва русӣ мутобиқи қонунгузории ҶТ."
      },
      {
        title: "Пешбурди маркетингӣ ва фурӯш",
        desc: "Кор бо ҷомеаи табибон, омӯзиши дорусозон, ҷойгиркунии афзалиятнок дар 500+ дорухона ва пешбурди рақамӣ."
      }
    ],

    authTitle: "100% Маҳсулоти асил ва сертификатсияшуда",
    authDesc: "Мо аслияти ҳар як маҳсулотро кафолат медиҳем. Интиқоли мустақим аз корхонаҳо воридшавии моли қалбакиро комилан истисно мекунад.",

    contactTitle: "Маълумоти расмӣ ва тамос",
    contactSubtitle: "Барои санҷишҳои аудитӣ, бастани шартномаҳои дистрибутсия ва хариди яклухт.",
    legalEntityLabel: "Шахси ҳуқуқӣ",
    legalEntityVal: "ҶДММ «Саховати Истаравшан» / LLC 'Sakhovati Istaravshan'",
    hqAddressLabel: "Дафтари марказӣ ва маҷмааи анборӣ",
    hqAddressVal: "Ҷумҳурии Тоҷикистон, шаҳри Хуҷанд, кӯчаи К. Хуҷандӣ 63/3, 735700",
    dushanbeHubLabel: "Маркази логистикӣ дар ш. Душанбе",
    dushanbeHubVal: "Маркази логистикии Душанбе, Ҷумҳурии Тоҷикистон",
    emailLabel: "Почтаи корпоративӣ (қабулгоҳ / комплаенс)",
    phoneLabel: "Шуъбаи дистрибутсия ва фурӯши яклухт",
    licenseLabel: "Литсензияи фаъолияти фарматсевтӣ",
    licenseVal: "Литсензияи давлатӣ барои фаъолияти фарматсевтӣ № 0001859 (аз ҷониби Вазорати тандурустии ҶТ)",
    whatsappBtn: "Муроҷиат тавассути WhatsApp",
    callBtn: "Занг задан ба қабулгоҳ",
    backHome: "Ба саҳифаи асосӣ",
    b2bPortalBtn: "Кушодани бахши B2B барои дорухонаҳо"
  }
};

export default function CorporateAboutPage() {
  const [lang, setLang] = useState<Lang>('ru');

  useEffect(() => {
    // Check url search params for lang=en
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang') as Lang | null;
      if (urlLang && (urlLang === 'en' || urlLang === 'ru' || urlLang === 'tj')) {
        setLang(urlLang);
      }
    }
  }, []);

  const t = CONTENT[lang];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1D1D1F] selection:bg-blue-600 selection:text-white font-sans">
      {/* Top Floating Navigation Bar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-black/[0.06] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white shadow-sm border border-black/[0.05] p-1 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
              <Image 
                src="/logo.webp" 
                alt="Toj-Vitamin Logo" 
                width={44} 
                height={44} 
                className="w-full h-full object-contain scale-[3.2]"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[16px] sm:text-[18px] tracking-tight text-[#1D1D1F] font-outfit">
                TOJ-VITAMIN
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 tracking-wider uppercase">
                LLC Sakhovati Istaravshan
              </span>
            </div>
          </Link>

          {/* Center Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-6 text-[13px] font-semibold text-[#1D1D1F]/70">
            <a href="#infrastructure" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'Infrastructure' : (lang === 'ru' ? 'Инфраструктура' : 'Инфрасохтор')}
            </a>
            <a href="#ecosystem" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'Holding Ecosystem' : (lang === 'ru' ? 'Экосистема' : 'Экосистема')}
            </a>
            <a href="#manufacturers" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'For Global Brands' : (lang === 'ru' ? 'Производителям' : 'Истеҳсолкунандагон')}
            </a>
            <a href="#credentials" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'Credentials & Contacts' : (lang === 'ru' ? 'Контакты' : 'Тамос')}
            </a>
          </div>

          {/* Right Action: Language Switcher & Home link */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 3-Way Language Toggle */}
            <div className="flex items-center p-1 bg-black/[0.04] rounded-full border border-black/[0.04]">
              {(['en', 'ru', 'tj'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-full transition-all ${
                    lang === l 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-[#1D1D1F]/60 hover:text-[#1D1D1F]'
                  }`}
                  aria-label={`Switch to ${l}`}
                >
                  {l}
                </button>
              ))}
            </div>

            <Link
              href="/"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold text-[#1D1D1F] bg-black/[0.04] hover:bg-black/[0.08] rounded-full transition-all"
            >
              <span>{t.backHome}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden border-b border-black/[0.05]">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-blue-500/10 via-emerald-500/10 to-transparent blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Official Chip */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-[11px] sm:text-[12px] font-bold uppercase tracking-wider mb-6 shadow-sm"
          >
            <ShieldCheck size={15} className="text-blue-600" />
            <span>{t.badge}</span>
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1D1D1F] font-outfit leading-[1.15] max-w-4xl mx-auto"
          >
            {t.heroTitle}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-base sm:text-xl text-[#1D1D1F]/70 font-normal leading-relaxed max-w-3xl mx-auto"
          >
            {t.heroSubtitle}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <Link
              href="/opt"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#1D1D1F] text-white font-bold text-[14px] hover:bg-blue-600 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Building2 size={18} />
              <span>{t.ctaB2B}</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/#catalog"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white border border-black/10 text-[#1D1D1F] font-bold text-[14px] hover:bg-black/[0.03] transition-all shadow-sm active:scale-95"
            >
              <span>{t.ctaCatalog}</span>
            </Link>

            <a
              href="#credentials"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-700 font-bold text-[14px] hover:bg-blue-100 transition-all active:scale-95"
            >
              <Mail size={16} />
              <span>{t.ctaContact}</span>
            </a>
          </motion.div>
        </div>

        {/* Stats Strip */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {t.stats.map((stat, idx) => (
              <div 
                key={idx}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-black/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center flex flex-col justify-center"
              >
                <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 font-outfit tracking-tight">
                  {stat.number}
                </span>
                <span className="text-[13px] sm:text-[14px] font-bold text-[#1D1D1F] mt-1">
                  {stat.label}
                </span>
                <span className="text-[11px] text-[#1D1D1F]/50 mt-0.5">
                  {stat.sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Infrastructure & Logistics (GDP/GSP) */}
      <section id="infrastructure" className="py-16 sm:py-24 bg-white border-b border-black/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em]">
              {t.infraTag}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D1D1F] font-outfit mt-2 tracking-tight">
              {t.infraTitle}
            </h2>
            <p className="mt-3 text-[15px] sm:text-base text-[#1D1D1F]/70">
              {t.infraDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {t.infraPillars.map((pillar, idx) => {
              const IconComp = pillar.icon;
              return (
                <div
                  key={idx}
                  className="p-6 sm:p-8 rounded-3xl bg-[#FDFBF7] border border-black/[0.06] hover:border-blue-500/30 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                      <IconComp size={24} />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#1D1D1F] font-outfit">
                      {pillar.title}
                    </h3>
                    <p className="mt-2.5 text-[14px] sm:text-[15px] text-[#1D1D1F]/70 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-black/[0.04] flex items-center text-[12px] font-bold text-blue-600">
                    <CheckCircle2 size={16} className="mr-1.5" />
                    <span>Verified Compliance (GSP/GDP)</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Regional coverage banner */}
          <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-900 to-[#1D1D1F] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">
                GEOGRAPHIC REACH
              </span>
              <h4 className="text-xl sm:text-2xl font-bold font-outfit">
                {lang === 'en' 
                  ? 'Scheduled Cold-Chain Routes Across All Regions' 
                  : (lang === 'ru' ? 'Регулярные рейсы во все регионы Республики Таджикистан' : 'Интиқоли мунтазам ба тамоми минтақаҳои Тоҷикистон')}
              </h4>
              <p className="text-[13px] text-white/70 max-w-xl">
                {lang === 'en'
                  ? 'Dushanbe • Khujand • Bokhtar • Kulob • Istaravshan • Panjakent • Isfara • Tursunzoda'
                  : 'Душанбе • Худжанд • Бохтар • Куляб • Истаравшан • Пенджикент • Исфара • Турсунзаде'}
              </p>
            </div>
            <Link
              href="/opt"
              className="shrink-0 px-6 py-3 rounded-2xl bg-white text-[#1D1D1F] font-bold text-[13px] hover:bg-blue-50 transition-colors shadow-md"
            >
              {t.b2bPortalBtn}
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2: Integrated Holding Ecosystem */}
      <section id="ecosystem" className="py-16 sm:py-24 bg-[#FDFBF7] border-b border-black/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em]">
              {t.ecosystemTag}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D1D1F] font-outfit mt-2 tracking-tight">
              {t.ecosystemTitle}
            </h2>
            <p className="mt-3 text-[15px] sm:text-base text-[#1D1D1F]/70">
              {t.ecosystemDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.ecosystemItems.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-white border border-black/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-lg transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50">
                      {item.badge}
                    </span>
                    <span className="text-[11px] font-semibold text-[#1D1D1F]/40">
                      {item.period}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#1D1D1F] font-outfit mt-2">
                    {item.name}
                  </h3>
                  <span className="text-[12px] font-bold text-blue-600 block mb-3">
                    {item.role}
                  </span>
                  <p className="text-[13px] text-[#1D1D1F]/70 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-black/[0.05]">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <span>{item.linkText}</span>
                      <ArrowUpRight size={14} />
                    </a>
                  ) : (
                    <span className="text-[12px] font-bold text-[#1D1D1F]/60">
                      {item.linkText}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: For Global Brands & Manufacturers (NOW Foods & Audits) */}
      <section id="manufacturers" className="py-16 sm:py-24 bg-white border-b border-black/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-[0.2em]">
              {t.partnerTag}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D1D1F] font-outfit mt-2 tracking-tight">
              {t.partnerTitle}
            </h2>
            <p className="mt-3 text-[15px] sm:text-base text-[#1D1D1F]/70">
              {t.partnerSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {t.partnerServices.map((srv, idx) => (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-3xl bg-[#F8FAF9] border border-emerald-900/10 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-[14px]">
                      0{idx + 1}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#1D1D1F] font-outfit">
                      {srv.title}
                    </h3>
                  </div>
                  <p className="text-[14px] sm:text-[15px] text-[#1D1D1F]/70 leading-relaxed">
                    {srv.desc}
                  </p>
                </div>
                <div className="mt-5 pt-4 border-emerald-900/5 flex items-center text-[12px] font-semibold text-emerald-700">
                  <Check size={16} className="mr-1.5" />
                  <span>Full Regulatory Compliance</span>
                </div>
              </div>
            ))}
          </div>

          {/* Compliance & Quality Assurance Callout */}
          <div className="mt-10 p-6 sm:p-8 rounded-3xl bg-blue-50/70 border border-blue-200/60 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Award size={28} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-lg font-bold text-[#1D1D1F] font-outfit">
                {t.authTitle}
              </h4>
              <p className="text-[14px] text-[#1D1D1F]/70 mt-1">
                {t.authDesc}
              </p>
            </div>
            <a
              href="mailto:ceo@toj-vitamin.tj"
              className="shrink-0 px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold text-[13px] hover:bg-blue-700 transition-colors shadow-sm"
            >
              Request Compliance Dossier
            </a>
          </div>
        </div>
      </section>

      {/* Section 4: Legal Information & Executive Contacts */}
      <section id="credentials" className="py-16 sm:py-24 bg-[#FDFBF7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em]">
              TRANSPARENCY & CREDENTIALS
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D1D1F] font-outfit mt-2 tracking-tight">
              {t.contactTitle}
            </h2>
            <p className="mt-3 text-[15px] sm:text-base text-[#1D1D1F]/70">
              {t.contactSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Legal Entity & Licensing */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-black/[0.06] shadow-sm space-y-6">
              <div>
                <span className="text-[11px] font-bold text-[#1D1D1F]/40 uppercase tracking-wider block mb-1">
                  {t.legalEntityLabel}
                </span>
                <p className="text-[16px] font-bold text-[#1D1D1F] font-outfit">
                  {t.legalEntityVal}
                </p>
                <span className="text-[12px] text-emerald-600 font-semibold block mt-1">
                  Tax Registration & FEA Status: Active (Est. 2003)
                </span>
              </div>

              <div className="pt-4 border-t border-black/[0.05]">
                <span className="text-[11px] font-bold text-[#1D1D1F]/40 uppercase tracking-wider block mb-1">
                  {t.licenseLabel}
                </span>
                <p className="text-[13px] text-[#1D1D1F]/80 font-medium">
                  {t.licenseVal}
                </p>
              </div>

              <div className="pt-4 border-t border-black/[0.05]">
                <span className="text-[11px] font-bold text-[#1D1D1F]/40 uppercase tracking-wider block mb-1">
                  Digital Platforms
                </span>
                <p className="text-[13px] text-[#1D1D1F]/80">
                  • toj-vitamin.tj (Supplements Distribution)<br />
                  • sakhovatapteka.tj (Retail Network)<br />
                  • aslpharm.tj (Ecosystem App)
                </p>
              </div>
            </div>

            {/* Column 2: Physical Hubs & Warehouses */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-black/[0.06] shadow-sm space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={16} className="text-blue-600" />
                  <span className="text-[11px] font-bold text-[#1D1D1F]/40 uppercase tracking-wider">
                    {t.hqAddressLabel}
                  </span>
                </div>
                <p className="text-[14px] font-bold text-[#1D1D1F]">
                  {t.hqAddressVal}
                </p>
                <span className="text-[12px] text-[#1D1D1F]/60 block mt-1">
                  Central Warehouse, Executive Offices & Distribution Management
                </span>
              </div>

              <div className="pt-4 border-t border-black/[0.05]">
                <div className="flex items-center gap-2 mb-1">
                  <Warehouse size={16} className="text-blue-600" />
                  <span className="text-[11px] font-bold text-[#1D1D1F]/40 uppercase tracking-wider">
                    {t.dushanbeHubLabel}
                  </span>
                </div>
                <p className="text-[14px] font-bold text-[#1D1D1F]">
                  {t.dushanbeHubVal}
                </p>
                <span className="text-[12px] text-[#1D1D1F]/60 block mt-1">
                  Regional Cross-docking & Central Tajikistan Express Delivery
                </span>
              </div>
            </div>

            {/* Column 3: Direct Executive Contact Channels */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider block mb-2">
                  DIRECT CONTACT DESK
                </span>
                <h3 className="text-xl font-bold font-outfit mb-4">
                  {lang === 'en' ? 'Get in Touch with Management' : (lang === 'ru' ? 'Связь с руководством' : 'Тамос бо роҳбарият')}
                </h3>

                <div className="space-y-4">
                  <div>
                    <span className="text-[11px] text-blue-200 uppercase tracking-wider block">
                      {t.emailLabel}
                    </span>
                    <a
                      href="mailto:ceo@toj-vitamin.tj"
                      className="text-[15px] font-bold text-white hover:underline flex items-center gap-1.5 mt-0.5"
                    >
                      <Mail size={16} />
                      <span>ceo@toj-vitamin.tj</span>
                    </a>
                  </div>

                  <div>
                    <span className="text-[11px] text-blue-200 uppercase tracking-wider block">
                      {t.phoneLabel}
                    </span>
                    <a
                      href="tel:+992176660707"
                      className="text-[15px] font-bold text-white hover:underline flex items-center gap-1.5 mt-0.5"
                    >
                      <Phone size={16} />
                      <span>+992 176660707</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/20 flex flex-col gap-2.5">
                <a
                  href="https://wa.me/992176660707"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-[#25D366] text-white font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-[#20ba59] transition-colors shadow-md"
                >
                  <MessageCircle size={18} fill="currentColor" />
                  <span>{t.whatsappBtn}</span>
                </a>
                <a
                  href="tel:+992176660707"
                  className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-colors border border-white/20"
                >
                  <Phone size={16} />
                  <span>{t.callBtn}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer in About Page */}
      <footer className="py-8 bg-white border-t border-black/[0.06] text-center text-[12px] text-[#1D1D1F]/50">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © {new Date().getFullYear()} LLC &quot;Sakhovati Istaravshan&quot; / Toj-Vitamin. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'Main Store' : (lang === 'ru' ? 'Главная витрина' : 'Саҳифаи асосӣ')}
            </Link>
            <Link href="/opt" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'B2B Wholesale' : (lang === 'ru' ? 'B2B Опт' : 'Бахши яклухт')}
            </Link>
            <Link href="/journal" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'Scientific Journal' : (lang === 'ru' ? 'Журнал' : 'Журнал')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
