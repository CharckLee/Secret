import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

type HeadingValue = (typeof HeadingLevel)[keyof typeof HeadingLevel];

const HEADING_MAP: Record<string, HeadingValue> = {
  H1: HeadingLevel.HEADING_1,
  H2: HeadingLevel.HEADING_2,
  H3: HeadingLevel.HEADING_3,
  H4: HeadingLevel.HEADING_4,
  H5: HeadingLevel.HEADING_5,
  H6: HeadingLevel.HEADING_6,
};

interface InlineFormat {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
}

// 递归收集文本片段及其内联格式
function collectTextRuns(
  node: Node,
  fmt: InlineFormat,
): { text: string; fmt: InlineFormat }[] {
  const results: { text: string; fmt: InlineFormat }[] = [];
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent) results.push({ text: node.textContent, fmt });
    return results;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tag = (node as Element).tagName.toLowerCase();
    let nextFmt = fmt;
    if (tag === 'strong' || tag === 'b') nextFmt = { ...fmt, bold: true };
    else if (tag === 'em' || tag === 'i') nextFmt = { ...fmt, italics: true };
    else if (tag === 'u') nextFmt = { ...fmt, underline: true };
    for (const child of Array.from((node as Element).childNodes)) {
      results.push(...collectTextRuns(child, nextFmt));
    }
  }
  return results;
}

function toTextRuns(runs: { text: string; fmt: InlineFormat }[]): TextRun[] {
  return runs.map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: r.fmt.bold,
        italics: r.fmt.italics,
        underline: r.fmt.underline ? { type: 'single' } : undefined,
      }),
  );
}

function blockToParagraphs(node: Node): Paragraph[] {
  const paras: Paragraph[] = [];
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (text) paras.push(new Paragraph({ children: [new TextRun(text)] }));
    return paras;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return paras;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (tag === 'p') {
    const runs = collectTextRuns(el, {});
    if (runs.length > 0) paras.push(new Paragraph({ children: toTextRuns(runs) }));
  } else if (/^h[1-6]$/.test(tag)) {
    const runs = collectTextRuns(el, {});
    if (runs.length > 0) {
      paras.push(
        new Paragraph({ children: toTextRuns(runs), heading: HEADING_MAP[tag.toUpperCase()] }),
      );
    }
  } else if (tag === 'ul' || tag === 'ol') {
    for (const li of Array.from(el.children)) {
      if (li.tagName.toLowerCase() === 'li') {
        const runs = collectTextRuns(li, {});
        if (runs.length > 0) {
          paras.push(new Paragraph({ children: toTextRuns(runs), bullet: { level: 0 } }));
        }
      }
    }
  } else {
    for (const child of Array.from(el.childNodes)) {
      paras.push(...blockToParagraphs(child));
    }
  }
  return paras;
}

// 将富文本 HTML 转成 Word 文档，保留标题层级、加粗、斜体、下划线、列表
export async function htmlToDocx(title: string, html: string): Promise<Blob> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const children: Paragraph[] = [];
  if (title.trim()) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: title.trim(), bold: true, size: 32 })] }),
    );
  }
  for (const node of Array.from(doc.body.childNodes)) {
    children.push(...blockToParagraphs(node));
  }
  const document = new Document({ sections: [{ children }] });
  return Packer.toBlob(document);
}
