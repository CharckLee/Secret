import { detectType } from './detect';
import { parseFields } from './parse';
import { formatReference } from './format';
import type { ParseResult, ReferenceType } from './types';

export function parseReference(raw: string): ParseResult {
  const type: ReferenceType = detectType(raw);
  const fields = parseFields(raw, type);
  const formatted = formatReference(fields);
  return { type, fields, formatted };
}
