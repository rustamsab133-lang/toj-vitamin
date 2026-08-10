import { genAI } from '../gemini';
import { BannerConfig } from '../types/banner';

function getAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const absoluteUrl = getAbsoluteUrl(url);
  const res = await fetch(absoluteUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image from ${absoluteUrl}: ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = res.headers.get('content-type') || 'image/png';
  return {
    data: buffer.toString('base64'),
    mimeType,
  };
}

export function buildBrandSystemPrompt(config: BannerConfig): string {
  let styleRules = '';
  switch (config.stylePreset) {
    case 'luxury_spa':
      styleRules = 'Create a premium, elegant, and calming atmosphere. Use soft, warm, natural lighting, travertine or marble textures, organic wood, botanical elements, and a clean minimalist aesthetic. The mood should feel like a high-end spa, wellness retreat, or premium boutique brand.';
      break;
    case 'sport_energy':
      styleRules = 'Create an energetic, dynamic, and powerful atmosphere. Use sharp shadows, dramatic lighting (e.g. key light from the side), slate, concrete, dark obsidian or dark stone textures, and a bold modern look. The mood should feel strong, motivating, and full of energy.';
      break;
    case 'clinical_science':
      styleRules = 'Create a clean, precise, and scientific atmosphere. Use bright, even, clinical white/blue lighting, clean glass, sterile laboratory surfaces, or minimalist medical backgrounds. The mood should feel authoritative, clinically proven, trusted, and evidence-based.';
      break;
    case 'editorial_magazine':
      styleRules = 'Create a highly stylized, artistic, and fashionable look, resembling a luxury magazine advertisement or a split editorial layout. Bold composition, rich textures, studio background, and designer placement of elements. The mood should feel sophisticated, modern, and high-fashion.';
      break;
  }

  return `You are a professional digital artist and advertising banner designer for the health and supplement brand "TOJ-VITAMIN" (Точвитамин).
Your task is to generate a high-fidelity, photorealistic advertisement banner matching the requested style and product composition.

BRAND IDENTITY & DESIGN RULES:
- Brand Name: "TOJ-VITAMIN" (always use this exact capitalization).
- Overall aesthetic: clean, premium, modern, professional, minimalist. No cheap clip-art, no messy clutter, no low-quality elements.
- Lighting & shadows: realistic, volumetric shadows and lighting matching the environment.
- Typography / Text: You MUST write the headline text on the banner. The text must be in clean, elegant, legible font (matching the style), perfectly spelled, and clearly visible.
- Text Content:
  * Brand Subtitle: "${config.subtitle || 'TOJ-VITAMIN'}"
  * Main Headline: "${config.headline}" (Render this headline clearly on the banner in Russian).

STYLE & PREET DIRECTIVES:
${styleRules}

COMPOSITION RULES:
- Layout aspect ratio is ${config.aspectRatio}.
- Place the products (references provided) realistically in the scene. Integrate them naturally so they cast realistic shadows, catch the scene lighting, and look like they were photographed in that environment.
- Preserve the exact product packaging, bottle shape (green plastic jars), labels, colors, and branding elements of the provided products. Do not distort, blur, or hallucinate the label design.
- The composition should be well-balanced. Text should not overlap products in a messy way. Avoid placing text in areas where it is hard to read.
`;
}

export async function generateBannerAI(config: BannerConfig): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' });

  const parts: any[] = [];

  // 1. Add Brand system instructions
  parts.push({ text: buildBrandSystemPrompt(config) });

  // 2. Add product images as reference
  for (const product of config.products) {
    if (product.image_url) {
      try {
        const { data, mimeType } = await fetchImageAsBase64(product.image_url);
        parts.push({
          inlineData: {
            data,
            mimeType
          }
        });
        parts.push({
          text: `This is the product packaging reference for "${product.name}". Place this exact bottle in the scene. Maintain its exact colors, design, and label.`
        });
      } catch (err) {
        console.error(`Error loading reference image for product ${product.name}:`, err);
      }
    }
  }

  // 3. Add final scene prompt
  parts.push({ text: `Scene description: ${config.imagePrompt}` });

  // Add layout/aspect ratio instruction
  parts.push({ text: `Ensure the output image has a ${config.aspectRatio} aspect ratio.` });

  console.log(`🎨 Generating banner via Gemini 3 Pro Image (Nano Banana Pro)... Prompt: "${config.imagePrompt.substring(0, 100)}..."`);
  
  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
    } as any,
  } as any);

  const response = result.response;
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error('No candidates returned from Gemini Image API');
  }

  const imagePart = candidates[0].content.parts.find((p: any) => p.inlineData);
  if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
    throw new Error('Response did not contain inline image data');
  }

  return `data:image/jpeg;base64,${imagePart.inlineData.data}`;
}
