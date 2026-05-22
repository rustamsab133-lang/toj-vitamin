const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Простой парсер .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const keyMatch = envContent.match(/GEMINI_API_KEY=(.+)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

console.log('Ключ для проверки:', apiKey.slice(0, 8) + '...');

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    // В новой версии Node.js SDK listModels находится в самом клиенте
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      console.log('--- ДОСТУПНЫЕ МОДЕЛИ ---');
      data.models.forEach(m => {
        if (m.supportedGenerationMethods.includes('generateContent')) {
          console.log(m.name);
        }
      });
    } else {
      console.error('Ошибка получения моделей:', data);
    }
  } catch (error) {
    console.error('Критическая ошибка:', error);
  }
}

listModels();
