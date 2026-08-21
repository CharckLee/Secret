import { describe, it, expect } from 'vitest';
import { applyReplacement } from './replace';

describe('applyReplacement', () => {
  it('replaces selection within content', () => {
    expect(applyReplacement('第一段。第二段。', '第二段。', '改写后的第二段。')).toBe(
      '第一段。改写后的第二段。',
    );
  });
  it('replaces whole content when selection is empty', () => {
    expect(applyReplacement('原文', '', '润色全文')).toBe('润色全文');
  });
  it('keeps content unchanged when selection is stale', () => {
    expect(applyReplacement('新文本', '旧选区', '替换')).toBe('新文本');
  });
});
