// 用润色结果替换原文本中的选区；选区为空视为全文润色；选区找不到（已失效）时保守返回原文
export function applyReplacement(content: string, selection: string, replacement: string): string {
  if (!selection) return replacement;
  if (content.includes(selection)) return content.replace(selection, replacement);
  return content;
}
