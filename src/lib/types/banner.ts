/**
 * Instagram AI Agent 3.0 — Типы и конфигурации
 */

export interface BannerConfig {
  // Контент
  headline: string;
  subtitle: string;
  caption: string;           // Текст подписи для Instagram поста (AIDA)
  products: BannerProduct[];

  // Настройки ИИ-генерации (Gemini 3 Pro Image / Nano Banana Pro)
  imagePrompt: string;       // Детальный промпт для генерации сцены
  stylePreset: 'luxury_spa' | 'sport_energy' | 'clinical_science' | 'editorial_magazine';
  aspectRatio: '9:16' | '4:5' | '1:1' | '16:9';

  // Результат
  bannerUrl?: string;        // Сгенерированный баннер (base64 или URL)
}

export interface BannerProduct {
  id: string;
  name: string;
  image_url: string;
  synergy_reason?: string;
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

export const DEFAULT_BANNER_CONFIG: BannerConfig = {
  headline: '',
  subtitle: 'TOJ-VITAMIN',
  caption: '',
  products: [],
  imagePrompt: '',
  stylePreset: 'luxury_spa',
  aspectRatio: '9:16',
  bannerUrl: '',
};
