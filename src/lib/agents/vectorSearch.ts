/**
 * Vector search for relevant products using Gemini embeddings.
 * Uses cosine similarity between query embedding and pre-computed product embeddings.
 * 
 * Embeddings are loaded lazily and cached in memory to avoid
 * reading from disk on every request.
 */

import { genAI } from '@/lib/gemini';

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

export async function getRelevantProducts(
  query: string,
  dbProducts: any[],
  count: number = 10
): Promise<any[]> {
  try {
    if (!query || query.trim().length === 0) return dbProducts.slice(0, count);

    // 1. Load cached embeddings (lazy, one-time)
    const embeddings = loadEmbeddings();
    if (!embeddings) {
      return dbProducts.slice(0, count);
    }

    // 2. Generate embedding for search query
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(query.trim());
    const queryVector = result.embedding.values;

    // 3. Compute similarity for each product
    const scoredProducts = dbProducts.map((p) => {
      const cached = embeddings[p.id];
      const score = cached ? cosineSimilarity(queryVector, cached.embedding) : 0;
      return { product: p, score };
    });

    // 4. Sort by descending similarity
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
