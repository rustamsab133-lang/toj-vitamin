export interface ThemeColors {
  bg: string;
  glow: string;
  text: string;
  primary?: string;
}

export const ZONE_THEMES: Record<string, ThemeColors> = {
  'energy': { bg: '#FFF7ED', glow: 'rgba(251, 146, 60, 0.15)', text: '#C2410C' },
  'sport': { bg: '#FFF7ED', glow: 'rgba(251, 146, 60, 0.15)', text: '#C2410C' },
  'brain': { bg: '#F5F3FF', glow: 'rgba(139, 92, 246, 0.15)', text: '#6D28D9' },
  'sleep': { bg: '#F5F3FF', glow: 'rgba(139, 92, 246, 0.15)', text: '#6D28D9' },
  'immune': { bg: '#F0FDF4', glow: 'rgba(34, 197, 94, 0.15)', text: '#15803D' },
  'detox': { bg: '#F0FDF4', glow: 'rgba(34, 197, 94, 0.15)', text: '#15803D' },
  'beauty': { bg: '#FFF1F2', glow: 'rgba(244, 63, 94, 0.15)', text: '#BE123C' },
  'heart': { bg: '#FFF1F2', glow: 'rgba(244, 63, 94, 0.15)', text: '#BE123C' },
  'vitamins': { bg: '#F0FDFA', glow: 'rgba(20, 184, 166, 0.15)', text: '#0F766E' },
  'default': { bg: '#FDFBF7', glow: 'rgba(29, 29, 31, 0.03)', text: '#1D1D1F' }
};

export const getTheme = (zone: string): ThemeColors => {
  return ZONE_THEMES[zone] || ZONE_THEMES.default;
};
