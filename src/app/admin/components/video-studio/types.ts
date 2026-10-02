export interface SelectedProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  dosage?: string;
  activeIngredients?: string[];
  category?: string;
}

export interface HudOverlay {
  id: string;
  type: 'pointer' | 'stat_badge' | 'formula' | 'gmp_seal' | 'synergy_bar';
  label: string;
  sublabel?: string;
  value?: string;
  color?: string; // e.g. '#10B981', '#6366F1'
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

export interface VideoScene {
  id: string;
  index: number;
  type: 'hook' | 'problem' | 'moa_action' | 'synergy' | 'offer';
  title: string;
  durationSeconds: number;
  voiceoverText: string;
  visualAssetId: string;
  visualPrompt?: string;
  hudOverlays: HudOverlay[];
  productFocusIds: string[];
  accentColor?: string;
  transition?: 'fade' | 'zoom_in' | 'slide';
}

export interface VideoProject {
  id: string;
  title: string;
  targetAudience: string;
  focusAngle: string;
  selectedProducts: SelectedProduct[];
  scenes: VideoScene[];
  aspectRatio: '9:16' | '1:1';
  voiceConfig: {
    speaker: 'doctor_male' | 'expert_female' | 'energetic_host';
    speed: number;
    emotion: 'authoritative' | 'empathetic' | 'dynamic';
  };
  musicConfig: {
    track: 'deep_scientific' | 'cinematic_ambient' | 'biohack_pulse' | 'none';
    volume: number;
  };
  subtitleStyle: {
    preset: 'hormozi' | 'clean_medical' | 'cyber_glow';
    fontSize: 'sm' | 'md' | 'lg';
    highlightColor: string;
  };
  renderStatus?: 'idle' | 'rendering' | 'ready';
  outputVideoUrl?: string;
}

export interface MoAAsset {
  id: string;
  name: string;
  category: 'cellular' | 'cardio' | 'brain' | 'dermis' | 'digestion' | 'joints' | 'immunity';
  description: string;
  scientificConcept: string;
  associatedNutrients: string[];
  gradientBg: string;
  accentColor: string;
  iconName: string;
  videoUrl?: string;
  fallbackPosterUrl?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  appliedActions?: string[];
  suggestedPrompts?: string[];
}
