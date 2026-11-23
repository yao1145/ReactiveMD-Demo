import type { Diagnostic } from 'reactive-md';
import type { LocalObserver, LocalTraceEvent } from 'reactive-md/observability';
import { dedupeDiagnostics } from './diagnostics';

/** Which pipeline produced an observation. */
export type DiagnosticOrigin = 'compile' | 'export';

/**
 * Identity of one document source generation. The display name is not part of
 * the identity: switching UI language must not split a scope, while editing the
 * source or switching documents must.
 */
export interface DiagnosticScope {
  readonly documentKey: string;
  readonly documentName: string;
  readonly sourceDigest: string;
  readonly sourceLength: number;
}

export interface ScopedDiagnostic {
  readonly scope: DiagnosticScope;
  readonly origin: DiagnosticOrigin;
  /** Export attempt (trace id) that produced the diagnostic. */
  readonly operationId?: string;
  readonly diagnostic: Diagnostic;
}

export interface ScopedTraceEvent {
  readonly scope: DiagnosticScope;
  readonly origin: DiagnosticOrigin;
  /** Export attempt (trace id) that produced the event. */
  readonly operationId?: string;
  readonly event: LocalTraceEvent;
}

export type ScopedObservation =
  | {
    readonly kind: 'diagnostic';
    readonly scope: DiagnosticScope;
    readonly origin: DiagnosticOrigin;
    readonly operationId?: string;
    readonly diagnostic: Diagnostic;
  }
  | {
    readonly kind: 'event';
    readonly scope: DiagnosticScope;
    readonly origin: DiagnosticOrigin;
    readonly operationId?: string;
    readonly event: LocalTraceEvent;
  };

function hash32(text: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Stable, synchronous source identity for scoping observations. */
export function digestSource(source: string): string {
  const high = hash32(source, 0x811c9dc5);
  const low = hash32(source, 0x9e3779b9);
  return `${high.toString(16).padStart(8, '0')}${low.toString(16).padStart(8, '0')}`;
}

export function createDiagnosticScope(
  documentKey: string,
  documentName: string,
  source: string,
): DiagnosticScope {
  return {
    documentKey,
    documentName,
    sourceDigest: digestSource(source),
    sourceLength: source.length,
  };
}

export function sameDiagnosticScope(left: DiagnosticScope, right: DiagnosticScope): boolean {
  return left.documentKey === right.documentKey
    && left.sourceDigest === right.sourceDigest
    && left.sourceLength === right.sourceLength;
}

/** Short display label for the panel; never used for identity. */
export function scopeLabel(scope: DiagnosticScope): string {
  return `${scope.documentName} · ${scope.sourceDigest.slice(0, 8)}`;
}

const MAX_DIAGNOSTICS = 100;
const MAX_EVENTS = 50;
const MAX_TRACE_SCOPES = 512;

/**
 * Bounded, scoped history of compiler events and export observations.
 *
 * Compile trace ids identify the generation that scheduled them, so a worker
 * response that arrives after a document or source switch stays filed under the
 * old generation. Export observations carry their operation scope explicitly.
 */
export class DiagnosticJournal {
  private scope: DiagnosticScope;
  private pendingScope: DiagnosticScope | null = null;
  private readonly traceScopes = new Map<string, DiagnosticScope>();
  readonly diagnostics: ScopedDiagnostic[] = [];
  readonly events: ScopedTraceEvent[] = [];

  constructor(scope: DiagnosticScope) {
    this.scope = scope;
  }

  /** Mark the generation that new compile events belong to. */
  setScope(scope: DiagnosticScope): void {
    if (!sameDiagnosticScope(this.scope, scope)) this.pendingScope = null;
    this.scope = scope;
  }

  /** File a compile trace event; its trace id keeps that generation. */
  recordCompileEvent(event: LocalTraceEvent): void {
    let scope = this.traceScopes.get(event.traceId);
    if (!scope) {
      scope = this.scope;
      this.traceScopes.set(event.traceId, scope);
      if (this.traceScopes.size > MAX_TRACE_SCOPES) {
        const oldest = this.traceScopes.keys().next();
        if (!oldest.done) this.traceScopes.delete(oldest.value);
      }
    }
    if (event.type === 'worker-error' || event.type === 'worker-timeout' || event.type === 'worker-stale-response') {
      this.pendingScope = scope;
    }
    this.pushEvent({ scope, origin: 'compile', event });
  }

  /**
   * File a compile diagnostic under the generation of the trace event that
   * reported it. Diagnostics only observe the worker's failure events, so an
   * unattributed diagnostic falls back to the current generation.
   */
  recordCompileDiagnostic(diagnostic: Diagnostic): void {
    const scope = this.pendingScope ?? this.scope;
    this.pendingScope = null;
    this.pushDiagnostic({ scope, origin: 'compile', diagnostic });
  }

  /** File an observation that already carries its operation scope. */
  record(observation: ScopedObservation): void {
    if (observation.kind === 'diagnostic') {
      this.pushDiagnostic({
        scope: observation.scope,
        origin: observation.origin,
        ...observation.operationId === undefined ? {} : { operationId: observation.operationId },
        diagnostic: observation.diagnostic,
      });
      return;
    }
    this.pushEvent({
      scope: observation.scope,
      origin: observation.origin,
      ...observation.operationId === undefined ? {} : { operationId: observation.operationId },
      event: observation.event,
    });
  }

  private pushDiagnostic(entry: ScopedDiagnostic): void {
    this.diagnostics.push(entry);
    DiagnosticJournal.trim(this.diagnostics, MAX_DIAGNOSTICS);
  }

  private pushEvent(entry: ScopedTraceEvent): void {
    this.events.push(entry);
    DiagnosticJournal.trim(this.events, MAX_EVENTS);
  }

  private static trim<T>(entries: T[], maxEntries: number): void {
    if (entries.length > maxEntries) entries.splice(0, entries.length - maxEntries);
  }
}

const SEVERITY_WEIGHT: Record<Diagnostic['severity'], number> = {
  info: 1,
  warning: 2,
  error: 3,
  fatal: 4,
};

/**
 * Order diagnostics for the report's 100-entry cap: more severe first, then the
 * latest export failure, then the original order. The full diagnostics panel
 * uses its own list and is unaffected.
 */
export function orderReportDiagnostics(
  current: readonly Diagnostic[],
  exportDiagnostics: readonly Diagnostic[] = [],
): Diagnostic[] {
  const entries = [
    ...exportDiagnostics.map(diagnostic => ({ diagnostic, exportGroup: 1 })),
    ...current.map(diagnostic => ({ diagnostic, exportGroup: 0 })),
  ];
  // Array.prototype.sort is stable, so each group keeps its recorded order.
  entries.sort((left, right) => SEVERITY_WEIGHT[right.diagnostic.severity]
    - SEVERITY_WEIGHT[left.diagnostic.severity]
    || right.exportGroup - left.exportGroup);
  return dedupeDiagnostics(entries.map(entry => entry.diagnostic));
}

/**
 * The trace id of the latest export operation when it failed. A later
 * successful, running or absent attempt means there is no current failure to
 * report.
 */
export function latestExportFailureId(
  scope: DiagnosticScope,
  events: readonly ScopedTraceEvent[],
): string | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const entry = events[index];
    if (entry.origin !== 'export' || !sameDiagnosticScope(entry.scope, scope)) continue;
    if (entry.event.type === 'export-error') return entry.event.traceId;
    if (
      entry.event.type === 'export-end'
      || entry.event.type === 'export-cancel'
      || entry.event.type === 'export-start'
    ) return null;
  }
  return null;
}

