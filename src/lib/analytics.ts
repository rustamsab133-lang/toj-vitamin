
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

export const getValidUtmParams = () => {
  if (typeof window === 'undefined') return null;
  try {
    const savedAtStr = localStorage.getItem('utm_saved_at');
    if (savedAtStr) {
      const savedAt = parseInt(savedAtStr, 10);
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - savedAt > thirtyDaysMs) {
        // Expired
        localStorage.removeItem('utm_source');
        localStorage.removeItem('utm_medium');
        localStorage.removeItem('utm_campaign');
        localStorage.removeItem('utm_saved_at');
        return null;
      }
    }

    const utmSource = localStorage.getItem('utm_source');
    if (utmSource) {
      return {
        utm_source: utmSource,
        utm_medium: localStorage.getItem('utm_medium'),
        utm_campaign: localStorage.getItem('utm_campaign'),
      };
    }
  } catch (e) {
    console.warn('Failed to read UTM parameters from localStorage', e);
  }
  return null;
};

export const trackEvent = async ({ event_name, data = {} }: TrackEventParams) => {
  if (typeof window === 'undefined') return;

  // Automatically enrich event data with UTM parameters from localStorage
  let enrichedData = { ...data };
  const utms = getValidUtmParams();
  if (utms) {
    enrichedData.utm_source = utms.utm_source;
    if (utms.utm_medium) enrichedData.utm_medium = utms.utm_medium;
    if (utms.utm_campaign) enrichedData.utm_campaign = utms.utm_campaign;
  }

  // 1. Google Analytics 4
  if ((window as any).gtag) {
    (window as any).gtag('event', event_name, enrichedData);
  }

  // 2. Meta Pixel (Client-side)
  if ((window as any).fbq) {
    (window as any).fbq('trackCustom', event_name, enrichedData);
  }

  // 3. Internal Database (Supabase)
  try {
    const { error } = await supabase.from('analytics_events').insert({
      event_name,
      page_path: window.location.pathname,
      event_data: enrichedData,
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
    body: JSON.stringify({ event_name, data: enrichedData, url: window.location.href }),
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

/**
 * Promocode Tracking
 */
export const trackPromoCodeApplied = (code: string, discountAmount: number, discountType: string, cartTotal: number) => {
  return trackEvent({
    event_name: 'promocode_applied',
    data: {
      code,
      discount_amount: discountAmount,
      discount_type: discountType,
      cart_total: cartTotal
    }
  });
};

export const trackPromoCodeFailed = (code: string, errorReason: string, cartTotal: number) => {
  return trackEvent({
    event_name: 'promocode_failed',
    data: {
      code,
      error_reason: errorReason,
      cart_total: cartTotal
    }
  });
};

