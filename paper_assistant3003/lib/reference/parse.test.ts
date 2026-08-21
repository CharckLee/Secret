import { describe, it, expect } from 'vitest';
import { parseFields } from './parse';

describe('parseFields', () => {
  const journal = '赵六, 钱七. 某方法研究[J]. 某学报, 2021, 42(3): 100-110.';

  it('extracts authors for journal', () => {
    const f = parseFields(journal, 'journal');
    expect(f.authors).toEqual(['赵六', '钱七']);
  });
  it('extracts title', () => {
    const f = parseFields(journal, 'journal');
    expect(f.title).toBe('某方法研究');
  });
  it('extracts year/volume/issue/pages', () => {
    const f = parseFields(journal, 'journal');
    expect(f.year).toBe('2021');
    expect(f.volume).toBe('42');
    expect(f.issue).toBe('3');
    expect(f.pages).toBe('100-110');
  });
  it('extracts DOI when present', () => {
    const f = parseFields('作者. 题名[J]. 刊名, 2020, 1(1): 1-2. DOI:10.1234/abc.', 'journal');
    expect(f.doi).toBe('10.1234/abc');
  });
  it('keeps long English author names', () => {
    const f = parseFields('MICHAEL JOHNSON, 王五. 某研究[J]. 刊名, 2020, 1(1): 1-2.', 'journal');
    expect(f.authors).toContain('MICHAEL JOHNSON');
  });
  it('filters et al. from authors', () => {
    const f = parseFields('赵六, 钱七, et al. 某研究[J]. 刊名, 2020, 1(1): 1-2.', 'journal');
    expect(f.authors).toEqual(['赵六', '钱七']);
  });
  it('normalizes fullwidth digits and brackets', () => {
    const f = parseFields('作者. 题名[J]. 刊名, ２０２１, ４２（３）: １００-１１０.', 'journal');
    expect(f.year).toBe('2021');
    expect(f.volume).toBe('42');
    expect(f.issue).toBe('3');
  });
});
