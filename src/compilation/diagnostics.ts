import type { Diagnostic } from 'reactive-md';

export function unexpectedDiagnostic(
  error: unknown,
  formatMessage: (detail: string) => string,
): Diagnostic {
  const detail = error instanceof Error ? error.message : String(error);
  return {
    code: 'demo.unexpected',
    message: formatMessage(detail),
    severity: 'error',
    range: { start: 0, end: 0 },
    line: 1,
    column: 1,
  };
}

export function dedupeDiagnostics(items: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  const result: Diagnostic[] = [];
  for (const item of items) {
    const key = `${item.code}|${item.range?.start ?? -1}|${item.range?.end ?? -1}|${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}
