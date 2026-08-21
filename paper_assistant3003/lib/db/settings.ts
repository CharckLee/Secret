import { db } from './index';

export async function getSetting<T>(key: string): Promise<T | undefined> {
  try {
    const row = await db.settings.get(key);
    return row?.value as T | undefined;
  } catch {
    return undefined;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  try {
    await db.settings.put({ key, value });
  } catch {
    // 忽略持久化失败
  }
}
