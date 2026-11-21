import type { LocalDocument } from 'reactive-md';

/** Keep an old script only while an uncompiled edit leaves its source and parsing context intact. */
export function samePreviewScripts(document: LocalDocument, source: string): boolean {
  const previous = document.source;
  const scripts = document.capabilities?.scripts;
  if (previous === source || !scripts?.length) return true;

  let start = 0;
  while (start < previous.length && start < source.length && previous[start] === source[start]) start++;
  let oldEnd = previous.length;
  let newEnd = source.length;
  while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === source[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const change = previous.slice(start, oldEnd) + source.slice(start, newEnd);
  if (/[<>`~\\\r\n]/.test(change)) return false;

  return scripts.every(({ range }) => {
    const tag = previous.lastIndexOf('<', range.start - 1);
    const line = previous.lastIndexOf('\n', tag) + 1;
    const end = previous.indexOf('>', range.end) + 1;
    return oldEnd < line || start >= end;
  });
}
