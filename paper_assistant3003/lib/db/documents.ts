import { db } from './index';
import { memory } from './memory';
import type { DocumentRecord } from '@/lib/types';

let degraded = false;

async function isDegraded(): Promise<boolean> {
  if (degraded) return true;
  try {
    await db.documents.count();
    return false;
  } catch {
    degraded = true;
    return true;
  }
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  if (await isDegraded()) {
    return (memory.list('documents') as DocumentRecord[]).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  }
  return db.documents.orderBy('updatedAt').reverse().toArray();
}

export async function getDocument(id: string): Promise<DocumentRecord | undefined> {
  if (await isDegraded()) return memory.get('documents', id) as DocumentRecord | undefined;
  return db.documents.get(id);
}

export async function saveDocument(doc: DocumentRecord): Promise<void> {
  if (await isDegraded()) {
    memory.put('documents', doc.id, doc);
    return;
  }
  await db.documents.put(doc);
}

export async function deleteDocument(id: string): Promise<void> {
  if (await isDegraded()) {
    memory.delete('documents', id);
    return;
  }
  await db.documents.delete(id);
}
