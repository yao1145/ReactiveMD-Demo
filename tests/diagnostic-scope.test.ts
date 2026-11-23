import { describe, expect, it } from 'vitest';
import { localCompileOptionsKey, type Diagnostic } from 'reactive-md';
import { createDiagnosticReport, emitLocalDiagnostic, type LocalTraceEvent } from 'reactive-md/observability';
import {
  DiagnosticJournal,
  createDiagnosticScope,
  createScopedObserver,
  digestSource,
  latestExportFailureId,
  orderReportDiagnostics,
  sameDiagnosticScope,
  scopeLabel,
  selectReportObservations,
  type ScopedObservation,
} from '../src/compilation/diagnostic-scope';

function diagnostic(code: string, overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    code,
    message: `Message for ${code}`,
    severity: 'error',
    range: { start: 0, end: 0 },
    line: 1,
    column: 1,
    ...overrides,
  };
}

function trace(type: LocalTraceEvent['type'], traceId: string, revision?: number): LocalTraceEvent {
  return {
    type,
    traceId,
    timestamp: 1,
    ...(revision === undefined ? {} : { sourceRevision: revision }),
  };
}

const SOURCE_A = '# Alpha\n\nWorker boundary {{ 1 + 1 }}';
const SOURCE_B = '# Beta\n\nWorker boundary {{ 2 + 1 }}';
const COMPILE_KEY = localCompileOptionsKey();
const STRICT_KEY = localCompileOptionsKey({ strict: true });
const RECOVERY_KEY = localCompileOptionsKey({ strict: false });
const scopeA = createDiagnosticScope('document:a', 'Alpha', SOURCE_A, COMPILE_KEY);
const scopeB = createDiagnosticScope('document:b', 'Beta', SOURCE_B, COMPILE_KEY);

describe('diagnostic scope identity', () => {
  it('separates documents, source generations and compile configurations but ignores the display name', () => {
    // The engine omits redundant option values, so only the narrowed key is
    // known to differ from the default.
    expect(STRICT_KEY).toBe(COMPILE_KEY);
    expect(RECOVERY_KEY).not.toBe(COMPILE_KEY);
    expect(digestSource(SOURCE_A)).toBe(digestSource(SOURCE_A));
    expect(digestSource(SOURCE_A)).not.toBe(digestSource(SOURCE_B));
    expect(sameDiagnosticScope(scopeA, createDiagnosticScope('document:a', 'Renamed', SOURCE_A, COMPILE_KEY))).toBe(true);
    expect(sameDiagnosticScope(scopeA, scopeB)).toBe(false);
    const edited = createDiagnosticScope('document:a', 'Alpha', `${SOURCE_A}!`, COMPILE_KEY);
    expect(sameDiagnosticScope(scopeA, edited)).toBe(false);
    const reconfigured = createDiagnosticScope('document:a', 'Alpha', SOURCE_A, RECOVERY_KEY);
    expect(sameDiagnosticScope(scopeA, reconfigured)).toBe(false);
    expect(scopeLabel(scopeA)).toBe(
      `Alpha · ${digestSource(SOURCE_A).slice(0, 8)} · ${digestSource(COMPILE_KEY).slice(0, 4)}`,
    );
    expect(scopeLabel(reconfigured)).not.toBe(scopeLabel(scopeA));
  });
});

