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
  barcode?: string;
  stock_quantity?: number;
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
  status: string; // 'new' | 'delivering' | 'paid' | 'cancelled' | 'processing' | 'completed'
  created_at: string;
  channel?: 'phone' | 'whatsapp' | 'telegram' | 'instagram' | 'website' | 'offline';
  operator_name?: string;
  courier_name?: string;
  customer_id?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_notes?: string;
  payment_method?: 'cash' | 'card' | 'alif' | 'dc' | 'transfer';
  payment_status?: 'unpaid' | 'paid';
  cancel_reason?: string;
  operator_notes?: string;
  promocode?: string | null;
  discount?: number | null;
  original_total?: number | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
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

// ==== OFFLINE WAREHOUSE TYPES ====

export interface OfflineProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  barcode?: string;
  image_url?: string;
  created_at?: string;
}

export interface OfflineCustomer {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  total_spent: number;
  created_at?: string;
}

export interface OfflineOrder {
  id: string;
  customer_id?: string;
  items: {
    product_id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total_amount: number;
  created_at?: string;
  // Relationship
  customer?: OfflineCustomer;
}

// ==== B2B PHARMACY TYPES ====

export interface Pharmacy {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  contact_person?: string;
  discount_percent: number;
  credit_limit: number;
  balance: number;
  token: string;
  status?: string;
  created_at?: string;
}

export interface PharmacyOrder {
  id: string;
  pharmacy_id: string;
  items: {
    product_id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total_amount: number;
  payment_method: string;
  payment_status: 'unpaid' | 'partial' | 'paid';
  order_status: 'new' | 'confirmed' | 'assembled' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
  delivery_date?: string;
  created_at?: string;
  pharmacies?: Pharmacy; // Relationship join name
}
