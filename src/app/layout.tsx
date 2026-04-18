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
    default: "Наука Здоровья: Премиальные Витамины №1 в Таджикистане | toj-vitamin.tj",
    template: "%s | tojvitamin"
  },
  description: "Экспертный медицинский маркетплейс витаминов и БАДов в Таджикистане. Квалифицированный подбор нутрицевтиков и научный подход Green Leaf Sciences.",
  keywords: ["купить витамины", "витамины Душанбе", "БАД Таджикистан", "Green Leaf Sciences", "GLS", "tojvitamin", "витаминҳо", "иловаҳои биологӣ"],
  authors: [{ name: "Green Leaf Sciences" }],
  
  // Open Graph (Instagram, Telegram, WhatsApp)
  openGraph: {
    type: "website",
    locale: "ru_RU",
    alternateLocales: ["tj_TJ"],
    url: "https://www.toj-vitamin.tj",
    siteName: "tojvitamin",
    title: "tojvitamin.tj | Научный подход к вашему здоровью",
    description: "Премиальные витамины и биодобавки с бесплатной консультацией в Таджикистане. Наука за гранью возможного.",
    images: [
      {
        url: "/og-image-v2.png",
        width: 1200,
        height: 630,
        alt: "tojvitamin - Green Leaf Sciences",
      },
    ],
  },

  // Twitter / Instagram Cards
  twitter: {
    card: "summary_large_image",
    title: "tojvitamin.tj | Витамины и БАДы №1 в Таджикистане",
    description: "Научный подход к подбору витаминов. Экспертиза Green Leaf Sciences.",
    images: ["/og-image-v2.png"],
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
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID || ''}', {
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
