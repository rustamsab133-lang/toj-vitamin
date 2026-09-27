import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'toj-vitamin.tj | Витамины и БАДы',
    short_name: 'toj-vitamin',
    description: 'Экспертный маркетплейс витаминов и биодобавок в Таджикистане',
    start_url: '/',
    display: 'standalone',
    background_color: '#FDFBF7',
    theme_color: '#1E40AF',
    lang: 'ru',
    categories: ['health', 'shopping', 'lifestyle'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  };
}
