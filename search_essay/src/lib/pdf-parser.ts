'use client';

import * as pdfjsLib from 'pdfjs-dist';

// 使用 CDN worker（客户端专用）
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

export interface PDFParseResult {
  text: string;
  metadata: {
    title?: string;
    author?: string;
  };
}

/**
 * 解析 PDF 文件，提取全文文本和元数据
 * 仅在浏览器端运行（'use client'）
 */
export async function parsePDF(file: File): Promise<PDFParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const metadata = await pdf.getMetadata();
  const info = metadata.info as Record<string, string>;

  // 并发提取所有页面文本（单页失败不影响其他页）
  const pagePromises = Array.from({ length: pdf.numPages }, async (_, i) => {
    try {
      const page = await pdf.getPage(i + 1);
      const textContent = await page.getTextContent();
      return {
        status: 'fulfilled' as const,
        text: textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' '),
      };
    } catch (err) {
      console.warn(`PDF 第 ${i + 1} 页解析失败:`, err);
      return { status: 'rejected' as const, text: '' };
    }
  });
  const results = await Promise.all(pagePromises);
  const textParts = results.map((r) => r.text);

  return {
    text: textParts.join('\n'),
    metadata: {
      title: info?.Title || undefined,
      author: info?.Author || undefined,
    },
  };
}

/**
 * 仅提取 PDF 文本内容
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const result = await parsePDF(file);
  return result.text;
}