describe('diagnostic journal report scoping', () => {
  it('reports only the current document after switching from A to B', () => {
    const journal = new DiagnosticJournal(scopeA);
    journal.recordCompileEvent(trace('worker-request', 'trace-a', 1));
    journal.recordCompileDiagnostic(diagnostic('local.anchor.duplicate'));
    journal.recordCompileEvent(trace('worker-response', 'trace-a', 1));

    journal.setScope(scopeB);
    journal.recordCompileEvent(trace('worker-request', 'trace-b', 2));
    journal.recordCompileDiagnostic(diagnostic('local.binding.unknown'));
    journal.recordCompileEvent(trace('worker-response', 'trace-b', 2));

    const selection = selectReportObservations({
      scope: scopeB,
      current: [],
      diagnostics: journal.diagnostics,
      events: journal.events,
    });
    expect(selection.diagnostics.map(item => item.code)).toEqual(['local.binding.unknown']);
    expect(selection.events.map(event => event.traceId)).toEqual(['trace-b', 'trace-b']);

    const report = createDiagnosticReport(SOURCE_B, {
      diagnostics: selection.diagnostics,
      events: selection.events,
    });
    expect(report.document.sourceBytes).toBe(new TextEncoder().encode(SOURCE_B).byteLength);
    expect(report.document.sourceDigest).toBe(createDiagnosticReport(SOURCE_B).document.sourceDigest);
    expect(report.diagnostics.map(item => item.code)).toEqual(['local.binding.unknown']);
    expect(report.events?.map(event => event.traceId)).toEqual(['trace-b', 'trace-b']);
  });

  it('keeps an older generation of the same document out of the current report', () => {
    const journal = new DiagnosticJournal(scopeA);
    const generation1 = createDiagnosticScope('document:a', 'Alpha', SOURCE_A, COMPILE_KEY);
    const generation2 = createDiagnosticScope('document:a', 'Alpha', `${SOURCE_A}\n\nEdited`, COMPILE_KEY);
    journal.setScope(generation1);
    journal.recordCompileEvent(trace('worker-request', 'trace-1', 1));
    journal.recordCompileDiagnostic(diagnostic('local.anchor.duplicate'));

    journal.setScope(generation2);
    journal.recordCompileEvent(trace('worker-request', 'trace-2', 2));
    journal.recordCompileDiagnostic(diagnostic('local.binding.unknown'));

    // A late response for the old request must stay with the old generation.
    journal.recordCompileEvent(trace('worker-stale-response', 'trace-1', 1));
    journal.recordCompileDiagnostic(diagnostic('local.worker.stale-response', { phase: 'worker' }));

    const selection = selectReportObservations({
      scope: generation2,
      current: [],
      diagnostics: journal.diagnostics,
      events: journal.events,
    });
    expect(selection.diagnostics.map(item => item.code)).toEqual(['local.binding.unknown']);
    expect(selection.events.map(event => event.traceId)).toEqual(['trace-2']);
    expect(journal.diagnostics.some(entry => entry.scope === generation1)).toBe(true);
  });

  it('keeps compile diagnostics from another compile configuration out of the current report', () => {
    const strictScope = createDiagnosticScope('document:a', 'Alpha', SOURCE_A, STRICT_KEY);
    const recoveryScope = createDiagnosticScope('document:a', 'Alpha', SOURCE_A, RECOVERY_KEY);

    // Same document and byte-identical source: only the compile options change.
    const journal = new DiagnosticJournal(strictScope);
    journal.recordCompileEvent(trace('worker-request', 'trace-strict', 1));
    journal.recordCompileDiagnostic(diagnostic('local.tag.unclosed'));

    journal.setScope(recoveryScope);
    journal.recordCompileEvent(trace('worker-request', 'trace-recovery', 1));
    journal.recordCompileDiagnostic(diagnostic('local.recovery.unclosed'));

    // A failed export belongs to the current configuration and still leads the report.
    journal.record({ kind: 'event', scope: recoveryScope, origin: 'export', operationId: 'export-current', event: trace('export-start', 'export-current') });
    journal.record({
      kind: 'diagnostic',
      scope: recoveryScope,
      origin: 'export',
      operationId: 'export-current',
      diagnostic: diagnostic('local.export.failure', { details: { stage: 'render', format: 'html', mode: 'interactive' } }),
    });
    journal.record({ kind: 'event', scope: recoveryScope, origin: 'export', operationId: 'export-current', event: trace('export-error', 'export-current') });

    const selection = selectReportObservations({
      scope: recoveryScope,
      current: [],
      diagnostics: journal.diagnostics,
      events: journal.events,
    });
    expect(selection.diagnostics.map(item => item.code)).toEqual(['local.export.failure', 'local.recovery.unclosed']);
    expect(selection.events.map(event => event.traceId)).toEqual(['trace-recovery', 'export-current', 'export-current']);
    expect(latestExportFailureId(recoveryScope, journal.events)).toBe('export-current');
    expect(latestExportFailureId(strictScope, journal.events)).toBe(null);

    const report = createDiagnosticReport(SOURCE_A, {
      diagnostics: selection.diagnostics,
      events: selection.events,
    });
    expect(report.diagnostics.map(item => item.code)).toEqual(['local.export.failure', 'local.recovery.unclosed']);

    // The panel keeps the earlier configuration's history.
    expect(journal.diagnostics.some(entry => entry.scope === strictScope)).toBe(true);
  });

  it('files export diagnostics under the scope captured by the operation', () => {
    const journal = new DiagnosticJournal(scopeA);
    const failure = diagnostic('local.export.failure', {
      details: { stage: 'pdf', format: 'pdf', mode: 'static' },
    });
    journal.record({ kind: 'event', scope: scopeA, origin: 'export', operationId: 'export-a', event: trace('export-start', 'export-a') });
    journal.record({ kind: 'diagnostic', scope: scopeA, origin: 'export', operationId: 'export-a', diagnostic: failure });
    journal.record({ kind: 'event', scope: scopeA, origin: 'export', operationId: 'export-a', event: trace('export-error', 'export-a') });

    journal.setScope(scopeB);
    journal.recordCompileEvent(trace('worker-request', 'trace-b', 2));

    const forA = selectReportObservations({
      scope: scopeA,
      current: [],
      diagnostics: journal.diagnostics,
      events: journal.events,
    });
    expect(forA.diagnostics.map(item => item.code)).toEqual(['local.export.failure']);
    expect(latestExportFailureId(scopeA, journal.events)).toBe('export-a');

    const forB = selectReportObservations({
      scope: scopeB,
      current: [],
      diagnostics: journal.diagnostics,
      events: journal.events,
    });
    expect(forB.diagnostics).toEqual([]);
    expect(latestExportFailureId(scopeB, journal.events)).toBe(null);
    expect(forB.events.some(event => event.traceId === 'export-a')).toBe(false);
  });

  it('drops an old export failure once a newer attempt succeeds', () => {
    const journal = new DiagnosticJournal(scopeA);
    journal.record({ kind: 'event', scope: scopeA, origin: 'export', operationId: 'export-1', event: trace('export-start', 'export-1') });
    journal.record({
      kind: 'diagnostic',
      scope: scopeA,
      origin: 'export',
      operationId: 'export-1',
      diagnostic: diagnostic('local.export.failure', { details: { stage: 'render', format: 'html', mode: 'interactive' } }),
    });
    journal.record({ kind: 'event', scope: scopeA, origin: 'export', operationId: 'export-1', event: trace('export-error', 'export-1') });
    journal.record({ kind: 'event', scope: scopeA, origin: 'export', operationId: 'export-2', event: trace('export-start', 'export-2') });
    journal.record({ kind: 'event', scope: scopeA, origin: 'export', operationId: 'export-2', event: trace('export-end', 'export-2') });

    expect(latestExportFailureId(scopeA, journal.events)).toBe(null);
    const selection = selectReportObservations({
      scope: scopeA,
      current: [],
      diagnostics: journal.diagnostics,
      events: journal.events,
    });
    expect(selection.diagnostics).toEqual([]);
  });

  it('keeps export diagnostics that carry no explicit phase', () => {
    const observations: ScopedObservation[] = [];
    const observer = createScopedObserver({
      scope: scopeA,
      operationId: 'export-1',
      onObservation: observation => observations.push(observation),
    });
    emitLocalDiagnostic(observer, diagnostic('local.binding.unknown'));
    emitLocalDiagnostic(observer, diagnostic('host.ssr.render', { phase: 'host' }));

    const journal = new DiagnosticJournal(scopeA);
    for (const observation of observations) journal.record(observation);
    journal.record({ kind: 'event', scope: scopeA, origin: 'export', operationId: 'export-1', event: trace('export-error', 'export-1') });

    const selection = selectReportObservations({
      scope: scopeA,
      current: [],
      diagnostics: journal.diagnostics,
      events: journal.events,
    });
    expect(selection.diagnostics.map(item => item.code)).toEqual(['local.binding.unknown', 'host.ssr.render']);
    expect(selection.diagnostics.map(item => item.phase)).toEqual(['semantic', 'host']);
  });

  it('drops observations from a cancelled or superseded export', () => {
    const observations: ScopedObservation[] = [];
    let current = true;
    const observer = createScopedObserver({
      scope: scopeA,
      operationId: 'export-1',
      isCurrent: () => current,
      onObservation: observation => observations.push(observation),
    });
    emitLocalDiagnostic(observer, diagnostic('local.export.failure'));
    current = false;
    emitLocalDiagnostic(observer, diagnostic('local.export.failure', { message: 'late' }));
    expect(observations).toHaveLength(1);
  });

  it('bounds retained diagnostics and events without dropping the newest', () => {
    const journal = new DiagnosticJournal(scopeA);
    for (let index = 0; index < 120; index += 1) {
      journal.record({
        kind: 'diagnostic',
        scope: scopeA,
        origin: 'compile',
        diagnostic: diagnostic('local.binding.unknown', { message: `Diagnostic ${index}` }),
      });
      journal.recordCompileEvent(trace('compile-end', `trace-${index}`));
    }
    expect(journal.diagnostics).toHaveLength(100);
    expect(journal.diagnostics[99].diagnostic.message).toBe('Diagnostic 119');
    expect(journal.events).toHaveLength(50);
    expect(journal.events[49].event.traceId).toBe('trace-119');
  });
});

