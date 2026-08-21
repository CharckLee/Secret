// 只转换全角 ASCII 字母和数字为半角，保留全角中文标点
export function normalizeFullwidth(s: string): string {
  return s
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    .replace(/\u3000/g, ' ');
}

// 连续空格/制表符合并；连续换行合并为一个
export function collapseWhitespace(s: string): string {
  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n');
}

export function normalizeText(s: string): string {
  return collapseWhitespace(normalizeFullwidth(s));
}
