import Dexie, { type Table } from 'dexie';
import type { DocumentRecord } from '@/lib/types';
import type { ReferenceRecord } from '@/lib/reference/types';

export interface SettingsRecord {
  key: string;
  value: unknown;
}

export class PaperDB extends Dexie {
  documents!: Table<DocumentRecord, string>;
  references!: Table<ReferenceRecord, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super('paper_assistant');
    this.version(1).stores({
      documents: 'id, title, updatedAt',
      references: 'id, updatedAt',
      settings: 'key',
    });
  }
}

export const db = new PaperDB();
