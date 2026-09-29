import React from 'react';
import { Metadata } from 'next';
import { getCatalogData } from '@/lib/catalogData';
import CatalogView from '@/components/catalog/CatalogView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Каталог продукции TOJ-VITAMIN | Витамины и схемы приема',
  description: 'Официальный каталог витаминов и БАД GLS Pharmaceuticals в Таджикистане. Подробные схемы приема, дозировки, актуальные цены и доставка по Душанбе и регионам.',
};

export default async function CatalogPage() {
  const data = await getCatalogData('retail');

  return <CatalogView initialData={data} />;
}
