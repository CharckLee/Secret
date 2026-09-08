import { describe, it, expect } from 'vitest';
import { textToHtml } from './textToHtml';

describe('textToHtml', () => {
  it('wraps each line in a paragraph', () => {
    expect(textToHtml('第一段\n第二段')).toBe('<p>第一段</p><p>第二段</p>');
  });
  it('escapes HTML special characters', () => {
    expect(textToHtml('a < b')).toBe('<p>a &lt; b</p>');
  });
  it('keeps empty lines as break paragraphs', () => {
    expect(textToHtml('a\n\nb')).toBe('<p>a</p><p><br></p><p>b</p>');
  });
});
