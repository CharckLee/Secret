import type { ParsedReference, ReferenceType } from './types';
import { normalizeText } from '@/lib/text/normalize';

function extractAuthors(raw: string): string[] {
  let authorPart = raw.split(/\.\s*(?=[^\d])/)[0] ?? '';
  if (authorPart === raw) {
    // 无句点时，用类型标记定位题名起点
    const mark = raw.match(/\[(J|M|D|EB\/OL)\]/);
    if (mark && mark.index !== undefined) {
      authorPart = raw.slice(0, mark.index);
    }
  }
  return authorPart
    .split(/[,，;；、]/)
    .map((a) => a.trim().replace(/^\[\d+\]\s*/, ''))
    .filter((a) => a.length > 0 && a.length <= 30 && !/^(et al\.?|等)$/i.test(a));
}

function extractTitle(raw: string): string {
  const typeMark = raw.match(/\[(J|M|D|EB\/OL)\]/);
  if (!typeMark || typeMark.index === undefined) return '';
  const before = raw.slice(0, typeMark.index);
  const lastDot = before.lastIndexOf('.');
  const title = lastDot >= 0 ? before.slice(lastDot + 1) : before;
  return title.trim();
}

function extractYear(raw: string): string | undefined {
  return raw.match(/(19|20)\d{2}/)?.[0];
}

function extractVolumeIssue(raw: string): { volume?: string; issue?: string } {
  const m = raw.match(/(\d+)\s*[（(]\s*(\d+)\s*[）)]/);
  return m ? { volume: m[1], issue: m[2] } : {};
}

function extractPages(raw: string): string | undefined {
  return raw.match(/(\d+)\s*-\s*(\d+)/)?.[0];
}

function extractDoi(raw: string): string | undefined {
  return raw.match(/10\.\d{4,}\/\S+/)?.[0]?.replace(/[.,;]+$/, '');
}

function extractUrl(raw: string): string | undefined {
  return raw.match(/https?:\/\/\S+/)?.[0]?.replace(/[.,;]+$/, '');
}

export function parseFields(raw: string, type: ReferenceType): ParsedReference {
  const norm = normalizeText(raw);
  const { volume, issue } = extractVolumeIssue(norm);
  return {
    type,
    authors: extractAuthors(norm),
    title: extractTitle(norm),
    year: extractYear(norm),
    volume,
    issue,
    pages: extractPages(norm),
    doi: extractDoi(norm),
    url: extractUrl(norm),
  };
}
