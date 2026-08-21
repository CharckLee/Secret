import { describe, it, expect } from 'vitest';
import { mergeSegments } from './segment';
import type { MatchPair } from './types';

describe('mergeSegments', () => {
  it('merges adjacent matching pairs into one segment', () => {
    const pairs: MatchPair[] = [
      { aIndex: 0, bIndex: 10, semantic: 0.8, lexical: 0.5, score: 0.71 },
      { aIndex: 1, bIndex: 11, semantic: 0.85, lexical: 0.5, score: 0.745 },
    ];
    const segs = mergeSegments(pairs, 0.7);
    expect(segs).toHaveLength(1);
    expect(segs[0].aStart).toBe(0);
    expect(segs[0].aEnd).toBe(1);
    expect(segs[0].bStart).toBe(10);
    expect(segs[0].bEnd).toBe(11);
  });

  it('drops pairs below threshold', () => {
    const pairs: MatchPair[] = [
      { aIndex: 0, bIndex: 5, semantic: 0.5, lexical: 0.5, score: 0.5 },
    ];
    expect(mergeSegments(pairs, 0.7)).toHaveLength(0);
  });
});
