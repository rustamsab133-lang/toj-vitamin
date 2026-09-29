import { NextResponse } from 'next/server';
import { getCatalogData } from '@/lib/catalogData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const priceType = (searchParams.get('priceType') as 'retail' | 'wholesale' | 'none') || 'retail';
    
    const data = await getCatalogData(priceType);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/catalog/data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch catalog data' },
      { status: 500 }
    );
  }
}
