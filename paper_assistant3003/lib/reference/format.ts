import type { ParsedReference } from './types';

function formatAuthors(authors: string[]): string {
  if (authors.length === 0) return '[佚名]';
  if (authors.length <= 3) return authors.join(', ');
  return `${authors.slice(0, 3).join(', ')}, 等`;
}

export function formatReference(f: ParsedReference): string {
  const authors = formatAuthors(f.authors);

  if (f.type === 'journal') {
    let s = `${authors}. ${f.title || '[题名缺失]'}[J]. ${f.journal || '[刊名缺失]'}`;
    if (f.year) s += `, ${f.year}`;
    if (f.volume) s += `, ${f.volume}`;
    if (f.issue) s += `(${f.issue})`;
    if (f.pages) s += `: ${f.pages}`;
    return `${s}.`;
  }

  if (f.type === 'thesis') {
    let s = `${authors}. ${f.title || '[题名缺失]'}[D].`;
    const loc = [f.place, f.school].filter(Boolean).join(': ');
    if (loc) s += ` ${loc}`;
    if (f.year) s += `, ${f.year}`;
    return `${s}.`;
  }

  if (f.type === 'book') {
    let s = `${authors}. ${f.title || '[题名缺失]'}[M].`;
    if (f.place && f.publisher) s += ` ${f.place}: ${f.publisher}`;
    if (f.year) s += `, ${f.year}`;
    return `${s}.`;
  }

  // web [EB/OL]
  let s = `${authors}. ${f.title || '[题名缺失]'}[EB/OL].`;
  if (f.pubDate) s += ` (${f.pubDate})`;
  if (f.accessDate) s += ` [${f.accessDate}]`;
  if (f.url) s += ` ${f.url}`;
  return `${s}.`;
}
