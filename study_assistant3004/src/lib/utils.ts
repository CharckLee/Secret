export function cn(
  ...classes: (string | false | null | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分钟`;
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 把未知输入归一化成干净的 id 列表：过滤非法项、去重、截断上限 */
export function normalizeIds(input: unknown, max = 200): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * 合并"已选文件"与"新拖入 / 新选择的文件"。
 * 同名**且**同大小视为同一个（同一个文件被拖两次很常见）；超过上限则丢弃多余的。
 */
export function mergeFileKeys<T extends { name: string; size: number }>(
  existing: T[],
  incoming: T[],
  max = 20,
): T[] {
  const key = (f: { name: string; size: number }) => `${f.name}::${f.size}`;
  const seen = new Set(existing.map(key));
  const out = [...existing];
  for (const f of incoming) {
    if (out.length >= max) break;
    const k = key(f);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}

/** 从 unknown 输入中安全取值，不在白名单则回退；const 类型参数保留字面量联合类型 */
export function pickEnum<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}
