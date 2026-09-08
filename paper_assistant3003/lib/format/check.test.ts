import { describe, it, expect } from 'vitest';
import { checkFormat, detectHeadingLevel } from './check';

describe('detectHeadingLevel', () => {
  it('detects level-1 heading', () => {
    expect(detectHeadingLevel('一、引言')).toBe(1);
  });
  it('detects level-2 heading', () => {
    expect(detectHeadingLevel('（一）小节')).toBe(2);
  });
  it('detects level-3 heading', () => {
    expect(detectHeadingLevel('1.1 内容')).toBe(3);
  });
  it('returns 0 for body text', () => {
    expect(detectHeadingLevel('这是正文。')).toBe(0);
  });
});

describe('checkFormat', () => {
  it('flags consecutive blank lines', () => {
    const issues = checkFormat('第一段\n\n\n\n第二段');
    expect(issues.some((i) => i.type === 'blank-lines')).toBe(true);
  });
  it('flags heading hierarchy (lower level without level 1)', () => {
    const issues = checkFormat('2.1 小节\n正文内容');
    expect(issues.some((i) => i.type === 'heading-hierarchy')).toBe(true);
  });
  it('returns no issues for clean text', () => {
    const issues = checkFormat('一、引言\n这是正文段落。');
    expect(issues).toHaveLength(0);
  });
});
