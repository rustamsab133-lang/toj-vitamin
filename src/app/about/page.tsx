"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Building2, ShieldCheck, Truck, Warehouse, Globe, 
  CheckCircle2, ArrowRight, Phone, Mail, MapPin, 
  ExternalLink, FileText, Award, Users, ChevronRight,
  TrendingUp, Layers, Check, ArrowUpRight, MessageCircle,
  Clock, HeartHandshake, Sparkles, Store, ThermometerSnowflake,
  Activity, BadgeCheck, Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Lang = 'en' | 'ru' | 'tj';

const CONTENT = {
  ru: {
    metaTitle: "Фармацевтический холдинг ООО «Саховати Истаравшан» и платформа Toj-Vitamin",
    metaDesc: "Официальный национальный импортер, дистрибьютор фармацевтической продукции, витаминов и БАД в Республике Таджикистан с 2003 года.",
    badge: "Официальный национальный дистрибьютор в Республике Таджикистан",
    
    // Блок 1. Первый экран (Hero Section)
    heroTitle: "Фармацевтический холдинг ООО «Саховати Истаравшан» и специализированная платформа Toj-Vitamin",
    heroSubtitle: "Официальный национальный импортер, дистрибьютор фармацевтической продукции, витаминов и БАД в Республике Таджикистан с 2003 года.",
    ctaB2B: "Для аптек и оптовых партнеров (B2B)",
    ctaCatalog: "Каталог продукции",
    ctaContact: "Связаться с отделом дистрибуции",

    // 4 ключевые плашки
    stats: [
      { number: "20+ лет", label: "Безупречной работы", sub: "На фармацевтическом рынке" },
      { number: "700+", label: "Аптек-партнеров", sub: "И медицинских учреждений" },
      { number: "250+", label: "Сотрудников в штате", sub: "Команда специалистов" },
      { number: "100%", label: "Национальный охват", sub: "Душанбе, Согд и регионы РТ" }
    ],

    // Блок 2. История и миссия компании
    historyMissionTag: "КОРПОРАТИВНЫЙ ПРОФИЛЬ И ЦЕННОСТИ",
    historyMissionTitle: "История и миссия компании",
    historyMissionSubtitle: "Более двух десятилетий лидерства, развития оптовой фармацевтической инфраструктуры и заботы о здоровье нации.",
    
    historyTitle: "История развития",
    historyDesc: "Основанная в 2003 году, компания ООО «Саховати Истаравшан» прошла путь от регионального дистрибьютора до одного из ведущих национальных операторов оптового фармацевтического рынка Таджикистана с развитой логистической базой и прямыми контрактами.",

    missionTitle: "Миссия холдинга",
    missionDesc: "Обеспечение населения и системы здравоохранения Таджикистана оригинальными, высококачественными сертифицированными лекарственными средствами, витаминами и нутрицевтиками мирового стандарта.",

    roleTitle: "Роль Toj-Vitamin",
    roleDesc: "Выделенное специализированное подразделение и цифровая платформа холдинга, сфокусированная исключительно на формировании цивилизованного рынка биологически активных добавок, развитии превентивной медицины и культуры здорового образа жизни.",

    // Блок 1.1. Визуальный блок Hero Showcase
    heroShowcaseTag: "НАЦИОНАЛЬНЫЙ ЛОГИСТИЧЕСКИЙ ХАБ",
    heroShowcaseTitle: "Складские комплексы класса А и изотермический автопарк",
    heroShowcaseDesc: "Многоярусные логистические комплексы в Худжанде и Душанбе с непрерывным климат-контролем 15–25°C, обеспечивающие снабжение 700+ аптек по всему Таджикистану.",
    fleetSectionTag: "ТРАНСПОРТНАЯ ТЕРМОЛОГИСТИКА",
    fleetSectionTitle: "Собственный изотермический автопарк",
    fleetSectionDesc: "Специализированные фургоны с холодильно-обогревательными установками и постоянным телеметрическим GPS-контролем температуры на всем маршруте.",
    warehouseSectionTag: "СТАНДАРТЫ ХРАНЕНИЯ",
    warehouseSectionTitle: "Многоярусное адресное хранение и зонирование",
    warehouseSectionDesc: "Карантинные зоны, цифровой учет серий, влагозащита и соблюдение правил санитарного и температурного режима 15–25°C.",
    labSectionTag: "КОНТРОЛЬ КАЧЕСТВА И СЕРТИФИКАЦИЯ",
    labSectionTitle: "100% Входной лабораторный контроль партий",
    labSectionDesc: "Каждая партия витаминов и добавок проходит обязательное тестирование в аналитических лабораториях Службы надзора за фармдеятельностью Минздрава РТ.",
    gmpSectionTag: "ПРОИЗВОДСТВЕННЫЙ СТАНДАРТ",
    gmpSectionTitle: "Международные сертификаты GMP и ISO",
    gmpSectionDesc: "Прямые контракты с аккредитованными фармпроизводителями. Оригинальная продукция без посредников и риска фальсификата.",

    // Блок 3. Экосистема бизнеса
    ecosystemTag: "БИЗНЕС-СИНЕРГИЯ ХОЛДИНГА",
    ecosystemTitle: "Экосистема бизнеса: от опта до конечного потребителя",
    ecosystemSubtitle: "Бесшовная интеграция оптовых поставок, развитой собственной розницы и цифровых медицинских технологий.",

    ecosystemBranches: [
      {
        icon: Building2,
        image: "/assets/about/warehouse_hub.jpg",
        badge: "B2B Фармация",
        title: "Оптовая дистрибуция (B2B Pharma)",
        desc: "Прямые контракты на поставку с национальными и региональными аптечными сетями, независимыми аптеками, клиниками и медицинскими учреждениями по всей стране. Бесперебойное снабжение и гибкие коммерческие условия.",
        linkText: "Оптовый B2B портал",
        url: "/opt"
      },
      {
        icon: Store,
        image: "/assets/about/aslpharm_pharmacy_hd.webp",
        badge: "Аптечный ритейл",
        title: "Собственные розничные сети ASLPHARM и САХОВАТ",
        desc: "Сеть собственных аптек, обеспечивающая прямой контакт с розничным покупателем, профессиональное консультирование провизорами и гарантированное наличие ключевых брендов на полках.",
        linkText: "Сеть Саховат (sakhovatapteka.tj) • ASLPHARM (aslpharm.tj)",
        url: "https://sakhovatapteka.tj",
        secondaryUrl: "https://aslpharm.tj"
      },
      {
        icon: Globe,
        image: "/assets/science/vitality.png",
        badge: "Цифровой флагман",
        title: "Цифровая платформа Toj-Vitamin (B2B / D2C)",
        desc: "Высокотехнологичный онлайн-сервис с персональным научным подбором витаминов, образовательной базой знаний, прямым контактом с потребителем и личным кабинетом заказа для аптек.",
        linkText: "Перейти к каталогу Toj-Vitamin",
        url: "/#catalog"
      }
    ],

    // Блок 4. Складская логистика и контроль хранения
    logisticsTag: "ИНФРАСТРУКТУРА И ЛОГИСТИКА",
    logisticsTitle: "Складская логистика и условия хранения",
    logisticsSubtitle: "Собственные складские мощности и постоянный температурный контроль для правильного хранения витаминов и фармпродукции.",

    logisticsFeatures: [
      {
        icon: ThermometerSnowflake,
        title: "Контроль параметров хранения",
        desc: "Мониторинг температурного режима и влажности: прохладные сухие зоны с температурой 15–25°C. Собственные складские комплексы в Худжанде и Душанбе."
      },
      {
        icon: Truck,
        title: "Собственный автопарк и экспресс-доставка",
        desc: "Специализированный транспорт, обеспечивающий доставку заказов в аптеки Душанбе и Худжанда в течение 24 часов, а в удаленные регионы Республики Таджикистан — до 48 часов."
      },
      {
        icon: Warehouse,
        title: "Надлежащее хранение и партионный учет",
        desc: "Зонирование складов, карантинные зоны, цифровой учет партий и серий, строгая прослеживаемость и соблюдение правил санитарного и температурного режима."
      },
      {
        icon: ShieldCheck,
        title: "100% Входной контроль качества",
        desc: "Обязательная проверка сопроводительной документации, сертификатов анализа и соответствия Службы надзора за фармдеятельностью Минздрава РТ."
      }
    ],

    // Блок 5. Опыт в категории БАД и портфель брендов
    trackRecordTag: "ЭКСПЕРТИЗА И ПОРТФЕЛЬ БРЕНДОВ",
    trackRecordTitle: "Опыт в категории БАД и портфель брендов (Category Track Record)",
    trackRecordSubtitle: "Подтвержденная коммерческая компетентность, статус надежного дистрибьютора и передовые маркетинговые инструменты.",

    trackItems: [
      {
        icon: Award,
        title: "Официальный дистрибьютор бренда GLS Pharmaceuticals",
        desc: "Подтвержденный опыт вывода на рынок Таджикистана и масштабной дистрибуции ведущих линеек витаминов и нутрицевтиков. Полноценная представленность в рознице и e-commerce."
      },
      {
        icon: Stethoscope,
        title: "Комплексный подход к продвижению",
        desc: "Системное взаимодействие с профильными врачами (терапевты, эндокринологи, педиатры), нутрициологами, лидерами мнений (UGC / инфлюенсер-маркетинг) и обучающие программы для первостольников аптек."
      },
      {
        icon: FileText,
        title: "Госрегистрация и локализация упаковки",
        desc: "Полное юридическое сопровождение регистрации БАД в уполномоченных органах Минздрава РТ, нанесение обязательной маркировки и стикеров на государственном и русском языках."
      },
      {
        icon: Activity,
        title: "Услуги для глобальных производителей",
        desc: "Прямой внешнеэкономический импорт (ВЭД), белое таможенное оформление под ключ, дистрибуция через 700+ аптек и защита бренда от контрафакта."
      }
    ],

    // Блок 6. Юридическая информация и лицензии
    legalTag: "ПРАВОВАЯ ЧИСТОТА И РЕКВИЗИТЫ",
    legalTitle: "Юридическая информация и лицензии (Compliance & Credentials)",
    legalSubtitle: "Официальные реквизиты, подтвержденные лицензии и прямые контакты руководства компании.",

    legalNameLabel: "Полное наименование юридического лица",
    legalNameVal: "Общество с ограниченной ответственностью «Саховати Истаравшан» (LLC \"Sakhovati Istaravshan\")",
    
    hqLabel: "Юридический и фактический адрес головного офиса и центрального склада",
    hqVal: "Республика Таджикистан, Согдийская область, г. Худжанд, ул. К. Худжанди 63/3, индекс 735700",

    dushanbeLabel: "Логистический хаб в г. Душанбе",
    dushanbeVal: "Логистический центр Душанбе, Республика Таджикистан (обеспечивает поставки в Хатлон и РРП)",

    licenseLabel: "Государственная лицензия на фармацевтическую деятельность",
    licenseVal: "Лицензия № 0001859, выдана Государственной службой надзора за фармацевтической деятельностью Министерства здравоохранения и социальной защиты населения Республики Таджикистан",

    emailLabel: "Приемная / Corporate Email",
    phoneLabel: "Телефон приемной с международным кодом",
    phoneVal: "+992 176660707",
    whatsappBtn: "Написать в WhatsApp",
    callBtn: "Позвонить в приемную",
    backHome: "На главную страницу"
  },

  en: {
    metaTitle: "Pharmaceutical Holding LLC 'Sakhovati Istaravshan' & Toj-Vitamin Platform",
    metaDesc: "Official national importer and distributor of pharmaceutical products, vitamins, and dietary supplements in the Republic of Tajikistan since 2003.",
    badge: "Official National Distributor in the Republic of Tajikistan",
    
    // Block 1. Hero Section
    heroTitle: "Pharmaceutical Holding LLC \"Sakhovati Istaravshan\" & Specialized Platform Toj-Vitamin",
    heroSubtitle: "Official national importer and distributor of pharmaceutical products, vitamins, and dietary supplements in the Republic of Tajikistan since 2003.",
    ctaB2B: "For Pharmacies & B2B Partners",
    ctaCatalog: "Explore Product Catalog",
    ctaContact: "Contact Distribution Desk",

    // 4 Key Stats
    stats: [
      { number: "20+ Years", label: "Of Proven Excellence", sub: "On the pharmaceutical market" },
      { number: "700+", label: "Partner Pharmacies", sub: "& Healthcare institutions" },
      { number: "250+", label: "Employees on Staff", sub: "Licensed pharmaceutical team" },
      { number: "100%", label: "National Coverage", sub: "Dushanbe, Sughd & regions of RT" }
    ],

    // Block 2. Corporate Background & Mission
    historyMissionTag: "CORPORATE PROFILE & VALUES",
    historyMissionTitle: "Corporate Background & Mission",
    historyMissionSubtitle: "Over two decades of continuous leadership, healthcare supply chain development, and nation-building.",

    historyTitle: "Corporate History",
    historyDesc: "Founded in 2003, LLC 'Sakhovati Istaravshan' has grown from a regional distributor into one of Tajikistan's leading national operators in the wholesale pharmaceutical market, backed by modern logistics and direct contracts.",

    missionTitle: "Corporate Mission",
    missionDesc: "Providing the population and healthcare infrastructure of Tajikistan with genuine, premium certified medicines, vitamins, and nutraceuticals meeting international standards.",

    roleTitle: "The Role of Toj-Vitamin",
    roleDesc: "A dedicated specialized division and digital ecosystem of the holding, focused exclusively on developing an authorized dietary supplements market, promoting preventive medicine, and cultivating health literacy.",

    // Block 1.1. Hero Showcase
    heroShowcaseTag: "NATIONAL LOGISTICS & PHARMA HUB",
    heroShowcaseTitle: "Class-A Warehousing Complexes & Cold-Chain Fleet",
    heroShowcaseDesc: "Multi-tier pharmaceutical distribution centers in Khujand and Dushanbe with continuous 15–25°C climate control, supplying over 700 partner pharmacies across Tajikistan.",
    fleetSectionTag: "COLD-CHAIN TRANSIT LOGISTICS",
    fleetSectionTitle: "Dedicated Refrigerated Fleet",
    fleetSectionDesc: "Specialized temperature-controlled delivery vans equipped with active cooling/heating units and telemetric GPS tracking throughout transit.",
    warehouseSectionTag: "STORAGE STANDARDS",
    warehouseSectionTitle: "High-Bay Multi-Tier Racking & Segregation",
    warehouseSectionDesc: "Quarantine areas, automated batch tracking, humidity control, and continuous 15–25°C thermal surveillance.",
    labSectionTag: "QUALITY ASSURANCE & TESTING",
    labSectionTitle: "100% Inbound Laboratory Verification",
    labSectionDesc: "Every imported batch of supplements undergoes mandatory physicochemical verification by the Ministry of Health of the Republic of Tajikistan.",
    gmpSectionTag: "MANUFACTURING COMPLIANCE",
    gmpSectionTitle: "Global GMP & ISO Certified Partners",
    gmpSectionDesc: "Direct authorized contracts with certified manufacturers. 100% genuine products with complete traceability and anti-counterfeit protection.",

    // Block 3. Business Ecosystem
    ecosystemTag: "ENTERPRISE SYNERGY",
    ecosystemTitle: "Business Ecosystem: From Wholesale to End-Consumer",
    ecosystemSubtitle: "Seamless synergy across wholesale pharma supply, proprietary retail pharmacy chains, and healthtech platforms.",

    ecosystemBranches: [
      {
        icon: Building2,
        image: "/assets/about/warehouse_hub.jpg",
        badge: "B2B Pharma",
        title: "Wholesale Distribution (B2B Pharma)",
        desc: "Direct supply agreements with national and regional pharmacy chains, independent drugstores, hospitals, and clinics across Tajikistan. Guaranteed supply continuity and flexible commercial terms.",
        linkText: "B2B Wholesale Portal",
        url: "/opt"
      },
      {
        icon: Store,
        image: "/assets/about/aslpharm_pharmacy_hd.webp",
        badge: "Pharmacy Retail",
        title: "Proprietary Retail Networks ASLPHARM & SAKHOVAT",
        desc: "In-house brick-and-mortar pharmacy chain providing direct patient engagement, expert pharmacist dispensing, and guaranteed prime shelf space for strategic partner brands.",
        linkText: "Sakhovat Chain (sakhovatapteka.tj) • ASLPHARM (aslpharm.tj)",
        url: "https://sakhovatapteka.tj",
        secondaryUrl: "https://aslpharm.tj"
      },
      {
        icon: Globe,
        image: "/assets/science/vitality.png",
        badge: "Digital Platform",
        title: "Digital Platform Toj-Vitamin (B2B / D2C)",
        desc: "High-tech consumer e-commerce platform offering algorithmic nutrient selection, medical content, direct consumer feedback, and online order management for pharmacies.",
        linkText: "Visit Toj-Vitamin Catalog",
        url: "/#catalog"
      }
    ],

    // Block 4. Warehousing & Storage Conditions
    logisticsTag: "SUPPLY CHAIN & STORAGE INFRASTRUCTURE",
    logisticsTitle: "Warehousing & Storage Conditions",
    logisticsSubtitle: "Dedicated regional storage facilities and continuous climate management ensuring optimal preservation of vitamins and health products.",

    logisticsFeatures: [
      {
        icon: ThermometerSnowflake,
        title: "Automated Parameter Monitoring",
        desc: "Continuous temperature and humidity tracking: controlled ambient dry zones (15–25°C). Dedicated warehouse complexes in Khujand and Dushanbe."
      },
      {
        icon: Truck,
        title: "Dedicated Fleet & Express Deliveries",
        desc: "Temperature-controlled logistics fleet ensuring delivery to pharmacies in Dushanbe and Khujand within 24 hours, and up to 48 hours to remote mountainous regions of Tajikistan."
      },
      {
        icon: Warehouse,
        title: "Quality Storage & Serial Tracking",
        desc: "Strict warehouse segregation, quarantine zones, batch serial tracking, and full compliance with sanitary and environmental standards."
      },
      {
        icon: ShieldCheck,
        title: "100% Inbound Quality Inspection",
        desc: "Rigorous verification of batch certificates, analytical documentation, and compliance with the Ministry of Health of the Republic of Tajikistan."
      }
    ],

    // Block 5. Category Track Record
    trackRecordTag: "PROVEN EXPERTISE & BRAND PORTFOLIO",
    trackRecordTitle: "Category Track Record in Dietary Supplements",
    trackRecordSubtitle: "Proven commercial execution, authorized distributor credentials, and multi-channel brand growth.",

    trackItems: [
      {
        icon: Award,
        title: "Authorized Distributor of GLS Pharmaceuticals",
        desc: "Proven track record in brand launch, localization, and nationwide market expansion of major nutraceutical lines with comprehensive retail and online presence."
      },
      {
        icon: Stethoscope,
        title: "Omnichannel Promotion & Medical Engagement",
        desc: "Systematic collaboration with healthcare practitioners (general practitioners, endocrinologists, pediatricians), nutritionists, digital KOLs (UGC), and continuous pharmacist education."
      },
      {
        icon: FileText,
        title: "State Registration & Packaging Compliance",
        desc: "End-to-end legal support for supplement registration with the Ministry of Health of RT, mandatory localization, and labeling in Tajik and Russian languages."
      },
      {
        icon: Activity,
        title: "Full-Cycle Services for Global Brands",
        desc: "Direct foreign trade import, turnkey customs clearance, retail distribution across 700+ pharmacies, and robust anti-counterfeit brand protection."
      }
    ],

    // Block 6. Compliance & Credentials
    legalTag: "COMPLIANCE, LEGAL ENTITY & CONTACTS",
    legalTitle: "Corporate Credentials & Licensing (Compliance)",
    legalSubtitle: "Official corporate details, government licenses, and direct executive contact channels.",

    legalNameLabel: "Full Legal Entity Name",
    legalNameVal: "LLC \"Sakhovati Istaravshan\" (Общество с ограниченной ответственностью «Саховати Истаравшан»)",
    
    hqLabel: "Headquarters & Central Distribution Warehouse",
    hqVal: "63/3 K. Khujandi Street, Khujand, Sughd Region, Republic of Tajikistan, Postal Code 735700",

    dushanbeLabel: "Dushanbe Logistics Hub",
    dushanbeVal: "Dushanbe Logistics Center, Republic of Tajikistan (supplying Khatlon and RRP regions)",

    licenseLabel: "State Pharmaceutical Activity License",
    licenseVal: "State License No. 0001859 issued by the State Service for Pharmaceutical Surveillance under the Ministry of Health and Social Protection of the Republic of Tajikistan",

    emailLabel: "Corporate & Compliance Email",
    phoneLabel: "Executive Office Phone (International)",
    phoneVal: "+992 176660707",
    whatsappBtn: "Chat via WhatsApp",
    callBtn: "Call Reception",
    backHome: "Back to Home"
  },

  tj: {
    metaTitle: "Холдинги фарматсевтии ҶДММ «Саховати Истаравшан» ва платформаи Toj-Vitamin",
    metaDesc: "Воридкунанда ва дистрибютори расмии миллии маҳсулоти фарматсевтӣ, витаминҳо ва иловаҳои биологӣ дар Ҷумҳурии Тоҷикистон аз соли 2003.",
    badge: "Дистрибютори расмии миллӣ дар Ҷумҳурии Тоҷикистон",
    
    // Блок 1. Hero
    heroTitle: "Холдинги фарматсевтии ҶДММ «Саховати Истаравшан» ва платформаи тахассусии Toj-Vitamin",
    heroSubtitle: "Воридкунанда ва дистрибютори расмии миллии маҳсулоти фарматсевтӣ, витаминҳо ва иловаҳои биологӣ дар Ҷумҳурии Тоҷикистон аз соли 2003.",
    ctaB2B: "Барои дорухонаҳо ва шарикони яклухт (B2B)",
    ctaCatalog: "Каталоги маҳсулот",
    ctaContact: "Тамос бо шуъбаи дистрибутсия",

    stats: [
      { number: "20+ сол", label: "Фаъолияти бенуқсон", sub: "Дар бозори фарматсевтӣ" },
      { number: "700+", label: "Дорухонаҳои шарик", sub: "Ва муассисаҳои тиббӣ" },
      { number: "250+", label: "Кормандон дар штат", sub: "Дастаи мутахассисон" },
      { number: "100%", label: "Фарогирии миллӣ", sub: "Душанбе, Суғд ва минтақаҳои ҶТ" }
    ],

    // Блок 2. Таърих ва рисолат
    historyMissionTag: "ПРОФИЛИ КОРПОРАТИВӢ ВА АРЗИШҲО",
    historyMissionTitle: "Таърих ва рисолати ширкат",
    historyMissionSubtitle: "Зиёда аз ду даҳсолаи пешсафӣ, рушди инфрасохтори яклухти фарматсевтӣ ва ғамхорӣ ба саломатии мардум.",

    historyTitle: "Таърихи ширкат",
    historyDesc: "Ширкати ҶДММ «Саховати Истаравшан», ки соли 2003 таъсис ёфтааст, аз як паҳнкунандаи минтақавӣ то ба яке аз пешсафони миллии бозори яклухти фарматсевтии Тоҷикистон рушд намуд.",

    missionTitle: "Рисолати холдинг",
    missionDesc: "Таъмини аҳолӣ ва низоми тандурустии Тоҷикистон бо дорувории аслӣ, босифат, сертификатсияшуда, витаминҳо ва иловаҳои биологии сатҳи ҷаҳонӣ.",

    roleTitle: "Нақши Toj-Vitamin",
    roleDesc: "Бахши тахассусӣ ва платформаи рақамии холдинг, ки махсус барои ташаккули бозори тамаддунофари иловаҳои биологӣ ва тарғиби тарзи ҳаёти солим нигаронида шудааст.",

    // Блок 1.1. Visual Hero Showcase
    heroShowcaseTag: "МАРКАЗИ ЛОГИСТИКИИ МИЛЛИИ ФАРМАТСЕВТӢ",
    heroShowcaseTitle: "Маҷмааҳои анбории дараҷаи А ва автопарки махсус",
    heroShowcaseDesc: "Марказҳои бисёрошёнаи анборӣ дар Хуҷанд ва Душанбе бо назорати доимии ҳарорати 15–25°C барои таъминоти зиёда аз 700 дорухонаи шарик дар саросари Тоҷикистон.",
    fleetSectionTag: "ЛОГИСТИКАИ САРДХОНАӢ",
    fleetSectionTitle: "Автопарки махсуси изотермикӣ",
    fleetSectionDesc: "Нақлиёти махсус бо дастгоҳҳои сардидиҳанда ва мониторинги доимии GPS оид ба ҳарорат дар тамоми масири ҳаракат.",
    warehouseSectionTag: "МЕЪЁРҲОИ НИГОҲДОРӢ",
    warehouseSectionTitle: "Нигоҳдории бисёрошёнаи адресӣ ва минтақабандӣ",
    warehouseSectionDesc: "Минтақаҳои карантинӣ, баҳисобгирии рақамии силсилаҳо ва риояи меъёрҳои санитарии 15–25°C.",
    labSectionTag: "НАЗОРАТИ СИФАТ ВА СЕРТИФИКАТСИЯ",
    labSectionTitle: "100% Санҷиши озмоишгоҳии ҳар як силсила",
    labSectionDesc: "Ҳар як силсилаи воридшуда аз санҷиши ҳатмии таҳлилӣ дар озмоишгоҳҳои Вазорати тандурустии ҶТ мегузарад.",
    gmpSectionTag: "МЕЪЁРИ ИСТЕҲСОЛОТ",
    gmpSectionTitle: "Шаҳодатномаҳои байналмилалии GMP ва ISO",
    gmpSectionDesc: "Шартномаҳои мустақим бо истеҳсолкунандагони пешрафта. Маҳсулоти аслӣ бидуни миёнарав ва кафолати сифат.",

    // Блок 3. Экосистема
    ecosystemTag: "СИНЕРГИЯИ БИЗНЕСИ ХОЛДИНГ",
    ecosystemTitle: "Экосистемаи тиҷорат: аз яклухт то истеъмолкунанда",
    ecosystemSubtitle: "Ҳамгироии бефосилаи таъминоти яклухт, шабакаи чакана ва технологияҳои тиббии рақамӣ.",

    ecosystemBranches: [
      {
        icon: Building2,
        image: "/assets/about/warehouse_hub.jpg",
        badge: "B2B Фарматсия",
        title: "Дистрибутсияи яклухт (B2B Pharma)",
        desc: "Шартномаҳои мустақим бо шабакаҳои дорухонаҳо, дорухонаҳои мустақил ва беморхонаҳо дар саросари кишвар. Таъминоти мунтазам ва шартҳои мусоид.",
        linkText: "Портали яклухти B2B",
        url: "/opt"
      },
      {
        icon: Store,
        image: "/assets/about/aslpharm_pharmacy_hd.webp",
        badge: "Чаканаи дорухона",
        title: "Шабакаҳои дорухонаи ASLPHARM ва САХОВАТ",
        desc: "Шабакаи дорухонаҳои хусусӣ, ки алоқаи мустақимро бо харидор ва мавҷудияти кафолатноки маҳсулотро дар рафҳо таъмин мекунад.",
        linkText: "Шабакаи Саховат (sakhovatapteka.tj) • ASLPHARM (aslpharm.tj)",
        url: "https://sakhovatapteka.tj",
        secondaryUrl: "https://aslpharm.tj"
      },
      {
        icon: Globe,
        image: "/assets/science/vitality.png",
        badge: "Флагмани рақамӣ",
        title: "Платформаи рақамии Toj-Vitamin (B2B / D2C)",
        desc: "Хизматрасонии онлайни баландтехнологӣ бо интихоби инфиродии витаминҳо, мақолаҳои илмӣ ва бахши фармоиш барои дорухонаҳо.",
        linkText: "Ба каталоги Toj-Vitamin гузаред",
        url: "/#catalog"
      }
    ],

    // Блок 4. Логистика ва нигоҳдорӣ
    logisticsTag: "ИНФРАСОХТОР ВА ЛОГИСТИКА",
    logisticsTitle: "Логистикаи анборӣ ва шароити нигоҳдорӣ",
    logisticsSubtitle: "Иқтидорҳои муосири анборӣ ва назорати доимии ҳарорат барои нигоҳдории дурусти иловаҳо ва маҳсулоти фарматсевтӣ.",

    logisticsFeatures: [
      {
        icon: ThermometerSnowflake,
        title: "Назорати нигоҳдории маҳсулот",
        desc: "Мониторинги шабонарӯзии ҳарорат ва намӣ: минтақаҳои салқин ва хушк бо ҳарорати 15–25°C. Анборҳои хусусӣ дар шаҳрҳои Хуҷанд ва Душанбе."
      },
      {
        icon: Truck,
        title: "Автопарки махсус ва интиқоли фаврӣ",
        desc: "Нақлиёти махсус, ки интиқоли фармоишҳоро ба дорухонаҳои Душанбе ва Хуҷанд дар давоми 24 соат ва ба минтақаҳои дурдаст то 48 соат таъмин менамояд."
      },
      {
        icon: Warehouse,
        title: "Нигоҳдории дуруст ва баҳисобгирии силсилаҳо",
        desc: "Минтақабандии анборҳо, ҷудокунии карантинӣ, баҳисобгирии рақамии силсилаҳо ва риояи меъёрҳои санитарӣ."
      },
      {
        icon: ShieldCheck,
        title: "100% Санҷиши сифати воридот",
        desc: "Санҷиши ҳатмии ҳуҷҷатҳои ҳамроҳкунанда, сертификатҳои таҳлил ва мутобиқат бо Хадамоти назорати фаъолияти фарматсевтии Вазорати тандурустии ҶТ."
      }
    ],

    // Блок 5. Таҷриба
    trackRecordTag: "ТАҶРИБА ВА САНДУҚИ БРЕНДҲО",
    trackRecordTitle: "Таҷриба дар бахши иловаҳои биологӣ (Category Track Record)",
    trackRecordSubtitle: "Салоҳияти исботшудаи тиҷоратӣ, мақоми дистрибютори боэътимод ва роҳҳои муосири пешбурди маҳсулот.",

    trackItems: [
      {
        icon: Award,
        title: "Дистрибютори расмии бренди GLS Pharmaceuticals",
        desc: "Таҷрибаи муваффақи ба бозори Тоҷикистон ворид намудан ва дистрибутсияи васеи витаминҳо ва иловаҳои биологӣ дар дорухонаҳо ва онлайн."
      },
      {
        icon: Stethoscope,
        title: "Муносибати ҳамаҷониба ба пешбурд",
        desc: "Ҳамкории доимӣ бо табибони соҳавӣ, нутритсиологҳо, блогерон (UGC) ва барномаҳои омӯзишӣ барои дорусозони дорухонаҳо."
      },
      {
        icon: FileText,
        title: "Бақайдгирии давлатӣ ва нишонагузорӣ",
        desc: "Дастгирии пурраи бақайдгирии иловаҳо дар Вазорати тандурустии ҶТ, гузоштани тамғакоғазҳо ва дастурҳо бо забонҳои тоҷикӣ ва русӣ."
      },
      {
        icon: Activity,
        title: "Хизматрасониҳо барои истеҳсолкунандагони ҷаҳонӣ",
        desc: "Воридоти мустақими хориҷӣ, барасмиятдарории гумрукӣ, паҳнкунӣ дар 700+ дорухона ва ҳифзи бренд аз маҳсулоти қалбакӣ."
      }
    ],

    // Блок 6. Маълумоти ҳуқуқӣ
    legalTag: "ШАФФОФИЯТИ ҲУҚУҚӢ ВА РЕКВИЗИТҲО",
    legalTitle: "Маълумоти ҳуқуқӣ ва литсензияҳо (Compliance & Credentials)",
    legalSubtitle: "Реквизитҳои расмӣ, литсензияҳои тасдиқшуда ва алоқаи мустақим бо роҳбарияти ширкат.",

    legalNameLabel: "Номи пурраи шахси ҳуқуқӣ",
    legalNameVal: "Ҷамъияти дорои масъулияти маҳдуди «Саховати Истаравшан» (LLC \"Sakhovati Istaravshan\")",
    
    hqLabel: "Нишонии ҳуқуқӣ ва воқеии дафтари марказӣ ва анбор",
    hqVal: "Ҷумҳурии Тоҷикистон, вилояти Суғд, шаҳри Хуҷанд, кӯчаи К. Хуҷандӣ 63/3, индекси 735700",

    dushanbeLabel: "Маркази логистикӣ дар шаҳри Душанбе",
    dushanbeVal: "Маркази логистикии Душанбе, Ҷумҳурии Тоҷикистон (таъминот ба вилояти Хатлон ва НТҶ)",

    licenseLabel: "Литсензияи давлатӣ барои фаъолияти фарматсевтӣ",
    licenseVal: "Литсензияи № 0001859, аз ҷониби Хадамоти назорати давлатии фаъолияти фарматсевтии Вазорати тандурустӣ ва ҳифзи иҷтимоии аҳолии ҶТ дода шудааст",

    emailLabel: "Почтаи корпоративӣ / Қабулгоҳ",
    phoneLabel: "Телефони қабулгоҳ бо рамзи байналмилалӣ",
    phoneVal: "+992 176660707",
    whatsappBtn: "Муроҷиат тавассути WhatsApp",
    callBtn: "Занг ба қабулгоҳ",
    backHome: "Ба саҳифаи асосӣ"
  }
};

