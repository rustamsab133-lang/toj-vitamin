/**
 * Vector search for relevant products using Gemini embeddings.
 * Uses cosine similarity between query embedding and pre-computed product embeddings.
 * 
 * Embeddings are loaded lazily and cached in memory to avoid
 * reading from disk on every request.
 */

import { genAI } from '@/lib/gemini';
import { getLocalizedProductName } from '@/lib/productLocalization';

// Lazy-loaded in-memory cache for product embeddings
let cachedEmbeddings: Record<string, { embedding: number[] }> | null = null;

function loadEmbeddings(): Record<string, { embedding: number[] }> | null {
  if (cachedEmbeddings) return cachedEmbeddings;

  try {
    const fs = require('fs');
    const path = require('path');
    const embeddingsPath = path.join(process.cwd(), 'src/data/product_embeddings.json');
    if (!fs.existsSync(embeddingsPath)) {
      console.warn('⚠️ Файл product_embeddings.json не найден.');
      return null;
    }
    cachedEmbeddings = JSON.parse(fs.readFileSync(embeddingsPath, 'utf-8'));
    console.log(`✅ Загружено ${Object.keys(cachedEmbeddings!).length} эмбеддингов в кеш.`);
    return cachedEmbeddings;
  } catch (err) {
    console.error('❌ Ошибка загрузки эмбеддингов:', err);
    return null;
  }
}

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

function keywordScore(query: string, product: any): number {
  if (!query || !product) return 0;
  const q = query.toLowerCase();
  const name = (product.name || '').toLowerCase();
  const fullName = (product.full_name || '').toLowerCase();
  const enName = getLocalizedProductName(product.name || '', 'en').toLowerCase();
  const tags = Array.isArray(product.tags) ? product.tags.join(' ').toLowerCase() : '';

  let score = 0;
  const words = q.split(/[\s,.;:!?+()\-]+/).filter((w: string) => w.length >= 3);
  for (const w of words) {
    if (name.includes(w) || enName.includes(w)) score += 0.35;
    if (fullName.includes(w)) score += 0.25;
    if (tags.includes(w)) score += 0.15;
  }
  return score;
}

export async function getRelevantProducts(
  query: string,
  dbProducts: any[],
  count: number = 10
): Promise<any[]> {
  try {
    if (!dbProducts || dbProducts.length === 0) return [];
    if (!query || query.trim().length === 0) return dbProducts.slice(0, count);

    // 1. Попытка векторного поиска с таймаутом 2.5 секунды
    let queryVector: number[] | null = null;
    const embeddings = loadEmbeddings();

    if (embeddings) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
        const embedPromise = model.embedContent(query.trim());
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Embedding timeout')), 2500)
        );

        const result: any = await Promise.race([embedPromise, timeoutPromise]);
        if (result?.embedding?.values) {
          queryVector = result.embedding.values;
        }
      } catch (embedErr) {
        console.warn('⚠️ Векторный эмбеддинг пропущен (таймаут или ошибка), переключаемся на ключевые слова:', embedErr);
      }
    }

    // 2. Расчет скоринга (векторный + ключевые слова)
    const scoredProducts = dbProducts.map((p) => {
      let vecScore = 0;
      if (queryVector && embeddings && embeddings[p.id]) {
        vecScore = cosineSimilarity(queryVector, embeddings[p.id].embedding);
      }
      const kwScore = keywordScore(query, p);
      const totalScore = vecScore + kwScore;
      return { product: p, score: totalScore, vecScore, kwScore };
    });

    // 3. Сортировка по общему баллу
    scoredProducts.sort((a, b) => b.score - a.score);

    console.log(`🔍 Поиск по запросу "${query}":`);
    scoredProducts.slice(0, 5).forEach((sp) => {
      console.log(`   - [${sp.score.toFixed(3)} | vec:${sp.vecScore.toFixed(2)} kw:${sp.kwScore.toFixed(2)}] ${sp.product.name}`);
    });

    return scoredProducts.slice(0, count).map((sp) => sp.product);
  } catch (err) {
    console.error('❌ Ошибка при поиске товаров:', err);
    return dbProducts ? dbProducts.slice(0, count) : [];
  }
}
