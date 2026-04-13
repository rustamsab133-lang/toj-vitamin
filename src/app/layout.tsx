import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

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
  title: "tojvitamin.tj | Интернет-магазин витаминов и БАДов",
  description: "Экспертный маркетплейс витаминов и биодобавок в Таджикистане. Квалифицированный подбор и научный подход Green Leaf Sciences.",
  keywords: ["купить витамины", "интернет-магазин БАД", "Таджикистан", "Душанбе", "витамины GLS", "tojvitamin"],
  icons: {
    icon: "/logo.webp",
    apple: "/logo.webp",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${outfit.variable}`}>
      <body className="bg-[#FDFBF7] antialiased font-sans">
        <div className="w-full min-h-screen overflow-x-hidden flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
