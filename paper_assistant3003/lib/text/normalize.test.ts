import { describe, it, expect } from 'vitest';
import { normalizeFullwidth, collapseWhitespace, normalizeText } from './normalize';

describe('normalizeFullwidth', () => {
  it('converts fullwidth ASCII letters/digits to halfwidth', () => {
    expect(normalizeFullwidth('ＡＢＣ１２３')).toBe('ABC123');
  });
  it('keeps CJK punctuation unchanged', () => {
    expect(normalizeFullwidth('中文，。！？；：')).toBe('中文，。！？；：');
  });
  it('converts fullwidth space to halfwidth', () => {
    expect(normalizeFullwidth('Ａ　Ｂ')).toBe('A B');
  });
});

describe('collapseWhitespace', () => {
  it('collapses consecutive spaces and newlines', () => {
    expect(collapseWhitespace('a   b\n\n\nc')).toBe('a b\nc');
  });
});

describe('normalizeText', () => {
  it('applies fullwidth then whitespace normalization', () => {
    expect(normalizeText('Ａ　Ｂ')).toBe('A B');
  });
});
