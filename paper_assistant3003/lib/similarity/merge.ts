import type { MatchPair } from './types';

// 融合多组相似对（语义 + 字面），按 a/b 无序去重，同一对取更高分
export function mergePairs(...pairLists: MatchPair[][]): MatchPair[] {
  const map = new Map<string, MatchPair>();
  for (const pairs of pairLists) {
    for (const p of pairs) {
      const lo = Math.min(p.aIndex, p.bIndex);
      const hi = Math.max(p.aIndex, p.bIndex);
      const key = `${lo}-${hi}`;
      const existing = map.get(key);
      if (!existing || p.score > existing.score) {
        map.set(key, { ...p, aIndex: lo, bIndex: hi });
      }
    }
  }
  return Array.from(map.values());
}
