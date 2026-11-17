import { useCallback, useEffect, useRef } from 'react';
import type { Language } from '../ui/i18n';
import type { DocumentLibrary, LibraryMode } from './document-library';
import { browserStorage, writeDraft } from './workspace-storage';

const SOURCE_WRITE_DELAY = 400;
interface PendingExampleDraft { exampleId: string; source: string; language: Language }

/** Debounce example drafts and flush both storage owners when the page leaves. */
export function useDraftPersistence(
  libraryMode: LibraryMode,
  selectedExample: string,
  source: string,
  language: Language,
  library: Pick<DocumentLibrary, 'flush'>,
) {
  const pendingSourceWrite = useRef<PendingExampleDraft | null>(null);
  const sourceWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Large sources are written after typing settles rather than on every key.
  const flushSourceWrite = useCallback((draft?: PendingExampleDraft) => {
    if (draft) pendingSourceWrite.current = draft;
    if (sourceWriteTimer.current !== null) {
      clearTimeout(sourceWriteTimer.current);
      sourceWriteTimer.current = null;
    }
    const pending = pendingSourceWrite.current;
    pendingSourceWrite.current = null;
    if (!pending) return;
    try {
      const storage = browserStorage();
      if (storage) writeDraft(storage, pending.language, pending.exampleId, pending.source);
    } catch { /* optional storage */ }
  }, []);

  useEffect(() => {
    if (libraryMode !== 'example') return;
    pendingSourceWrite.current = { exampleId: selectedExample, source, language };
    if (sourceWriteTimer.current !== null) clearTimeout(sourceWriteTimer.current);
    sourceWriteTimer.current = setTimeout(() => {
      sourceWriteTimer.current = null;
      flushSourceWrite();
    }, SOURCE_WRITE_DELAY);
  }, [libraryMode, language, selectedExample, source, flushSourceWrite]);

  useEffect(() => {
    // Leaving the page must keep both the example draft and the personal
    // library up to date, whichever destination is open.
    const flush = () => {
      flushSourceWrite();
      library.flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [flushSourceWrite, library]);

  return flushSourceWrite;
}
