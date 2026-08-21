// 去除控制字符（保留 \n 与 \t），统一换行为 \n
export function cleanText(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}
