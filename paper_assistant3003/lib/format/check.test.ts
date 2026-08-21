import { describe, it, expect } from 'vitest';
import { checkFormat } from './check';

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
