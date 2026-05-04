import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: '#FDFBF7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const inter = Inter({ 
  subsets: ["latin", "cyrillic"], 
  display: "swap",
  variable: "--font-inter",
});

const outfit = Outfit({ 
  subsets: ["latin"], 
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.toj-vitamin.tj'),
  alternates: {
    canonical: '/',
    languages: {
      'ru-TJ': '/ru',
      'tg-TJ': '/tj',
    },
  },
  title: {
    default: "Наука Здоровья: Премиальные Витамины №1 в Таджикистане | Купить Витамины в Душанбе",
    template: "%s | toj-vitamin.tj"
  },
  description: "Экспертный медицинский маркетплейс витаминов и БАДов в Таджикистане. Квалифицированный подбор нутрицевтиков и научный подход Green Leaf Sciences. Бесплатная консультация и доставка по Душанбе.",
  keywords: [
    "купить витамины", "купить витамины в Душанбе", "витамины в Таджикистане", 
    "лучшие БАДы Душанбе", "Green Leaf Sciences Таджикистан", "GLS Душанбе", 
    "магазин витаминов Таджикистан", "витаминҳо харидан Душанбе", 
    "иловаҳои биологӣ Тоҷикистон", "нутрицевтики", "здоровье Душанбе",
    "спортивное питание Таджикистан", "витамины для женщин Душанбе",
    "витамины для мужчин Таджикистан",
    "tojvitamin", "toj vitamin", "toj-vitamin", "тожвитамин", "тож-витамин", "тоджвитамин",
    "точвитамин", "тачвитамин", "точ-витамин", "тач-витамин", "taj-vitamin", "tajvitamin",
    "таджвитамин", "тадж-витамин", "тодж-витамин", "vitamin tj", "vitamin.tj", "витамин тч", "витамин.тч"
  ],
  authors: [{ name: "Green Leaf Sciences", url: "https://www.toj-vitamin.tj" }],
  
  // Open Graph (Instagram, Telegram, WhatsApp)
  openGraph: {
    type: "website",
    locale: "ru_RU",
    alternateLocale: ["tj_TJ"],
    url: "https://www.toj-vitamin.tj",
    siteName: "toj-vitamin",
    title: "toj-vitamin.tj | Научный подход к вашему здоровью",
    description: "Премиальные витамины и биодобавки с бесплатной консультацией в Таджикистане. Наука за гранью возможного.",
    images: [
      {
        url: "/og-large-logo.png",
        width: 1200,
        height: 630,
        alt: "toj-vitamin - Green Leaf Sciences",
      },
    ],
  },

  // Twitter / Instagram Cards
  twitter: {
    card: "summary_large_image",
    title: "toj-vitamin.tj | Витамины и БАДы №1 в Таджикистане",
    description: "Научный подход к подбору витаминов. Экспертиза Green Leaf Sciences.",
    images: ["/og-large-logo.png"],
  },

  // Icons
  icons: {
    icon: [
      { url: "/logo.webp" },
      { url: "/logo.webp", sizes: "32x32", type: "image/webp" },
    ],
    apple: [
      { url: "/logo.webp", sizes: "180x180", type: "image/webp" },
    ],
  },

  // Verification
  verification: {
    google: "QiaIKS3u2_foIbgWDcLs8zncEa5ABq9zhx5jULwtG7A",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID || 'G-4FRDH17FRC'}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID || 'G-4FRDH17FRC'}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
             __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${process.env.NEXT_PUBLIC_FB_PIXEL_ID || ''}');
              fbq('track', 'PageView');
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "toj-vitamin",
                "alternateName": [
                  "tojvitamin", 
                  "тожвитамин", 
                  "тож-витамин", 
                  "toj vitamin", 
                  "точвитамин", 
                  "точ-витамин", 
                  "тачвитамин", 
                  "таджвитамин", 
                  "тадж-витамин", 
                  "тоджвитамин", 
                  "tajvitamin", 
                  "taj-vitamin", 
                  "vitamin tj", 
                  "vitamin.tj", 
                  "витамин тч",
                  "витамин.тч"
                ],
                "url": "https://www.toj-vitamin.tj",
                "logo": "https://www.toj-vitamin.tj/logo.webp",
                "contactPoint": {
                  "@type": "ContactPoint",
                  "telephone": "+992176660707",
                  "contactType": "customer service",
                  "areaServed": "TJ",
                  "availableLanguage": ["ru", "tg"]
                },
                "sameAs": [
                  "https://www.instagram.com/toj_vitamin",
                ]
              },
              {
                "@context": "https://schema.org",
                "@type": "MedicalBusiness",
                "name": "Green Leaf Sciences (toj-vitamin.tj)",
                "image": "https://www.toj-vitamin.tj/og-image.png",
                "@id": "https://www.toj-vitamin.tj",
                "url": "https://www.toj-vitamin.tj",
                "telephone": "+992176660707",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "Душанбе",
                  "addressLocality": "Душанбе",
                  "postalCode": "734000",
                  "addressCountry": "TJ"
                },
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": 38.57,
                  "longitude": 68.78
                },
                "openingHoursSpecification": {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday"
                  ],
                  "opens": "09:00",
                  "closes": "21:00"
                }
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "url": "https://www.toj-vitamin.tj",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://www.toj-vitamin.tj/?search={search_term_string}"
                  },
                  "query-input": "required name=search_term_string"
                }
              },
              {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Главная",
                    "item": "https://www.toj-vitamin.tj"
                  }
                ]
              }
            ])
          }}
        />
      </head>
      <body className="bg-[#FDFBF7] antialiased font-sans">
        <div className="w-full min-h-screen overflow-x-hidden flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
