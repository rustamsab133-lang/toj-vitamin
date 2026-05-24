/**
 * Instagram AI Agent 2.0 — Типы и конфигурации
 */

export interface BannerConfig {
  // Цвета
  bgColor: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;

  // Типографика
  headline: string;
  subtitle: string;
  fontSize: number;       // 40-90px

  // Товары
  products: BannerProduct[];

  // Расположение фото
  photoSize: number;      // 300-600px
  photoAngle: number;     // -20 to +20 degrees
  photoLayout: 'center' | 'duo' | 'pyramid';

  // Текстовый блок
  textPosition: 'top' | 'bottom';

  // Caption для Instagram
  caption: string;
}

export interface BannerProduct {
  id: string;
  name: string;
  image_url: string;
  synergy_reason?: string;
  x?: number;        // X координата в процентах (0-100)
  y?: number;        // Y координата в процентах (0-100)
  scale?: number;     // Масштаб (например, 0.5 - 2.0)
  rotation?: number;  // Угол наклона в градусах (-180 до 180)
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  bannerConfig?: Partial<BannerConfig>;
}

export interface AgentSession {
  id: string;
  messages: ChatMessage[];
  bannerConfig: BannerConfig;
  caption: string;
  created_at: string;
  updated_at: string;
}

// 6 предустановленных тем
export const BANNER_THEMES: Record<string, {
  name: string;
  emoji: string;
  bgColor: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
}> = {
  cream: {
    name: 'Кремовый',
    emoji: '🧁',
    bgColor: '#EFEAE2',
    textPrimary: '#251E18',
    textSecondary: '#75695C',
    accentColor: '#B88E6F',
  },
  chocolate: {
    name: 'Шоколадный',
    emoji: '🍫',
    bgColor: '#2D2722',
    textPrimary: '#FAFAF8',
    textSecondary: '#B8A99A',
    accentColor: '#D4A574',
  },
  mint: {
    name: 'Мятный',
    emoji: '🌿',
    bgColor: '#E8F0E8',
    textPrimary: '#1A2D20',
    textSecondary: '#5B7F61',
    accentColor: '#4CAF72',
  },
  indigo: {
    name: 'Индиго',
    emoji: '💎',
    bgColor: '#1E1B3A',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    accentColor: '#818CF8',
  },
  white: {
    name: 'Белый',
    emoji: '⬜',
    bgColor: '#FFFFFF',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    accentColor: '#EC4899',
  },
  black: {
    name: 'Чёрный',
    emoji: '⬛',
    bgColor: '#0A0A0A',
    textPrimary: '#FAFAFA',
    textSecondary: '#737373',
    accentColor: '#F59E0B',
  },
};

export const DEFAULT_BANNER_CONFIG: BannerConfig = {
  bgColor: '#EFEAE2',
  textPrimary: '#251E18',
  textSecondary: '#75695C',
  accentColor: '#B88E6F',
  headline: '',
  subtitle: 'TOJ-VITAMIN',
  fontSize: 56,
  products: [],
  photoSize: 420,
  photoAngle: 0,
  photoLayout: 'center',
  textPosition: 'top',
  caption: '',
};
