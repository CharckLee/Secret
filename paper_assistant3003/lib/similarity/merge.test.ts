import { describe, it, expect } from 'vitest';
import { mergePairs } from './merge';
import type { MatchPair } from './types';

describe('mergePairs', () => {
  it('deduplicates the same pair and keeps the higher score', () => {
    const semantic: MatchPair[] = [{ aIndex: 0, bIndex: 5, semantic: 0.9, lexical: 0, score: 0.9 }];
    const lexical: MatchPair[] = [{ aIndex: 0, bIndex: 5, semantic: 0, lexical: 0.8, score: 0.8 }];
    const merged = mergePairs(semantic, lexical);
    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBe(0.9);
  });

  it('keeps reversed-order pairs as one', () => {
    const a: MatchPair[] = [{ aIndex: 3, bIndex: 8, semantic: 0.7, lexical: 0, score: 0.7 }];
    const b: MatchPair[] = [{ aIndex: 8, bIndex: 3, semantic: 0, lexical: 0.6, score: 0.6 }];
    const merged = mergePairs(a, b);
    expect(merged).toHaveLength(1);
    expect(merged[0].aIndex).toBe(3);
    expect(merged[0].bIndex).toBe(8);
  });
});
