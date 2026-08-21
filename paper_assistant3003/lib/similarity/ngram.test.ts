import { describe, it, expect } from 'vitest';
import { diceCoefficient } from './ngram';

describe('diceCoefficient', () => {
  it('returns 1 for identical strings', () => {
    expect(diceCoefficient('同一段文字', '同一段文字')).toBe(1);
  });
  it('returns 0 for disjoint strings', () => {
    expect(diceCoefficient('abc', 'xyz')).toBe(0);
  });
  it('is higher for verbatim copy than paraphrase', () => {
    const verbatim = diceCoefficient('深度学习模型表现优异', '深度学习模型表现优异');
    const paraphrase = diceCoefficient('深度学习模型表现优异', '神经网络算法性能很好');
    expect(verbatim).toBeGreaterThan(paraphrase);
  });
});
