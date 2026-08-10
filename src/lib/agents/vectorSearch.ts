import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function getRelevantProducts(
  query: string,
  dbProducts: any[],
  count: number = 10
): Promise<any[]> {
  try {
    if (!query || query.trim().length === 0) return dbProducts.slice(0, count);

    // 1. Читаем кэш эмбеддингов
    const embeddingsPath = path.join(process.cwd(), 'src/data/product_embeddings.json');
    if (!fs.existsSync(embeddingsPath)) {
      console.warn('⚠️ Файл product_embeddings.json не найден. Возвращаем дефолтные товары.');
      return dbProducts.slice(0, count);
    }

    const embeddingsCache: Record<string, { embedding: number[] }> = JSON.parse(
      fs.readFileSync(embeddingsPath, 'utf-8')
    );

    // 2. Генерируем эмбеддинг для поискового запроса
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(query.trim());
    const queryVector = result.embedding.values;

    // 3. Вычисляем близость для каждого товара
    const scoredProducts = dbProducts.map((p) => {
      const cached = embeddingsCache[p.id];
      const score = cached ? cosineSimilarity(queryVector, cached.embedding) : 0;
      return { product: p, score };
    });

    // 4. Сортируем по убыванию сходства
    scoredProducts.sort((a, b) => b.score - a.score);

    console.log(`🔍 Векторный поиск по запросу "${query}":`);
    scoredProducts.slice(0, 5).forEach((sp) => {
      console.log(`   - [${sp.score.toFixed(3)}] ${sp.product.name}`);
    });

    return scoredProducts.slice(0, count).map((sp) => sp.product);
  } catch (err) {
    console.error('❌ Ошибка при векторном поиске:', err);
    return dbProducts.slice(0, count); // Фоллбек
  }
}
