import { describe, it, expect } from 'vitest';
import { splitSentences } from './split';

describe('splitSentences', () => {
  it('splits on Chinese sentence enders', () => {
    expect(splitSentences('第一句。第二句！第三句？第四句；结束')).toEqual([
      '第一句。', '第二句！', '第三句？', '第四句；', '结束',
    ]);
  });
  it('splits on newlines and drops empty lines', () => {
    expect(splitSentences('第一行\n\n第二行')).toEqual(['第一行', '第二行']);
  });
  it('trims and drops empty results', () => {
    expect(splitSentences('  。  ')).toEqual([]);
  });
});
