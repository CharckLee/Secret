export type ID = string;

export type SourceFormat = 'txt' | 'docx' | 'paste';

export interface DocumentRecord {
  id: ID;
  title: string;
  content: string;
  sourceFormat: SourceFormat;
  createdAt: number;
  updatedAt: number;
}
