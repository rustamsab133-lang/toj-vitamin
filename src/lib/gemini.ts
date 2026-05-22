import { GoogleGenerativeAI } from '@google/generative-ai';
import dns from 'dns';

// Force Node.js to prefer IPv4 over IPv6 when resolving addresses.
// This is critical on Windows systems to prevent "TypeError: fetch failed" for external API hosts.
if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY не найден в .env.local');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

/**
 * Gemini 2.0 Flash — быстрая и стабильная модель для генерации SEO-контента.
 */
export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
});

export { genAI };
