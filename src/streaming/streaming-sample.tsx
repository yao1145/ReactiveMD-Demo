import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import {
  LocalCompileScheduler,
  formatLocalDiagnostic,
  type Diagnostic,
  type LocalCompileOptions,
  type LocalCompileWorker,
} from 'reactive-md';
import { LocalReactiveDocument } from 'reactive-md/react';
import { useCopy, useLanguage } from '../ui/i18n';
import { FakeStreamController, STREAM_SOURCE, STREAM_SPEED_SLIDER_MAX, sliderPositionToTps, tpsToSliderPosition, type StreamStatus } from './fake-stream';
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
 * Deterministic streaming sample. The current source is revealed by character
 * at the chosen rate into LocalCompileScheduler; the panel renders the growing
 * snapshot through LocalReactiveDocument. It never touches the Playground
 * editor state.
 */
export function StreamingSample() {
  const copy = useCopy().streaming;
  const language = useLanguage();
  const schedulerRef = useRef<LocalCompileScheduler | null>(null);
  const controllerRef = useRef<FakeStreamController | null>(null);
  const sourceRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  // Each generation owns a scheduler, so results from a cancelled run cannot
  // arrive under the next generation. The generation travels with each result.
  const createScheduler = (generation: number): void => {
    schedulerRef.current?.dispose();
    const current = controllerRef.current;
    schedulerRef.current = new LocalCompileScheduler({
      createWorker: createStreamWorker,
      // Shorter than one character tick so each revealed prefix can settle.
      delay: 60,
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
      source: STREAM_SOURCE,
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
    // Keep a transport ready for edits made before the first Start, but do not
    // reveal any source until the user asks for it.
    createScheduler(controller.getSnapshot().generation);
    return () => {
      schedulerRef.current?.dispose();
      schedulerRef.current = null;
      controller.dispose();
    };
  }, [controller]);

  useEffect(() => {
    // Keep the source and preview windows on the newest content while the
    // stream grows, then return both to the start of the completed document.
    const sourcePane = sourceRef.current;
    const previewPane = previewRef.current;
    if (!sourcePane || !previewPane) return;
    if (state.running || state.status === 'finalizing') {
      sourcePane.scrollTop = sourcePane.scrollHeight;
      previewPane.scrollTop = previewPane.scrollHeight;
    } else if (state.status === 'done' || state.status === 'failed') {
      sourcePane.scrollTop = 0;
      previewPane.scrollTop = 0;
    }
  }, [state.source, state.status]);

  const statusLabels: Record<StreamStatus, string> = {
    idle: copy.statusIdle,
    draft: copy.statusDraft,
    streaming: copy.statusStreaming,
    finalizing: copy.statusFinalizing,
    done: copy.statusDone,
    failed: copy.statusFailed,
    cancelled: copy.statusCancelled,
  };
  const busy = state.running;
  const finished = state.status === 'done' || state.status === 'failed';
  const final = state.status === 'done';
  const editorValue = state.running ? state.source : state.targetSource;
  // Provisional diagnostics belong to an unfinished snapshot. Once the final
  // snapshot is applied (successful or failed), its diagnostics move to the
  // final section and this list is empty.
  const provisionalDiagnostics = state.transient;
  const snapshotDiagnostics = finished ? state.finalDiagnostics : state.streamingDiagnostics;
  const diagnosticsHeading = finished ? copy.finalHeading : copy.diagnosticsHeading;
  const chipState = state.status === 'done' ? '' : state.status === 'cancelled' || state.status === 'failed' || state.snapshotStatus === 'failed' ? ' is-error' : ' is-pending';
  const speedPosition = tpsToSliderPosition(state.speedTps);
  const speedProgress = `${(speedPosition / STREAM_SPEED_SLIDER_MAX) * 100}%`;

  return (
    <section className="streaming-view" aria-label={copy.region}>
      <header className="streaming-hero">
        <h2>{copy.title}</h2>
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
            disabled={state.running || !state.targetSource} data-testid="streaming-start">
            {copy.start}
          </button>
          <button type="button" className="button" onClick={controller.cancel}
            disabled={!state.running} data-testid="streaming-cancel">
            {copy.cancel}
          </button>
          <button type="button" className="button" onClick={controller.restoreExample}
            data-testid="streaming-restore">
            {copy.restore}
          </button>
          {state.mode === 'custom' ? (
            <button type="button" className="button" onClick={controller.finalizeSource}
              disabled={state.running || !state.targetSource || state.status === 'finalizing' || state.status === 'done'}
              data-testid="streaming-finalize">
              {copy.finalize}
            </button>
          ) : null}
        </div>
        <label className="streaming-speed"
          style={{ '--streaming-speed-progress': speedProgress } as CSSProperties}>
          <span className="streaming-speed-label">{copy.speedLabel}</span>
          <input type="range" min={0} max={STREAM_SPEED_SLIDER_MAX}
            step={1} value={speedPosition}
            onChange={(event) => controller.setSpeed(sliderPositionToTps(Number(event.target.value)))}
            data-testid="streaming-speed" />
          <output data-testid="streaming-speed-value">{copy.speedValue(state.speedTps)}</output>
        </label>
        <ul className="streaming-meta">
          <li>{copy.progress(state.revealedTokens, state.totalTokens)}</li>
        </ul>
      </div>

      <div className="streaming-grid">
        <article className="streaming-panel" aria-labelledby="streaming-source-heading">
          <header className="streaming-panel-head">
            <h3 id="streaming-source-heading">{copy.sourceHeading}</h3>
          </header>
          <textarea ref={sourceRef} className="streaming-source" value={editorValue} spellCheck={false}
            readOnly={state.running}
            aria-label={copy.sourceHeading}
            onChange={(event) => controller.editSource(event.target.value)}
            data-testid="streaming-source" />
        </article>

        <article className="streaming-panel" aria-labelledby="streaming-preview-heading">
          <header className="streaming-panel-head">
            <h3 id="streaming-preview-heading">{copy.previewHeading}</h3>
          </header>
          <div ref={previewRef} className="streaming-preview" data-testid="streaming-preview" aria-busy={busy}>
            {state.source ? (
              <LocalReactiveDocument
                key={`stream-generation-${state.generation}`}
                source={state.source}
                sourcePhase={final ? 'final' : 'streaming'}
                compileOptions={STREAM_COMPILE_OPTIONS}
                locale={language}
              />
            ) : null}
          </div>
        </article>
      </div>

      <div className="streaming-diagnostics">
        <section className="streaming-panel" aria-labelledby="streaming-transient-heading">
          <header className="streaming-panel-head">
            <h3 id="streaming-transient-heading">{copy.transientHeading}</h3>
            <span className="streaming-panel-meta">{provisionalDiagnostics.length ? copy.count(provisionalDiagnostics.length) : copy.none}</span>
          </header>
          <DiagnosticItems diagnostics={provisionalDiagnostics} testId="streaming-transient" />
        </section>
        <section className="streaming-panel" aria-labelledby="streaming-diagnostics-heading">
          <header className="streaming-panel-head">
            <h3 id="streaming-diagnostics-heading">{diagnosticsHeading}</h3>
            <span className="streaming-panel-meta">{snapshotDiagnostics.length ? copy.count(snapshotDiagnostics.length) : copy.none}</span>
          </header>
          <DiagnosticItems diagnostics={snapshotDiagnostics} testId="streaming-final" />
        </section>
      </div>
    </section>
  );
}