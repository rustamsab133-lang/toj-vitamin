import { GoogleGenerativeAI } from '@google/generative-ai';

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
