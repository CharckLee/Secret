import type { MatchPair, SentenceUnit } from './types';
import { diceCoefficient } from './ngram';
import { combinedScore, cosineSimilarity } from './score';
import { splitSentences } from '@/lib/text/split';
import { getCachedEmbedding, cacheEmbedding } from '@/lib/db/embeddingCache';

async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 模块级单例 worker：模型只加载一次，常驻复用
let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: number[][]) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../../worker/embedding.worker', import.meta.url));
    worker.onmessage = (e: MessageEvent) => {
      const { id, ok, vectors, error } = e.data;
      const p = pending.get(id);
      if (!p) return;
      pending.delete(id);
      if (ok) p.resolve(vectors);
      else p.reject(new Error(error));
    };
    worker.onerror = (err) => {
      for (const [, p] of pending) p.reject(err instanceof Error ? err : new Error(String(err)));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

function runWorkerEmbedding(texts: string[]): Promise<number[][]> {
  const w = getWorker();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try {
      w.postMessage({ id, texts });
    } catch (err) {
      pending.delete(id);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  const missing: number[] = [];
  const results: (Float32Array | null)[] = new Array(texts.length).fill(null);

  for (let i = 0; i < texts.length; i++) {
    const h = await hashText(texts[i]);
    const cached = await getCachedEmbedding(h);
    if (cached) results[i] = cached;
    else missing.push(i);
  }

  if (missing.length > 0) {
    const missingTexts = missing.map((i) => texts[i]);
    const vectors = await runWorkerEmbedding(missingTexts);
    if (vectors.length !== missing.length) {
      throw new Error(`向量化结果数量不匹配：期望 ${missing.length}，得到 ${vectors.length}`);
    }
    for (let j = 0; j < missing.length; j++) {
      const vec = Float32Array.from(vectors[j]);
      results[missing[j]] = vec;
      await cacheEmbedding(await hashText(texts[missing[j]]), vec);
    }
  }
  return results as Float32Array[];
}

export function buildUnits(text: string): SentenceUnit[] {
  return splitSentences(text).map((t, i) => ({ index: i, text: t }));
}

export function compareUnits(
  aUnits: SentenceUnit[],
  bUnits: SentenceUnit[],
  aVecs: Float32Array[],
  bVecs: Float32Array[],
  topK = 50,
  self = false,
): MatchPair[] {
  const pairs: MatchPair[] = [];
  for (let i = 0; i < aUnits.length; i++) {
    const startJ = self ? i + 1 : 0;
    const sims: { j: number; s: number }[] = [];
    for (let j = startJ; j < bUnits.length; j++) {
      const s = cosineSimilarity(aVecs[i], bVecs[j]);
      sims.push({ j, s });
    }
    sims.sort((x, y) => y.s - x.s);
    for (const { j, s } of sims.slice(0, topK)) {
      const lexical = diceCoefficient(aUnits[i].text, bUnits[j].text);
      pairs.push({
        aIndex: aUnits[i].index,
        bIndex: bUnits[j].index,
        semantic: s,
        lexical,
        score: combinedScore(s, lexical),
      });
    }
  }
  return pairs;
}

// 语义模型不可用时的降级路径：纯字面 N-Gram 比对（self 模式，i < j）
export function lexicalOnlyPairs(units: SentenceUnit[]): MatchPair[] {
  const pairs: MatchPair[] = [];
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const lexical = diceCoefficient(units[i].text, units[j].text);
      pairs.push({
        aIndex: units[i].index,
        bIndex: units[j].index,
        semantic: 0,
        lexical,
        score: lexical,
      });
    }
  }
  return pairs;
}
