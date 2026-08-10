"use client";

import { useEffect } from 'react';

export function UtmTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source') || params.get('ref');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    const buyIdsParam = params.get('buy_ids');

    if (utmSource || buyIdsParam) {
      if (utmSource) {
        localStorage.setItem('utm_source', utmSource);
        if (utmMedium) localStorage.setItem('utm_medium', utmMedium);
        if (utmCampaign) localStorage.setItem('utm_campaign', utmCampaign);
        localStorage.setItem('utm_saved_at', Date.now().toString());

        // Track campaign visit
        import('@/lib/analytics').then(({ trackEvent }) => {
          trackEvent({
            event_name: 'campaign_visit',
            data: {
              utm_source: utmSource,
              utm_medium: utmMedium || 'none',
              utm_campaign: utmCampaign || 'none',
            }
          });
        }).catch(err => console.error("Failed to track campaign visit:", err));
      }

      // Check for buy_ids (combo bundle link)
      if (buyIdsParam) {
        const ids = buyIdsParam.split(',').map(id => id.trim()).filter(Boolean);
        if (ids.length > 0) {
          import('@/lib/products').then(async ({ getProductsWithMarkup }) => {
            const allProds = await getProductsWithMarkup();
            const matchedProds = allProds.filter(p => ids.includes(String(p.id)));
            if (matchedProds.length > 0) {
              const { useCart } = await import('@/store/useCart');
              const cartStore = useCart.getState();
              matchedProds.forEach(prod => cartStore.addItem(prod));
              cartStore.setIsOpen(true);
            }
          }).catch(err => console.error("Failed to load/add combo products:", err));
        }
      }

      // Clean query parameters from URL to keep it clean
      const url = new URL(window.location.href);
      url.searchParams.delete('utm_source');
      url.searchParams.delete('ref');
      url.searchParams.delete('utm_medium');
      url.searchParams.delete('utm_campaign');
      url.searchParams.delete('buy_ids');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  return null;
}
