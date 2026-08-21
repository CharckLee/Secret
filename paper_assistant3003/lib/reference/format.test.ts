import { describe, it, expect } from 'vitest';
import { formatReference } from './format';
import { parseReference } from './index';

describe('formatReference', () => {
  it('formats journal with 3+ authors as 等', () => {
    expect(
      formatReference({
        type: 'journal',
        authors: ['甲', '乙', '丙', '丁'],
        title: '某研究',
        journal: '某学报',
        year: '2021',
        volume: '42',
        issue: '3',
        pages: '100-110',
      }),
    ).toBe('甲, 乙, 丙, 等. 某研究[J]. 某学报, 2021, 42(3): 100-110.');
  });

  it('formats thesis', () => {
    expect(
      formatReference({
        type: 'thesis',
        authors: ['李四'],
        title: '某研究',
        school: '某大学',
        place: '北京',
        year: '2020',
      }),
    ).toBe('李四. 某研究[D]. 北京: 某大学, 2020.');
  });
});

describe('parseReference', () => {
  it('parses and formats a journal entry end-to-end', () => {
    const r = parseReference('赵六, 钱七. 某方法研究[J]. 某学报, 2021, 42(3): 100-110.');
    expect(r.type).toBe('journal');
    expect(r.formatted).toContain('[J]');
  });
});
