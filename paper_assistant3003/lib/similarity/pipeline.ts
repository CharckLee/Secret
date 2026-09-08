import type { SentenceUnit } from './types';
import { splitSentences } from '@/lib/text/split';

export function buildUnits(text: string): SentenceUnit[] {
  return splitSentences(text).map((t, i) => ({ index: i, text: t }));
}
