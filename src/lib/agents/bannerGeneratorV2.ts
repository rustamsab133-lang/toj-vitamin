import path from 'path';

// Configure Fontconfig for Vercel Serverless and local development
const fontconfigPath = path.join(process.cwd(), 'public/fonts/fonts.conf');
process.env.FONTCONFIG_FILE = fontconfigPath;
process.env.FONTCONFIG_PATH = path.join(process.cwd(), 'public/fonts');

import sharp from 'sharp';
import { BannerConfig } from '@/lib/types/banner';

let cachedMontserratBold = '';
let cachedMontserratRegular = '';

async function loadFonts(): Promise<{ bold: string; regular: string }> {
  if (cachedMontserratBold && cachedMontserratRegular) {
    return { bold: cachedMontserratBold, regular: cachedMontserratRegular };
  }

  try {
    console.log('📥 Loading Montserrat fonts for banner generator V2...');
    const [boldRes, regRes] = await Promise.all([
      fetch('https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-Bold.ttf'),
      fetch('https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-Regular.ttf')
    ]);

    if (!boldRes.ok || !regRes.ok) throw new Error(`Font download failed`);

    const [boldBuf, regBuf] = await Promise.all([
      boldRes.arrayBuffer(),
      regRes.arrayBuffer()
    ]);

    cachedMontserratBold = Buffer.from(boldBuf).toString('base64');
    cachedMontserratRegular = Buffer.from(regBuf).toString('base64');
    console.log('✅ Montserrat fonts cached.');
  } catch (err) {
    console.error('⚠️ Font loading error, using system fonts:', err);
  }

  return { bold: cachedMontserratBold, regular: cachedMontserratRegular };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Разбивает заголовок на строки для SVG text элементов.
 * Макс ~20 символов на строку для крупного шрифта.
 */
function splitHeadline(headline: string, maxCharsPerLine = 18): string[] {
  const words = headline.trim().toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine && (currentLine + ' ' + word).length > maxCharsPerLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Рассчитывает позиции для фото товаров на основе layout и photoSize.
 */
function calculateProductPositions(
  count: number,
  photoSize: number,
  photoAngle: number,
  layout: 'center' | 'duo' | 'pyramid',
  photoY: number
): { left: number; top: number; w: number; h: number; rotation: number }[] {
  const canvasW = 1080;

  if (count === 0) return [];

  if (count === 1 || layout === 'center') {
    // Все товары по центру с небольшим сдвигом
    if (count === 1) {
      return [{
        left: Math.round((canvasW - photoSize) / 2),
        top: photoY,
        w: photoSize,
        h: photoSize,
        rotation: photoAngle,
      }];
    }
    // Для 2-3 товаров в режиме center — горизонтальный ряд
    const gap = 20;
    const itemW = Math.round(photoSize * 0.85);
    const totalW = count * itemW + (count - 1) * gap;
    const startX = Math.round((canvasW - totalW) / 2);
    return Array.from({ length: count }, (_, i) => ({
      left: startX + i * (itemW + gap),
      top: photoY,
      w: itemW,
      h: itemW,
      rotation: i === 0 ? -photoAngle : i === count - 1 ? photoAngle : 0,
    }));
  }

  if (layout === 'duo' && count >= 2) {
    const mainSize = photoSize;
    const secondSize = Math.round(photoSize * 0.85);
    return [
      {
        left: Math.round(canvasW / 2 - mainSize - 10),
        top: photoY + Math.round((mainSize - secondSize) / 2),
        w: secondSize,
        h: secondSize,
        rotation: -Math.abs(photoAngle) || -5,
      },
      {
        left: Math.round(canvasW / 2 + 10),
        top: photoY,
        w: mainSize,
        h: mainSize,
        rotation: Math.abs(photoAngle) || 5,
      },
      // Третий товар (если есть) — мелкий по центру снизу
      ...(count >= 3 ? [{
        left: Math.round((canvasW - secondSize * 0.7) / 2),
        top: photoY + mainSize - Math.round(secondSize * 0.3),
        w: Math.round(secondSize * 0.7),
        h: Math.round(secondSize * 0.7),
        rotation: 0,
      }] : []),
    ].slice(0, count);
  }

  if (layout === 'pyramid' && count >= 2) {
    const mainSize = photoSize;
    const sideSize = Math.round(photoSize * 0.75);
    if (count === 2) {
      return [
        { left: Math.round(canvasW / 2 - sideSize - 30), top: photoY + 40, w: sideSize, h: sideSize, rotation: -(Math.abs(photoAngle) || 8) },
        { left: Math.round(canvasW / 2 + 30), top: photoY + 40, w: sideSize, h: sideSize, rotation: Math.abs(photoAngle) || 8 },
      ];
    }
    return [
      { left: Math.round(canvasW / 2 - sideSize - 60), top: photoY + 60, w: sideSize, h: sideSize, rotation: -(Math.abs(photoAngle) || 8) },
      { left: Math.round(canvasW / 2 + 60), top: photoY + 60, w: sideSize, h: sideSize, rotation: Math.abs(photoAngle) || 8 },
      { left: Math.round((canvasW - mainSize) / 2), top: photoY - 20, w: mainSize, h: mainSize, rotation: 0 },
    ];
  }

  // Fallback
  return [{
    left: Math.round((canvasW - photoSize) / 2),
    top: photoY,
    w: photoSize,
    h: photoSize,
    rotation: photoAngle,
  }];
}

/**
 * Генератор баннеров V2 — чистый минимализм.
 * Только: однотонный фон + Montserrat + текст + фото товаров.
 */
export async function generateBannerV2(config: BannerConfig): Promise<string> {
  const width = 1080;
  const height = 1920;

  const { bold: base64Bold, regular: base64Reg } = await loadFonts();

  let fontStyles = '';
  let fontFamily = "'DejaVu Sans', 'Liberation Sans', sans-serif";
  if (base64Bold && base64Reg) {
    fontStyles = `
      @font-face {
        font-family: 'MontserratCustom';
        src: url(data:font/truetype;charset=utf-8;base64,${base64Reg}) format('truetype');
        font-weight: normal;
      }
      @font-face {
        font-family: 'MontserratCustom';
        src: url(data:font/truetype;charset=utf-8;base64,${base64Bold}) format('truetype');
        font-weight: bold;
      }
    `;
    fontFamily = "Montserrat, 'MontserratCustom', 'DejaVu Sans', sans-serif";
  }

  const {
    bgColor, textPrimary, textSecondary, accentColor,
    headline, subtitle, fontSize,
    products, photoSize, photoAngle, photoLayout,
    textPosition,
  } = config;

  // Рассчитываем зоны
  const headlineLines = splitHeadline(headline || '', Math.round(800 / (fontSize * 0.6)));
  const textBlockHeight = headlineLines.length * (fontSize + 12) + 120; // headline + subtitle + brand + padding
  
  let textStartY: number;
  let photoStartY: number;

  if (textPosition === 'bottom') {
    photoStartY = 160;
    textStartY = height - textBlockHeight - 100;
  } else {
    // top (default)
    textStartY = 120;
    photoStartY = textStartY + textBlockHeight + 60;
  }

  // Рассчитываем позиции фото
  const productCount = Math.min(products.length, 3);
  const positions = calculateProductPositions(
    productCount, photoSize, photoAngle, photoLayout, photoStartY
  );

  // Построение SVG — чистый минимализм
  const brandY = textStartY;
  const headlineStartY = brandY + 50;
  const accentLineY = headlineStartY + headlineLines.length * (fontSize + 12) + 10;
  const subtitleY = accentLineY + 35;

  const headlineElements = headlineLines.map((line, i) => {
    const y = headlineStartY + i * (fontSize + 12);
    return `<text x="540" y="${y}" font-family="${fontFamily}" font-weight="bold" font-size="${fontSize}" fill="${escapeHtml(textPrimary)}" letter-spacing="1" text-anchor="middle" dominant-baseline="hanging">${escapeHtml(line)}</text>`;
  }).join('\n');

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>${fontStyles}</style>
      </defs>

      <!-- Однотонный фон -->
      <rect width="${width}" height="${height}" fill="${escapeHtml(bgColor)}" />

      <!-- Бренд -->
      <text x="540" y="${brandY}" font-family="${fontFamily}" font-weight="600" font-size="16" fill="${escapeHtml(textSecondary)}" letter-spacing="8" text-anchor="middle" dominant-baseline="hanging">${escapeHtml(subtitle || 'TOJ-VITAMIN')}</text>

      <!-- Заголовок -->
      ${headlineElements}

      <!-- Акцентная линия -->
      <line x1="440" y1="${accentLineY}" x2="640" y2="${accentLineY}" stroke="${escapeHtml(accentColor)}" stroke-width="2.5" opacity="0.6" />

      <!-- Подтекст -->
      <text x="540" y="${subtitleY}" font-family="${fontFamily}" font-weight="500" font-size="15" fill="${escapeHtml(textSecondary)}" text-anchor="middle" dominant-baseline="hanging">Синергетическая связка витаминов</text>
    </svg>
  `;

  // Рендерим базовый SVG
  let baseImage = sharp(Buffer.from(svg));

  // Скачиваем и накладываем фото товаров
  const compositions: { input: Buffer; top: number; left: number; layerIndex: number }[] = [];

  for (let i = 0; i < productCount; i++) {
    const product = products[i];
    const pos = positions[i];
    if (!product?.image_url || !pos) continue;

    try {
      const response = await fetch(product.image_url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      let productSharp = sharp(imageBuffer);
      if (pos.rotation) {
        productSharp = productSharp.rotate(pos.rotation, {
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        });
      }

      const resized = await productSharp
        .resize(pos.w, pos.h, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();

      compositions.push({
        input: resized,
        top: pos.top,
        left: pos.left,
        layerIndex: i,
      });
    } catch (err) {
      console.error(`⚠️ Failed to overlay product ${product.name}:`, err);
    }
  }

  // Сортируем по layerIndex и накладываем
  compositions.sort((a, b) => a.layerIndex - b.layerIndex);
  const cleanCompositions = compositions.map(c => ({
    input: c.input,
    top: c.top,
    left: c.left,
  }));

  if (cleanCompositions.length > 0) {
    baseImage = baseImage.composite(cleanCompositions);
  }

  const finalBuffer = await baseImage.jpeg({ quality: 93 }).toBuffer();
  return `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;
}
