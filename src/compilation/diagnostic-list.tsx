import { formatLocalDiagnostic, type Diagnostic, type SourceRange } from 'reactive-md';
import { useCopy, useLanguage } from '../ui/i18n';

interface DiagnosticListProps {
  diagnostics: Diagnostic[];
  focusDiagnostic: (range: SourceRange) => void;
  emptyText?: string;
}

export function DiagnosticList({ diagnostics, focusDiagnostic, emptyText }: DiagnosticListProps) {
  const copy = useCopy().editor;
  const language = useLanguage();
  if (diagnostics.length === 0) {
    return emptyText ? <p className="diagnostic-empty">{emptyText}</p> : null;
  }
  return (
    <ul className="diagnostic-list">
      {diagnostics.map((diagnostic, index) => (
        <li key={`${diagnostic.code}-${diagnostic.range?.start ?? 0}-${index}`}>
          <button
            type="button"
            className="diagnostic-item"
            onClick={() => focusDiagnostic(diagnostic.range)}
            title={copy.locate}
          >
            <span className={`diag-severity diag-${diagnostic.severity === 'warning' ? 'warning' : 'error'}`}>
              {diagnostic.severity === 'warning' ? copy.warning : copy.error}
            </span>
            <span className="diag-message">{formatLocalDiagnostic(diagnostic, language)}</span>
            <span className="diag-position">{copy.position(diagnostic.line, diagnostic.column)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
