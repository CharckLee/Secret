import { describe, it, expect } from 'vitest';
import { toMarkdown } from './markdown';

describe('toMarkdown', () => {
  it('converts level-1 heading to markdown', () => {
    expect(toMarkdown('一、引言\n这是正文。')).toBe('# 一、引言\n这是正文。');
  });
  it('converts level-2 heading', () => {
    expect(toMarkdown('（一）小节')).toBe('## （一）小节');
  });
  it('keeps body text unchanged', () => {
    expect(toMarkdown('普通段落')).toBe('普通段落');
  });
});
