import sharp from 'sharp';

interface ProductImage {
  name: string;
  image_url: string;
}

/**
 * Программный генератор баннеров с градиентным фоном и карточками товаров.
 */
export async function generateBanner(
  headline: string, 
  products: ProductImage[],
  style = 'dark_purple'
): Promise<string> {
  const width = 1080;
  const height = 1080;

  // Определение цветов градиента в зависимости от стиля баннера
  let stop1 = '#0F0C20';
  let stop2 = '#15102A';
  let stop3 = '#06040A';
  let glowColor = '#6366f1';
  let brandingColor = '#6366f1';

  if (style === 'electric_blue') {
    stop1 = '#030712';
    stop2 = '#0B132B';
    stop3 = '#1C2541';
    glowColor = '#3b82f6';
    brandingColor = '#60a5fa';
  } else if (style === 'emerald_mint') {
    stop1 = '#022c22';
    stop2 = '#064e3b';
    stop3 = '#022c22';
    glowColor = '#10b981';
    brandingColor = '#34d399';
  } else if (style === 'warm_sunset') {
    stop1 = '#180808';
    stop2 = '#2D120F';
    stop3 = '#0A0302';
    glowColor = '#f97316';
    brandingColor = '#fb923c';
  }

  // 1. Создаем премиальный градиент в формате SVG
  const bgSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${stop1};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${stop2};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${stop3};stop-opacity:1" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:${glowColor};stop-opacity:0.25" />
          <stop offset="100%" style="stop-color:${glowColor};stop-opacity:0" />
        </radialGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="15" stdDeviation="20" flood-color="#000000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <!-- Задний фон -->
      <rect width="1080" height="1080" fill="url(#bg-grad)" />
      
      <!-- Светящаяся аура за продуктами -->
      <circle cx="540" cy="580" r="450" fill="url(#glow)" />

      <!-- Брендинг сверху -->
      <text x="540" y="100" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="20" fill="${brandingColor}" letter-spacing="6" text-anchor="middle">TOJ-VITAMIN</text>

      <!-- Главный заголовок -->
      <text x="540" y="170" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="44" fill="#ffffff" text-anchor="middle">${escapeHtml(headline)}</text>
      
      <!-- Сноска внизу -->
      <text x="540" y="980" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" fill="#ffffff" opacity="0.4" letter-spacing="1" text-anchor="middle">Подбор сделан искусственным интеллектом • Заказ в Директ</text>
    </svg>
  `;

  // 2. Рассчитываем координаты карточек продуктов
  const cardY = 280;
  let cards: { x: number; y: number; w: number; h: number; imgSize: number }[] = [];

  const count = products.length;
  if (count === 1) {
    cards = [{ x: 320, y: cardY, w: 440, h: 580, imgSize: 360 }];
  } else if (count === 2) {
    cards = [
      { x: 130, y: cardY + 30, w: 380, h: 520, imgSize: 300 },
      { x: 570, y: cardY + 30, w: 380, h: 520, imgSize: 300 }
    ];
  } else {
    // 3 продукта
    cards = [
      { x: 70, y: cardY + 60, w: 290, h: 460, imgSize: 230 },
      { x: 395, y: cardY + 60, w: 290, h: 460, imgSize: 230 },
      { x: 720, y: cardY + 60, w: 290, h: 460, imgSize: 230 }
    ];
  }

  // 3. Генерируем SVG с карточками и их названиями
  let cardsSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  cards.forEach((card, index) => {
    const product = products[index];
    const textX = card.x + card.w / 2;
    const textY = card.y + card.h - 45;
    const shortName = product.name.toUpperCase();

    cardsSvg += `
      <!-- Белая карточка с тенью -->
      <rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" rx="32" fill="#ffffff" filter="url(#shadow)" />
      
      <!-- Название продукта на карточке -->
      <text x="${textX}" y="${textY}" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="15" fill="#111827" text-anchor="middle">${escapeHtml(shortName)}</text>
      <text x="${textX}" y="${textY + 20}" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="11" fill="#6B7280" text-anchor="middle">GREEN LEAF SCIENCES</text>
    `;
  });
  cardsSvg += `</svg>`;

  // 4. Загружаем изображения бутылочек и готовим их к наложению
  const compositions: any[] = [];

  // Добавляем фоновый градиент первым слоем
  let baseImage = sharp(Buffer.from(bgSvg));

  // Накладываем белые карточки
  baseImage = baseImage.composite([{ input: Buffer.from(cardsSvg), top: 0, left: 0 }]);

  // Готовим наложение самих картинок продуктов
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const card = cards[i];

    if (!product.image_url) continue;

    try {
      // Скачиваем изображение продукта
      const response = await fetch(product.image_url);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Масштабируем картинку продукта под размер карточки
      const resizedProductImg = await sharp(imageBuffer)
        .resize(card.imgSize, card.imgSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .toBuffer();

      // Центрируем картинку внутри карточки по горизонтали и вертикали
      const left = Math.round(card.x + (card.w - card.imgSize) / 2);
      const top = Math.round(card.y + 40);

      compositions.push({
        input: resizedProductImg,
        top,
        left
      });
    } catch (err) {
      console.error(`Не удалось обработать изображение для ${product.name}:`, err);
    }
  }

  // Накладываем картинки продуктов поверх карточек
  if (compositions.length > 0) {
    baseImage = baseImage.composite(compositions);
  }

  // Рендерим финальный JPEG
  const finalBuffer = await baseImage.jpeg({ quality: 90 }).toBuffer();
  
  return `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