export default function CorporateAboutPage() {
  const [lang, setLang] = useState<Lang>('ru');

  useEffect(() => {
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
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-black/[0.06] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white shadow-sm border border-black/[0.05] p-1 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
              <Image 
                src="/logo-square.webp" 
                alt="Toj-Vitamin Logo" 
                width={88} 
                height={88} 
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[15px] sm:text-[18px] tracking-tight text-[#1D1D1F] font-outfit leading-tight">
                TOJ-VITAMIN
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 tracking-wider uppercase leading-tight">
                ООО «Саховати Истаравшан»
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <div className="hidden xl:flex items-center gap-6 text-[13px] font-semibold text-[#1D1D1F]/70">
            <a href="#mission" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'History & Mission' : (lang === 'ru' ? 'История и миссия' : 'Таърих ва рисолат')}
            </a>
            <a href="#ecosystem" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'Ecosystem' : (lang === 'ru' ? 'Экосистема' : 'Экосистема')}
            </a>
            <a href="#logistics" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'Logistics & Warehouses' : (lang === 'ru' ? 'Логистика и склады' : 'Логистика ва анборҳо')}
            </a>
            <a href="#track-record" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'Track Record' : (lang === 'ru' ? 'Опыт и бренды' : 'Таҷриба')}
            </a>
            <a href="#compliance" className="hover:text-blue-600 transition-colors">
              {lang === 'en' ? 'Credentials' : (lang === 'ru' ? 'Реквизиты' : 'Маълумоти ҳуқуқӣ')}
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

      {/* ======================================================== */}
      {/* БЛОК 1. ПЕРВЫЙ ЭКРАН (HERO SECTION)                     */}
      {/* ======================================================== */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden border-b border-black/[0.05]">
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

          {/* Main Title: exact required headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1D1D1F] font-outfit leading-[1.2] max-w-4xl mx-auto"
          >
            {t.heroTitle}
          </motion.h1>

          {/* Subtitle: exact required subheadline */}
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
              href="#compliance"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-700 font-bold text-[14px] hover:bg-blue-100 transition-all active:scale-95"
            >
              <Mail size={16} />
              <span>{t.ctaContact}</span>
            </a>
          </motion.div>
        </div>

        {/* Featured Visual Hero Showcase */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
          <div className="relative rounded-[32px] overflow-hidden border border-black/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.12)] bg-slate-900 group">
            <div className="relative h-[280px] sm:h-[420px] lg:h-[480px] w-full">
              <Image
                src="/assets/about/warehouse_hub.jpg"
                alt="Central Pharmaceutical Logistics Hub LLC Sakhovati Istaravshan"
                fill
                priority
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-cover object-center group-hover:scale-[1.02] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
            </div>

            {/* Floating Top Badges */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex flex-wrap gap-2 z-10">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[#1D1D1F] text-[11px] sm:text-[12px] font-bold shadow-md">
                <ThermometerSnowflake size={14} className="text-blue-600" />
                <span>{lang === 'en' ? 'Climate Controlled 15–25°C' : (lang === 'ru' ? 'Контроль температуры 15–25°C' : 'Назорати ҳарорат 15–25°C')}</span>
              </div>
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600/95 backdrop-blur-md text-white text-[11px] sm:text-[12px] font-bold shadow-md">
                <ShieldCheck size={14} />
                <span>{lang === 'en' ? 'State Licensed Importer' : (lang === 'ru' ? 'Лицензия Минздрава РТ' : 'Литсензияи Вазорати тандурустӣ')}</span>
              </div>
            </div>

            {/* Bottom Caption Overlay */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-8 sm:left-8 sm:right-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white z-10">
              <div className="text-left">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-blue-300 block mb-1">
                  {t.heroShowcaseTag}
                </span>
                <h3 className="text-lg sm:text-2xl font-bold font-outfit text-white">
                  {t.heroShowcaseTitle}
                </h3>
                <p className="text-[12px] sm:text-[14px] text-white/80 max-w-2xl mt-1.5 hidden sm:block leading-relaxed">
                  {t.heroShowcaseDesc}
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-start sm:self-end">
                <div className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center">
                  <span className="text-base sm:text-2xl font-extrabold font-outfit text-white block leading-tight">24h</span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/70 block">{lang === 'en' ? 'Dushanbe' : 'Душанбе'}</span>
                </div>
                <div className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center">
                  <span className="text-base sm:text-2xl font-extrabold font-outfit text-white block leading-tight">24h</span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/70 block">{lang === 'en' ? 'Khujand' : 'Худжанд'}</span>
                </div>
                <div className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center">
                  <span className="text-base sm:text-2xl font-extrabold font-outfit text-white block leading-tight">48h</span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/70 block">{lang === 'en' ? 'Regions' : 'Регионы'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ключевые показатели: Инфографика в 4 плашках */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-14 sm:mt-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {t.stats.map((stat, idx) => (
              <div 
                key={idx}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-black/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center flex flex-col justify-center hover:border-blue-500/30 transition-all"
              >
                <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 font-outfit tracking-tight">
                  {stat.number}
                </span>
                <span className="text-[13px] sm:text-[14px] font-bold text-[#1D1D1F] mt-1.5 leading-snug">
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

      {/* ======================================================== */}
      {/* БЛОК 2. ИСТОРИЯ И МИССИЯ КОМПАНИИ (BACKGROUND & MISSION) */}
      {/* ======================================================== */}
      <section id="mission" className="py-16 sm:py-24 bg-white border-b border-black/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em]">
              {t.historyMissionTag}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D1D1F] font-outfit mt-2 tracking-tight">
              {t.historyMissionTitle}
            </h2>
            <p className="mt-3 text-[15px] sm:text-base text-[#1D1D1F]/70">
              {t.historyMissionSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Карточка 1: История */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#FDFBF7] border border-black/[0.06] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-5">
                  <Clock size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] font-outfit">
                  {t.historyTitle}
                </h3>
                <p className="mt-3 text-[14px] sm:text-[15px] text-[#1D1D1F]/70 leading-relaxed">
                  {t.historyDesc}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-black/[0.05] flex items-center text-[12px] font-bold text-amber-700">
                <CheckCircle2 size={16} className="mr-1.5" />
                <span>2003 – {new Date().getFullYear()}</span>
              </div>
            </div>

            {/* Карточка 2: Миссия */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#FDFBF7] border border-black/[0.06] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center mb-5">
                  <HeartHandshake size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] font-outfit">
                  {t.missionTitle}
                </h3>
                <p className="mt-3 text-[14px] sm:text-[15px] text-[#1D1D1F]/70 leading-relaxed">
                  {t.missionDesc}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-black/[0.05] flex items-center text-[12px] font-bold text-blue-600">
                <CheckCircle2 size={16} className="mr-1.5" />
                <span>
                  {lang === 'en' 
                    ? 'Global Quality Standards' 
                    : (lang === 'ru' ? 'Мировые стандарты качества' : 'Стандартҳои ҷаҳонии сифат')}
                </span>
              </div>
            </div>

            {/* Карточка 3: Роль Toj-Vitamin */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#FDFBF7] border border-black/[0.06] flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center mb-5">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] font-outfit">
                  {t.roleTitle}
                </h3>
                <p className="mt-3 text-[14px] sm:text-[15px] text-[#1D1D1F]/70 leading-relaxed">
                  {t.roleDesc}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-black/[0.05] flex items-center text-[12px] font-bold text-emerald-700">
                <CheckCircle2 size={16} className="mr-1.5" />
                <span>
                  {lang === 'en'
                    ? 'Preventive Medicine & B2B/D2C'
                    : (lang === 'ru' ? 'Превентивная медицина & B2B/D2C' : 'Тибби пешгирикунанда & B2B/D2C')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* БЛОК 3. ЭКОСИСТЕМА БИЗНЕСА: ОТ ОПТА ДО ПОТРЕБИТЕЛЯ       */}
      {/* ======================================================== */}
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
              {t.ecosystemSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.ecosystemBranches.map((branch, idx) => {
              const IconComp = branch.icon;
              return (
                <div
                  key={idx}
                  className="rounded-3xl bg-white border border-black/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-xl transition-all group overflow-hidden"
                >
                  <div>
                    {/* Top Image Banner */}
                    <div className="relative h-[210px] w-full overflow-hidden bg-slate-100">
                      <Image
                        src={branch.image}
                        alt={branch.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      <div className="absolute top-3 left-3 z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-blue-700 shadow-sm border border-black/5">
                          {branch.badge}
                        </span>
                      </div>

                      <div className="absolute bottom-3.5 left-4 right-4 z-10 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 border border-white/30">
                          <IconComp size={16} />
                        </div>
                        <span className="text-white text-[15px] font-bold font-outfit drop-shadow-sm leading-snug">
                          {branch.title}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="text-[14px] text-[#1D1D1F]/70 leading-relaxed">
                        {branch.desc}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <div className="pt-4 border-t border-black/[0.05]">
                      {branch.url.startsWith('http') ? (
                        <div className="flex flex-col gap-1.5">
                          <a
                            href={branch.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <span>{branch.linkText}</span>
                            <ArrowUpRight size={14} />
                          </a>
                        </div>
                      ) : (
                        <Link
                          href={branch.url}
                          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <span>{branch.linkText}</span>
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* БЛОК 4. СКЛАДСКАЯ ЛОГИСТИКА И УСЛОВИЯ ХРАНЕНИЯ             */}
      {/* ======================================================== */}
      <section id="logistics" className="py-16 sm:py-24 bg-white border-b border-black/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em]">
              {t.logisticsTag}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D1D1F] font-outfit mt-2 tracking-tight">
              {t.logisticsTitle}
            </h2>
            <p className="mt-3 text-[15px] sm:text-base text-[#1D1D1F]/70">
              {t.logisticsSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {t.logisticsFeatures.map((feat, idx) => {
              const IconComp = feat.icon;
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
                      {feat.title}
                    </h3>
                    <p className="mt-2.5 text-[14px] sm:text-[15px] text-[#1D1D1F]/70 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-black/[0.04] flex items-center text-[12px] font-bold text-blue-600">
                    <CheckCircle2 size={16} className="mr-1.5" />
                    <span>{lang === 'en' ? 'Climate Controlled (15–25°C)' : (lang === 'ru' ? 'Контроль температуры 15–25°C' : 'Назорати ҳарорат 15–25°C')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Photo Showcase: Cold-Chain Fleet & Modern High-Bay Warehouse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Card 1: Refrigerated Delivery Fleet */}
            <div className="relative rounded-[28px] overflow-hidden border border-black/[0.08] shadow-lg group h-[260px] sm:h-[320px] bg-slate-900">
              <Image
                src="/assets/about/delivery_fleet.jpg"
                alt="Pharmaceutical refrigerated delivery fleet"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="absolute top-4 left-4 z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-600 text-white shadow-sm">
                  {t.fleetSectionTag}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-10 text-white">
                <h4 className="text-base sm:text-xl font-bold font-outfit text-white">
                  {t.fleetSectionTitle}
                </h4>
                <p className="text-[12px] sm:text-[13px] text-white/80 mt-1 leading-snug">
                  {t.fleetSectionDesc}
                </p>
              </div>
            </div>

            {/* Card 2: Climate Controlled High-Bay Warehouse */}
            <div className="relative rounded-[28px] overflow-hidden border border-black/[0.08] shadow-lg group h-[260px] sm:h-[320px] bg-slate-900">
              <Image
                src="/assets/about/warehouse_hub.jpg"
                alt="Central climate controlled warehouse multi-tier storage"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="absolute top-4 left-4 z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-600 text-white shadow-sm">
                  {t.warehouseSectionTag}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-10 text-white">
                <h4 className="text-base sm:text-xl font-bold font-outfit text-white">
                  {t.warehouseSectionTitle}
                </h4>
                <p className="text-[12px] sm:text-[13px] text-white/80 mt-1 leading-snug">
                  {t.warehouseSectionDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Regional coverage banner */}
          <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-900 to-[#1D1D1F] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">
                GEOGRAPHIC REACH
              </span>
              <h4 className="text-xl sm:text-2xl font-bold font-outfit">
                {lang === 'en' 
                  ? 'Delivery: 24h Dushanbe & Khujand • Up to 48h Nationwide' 
                  : (lang === 'ru' ? 'Доставка: 24 часа Душанбе и Худжанд • До 48 часов по всей республике' : 'Интиқол: 24 соат Душанбе ва Хуҷанд • То 48 соат дар саросари ҷумҳурӣ')}
              </h4>
              <p className="text-[13px] text-white/70 max-w-xl">
                {lang === 'en' 
                  ? 'Dushanbe • Khujand • Bokhtar • Kulob • Istaravshan • Panjakent • Isfara • Tursunzoda' 
                  : (lang === 'ru' 
                    ? 'Душанбе • Худжанд • Бохтар • Куляб • Истаравшан • Пенджикент • Исфара • Турсунзаде' 
                    : 'Душанбе • Хуҷанд • Бохтар • Кӯлоб • Истаравшан • Панҷакент • Исфара • Турсунзода')}
              </p>
            </div>
            <Link
              href="/opt"
              className="shrink-0 px-6 py-3 rounded-2xl bg-white text-[#1D1D1F] font-bold text-[13px] hover:bg-blue-50 transition-colors shadow-md"
            >
              {lang === 'en' ? 'Open B2B Portal' : (lang === 'ru' ? 'Открыть B2B-портал для аптек' : 'Кушодани бахши B2B')}
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* БЛОК 5. ОПЫТ В КАТЕГОРИИ БАД И ПОРТФЕЛЬ БРЕНДОВ          */}
      {/* ======================================================== */}
      <section id="track-record" className="py-16 sm:py-24 bg-[#FDFBF7] border-b border-black/[0.05]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-[0.2em]">
              {t.trackRecordTag}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D1D1F] font-outfit mt-2 tracking-tight">
              {t.trackRecordTitle}
            </h2>
            <p className="mt-3 text-[15px] sm:text-base text-[#1D1D1F]/70">
              {t.trackRecordSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {t.trackItems.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div
                  key={idx}
                  className="p-6 sm:p-8 rounded-3xl bg-white border border-black/[0.06] hover:border-emerald-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
                        <IconComp size={20} />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-[#1D1D1F] font-outfit">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-[14px] sm:text-[15px] text-[#1D1D1F]/70 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-black/[0.05] flex items-center text-[12px] font-semibold text-emerald-700">
                    <Check size={16} className="mr-1.5" />
                    <span>Commercial Competence & Brand Growth</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Photo Showcase: Laboratory & Manufacturing Quality */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Card 1: Analytical Laboratory Testing */}
            <div className="relative rounded-[28px] overflow-hidden border border-black/[0.08] shadow-lg group h-[260px] sm:h-[300px] bg-slate-900">
              <Image
                src="/assets/science/lab.png"
                alt="Analytical laboratory quality testing"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="absolute top-4 left-4 z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-600 text-white shadow-sm">
                  {t.labSectionTag}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-10 text-white">
                <h4 className="text-base sm:text-xl font-bold font-outfit text-white">
                  {t.labSectionTitle}
                </h4>
                <p className="text-[12px] sm:text-[13px] text-white/80 mt-1 leading-snug">
                  {t.labSectionDesc}
                </p>
              </div>
            </div>

            {/* Card 2: GMP & ISO Certified Manufacturing */}
            <div className="relative rounded-[28px] overflow-hidden border border-black/[0.08] shadow-lg group h-[260px] sm:h-[300px] bg-slate-900">
              <Image
                src="/assets/science/factory.png"
                alt="GMP and ISO certified cleanroom manufacturing"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="absolute top-4 left-4 z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-600 text-white shadow-sm">
                  {t.gmpSectionTag}
                </span>
              </div>
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 z-10 text-white">
                <h4 className="text-base sm:text-xl font-bold font-outfit text-white">
                  {t.gmpSectionTitle}
                </h4>
                <p className="text-[12px] sm:text-[13px] text-white/80 mt-1 leading-snug">
                  {t.gmpSectionDesc}
                </p>
              </div>
            </div>
          </div>

          {/* Compliance Callout Banner */}
          <div className="mt-10 p-6 sm:p-8 rounded-3xl bg-blue-50/70 border border-blue-200/60 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Award size={28} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-lg font-bold text-[#1D1D1F] font-outfit">
                {lang === 'en' ? 'Direct Gateway for Global Manufacturers' : (lang === 'ru' ? 'Прямой шлюз для международных производителей' : 'Дарвозаи мустақим барои истеҳсолкунандагони ҷаҳонӣ')}
              </h4>
              <p className="text-[14px] text-[#1D1D1F]/70 mt-1">
                {lang === 'en'
                  ? 'We act as your authorized national sponsor, handling customs, regulatory dossiers, localization, and omnichannel sales across Tajikistan.'
                  : (lang === 'ru' ? 'Мы выступаем вашим официальным импортером, обеспечивая таможню, регистрацию в Минздраве РТ, локализацию и продажи во всех регионах.' : 'Мо воридкунандаи расмии шумо буда, гумрук, бақайдгирӣ дар Вазорати тандурустӣ ва фурӯшро таъмин менамоем.')}
              </p>
            </div>
            <a
              href="mailto:ceo@toj-vitamin.tj"
              className="shrink-0 px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold text-[13px] hover:bg-blue-700 transition-colors shadow-sm"
            >
              {lang === 'en' ? 'Request Distribution Dossier' : (lang === 'ru' ? 'Запросить досье дистрибьютора' : 'Дархости ҳуҷҷатҳо')}
            </a>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* БЛОК 6. ЮРИДИЧЕСКАЯ ИНФОРМАЦИЯ И ЛИЦЕНЗИИ (COMPLIANCE)    */}
      {/* ======================================================== */}
      <section id="compliance" className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em]">
              {t.legalTag}
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1D1D1F] font-outfit mt-2 tracking-tight">
              {t.legalTitle}
            </h2>
            <p className="mt-3 text-[15px] sm:text-base text-[#1D1D1F]/70">
              {t.legalSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Legal Entity & Licensing */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#FDFBF7] border border-black/[0.06] shadow-sm space-y-6">
              <div>
                <span className="text-[11px] font-bold text-[#1D1D1F]/40 uppercase tracking-wider block mb-1">
                  {t.legalNameLabel}
                </span>
                <p className="text-[15px] font-bold text-[#1D1D1F] font-outfit">
                  {t.legalNameVal}
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
                  Digital Platforms & Brands
                </span>
                <p className="text-[13px] text-[#1D1D1F]/80">
                  • toj-vitamin.tj (Supplements Distribution)<br />
                  • sakhovatapteka.tj (Retail Pharmacy Network)<br />
                  • aslpharm.tj (Digital Ecosystem & App)
                </p>
              </div>
            </div>

            {/* Column 2: Physical Hubs & Warehouses */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#FDFBF7] border border-black/[0.06] shadow-sm space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={16} className="text-blue-600" />
                  <span className="text-[11px] font-bold text-[#1D1D1F]/40 uppercase tracking-wider">
                    {t.hqLabel}
                  </span>
                </div>
                <p className="text-[14px] font-bold text-[#1D1D1F]">
                  {t.hqVal}
                </p>
                <span className="text-[12px] text-[#1D1D1F]/60 block mt-1">
                  {lang === 'en'
                    ? 'Headquarters, central logistics complex, and executive management'
                    : (lang === 'ru' ? 'Головной офис, центральный складской комплекс и руководство' : 'Дафтари асосӣ, маркази логистикӣ ва роҳбарият')}
                </span>
              </div>

              <div className="pt-4 border-t border-black/[0.05]">
                <div className="flex items-center gap-2 mb-1">
                  <Warehouse size={16} className="text-blue-600" />
                  <span className="text-[11px] font-bold text-[#1D1D1F]/40 uppercase tracking-wider">
                    {t.dushanbeLabel}
                  </span>
                </div>
                <p className="text-[14px] font-bold text-[#1D1D1F]">
                  {t.dushanbeVal}
                </p>
                <span className="text-[12px] text-[#1D1D1F]/60 block mt-1">
                  {lang === 'en'
                    ? 'Cross-docking and express delivery across Dushanbe, Khatlon, and RRP'
                    : (lang === 'ru' ? 'Кросс-докинг и экспресс-доставка по Душанбе, Хатлону и РРП' : 'Кросс-докинг ва интиқоли фаврӣ ба Душанбе ва Хатлон')}
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
                  {lang === 'en' ? 'Executive & Distribution Contacts' : (lang === 'ru' ? 'Контакты руководства и дистрибуции' : 'Тамос бо роҳбарият')}
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
                      <span>{t.phoneVal}</span>
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
      <footer className="py-8 bg-[#FDFBF7] border-t border-black/[0.06] text-center text-[12px] text-[#1D1D1F]/50">
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
