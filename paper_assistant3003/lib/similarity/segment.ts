import type { MatchPair, Segment } from './types';

export function mergeSegments(pairs: MatchPair[], threshold: number): Segment[] {
  const filtered = pairs.filter((p) => p.score >= threshold);
  if (filtered.length === 0) return [];

  filtered.sort((x, y) => x.aIndex - y.aIndex || x.bIndex - y.bIndex);

  const segments: Segment[] = [];
  let cur: Segment = {
    aStart: filtered[0].aIndex,
    aEnd: filtered[0].aIndex,
    bStart: filtered[0].bIndex,
    bEnd: filtered[0].bIndex,
    score: filtered[0].score,
  };

  for (let i = 1; i < filtered.length; i++) {
    const p = filtered[i];
    const adjacent = p.aIndex <= cur.aEnd + 1 && p.bIndex <= cur.bEnd + 1;
    if (adjacent) {
      cur.aEnd = Math.max(cur.aEnd, p.aIndex);
      cur.bEnd = Math.max(cur.bEnd, p.bIndex);
      cur.score = Math.max(cur.score, p.score);
    } else {
      segments.push(cur);
      cur = {
        aStart: p.aIndex,
        aEnd: p.aIndex,
        bStart: p.bIndex,
        bEnd: p.bIndex,
        score: p.score,
      };
    }
  }
  segments.push(cur);
  return segments;
}
