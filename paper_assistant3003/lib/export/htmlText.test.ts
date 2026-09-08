import { describe, it, expect } from 'vitest';
import { htmlToText } from './htmlText';

describe('htmlToText', () => {
  it('extracts text from paragraphs', () => {
    expect(htmlToText('<p>第一段</p><p>第二段</p>')).toBe('第一段\n第二段');
  });
  it('keeps inline formatting content', () => {
    expect(htmlToText('<h1>标题</h1><p>正文<strong>加粗</strong></p>')).toBe('标题\n正文加粗');
  });
  it('extracts list items', () => {
    expect(htmlToText('<ul><li>项目1</li><li>项目2</li></ul>')).toBe('项目1\n项目2');
  });
  it('handles br and entities', () => {
    expect(htmlToText('<p>a<br>b &amp; c</p>')).toBe('a\nb & c');
  });
});
