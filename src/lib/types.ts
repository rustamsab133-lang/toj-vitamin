export interface Product {
  id: string;
  name: string;
  full_name: string;
  description: string;
  price: number;
  icon_type: string;
  image_url: string | null;
  synergy_product_id?: string;
  synergy_reason?: string;
  tags?: string[];
  med_interactions?: string[];
  marketing_hooks?: string[];
}

export interface Complex {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  product_a_id: string;
  product_b_id: string;
  bg_color: string;
  sort_order: number;
  is_active: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: number;
  items: OrderItem[];
  total: number;
  phone: string | null;
  status: string;
  created_at: string;
}

// ==== QUIZ TYPES ====

export type Lang = 'ru' | 'tj';
export type I18nString = Record<Lang, string>;

export interface QuizCategory {
  id: string;
  title: string;
  question: string;
  sort_order: number;
  // Multi-lang support from DB
  title_lang?: I18nString;
  question_lang?: I18nString;
  image_url?: string;
}

export interface QuizOption {
  id: string;
  category_id: string;
  text: string;
  sort_order: number;
  text_lang?: I18nString;
}

export interface QuizSynergyProduct {
  name: string;
  properties: string[];
  price?: number;
  id?: string;
  image_url?: string;
  marketing_hooks?: string[];
  tags?: string[];
  expert_description?: string;
}

export interface QuizSynergy {
  id: string;
  option_id?: string;
  type: string;
  dosage: string;
  rule: string;
  sort_order?: number;
  
  // Multi-lang support from DB
  type_lang?: I18nString;
  dosage_lang?: I18nString;
  rule_lang?: I18nString;
  
  products_data?: QuizSynergyProduct[];
  products: QuizSynergyProduct[]; 
  total_price?: number;
}

// ==== JOURNAL TYPES ====

export interface Article {
  id: string;
  slug: string;
  title_ru: string;
  title_tj: string;
  excerpt_ru?: string;
  excerpt_tj?: string;
  content_ru: string;
  content_tj: string;
  image_url?: string;
  category: string;
  author: string;
  read_time_min: number;
  published_at: string;
}
