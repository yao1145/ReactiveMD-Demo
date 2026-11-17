import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { notifyLocalRuntime, type Diagnostic, type LocalRuntime } from 'reactive-md';
import { LocalDocumentView, type LocalSourceTarget } from 'reactive-md/react';
import { flushComponentStateOnPageHide } from 'reactive-md/runtime/browser';
import { reactConfig as demoReactConfig } from 'virtual:reactive-md/host';
import { useCopy, useLanguage } from '../ui/i18n';
import { imagePolicy, type ImageAsset } from '../images/image-assets';
import type { LocalCompiledDocument } from '../compilation/use-local-compilation';
import type { PreviewStateSession } from '../compilation/preview-state';
import { COMPONENT_STATE_WRITE_DELAY, createSavedComponentStateStorage, hasSavableComponents } from '../compilation/component-state-storage';
import { unexpectedDiagnostic } from '../compilation/diagnostics';

interface LocalPreviewProps {
  document: LocalCompiledDocument;
  session: PreviewStateSession;
  /** Stable document identity used to scope saved component progress. */
  stateId: string;
  onDiagnostics: (diagnostics: Diagnostic[]) => void;
  images: readonly ImageAsset[];
  onSourceNavigate?(target: LocalSourceTarget): void;
}

export const LocalPreview = memo(function LocalPreview({ document, session, stateId, onDiagnostics, images, onSourceNavigate }: LocalPreviewProps) {
  const language = useLanguage();
  const copy = useCopy();
  const imageProps = useMemo(() => imagePolicy(Object.fromEntries(images.map(a => [a.url, a.dataUrl]))), [images]);
  const [instance, setInstance] = useState<{
    document: LocalCompiledDocument;
    runtime: LocalRuntime;
    session: PreviewStateSession;
  } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const reportRef = useRef(onDiagnostics);
  reportRef.current = onDiagnostics;
  const activeRef = useRef<{session:PreviewStateSession; lease:ReturnType<PreviewStateSession['open']>} | null>(null);

  useLayoutEffect(() => () => {
    const active = activeRef.current;
    if (active?.session === session) {
      active.lease.release();
      activeRef.current = null;
    }
  }, [session]);

  useLayoutEffect(() => {
    try {
      let active = activeRef.current;
      if (!active || active.session !== session || !active.lease.update(document)) {
        // The replacement runtime reads stored progress while it is created;
        // write any coalesced save first so it does not restore stale state.
        active?.lease.runtime.services?.state.flush();
        // Component progress is restored only while creating a runtime; later
        // document updates keep the existing registry.
        const lease = session.open(
          document,
          hasSavableComponents(document)
            ? {
                documentId: stateId,
                componentStateStorage: createSavedComponentStateStorage(stateId),
                componentStateWriteDelayMs: COMPONENT_STATE_WRITE_DELAY,
              }
            : {},
        );
        const previous = active;
        active = {session,lease};
        activeRef.current = active;
        previous?.lease.release();
      }
      setInstance({document,runtime:active.lease.runtime,session});
      setInitError(null);
    } catch (error) {
      setInitError(error instanceof Error ? error.message : String(error));
      reportRef.current([unexpectedDiagnostic(error, copy.status.unexpectedError)]);
      return;
    }
  }, [document, session, stateId, copy.status.unexpectedError]);

  useLayoutEffect(() => {
    if (instance?.document === document) notifyLocalRuntime(instance.runtime);
  }, [instance, document]);

  // Coalesced game saves stop with the page; flush the newest snapshot before
  // the browser discards it.
  useEffect(() => flushComponentStateOnPageHide({
    flush: () => activeRef.current?.lease.runtime.services?.state.flush(),
  }), []);

  if (initError) {
    return <div className="preview-error" role="alert">
      <h3>{copy.preview.startErrorTitle}</h3>
      <p>{initError}</p>
    </div>;
  }
  if (!instance || instance.session !== session) {
    return <div className="preview-loading" role="status"><p>{copy.preview.preparing}</p></div>;
  }
  return (
    <LocalDocumentView
      reactConfig={demoReactConfig}
      {...imageProps}
      document={instance.document}
      runtime={instance.runtime}
      onDiagnostics={onDiagnostics}
      locale={language}
      onSourceNavigate={onSourceNavigate}
    />
  );
});
