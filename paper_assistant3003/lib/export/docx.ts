import { Document, Packer, Paragraph, TextRun } from 'docx';

// 忠实导出：逐行保留为普通段落，不做任何标题/样式变换，保持编辑器内容原样
export async function exportToDocx(title: string, text: string): Promise<Blob> {
  const children: Paragraph[] = [];
  if (title.trim()) {
    children.push(new Paragraph({ children: [new TextRun(title.trim())] }));
  }
  for (const line of text.split('\n')) {
    children.push(new Paragraph({ children: [new TextRun(line)] }));
  }
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
