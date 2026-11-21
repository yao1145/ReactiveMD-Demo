import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  LocalCompileScheduler,
  formatLocalDiagnostic,
  type Diagnostic,
  type LocalCompileOptions,
  type LocalCompileWorker,
} from 'reactive-md';
import { LocalReactiveDocument } from 'reactive-md/react';
import { useCopy, useLanguage } from '../ui/i18n';
import { FakeStreamController, STREAM_CHUNKS, STREAM_INTERVAL_MS, type StreamStatus } from './fake-stream';
import './streaming-sample.css';

/** Same defaults the Playground uses for this source, so both compiles agree. */
const STREAM_COMPILE_OPTIONS: LocalCompileOptions = { markdownBreaks: true };

function createStreamWorker(): LocalCompileWorker {
  if (typeof Worker === 'undefined') throw new Error('This browser does not support Web Workers');
  return new Worker(
    new URL('../compilation/local-compile-worker.ts', import.meta.url),
    { type: 'module' },
  );
}

function DiagnosticItems({ diagnostics, testId }: { diagnostics: readonly Diagnostic[]; testId: string }) {
  const language = useLanguage();
  const labels = useCopy().editor;
  return (
    <ul className="diagnostic-list streaming-diagnostic-list" data-testid={testId}>
      {diagnostics.map((diagnostic, index) => (
        <li key={`${diagnostic.code}-${diagnostic.range?.start ?? 0}-${index}`}>
          <div className={`diagnostic-item streaming-diagnostic-item${diagnostic.severity === 'warning' ? ' is-warning' : ''}`}>
            <span className={`diag-severity diag-${diagnostic.severity === 'warning' ? 'warning' : 'error'}`}>
              {diagnostic.severity === 'warning' ? labels.warning : labels.error}
            </span>
            <span className="diag-message">{formatLocalDiagnostic(diagnostic, language)}</span>
            <span className="diag-position">{diagnostic.line}:{diagnostic.column}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Deterministic streaming sample. A fixed chunk list is replayed on a timer
 * into LocalCompileScheduler; the panel renders the growing snapshot through
 * LocalReactiveDocument. It never touches the Playground editor state.
 */
export function StreamingSample() {
  const copy = useCopy().streaming;
  const language = useLanguage();
  const schedulerRef = useRef<LocalCompileScheduler | null>(null);
  const controllerRef = useRef<FakeStreamController | null>(null);
  // Each generation owns a scheduler, so results from a cancelled run cannot
  // arrive under the next generation. The generation travels with each result.
  const createScheduler = (generation: number): void => {
    schedulerRef.current?.dispose();
    const current = controllerRef.current;
    schedulerRef.current = new LocalCompileScheduler({
      createWorker: createStreamWorker,
      delay: 120,
      onResult: (outcome) => {
        current?.applyOutcome({
          source: outcome.source,
          sourcePhase: outcome.sourcePhase,
          result: outcome.result,
          duration: outcome.duration,
        }, generation);
      },
    });
  };
  const [controller] = useState(() => {
    const created = new FakeStreamController({
      chunks: STREAM_CHUNKS,
      intervalMs: STREAM_INTERVAL_MS,
      submit: (source, phase) => {
        schedulerRef.current?.schedule(source, STREAM_COMPILE_OPTIONS, undefined, phase);
      },
      resetTransport: (generation) => createScheduler(generation),
    });
    controllerRef.current = created;
    return created;
  });
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  useEffect(() => {
    controller.start();
    return () => {
      schedulerRef.current?.dispose();
      schedulerRef.current = null;
      controller.dispose();
    };
  }, [controller]);

  const statusLabels: Record<StreamStatus, string> = {
    idle: copy.statusIdle,
    streaming: copy.statusStreaming,
    finalizing: copy.statusFinalizing,
    done: copy.statusDone,
    cancelled: copy.statusCancelled,
  };
  const busy = state.status === 'streaming' || state.status === 'finalizing';
  const final = state.status === 'done';
  const diagnostics = final ? state.finalDiagnostics : state.streamingDiagnostics;
  const diagnosticsHeading = final ? copy.finalHeading : copy.diagnosticsHeading;
  const diagnosticsHint = final ? copy.finalHint : copy.diagnosticsHint;
  const previewNote = state.status === 'cancelled'
    ? copy.previewCancelled
    : state.source
      ? copy.previewNote
      : copy.previewIdle;
  const chipState = state.status === 'done' ? '' : state.status === 'cancelled' || state.snapshotStatus === 'failed' ? ' is-error' : ' is-pending';

  return (
    <section className="streaming-view" aria-label={copy.region}>
      <header className="streaming-hero">
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <span
          className={`status-chip streaming-status${chipState}`}
          role="status"
          aria-live="polite"
          aria-label={`${copy.statusLabel}: ${statusLabels[state.status]}`}
          data-testid="streaming-status"
        >
          {copy.statusLabel} · {statusLabels[state.status]}
        </span>
      </header>

      <div className="streaming-toolbar">
        <div className="streaming-controls" role="group" aria-label={copy.controls}>
          <button type="button" className="button button-primary" onClick={controller.start}
            disabled={busy} data-testid="streaming-start">
            {copy.start}
          </button>
          <button type="button" className="button" onClick={controller.cancel}
            disabled={!busy} data-testid="streaming-cancel">
            {copy.cancel}
          </button>
          <button type="button" className="button" onClick={controller.restart} data-testid="streaming-restart">
            {copy.restart}
          </button>
        </div>
        <ul className="streaming-meta">
          <li>{copy.runMeta(state.generation, state.chunks, state.totalChunks)}</li>
          {state.snapshotStatus ? <li>{copy.snapshot(state.snapshotStatus, state.snapshotPhase ?? 'streaming')}</li> : null}
          {state.durationMs > 0 ? <li>{copy.duration(Math.round(state.durationMs))}</li> : null}
          <li data-testid="streaming-discarded">{copy.discarded(state.discarded)}</li>
        </ul>
      </div>

      <div className="streaming-grid">
        <article className="streaming-panel" aria-labelledby="streaming-source-heading">
          <header className="streaming-panel-head">
            <h3 id="streaming-source-heading">{copy.sourceHeading}</h3>
            <span className="streaming-panel-meta">{copy.sourceMeta(state.source.length)}</span>
          </header>
          <pre className="streaming-source" tabIndex={0} aria-label={copy.sourceHeading} data-testid="streaming-source">
            {state.source || copy.sourceEmpty}
          </pre>
        </article>

        <article className="streaming-panel" aria-labelledby="streaming-preview-heading">
          <header className="streaming-panel-head">
            <h3 id="streaming-preview-heading">{copy.previewHeading}</h3>
          </header>
          <p className="streaming-hint">{previewNote}</p>
          <div className="streaming-preview" data-testid="streaming-preview" aria-busy={busy}>
            {state.source ? (
              <LocalReactiveDocument
                key={`stream-generation-${state.generation}`}
                source={state.source}
                sourcePhase={final ? 'final' : 'streaming'}
                compileOptions={STREAM_COMPILE_OPTIONS}
                locale={language}
              />
            ) : <p className="streaming-placeholder">{copy.previewIdle}</p>}
          </div>
        </article>
      </div>

      <div className="streaming-diagnostics">
        <section className="streaming-panel" aria-labelledby="streaming-transient-heading">
          <header className="streaming-panel-head">
            <h3 id="streaming-transient-heading">{copy.transientHeading}</h3>
            <span className="streaming-panel-meta">{state.transient.length ? copy.count(state.transient.length) : copy.none}</span>
          </header>
          <p className="streaming-hint">{copy.transientHint}</p>
          <DiagnosticItems diagnostics={state.transient} testId="streaming-transient" />
        </section>
        <section className="streaming-panel" aria-labelledby="streaming-diagnostics-heading">
          <header className="streaming-panel-head">
            <h3 id="streaming-diagnostics-heading">{diagnosticsHeading}</h3>
            <span className="streaming-panel-meta">{diagnostics.length ? copy.count(diagnostics.length) : copy.none}</span>
          </header>
          <p className="streaming-hint">{diagnosticsHint}</p>
          <DiagnosticItems diagnostics={diagnostics} testId="streaming-final" />
        </section>
      </div>
    </section>
  );
}