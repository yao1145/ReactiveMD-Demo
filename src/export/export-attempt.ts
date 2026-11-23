import type { Diagnostic } from 'reactive-md';
import {
  createLocalTraceId,
  emitLocalDiagnostic,
  emitLocalTrace,
  type LocalObserver,
  type LocalTraceEvent,
} from 'reactive-md/observability';
import {
  createScopedObserver,
  type DiagnosticScope,
  type ScopedObservation,
} from '../compilation/diagnostic-scope';

/** Stages the engine report keeps for export trace events. */
export const EXPORT_STAGES = ['compile', 'assets', 'bundle', 'render', 'download', 'pdf'] as const;
export type ExportStage = (typeof EXPORT_STAGES)[number];

/** Terminal statuses the engine report keeps for export trace events. */
export type ExportTerminalStatus = 'ok' | 'printed' | 'cancelled' | 'failed';

export interface ExportAttemptOptions {
  /** Document and source generation every observation is filed under. */
  readonly scope: DiagnosticScope;
  /** Whether this attempt is still the one the dialog shows and archives. */
  readonly isCurrent: () => boolean;
  readonly onObservation?: (observation: ScopedObservation) => void;
  /** Trace id of the attempt; tests pass a fixed id. */
  readonly traceId?: string;
  /** Clock injection for deterministic durations in tests. */
  readonly now?: () => number;
  readonly elapsed?: () => number;
}

/**
 * One export attempt with a single terminal event.
 *
 * The constructor emits `export-start`. Exactly one of `succeed`, `fail` and
 * `cancel` then emits the matching terminal event with the attempt's trace id,
 * current stage and duration; later terminal calls return false and emit
 * nothing. Observations from the attempt stop being archived once it settles,
 * so a late build or print promise cannot write back into the panel.
 */
export class ExportAttempt {
  readonly traceId: string;
  /** Observer for work done by this attempt; drops observations after settle. */
  readonly observer: LocalObserver;
  readonly startedAt: number;
  private readonly options: ExportAttemptOptions;
  private readonly now: () => number;
  private readonly elapsed: () => number;
  private readonly terminalObserver: LocalObserver;
  private currentStage: ExportStage = 'compile';
  private settled = false;

  constructor(options: ExportAttemptOptions) {
    this.options = options;
    this.now = options.now ?? Date.now;
    this.elapsed = options.elapsed ?? (() => performance.now());
    this.traceId = options.traceId ?? createLocalTraceId();
    this.startedAt = this.elapsed();
    this.terminalObserver = createScopedObserver({
      scope: options.scope,
      operationId: this.traceId,
      isCurrent: options.isCurrent,
      onObservation: options.onObservation,
    });
    this.observer = createScopedObserver({
      scope: options.scope,
      operationId: this.traceId,
      isCurrent: () => !this.settled && options.isCurrent(),
      onObservation: options.onObservation,
    });
    emitLocalTrace(this.terminalObserver, {
      type: 'export-start',
      traceId: this.traceId,
      timestamp: this.now(),
    });
  }

  get stage(): ExportStage {
    return this.currentStage;
  }

  get done(): boolean {
    return this.settled;
  }

  /** Still active and owned by the dialog. */
  isCurrent(): boolean {
    return !this.settled && this.options.isCurrent();
  }

  /** Record the pipeline stage; late calls after a terminal event are ignored. */
  setStage(stage: ExportStage): boolean {
    if (!this.isCurrent()) return false;
    this.currentStage = stage;
    return true;
  }

  /** Emit `export-end` with `ok` for a saved file or `printed` for print. */
  succeed(status: 'ok' | 'printed' = 'ok'): boolean {
    return this.settle({ type: 'export-end', status });
  }

  /** Emit the failure diagnostics and then `export-error` with `failed`. */
  fail(code: string, diagnostics: readonly Diagnostic[] = []): boolean {
    if (!this.isCurrent()) return false;
    for (const diagnostic of diagnostics) emitLocalDiagnostic(this.terminalObserver, diagnostic);
    return this.settle({ type: 'export-error', code, status: 'failed' });
  }

  /** Emit `export-cancel` with `cancelled` before the caller invalidates the task. */
  cancel(): boolean {
    return this.settle({ type: 'export-cancel', status: 'cancelled' });
  }

  private settle(
    event: Pick<LocalTraceEvent, 'type' | 'status' | 'code'>,
  ): boolean {
    if (!this.isCurrent()) return false;
    this.settled = true;
    emitLocalTrace(this.terminalObserver, {
      ...event,
      traceId: this.traceId,
      timestamp: this.now(),
      stage: this.currentStage,
      durationMs: Math.max(0, Math.round(this.elapsed() - this.startedAt)),
    });
    return true;
  }
}