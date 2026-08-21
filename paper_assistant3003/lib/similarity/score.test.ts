import { describe, it, expect } from 'vitest';
import { combinedScore, cosineSimilarity } from './score';

describe('cosineSimilarity', () => {
  it('equals 1 for identical vectors', () => {
    const v = new Float32Array([1, 2, 3]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });
  it('equals 0 for orthogonal vectors', () => {
    expect(cosineSimilarity(new Float32Array([1, 0]), new Float32Array([0, 1]))).toBeCloseTo(0, 5);
  });
});

describe('combinedScore', () => {
  it('weights semantic at 0.7 and lexical at 0.3', () => {
    expect(combinedScore(1, 0)).toBeCloseTo(0.7, 5);
    expect(combinedScore(0, 1)).toBeCloseTo(0.3, 5);
  });
});
