import { detectHeadingLevel } from '@/lib/format/check';

export function toMarkdown(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const level = detectHeadingLevel(line);
      if (level > 0) return '#'.repeat(level) + ' ' + line.trim();
      return line;
    })
    .join('\n');
}
