import { NextRequest, NextResponse } from 'next/server';
import { generateBannerAI } from '@/lib/agents/generateBannerAI';
import { BannerConfig } from '@/lib/types/banner';

/**
 * Render Banner API — принимает BannerConfig, возвращает base64 JPEG.
 * Используется для ручной перегенерации или при ручной корректировке промпта/стиля.
 */
export async function POST(request: NextRequest) {
  try {
    const config: BannerConfig = await request.json();

    if (!config.products || config.products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Необходимы products' },
        { status: 400 }
      );
    }

    if (!config.imagePrompt) {
      const prodNames = config.products.map(p => p.name).join(' and ');
      config.imagePrompt = `A premium professional advertising studio photography of ${prodNames} placed on a clean minimalist stage, warm volumetric lighting, matching style preset ${config.stylePreset || 'luxury_spa'}.`;
    }

    console.log(`🎨 Render API: Generating banner via AI with ${config.products.length} products...`);
    const bannerUrl = await generateBannerAI(config);
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
