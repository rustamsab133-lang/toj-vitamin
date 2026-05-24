import { NextRequest, NextResponse } from 'next/server';
import { generateBannerV2 } from '@/lib/agents/bannerGeneratorV2';
import { BannerConfig } from '@/lib/types/banner';

/**
 * Render Banner API — принимает BannerConfig, возвращает base64 JPEG.
 * Используется для ручного обновления слайдерами без вызова агента.
 */
export async function POST(request: NextRequest) {
  try {
    const config: BannerConfig = await request.json();

    if (!config.headline || !config.products || config.products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Необходимы headline и products' },
        { status: 400 }
      );
    }

    console.log(`🎨 Render API: Generating banner with ${config.products.length} products...`);
    const bannerUrl = await generateBannerV2(config);
    console.log('✅ Render API: Banner generated.');

    return NextResponse.json({ success: true, bannerUrl });
  } catch (error: any) {
    console.error('❌ Render API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
