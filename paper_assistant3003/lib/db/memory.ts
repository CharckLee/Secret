// IndexedDB 不可用（如隐私模式）时的内存降级存储，会话内有效，关闭页面后丢失
const tables = new Map<string, Map<string, unknown>>();

function table(name: string): Map<string, unknown> {
  if (!tables.has(name)) tables.set(name, new Map());
  return tables.get(name)!;
}

export const memory = {
  get(name: string, id: string): unknown {
    return table(name).get(id);
  },
  put(name: string, id: string, value: unknown): void {
    table(name).set(id, value);
  },
  delete(name: string, id: string): void {
    table(name).delete(id);
  },
  list(name: string): unknown[] {
    return Array.from(table(name).values());
  },
};