describe('report diagnostic ordering', () => {
  it('keeps the latest export failure inside the report cap after many diagnostics', () => {
    const diagnostics = Array.from({ length: 120 }, (_, index) => diagnostic('local.binding.unknown', {
      message: `Existing diagnostic ${index}`,
    }));
    const failure = diagnostic('local.export.failure', {
      details: { stage: 'pdf', format: 'pdf', mode: 'static' },
    });
    const ordered = orderReportDiagnostics(diagnostics, [failure]);
    expect(ordered[0]).toBe(failure);

    const report = createDiagnosticReport(SOURCE_A, { diagnostics: ordered });
    expect(report.diagnostics).toHaveLength(100);
    expect(report.diagnostics[0]).toMatchObject({
      code: 'local.export.failure',
      details: { stage: 'pdf', format: 'pdf', mode: 'static' },
    });
  });

  it('keeps more severe diagnostics ahead of the export failure', () => {
    const fatal = diagnostic('local.compile.limit', { severity: 'fatal' });
    const errors = Array.from({ length: 120 }, (_, index) => diagnostic('local.binding.unknown', {
      message: `Existing diagnostic ${index}`,
    }));
    const failure = diagnostic('local.export.failure');
    const ordered = orderReportDiagnostics([fatal, ...errors], [failure]);
    expect(ordered[0]).toBe(fatal);
    expect(ordered[1]).toBe(failure);
    expect(ordered).toHaveLength(122);
  });

  it('selects the ordered report through the journal, not just a bare array', () => {
    const current = Array.from({ length: 120 }, (_, index) => diagnostic('local.binding.unknown', {
      message: `Existing diagnostic ${index}`,
    }));
    const journal = new DiagnosticJournal(scopeA);
    journal.record({ kind: 'event', scope: scopeA, origin: 'export', operationId: 'export-1', event: trace('export-start', 'export-1') });
    journal.record({
      kind: 'diagnostic',
      scope: scopeA,
      origin: 'export',
      operationId: 'export-1',
      diagnostic: diagnostic('local.export.failure', { details: { stage: 'bundle', format: 'html', mode: 'interactive' } }),
    });
    journal.record({ kind: 'event', scope: scopeA, origin: 'export', operationId: 'export-1', event: trace('export-error', 'export-1') });

    const selection = selectReportObservations({
      scope: scopeA,
      current,
      diagnostics: journal.diagnostics,
      events: journal.events,
    });
    const report = createDiagnosticReport(SOURCE_A, { diagnostics: selection.diagnostics });
    expect(report.diagnostics[0]).toMatchObject({ code: 'local.export.failure' });
    expect(report.diagnostics).toHaveLength(100);
  });
});