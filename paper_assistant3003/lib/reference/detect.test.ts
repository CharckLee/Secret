import { describe, it, expect } from 'vitest';
import { detectType } from './detect';

describe('detectType', () => {
  it('detects web resource by [EB/OL] marker', () => {
    expect(detectType('张三. 基于深度学习的图像识别[EB/OL]. https://example.com')).toBe('web');
  });
  it('detects thesis by [D] marker', () => {
    expect(detectType('李四. 某研究[D]. 北京: 某大学, 2020.')).toBe('thesis');
  });
  it('detects book by [M] marker', () => {
    expect(detectType('王五. 机器学习导论[M]. 北京: 高等教育出版社, 2019.')).toBe('book');
  });
  it('detects journal by [J] marker', () => {
    expect(detectType('赵六. 某方法研究[J]. 某学报, 2021, 42(3): 100-110.')).toBe('journal');
  });
  it('detects book with pages via [M] marker', () => {
    expect(detectType('王五. 机器学习导论[M]. 北京: 高等教育出版社, 2019: 100-200.')).toBe('book');
  });
  it('detects journal with 硕士 in title via [J] marker', () => {
    expect(
      detectType('关于硕士研究生培养质量提升的研究[J]. 中国高等教育, 2021, 62(1): 10-15.'),
    ).toBe('journal');
  });
  it('detects journal with DOI only', () => {
    expect(detectType('作者. 题名[J]. 刊名, 2020, 1(1): 1-2. DOI:10.1234/abc.')).toBe('journal');
  });
});
