
import { supabase } from './supabase';

/**
 * Unified Analytics Library for TOJ-VITAMIN
 * Handles GA4, Meta Pixel (Client), Meta CAPI (Server), and Internal Database tracking.
 */

interface TrackEventParams {
  event_name: string;
  data?: Record<string, any>;
}

/**
 * CLIENT-SIDE TRACKING
 */
export const trackEvent = async ({ event_name, data = {} }: TrackEventParams) => {
  if (typeof window === 'undefined') return;

  // 1. Google Analytics 4
  if ((window as any).gtag) {
    (window as any).gtag('event', event_name, data);
  }

  // 2. Meta Pixel (Client-side)
  if ((window as any).fbq) {
    (window as any).fbq('trackCustom', event_name, data);
  }

  // 3. Internal Database (Supabase)
  try {
    const { error } = await supabase.from('analytics_events').insert({
      event_name,
      page_path: window.location.pathname,
      event_data: data,
      user_agent: window.navigator.userAgent,
    });
    if (error) console.error('DB Analytics Error:', error);
  } catch (err) {
    console.error('Failed to log event to DB:', err);
  }

  // 4. Server-side Meta CAPI (Forwarding)
  // We trigger a background call to our API to handle CAPI sending
  fetch('/api/analytics/capi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_name, data, url: window.location.href }),
  }).catch(() => {}); // Fire and forget
};

/**
 * E-commerce Specific Helpers
 */
export const trackAddToCart = (product: any) => {
  return trackEvent({
    event_name: 'add_to_cart',
    data: {
      currency: 'TJS',
      value: product.price,
      items: [{
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: 1
      }]
    }
  });
};

export const trackWhatsAppClick = (product: any) => {
  const transactionId = `TJS_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Send a standard 'purchase' event to Google for optimization
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: product.price,
      currency: 'TJS',
      items: [{
        item_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: 1
      }]
    });
  }

  return trackEvent({
    event_name: 'whatsapp_order_click',
    data: {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      transaction_id: transactionId
    }
  });
};

/**
 * Search Tracking
 */
export const trackSearch = (query: string) => {
  return trackEvent({
    event_name: 'search',
    data: {
      search_term: query
    }
  });
};
