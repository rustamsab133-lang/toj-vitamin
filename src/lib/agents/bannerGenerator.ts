import sharp from 'sharp';

interface ProductImage {
  name: string;
  image_url: string;
}

/**
 * Премиальный программный генератор баннеров в стиле Warm Organic Editorial 2026.
 * Поддерживает 4 роскошные современные темы, перекрывающиеся 3D композиции продуктов и реалистичные тени.
 */
export async function generateBanner(
  headline: string, 
  products: ProductImage[],
  style = 'warm_editorial'
): Promise<string> {
  const width = 1080;
  const height = 1920;

  // 1. Определение параметров темы в стиле Warm Organic Editorial 2026
  let bgColor = '#EFEAE2';             // Благородный теплый кремовый беж по умолчанию
  let shadowColor = '#2D2722';         // Цвет тени от листьев
  let textColorPrimary = '#251E18';    // Темно-шоколадный
  let textColorSecondary = '#75695C';  // Кофейный
  let accentColor = '#B88E6F';         // Теплый терракотово-золотой акцент
  let fontTitle = 'Georgia, serif';    // Журнальный шрифт по умолчанию
  let fontBody = 'Georgia, serif';     // Журнальный шрифт для текста по умолчанию
  let styleSubtitle = 'СВЯЗКА ДЛЯ ЗДОРОВЬЯ';
  
  // Дополнительные настройки для разных стилей
  let podiumTopColor = '#EAE0D2';
  let podiumEdgeColor = '#D2C7B7';
  let isGlassPodium = false;
  let shadowOpacity = 0.15;            // Отчетливо видимая тень по умолчанию
  let isWindowsGrid = false;           // Тень в виде окна вместо пальмы (для бетона)
  let isNoShadow = false;

  // Инициализация стилей
  if (style === 'emerald_mint') {
    // Мятный Дзен / Спа-стиль (Насыщенный благородный шалфейный)
    bgColor = '#CEDACF';
    shadowColor = '#1A2D20';
    textColorPrimary = '#1A2D20';
    textColorSecondary = '#5B7F61';
    accentColor = '#5B7F61';
    fontTitle = 'Georgia, serif';
    fontBody = 'system-ui, -apple-system, sans-serif';
    podiumTopColor = '#FAF8F5'; // Каррарский белый мрамор
    podiumEdgeColor = '#E3DDD0';
    styleSubtitle = 'НАТУРАЛЬНЫЙ ОРГАНИК КОМПЛЕКС';
    shadowOpacity = 0.14;
  } else if (style === 'matte_slate') {
    // Бетон и Графит / Спортивный активный стиль (Плотный индустриальный серый)
    bgColor = '#C8CFD3';
    shadowColor = '#1A1D20';
    textColorPrimary = '#1A1D20';
    textColorSecondary = '#4F575E';
    accentColor = '#2B3138';
    fontTitle = 'system-ui, -apple-system, sans-serif'; // Строгий гротеск
    fontBody = 'system-ui, -apple-system, sans-serif';
    podiumTopColor = '#32373C'; // Темный сланец
    podiumEdgeColor = '#1F2225';
    styleSubtitle = 'АТЛЕТИЧЕСКАЯ ФОРМУЛА АКТИВНОСТИ';
    shadowOpacity = 0.15;
    isWindowsGrid = true; // Вместо пальмы - тень от окна
  } else if (style === 'glass_minimal') {
    // Сверхлегкий минимализм со стекломорфизмом в Luxury Dark Mode
    bgColor = '#0D111A';               // Глубокий роскошный темный космос
    shadowColor = '#000000';
    textColorPrimary = '#FFFFFF';      // Белоснежный контрастный
    textColorSecondary = '#94A3B8';    // Серебристо-серый
    accentColor = '#38BDF8';           // Светящийся голубой
    fontTitle = 'system-ui, -apple-system, sans-serif';
    fontBody = 'system-ui, -apple-system, sans-serif';
    isGlassPodium = true;              // Стеклянный подиум
    styleSubtitle = 'НАУЧНЫЙ БИОХАКИНГ И КЛЕТОЧНЫЙ БАЛАНС';
    isNoShadow = true;                 // Без теней листьев, чистая эстетика
    shadowOpacity = 0;
  }

  // 2. Создаем фоновую SVG композицию
  
  // Рендерим пальмовую тень (Warm/Mint) или тень от окна (Slate) или пустой свет (Glass)
  let shadowLayer = '';
  if (isWindowsGrid) {
    // Тень в виде индустриальной оконной рамы для бетонного стиля
    shadowLayer = `
      <g filter="url(#leaf-blur)" fill="${shadowColor}" opacity="${shadowOpacity}" transform="rotate(10, 540, 960)">
        <rect x="100" y="-100" width="80" height="2100" />
        <rect x="400" y="-100" width="80" height="2100" />
        <rect x="700" y="-100" width="80" height="2100" />
        <rect x="-100" y="400" width="2100" height="80" />
        <rect x="-100" y="800" width="2100" height="80" />
        <rect x="-100" y="1200" width="2100" height="80" />
      </g>
    `;
  } else if (!isNoShadow) {
    // Мягкая, эстетичная тень от пальмовых листьев (масштабированная под 9:16)
    shadowLayer = `
      <g filter="url(#leaf-blur)" fill="${shadowColor}" opacity="${shadowOpacity}" transform="scale(1.5) translate(-100, -100)">
        <path d="M-100,-100 C150,150 450,350 700,600" stroke="${shadowColor}" stroke-width="8" fill="none" opacity="0.5" />
        <path d="M20,30 C120,80 280,200 320,300 C260,260 140,120 20,30 Z" />
        <path d="M80,90 C200,150 350,300 400,420 C330,370 210,210 80,90 Z" />
        <path d="M140,150 C280,220 420,400 480,530 C400,470 280,300 140,150 Z" />
        <path d="M200,210 C350,290 500,500 550,650 C480,580 350,380 200,210 Z" />
      </g>
    `;
  }

  // Рендерим подиум (Каменный или Стеклянный) - центрированный по горизонтали
  let podiumLayer = '';
  if (isGlassPodium) {
    // Сверхсовременный матовый стеклянный круг (особый контраст в Dark Mode)
    podiumLayer = `
      <!-- Мягкая светящаяся тень-аура под парящим стеклом -->
      <ellipse cx="540" cy="1380" rx="360" ry="60" fill="url(#podium-shadow)" opacity="0.6" />
      
      <!-- Боковое свечение матового ребра стекла -->
      <ellipse cx="540" cy="1352" rx="340" ry="60" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.4" />
      
      <!-- Тело стеклянной плиты (Glassmorphism) -->
      <ellipse cx="540" cy="1350" rx="340" ry="60" fill="#ffffff" fill-opacity="0.12" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.6" />
    `;
  } else {
    // Премиальный круглый подиум из камня/песчаника
    podiumLayer = `
      <!-- Мягкая тень под подиумом -->
      <ellipse cx="540" cy="1380" rx="370" ry="55" fill="url(#podium-shadow)" />
      
      <!-- Боковая грань подиума (объем) -->
      <path d="M200,1350 A340,60 0 0,0 880,1350 L880,1380 A340,60 0 0,1 200,1380 Z" fill="${podiumEdgeColor}" />
      
      <!-- Верхняя плоскость подиума -->
      <ellipse cx="540" cy="1350" rx="340" ry="60" fill="${podiumTopColor}" stroke="#FAF6F0" stroke-width="1.5" stroke-opacity="0.8" />
    `;
  }

  // Рассчитываем тени под бутылочками в зависимости от их количества
  let productShadows = '';
  const count = products.length;
  const bottleShadowOpacity = isGlassPodium ? '0.35' : '0.25';
  if (count === 1) {
    productShadows = `<ellipse cx="540" cy="1340" rx="140" ry="30" fill="#000000" opacity="${bottleShadowOpacity}" filter="url(#shadow-blur)" />`;
  } else if (count === 2) {
    productShadows = `
      <ellipse cx="410" cy="1335" rx="110" ry="28" fill="#000000" opacity="${parseFloat(bottleShadowOpacity) - 0.03}" filter="url(#shadow-blur)" />
      <ellipse cx="650" cy="1345" rx="120" ry="30" fill="#000000" opacity="${bottleShadowOpacity}" filter="url(#shadow-blur)" />
    `;
  } else {
    // 3 продукта
    productShadows = `
      <ellipse cx="330" cy="1330" rx="90" ry="25" fill="#000000" opacity="${parseFloat(bottleShadowOpacity) - 0.07}" filter="url(#shadow-blur)" />
      <ellipse cx="750" cy="1330" rx="90" ry="25" fill="#000000" opacity="${parseFloat(bottleShadowOpacity) - 0.07}" filter="url(#shadow-blur)" />
      <ellipse cx="540" cy="1345" rx="110" ry="28" fill="#000000" opacity="${parseFloat(bottleShadowOpacity) + 0.03}" filter="url(#shadow-blur)" />
    `;
  }

  const bgSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Фильтр роскошной текстуры штукатурки -->
        <filter id="plaster-texture" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
          <feDiffuseLighting in="noise" lighting-color="#ffffff" surfaceScale="1.2" result="light">
            <feDistantLight azimuth="45" elevation="65" />
          </feDiffuseLighting>
          <feBlend mode="multiply" in="SourceGraphic" in2="light" />
        </filter>

        <!-- Размытие для теней -->
        <filter id="leaf-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id="shadow-blur">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        
        <!-- Мягкая радиальная тень под подиумом -->
        <radialGradient id="podium-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#000000;stop-opacity:${isGlassPodium ? '0.45' : '0.25'}" />
          <stop offset="70%" style="stop-color:#000000;stop-opacity:${isGlassPodium ? '0.15' : '0.08'}" />
          <stop offset="100%" style="stop-color:#000000;stop-opacity:0" />
        </radialGradient>
      </defs>

      <!-- 1. Фоновая матовая стена с штукатуркой (текстуру не накладываем на чистый темный режим для идеального глянца) -->
      <rect width="${width}" height="${height}" fill="${bgColor}" ${style === 'glass_minimal' ? '' : 'filter="url(#plaster-texture)"'} />

      <!-- 2. Световой блик от окна (солнечный зайчик) -->
      <radialGradient id="sunlight" cx="50%" cy="30%" r="70%">
        <stop offset="0%" style="stop-color:${style === 'glass_minimal' ? '#38BDF8' : '#FFFDF9'};stop-opacity:${style === 'glass_minimal' ? '0.15' : '0.5'}" />
        <stop offset="60%" style="stop-color:${style === 'glass_minimal' ? '#38BDF8' : '#FFFDF9'};stop-opacity:${style === 'glass_minimal' ? '0.02' : '0.15'}" />
        <stop offset="100%" style="stop-color:${style === 'glass_minimal' ? '#38BDF8' : '#FFFDF9'};stop-opacity:0" />
      </radialGradient>
      <rect width="${width}" height="${height}" fill="url(#sunlight)" />

      <!-- 3. Накладываем мягкие растительные или оконные тени -->
      ${shadowLayer}

      <!-- 4. Рисуем премиальный подиум -->
      ${podiumLayer}

      <!-- 5. Мягкие контактные тени непосредственно под баночками -->
      ${productShadows}

      <!-- 6. ЭЛЕГАНТНАЯ ЖУРНАЛЬНАЯ ТИПОГРАФИКА (Центрированная вертикальная верстка с динамическими шрифтами) -->
      <g>
        <!-- Бренд-заголовок -->
        <text x="540" y="160" font-family="${fontBody}" font-weight="600" font-size="16" fill="${textColorSecondary}" letter-spacing="8" text-anchor="middle">TOJ-VITAMIN</text>
        
        <!-- Главный оффер (макс 2-3 слова на строке) -->
        ${renderHeadline(headline, textColorPrimary, fontTitle)}
        
        <!-- Изысканная разделительная линия -->
        <line x1="440" y1="450" x2="640" y2="450" stroke="${textColorSecondary}" stroke-width="1.5" opacity="0.3" />

        <!-- Категорийный подзаголовок -->
        <text x="540" y="495" font-family="${fontBody}" font-weight="800" font-size="11" fill="${textColorSecondary}" letter-spacing="3" text-anchor="middle">${styleSubtitle}</text>
        
        <!-- Поддерживающий текст о синергии -->
        <text x="540" y="540" font-family="${fontBody}" font-weight="500" font-size="15" fill="${textColorPrimary}" opacity="0.8" text-anchor="middle">Сбалансированная связка натуральных витаминов</text>
        <text x="540" y="568" font-family="${fontBody}" font-weight="500" font-size="15" fill="${textColorPrimary}" opacity="0.8" text-anchor="middle">для здоровья и жизненной силы.</text>

        <!-- Элегантный бейдж качества -->
        <rect x="470" y="615" width="140" height="30" rx="15" fill="${accentColor}" opacity="${style === 'glass_minimal' ? '0.2' : '0.1'}" />
        <text x="540" y="634" font-family="${fontBody}" font-weight="700" font-size="10" fill="${style === 'glass_minimal' ? '#FFFFFF' : accentColor}" letter-spacing="2" text-anchor="middle">PREMIUM GRADE</text>
      </g>
    </svg>
  `;

  // 3. Рассчитываем координаты и размеры наложения баночек (центрированные, 9:16)
  let cards: { w: number; h: number; left: number; top: number }[] = [];
  
  if (count === 1) {
    // 1 баночка по центру
    const w = 520;
    cards = [{ w, h: w, left: 540 - w/2, top: 850 }];
  } else if (count === 2) {
    // 2 баночки с красивым 3D-перекрытием
    cards = [
      { w: 420, h: 420, left: 170, top: 920 }, // Левая (чуть сзади)
      { w: 470, h: 470, left: 425, top: 880 }  // Правая (спереди, перекрывает левую)
    ];
  } else {
    // 3 баночки в 3D пирамидке
    cards = [
      { w: 360, h: 360, left: 100, top: 980 }, // Левая сзади
      { w: 360, h: 360, left: 620, top: 980 }, // Правая сзади
      { w: 440, h: 440, left: 320, top: 920 }  // Центр спереди (самая большая)
    ];
  }

  // 4. Скачиваем прозрачные PNG баночки и готовим их к наложению
  const compositions: any[] = [];
  let baseImage = sharp(Buffer.from(bgSvg));

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const card = cards[i];

    if (!product.image_url) continue;

    try {
      // Скачиваем прозрачный PNG
      const response = await fetch(product.image_url);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Масштабируем с абсолютно ПРОЗРАЧНЫМ фоном (никаких черных полей!)
      const resizedProductImg = await sharp(imageBuffer)
        .resize(card.w, card.h, { 
          fit: 'contain', 
          background: { r: 0, g: 0, b: 0, alpha: 0 } 
        })
        .toBuffer();

      compositions.push({
        input: resizedProductImg,
        top: card.top,
        left: card.left
      });
    } catch (err) {
      console.error(`Не удалось наложить изображение для ${product.name}:`, err);
    }
  }

  // Накладываем картинки продуктов поверх подиума и фона
  if (compositions.length > 0) {
    baseImage = baseImage.composite(compositions);
  }

  // Рендерим финальный JPEG
  const finalBuffer = await baseImage.jpeg({ quality: 93 }).toBuffer();
  
  return `data:image/jpeg;base64,${finalBuffer.toString('base64')}`;
}

/**
 * Вспомогательная функция для красивого переноса строк заголовка (центрированная для 9:16)
 */
function renderHeadline(headline: string, color: string, font: string): string {
  const words = headline.trim().toUpperCase().split(/\s+/);
  
  // Если заголовок короткий (1-2 слова)
  if (words.length <= 2) {
    return `<text x="540" y="270" font-family="${font}" font-weight="bold" font-size="56" fill="${color}" letter-spacing="1" text-anchor="middle">${escapeHtml(headline.toUpperCase())}</text>`;
  }

  // Разбиваем на две логические строки
  const midIndex = Math.ceil(words.length / 2);
  const line1 = words.slice(0, midIndex).join(' ');
  const line2 = words.slice(midIndex).join(' ');

  return `
    <text x="540" y="270" font-family="${font}" font-weight="bold" font-size="56" fill="${color}" letter-spacing="1" text-anchor="middle">${escapeHtml(line1)}</text>
    <text x="540" y="340" font-family="${font}" font-weight="bold" font-size="56" fill="${color}" letter-spacing="1" text-anchor="middle">${escapeHtml(line2)}</text>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
