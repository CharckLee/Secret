import type { FormatIssue } from './types';

const H1 = /^(一|二|三|四|五|六|七|八|九|十)、/;
const H2 = /^（[一二三四五六七八九十]+）/;
const H3 = /^\d+\.\d+\s/;

// 识别标题层级：1=一级 2=二级 3=三级 0=正文
export function detectHeadingLevel(line: string): number {
  const t = line.trim();
  if (H1.test(t)) return 1;
  if (H2.test(t)) return 2;
  if (H3.test(t)) return 3;
  return 0;
}

export function checkFormat(text: string): FormatIssue[] {
  const issues: FormatIssue[] = [];
  const lines = text.split('\n');

  let blankCount = 0;
  let hasH1 = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    const trimmed = line.trim();

    if (trimmed === '') {
      blankCount++;
      if (blankCount === 2) {
        issues.push({
          type: 'blank-lines',
          line: lineNo,
          severity: 'warning',
          message: '存在连续空行',
          suggestion: '合并为单个空行',
        });
      }
      continue;
    }

    blankCount = 0;

    if (H1.test(trimmed)) hasH1 = true;

    if ((H2.test(trimmed) || H3.test(trimmed)) && !hasH1) {
      issues.push({
        type: 'heading-hierarchy',
        line: lineNo,
        severity: 'error',
        message: '出现二级或更低层级标题，但未见一级标题',
        suggestion: '补充一级标题，或调整标题层级',
      });
    }
  }

  return issues;
}