export interface ReportSelectionInput {
  /** Identity of the source the report is generated for. */
  readonly scope: DiagnosticScope;
  /** Diagnostics compiled for that exact source, as shown in the editor. */
  readonly current: readonly Diagnostic[];
  readonly diagnostics: readonly ScopedDiagnostic[];
  readonly events: readonly ScopedTraceEvent[];
}

export interface ReportObservationSelection {
  readonly diagnostics: Diagnostic[];
  readonly events: LocalTraceEvent[];
}

/**
 * Select the report payload for one document source generation: only
 * diagnostics and events filed under that exact scope, with the latest failed
 * export operation ordered into the report's first 100 diagnostics.
 */
export function selectReportObservations(input: ReportSelectionInput): ReportObservationSelection {
  const scoped = input.diagnostics.filter(entry => sameDiagnosticScope(entry.scope, input.scope));
  const compiled = scoped.filter(entry => entry.origin === 'compile').map(entry => entry.diagnostic);
  const failureId = latestExportFailureId(input.scope, input.events);
  const exported = failureId === null
    ? []
    : scoped
      .filter(entry => entry.origin === 'export' && entry.operationId === failureId)
      .map(entry => entry.diagnostic);
  return {
    diagnostics: orderReportDiagnostics([...input.current, ...compiled], exported),
    events: input.events
      .filter(entry => sameDiagnosticScope(entry.scope, input.scope))
      .map(entry => entry.event),
  };
}

export interface ScopedObserverOptions {
  readonly scope: DiagnosticScope;
  readonly origin?: DiagnosticOrigin;
  readonly operationId?: string;
  /** False drops late observations from a cancelled or superseded operation. */
  readonly isCurrent?: () => boolean;
  readonly onObservation?: (observation: ScopedObservation) => void;
}

/** A LocalObserver that stamps every observation with one operation scope. */
export function createScopedObserver(options: ScopedObserverOptions): LocalObserver {
  const origin = options.origin ?? 'export';
  const isCurrent = options.isCurrent ?? (() => true);
  const emit = (observation: ScopedObservation) => {
    if (!isCurrent()) return;
    options.onObservation?.(observation);
  };
  return {
    onDiagnostic: diagnostic => emit({
      kind: 'diagnostic',
      scope: options.scope,
      origin,
      operationId: options.operationId,
      diagnostic,
    }),
    onTrace: event => emit({
      kind: 'event',
      scope: options.scope,
      origin,
      operationId: options.operationId,
      event,
    }),
  };
}