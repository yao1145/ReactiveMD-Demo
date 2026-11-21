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
  const changed = previous.slice(start, oldEnd) + source.slice(start, newEnd);
  if (/[\r\n]/.test(changed)) return false;

  // Only edits within a plain prose line can reuse the pending script grant.
  // Indentation, blank lines and Markdown structure can change its meaning
  // even when the script and its delimiters have the same text.
  const lineStart = previous.lastIndexOf('\n', start - 1) + 1;
  const previousLineEnd = previous.indexOf('\n', oldEnd);
  const nextLineEnd = source.indexOf('\n', newEnd);
  const plainProse = /^\p{L}[\p{L}\p{N} \t.,:!?，。！？：]*\r?$/u;
  if (!plainProse.test(previous.slice(lineStart, previousLineEnd < 0 ? undefined : previousLineEnd))
    || !plainProse.test(source.slice(lineStart, nextLineEnd < 0 ? undefined : nextLineEnd))) return false;


  return scripts.every(({ range }) => {
    const tag = previous.lastIndexOf('<', range.start - 1);
    const line = previous.lastIndexOf('\n', tag) + 1;
    const end = previous.indexOf('>', range.end) + 1;
    return oldEnd < line || start >= end;
  });
}
