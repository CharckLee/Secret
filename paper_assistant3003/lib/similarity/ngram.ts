function ngrams(s: string, n: number): Set<string> {
  const set = new Set<string>();
  if (s.length < n) return set;
  for (let i = 0; i <= s.length - n; i++) {
    set.add(s.slice(i, i + n));
  }
  return set;
}

// 字符级 2-gram 与 3-gram 的 Dice 重叠系数（0-1）
export function diceCoefficient(a: string, b: string): number {
  const a2 = ngrams(a, 2);
  const a3 = ngrams(a, 3);
  const b2 = ngrams(b, 2);
  const b3 = ngrams(b, 3);

  let inter = 0;
  for (const g of a2) if (b2.has(g)) inter++;
  for (const g of a3) if (b3.has(g)) inter++;

  const total = a2.size + b2.size + a3.size + b3.size;
  return total === 0 ? 0 : (2 * inter) / total;
}
