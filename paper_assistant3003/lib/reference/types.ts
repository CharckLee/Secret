export type ReferenceType = 'journal' | 'thesis' | 'book' | 'web';

export interface ReferenceRecord {
  id: string;
  raw: string;
  fields: ParsedReference;
  formatted: string;
  updatedAt: number;
}

export interface ParsedReference {
  type: ReferenceType;
  authors: string[];
  title: string;
  journal?: string;      // 期刊名 或 出版者
  year?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  place?: string;        // 出版地 / 保存地
  school?: string;       // 学位授予单位
  doi?: string;
  url?: string;
  pubDate?: string;      // 电子文献发布日期
  accessDate?: string;   // 引用日期
}

export interface ParseResult {
  type: ReferenceType;
  fields: ParsedReference;
  formatted: string;
}
