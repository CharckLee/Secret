import { describe, it, expect } from 'vitest';
import { cleanLayout } from './clean';

describe('cleanLayout', () => {
  it('removes consecutive blank lines', () => {
    expect(cleanLayout('a\n\n\n\nb')).toBe('a\n\nb');
  });
  it('trims trailing whitespace per line', () => {
    expect(cleanLayout('a   \nb')).toBe('a\nb');
  });
});
