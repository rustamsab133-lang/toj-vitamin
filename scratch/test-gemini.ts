import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Загружаем переменные из .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('--- ТЕСТИРОВАНИЕ GEMINI API ---');
console.log('Ключ из .env.local:', apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-5)}` : 'ОТСУТСТВУЕТ');

if (!apiKey) {
  console.error('Ошибка: GEMINI_API_KEY не задан!');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

async function runTest() {
  try {
    console.log('Отправка тестового запроса к модели gemini-2.0-flash...');
    const result = await model.generateContent('Ответь одним словом "Привет", если ты меня слышишь.');
    console.log('🚀 ОТВЕТ ПОЛУЧЕН УСПЕШНО:');
    console.log(result.response.text().trim());
  } catch (err: any) {
    console.error('❌ ОШИБКА API GEMINI:');
    if (err.status) console.error('Код статуса HTTP:', err.status);
    console.error('Сообщение об ошибке:', err.message || err);
    console.error('Детали ошибки:', JSON.stringify(err, null, 2));
  }
}

runTest();
