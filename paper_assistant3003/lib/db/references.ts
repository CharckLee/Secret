import { db } from './index';
import { memory } from './memory';
import type { ReferenceRecord } from '@/lib/reference/types';

let degraded = false;

async function isDegraded(): Promise<boolean> {
  if (degraded) return true;
  try {
    await db.references.count();
    return false;
  } catch {
    degraded = true;
    return true;
  }
}

export async function listReferences(): Promise<ReferenceRecord[]> {
  if (await isDegraded()) {
    return (memory.list('references') as ReferenceRecord[]).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  }
  return db.references.orderBy('updatedAt').reverse().toArray();
}

export async function saveReference(record: ReferenceRecord): Promise<void> {
  if (await isDegraded()) {
    memory.put('references', record.id, record);
    return;
  }
  await db.references.put(record);
}

export async function deleteReference(id: string): Promise<void> {
  if (await isDegraded()) {
    memory.delete('references', id);
    return;
  }
  await db.references.delete(id);
}
