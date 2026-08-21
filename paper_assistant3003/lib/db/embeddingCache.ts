import { db } from './index';

export async function getCachedEmbedding(textHash: string): Promise<Float32Array | undefined> {
  try {
    const row = await db.embeddingCache.get(textHash);
    return row?.vector;
  } catch {
    return undefined; // IndexedDB 不可用，视为缓存 miss
  }
}

export async function cacheEmbedding(textHash: string, vector: Float32Array): Promise<void> {
  try {
    await db.embeddingCache.put({ textHash, vector });
  } catch {
    // 缓存失败忽略，下次重算
  }
}
