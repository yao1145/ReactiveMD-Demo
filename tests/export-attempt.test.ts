import { describe, expect, it } from 'vitest';
import type { Diagnostic } from 'reactive-md';
import { createDiagnosticReport, emitLocalDiagnostic } from 'reactive-md/observability';
import {
  DiagnosticJournal,
  createDiagnosticScope,
  latestExportFailureId,
  selectReportObservations,
  type ScopedObservation,
} from '../src/compilation/diagnostic-scope';
import { ExportAttempt } from '../src/export/export-attempt';

const SOURCE = '# Export lifecycle\n\nWorker boundary {{ 1 + 1 }}';
const scope = createDiagnosticScope('export:lifecycle', 'Lifecycle', SOURCE);

function diagnostic(code: string, message = `Message for ${code}`): Diagnostic {
  return {
    code,
    message,
    severity: 'error',
    range: { start: 0, end: 0 },
    line: 1,
    column: 1,
  };
}

/** An attempt with a fixed trace id and a controllable task ownership. */
function attempt(options: { current?: () => boolean; onObservation?: (observation: ScopedObservation) => void } = {}) {
  let clock = 1_000;
  let elapsed = 100;
  const observations: ScopedObservation[] = [];
  const created = new ExportAttempt({
    scope,
    traceId: 'export-lifecycle',
    isCurrent: options.current ?? (() => true),
    onObservation: (observation) => {
      observations.push(observation);
      options.onObservation?.(observation);
    },
    now: () => clock,
    elapsed: () => elapsed,
  });
  return {
    attempt: created,
    observations,
    advance(milliseconds: number) {
      clock += milliseconds;
      elapsed += milliseconds;
    },
  };
}

function events(observations: readonly ScopedObservation[]) {
  return observations.flatMap(observation => observation.kind === 'event' ? [observation.event] : []);
}

function diagnostics(observations: readonly ScopedObservation[]) {
  return observations.flatMap(observation => observation.kind === 'diagnostic' ? [observation.diagnostic] : []);
}

describe('export attempt terminal state machine', () => {
  it('emits one start and one success end with status ok and the download stage', () => {
    const { attempt: run, observations, advance } = attempt();
    run.setStage('compile');
    run.setStage('render');
    run.setStage('download');
    advance(250);
    expect(run.succeed('ok')).toBe(true);

    const lifecycle = events(observations);
    expect(lifecycle.map(event => event.type)).toEqual(['export-start', 'export-end']);
    expect(lifecycle[1]).toMatchObject({
      traceId: 'export-lifecycle',
      status: 'ok',
      stage: 'download',
      durationMs: 250,
    });
    expect(lifecycle.every(event => event.traceId === 'export-lifecycle')).toBe(true);
    expect(run.done).toBe(true);
  });

  it('emits one failure with its diagnostics, status failed and the stage at failure', () => {
    const { attempt: run, observations, advance } = attempt();
    run.setStage('pdf');
    advance(40);
    const failure = diagnostic('local.export.failure');
    const compiler = diagnostic('local.binding.unknown');
    expect(run.fail(failure.code, [failure, compiler])).toBe(true);

    const lifecycle = events(observations);
    expect(lifecycle.map(event => event.type)).toEqual(['export-start', 'export-error']);
    expect(lifecycle[1]).toMatchObject({
      status: 'failed',
      stage: 'pdf',
      code: 'local.export.failure',
      durationMs: 40,
    });
    // The engine stamps phase and recoverable on the way to the observer.
    expect(diagnostics(observations).map(item => [item.code, item.phase])).toEqual([
      ['local.export.failure', 'export'],
      ['local.binding.unknown', 'semantic'],
    ]);
  });

  it('cancels once with status cancelled and keeps the stage that was running', () => {
    const { attempt: run, observations, advance } = attempt();
    run.setStage('compile');
    run.setStage('assets');
    run.setStage('pdf');
    advance(90);
    expect(run.cancel()).toBe(true);
    // Every later path of the same attempt is a no-op.
    expect(run.cancel()).toBe(false);
    expect(run.succeed('ok')).toBe(false);
    expect(run.fail('local.export.failure')).toBe(false);
    expect(run.setStage('download')).toBe(false);
    expect(run.stage).toBe('pdf');

    const lifecycle = events(observations);
    expect(lifecycle.map(event => event.type)).toEqual(['export-start', 'export-cancel']);
    expect(lifecycle[1]).toMatchObject({
      traceId: 'export-lifecycle',
      status: 'cancelled',
      stage: 'pdf',
      durationMs: 90,
    });
    expect(run.done).toBe(true);
  });

  it('does not cancel an attempt that already succeeded or failed', () => {
    const succeeded = attempt();
    succeeded.attempt.succeed('ok');
    expect(succeeded.attempt.cancel()).toBe(false);
    expect(events(succeeded.observations).map(event => event.type)).toEqual(['export-start', 'export-end']);

    const failed = attempt();
    failed.attempt.fail('local.export.failure');
    expect(failed.attempt.cancel()).toBe(false);
    expect(events(failed.observations).map(event => event.type)).toEqual(['export-start', 'export-error']);
  });

  it('drops late observations after cancel instead of archiving them', () => {
    const { attempt: run, observations } = attempt();
    run.setStage('bundle');
    emitLocalDiagnostic(run.observer, diagnostic('local.export.failure'));
    expect(run.cancel()).toBe(true);
    emitLocalDiagnostic(run.observer, diagnostic('late.export.failure'));
    expect(diagnostics(observations).map(item => item.code)).toEqual(['local.export.failure']);
    expect(events(observations).map(event => event.type)).toEqual(['export-start', 'export-cancel']);
  });

  it('reports the print path as printed once the print interaction finishes', () => {
    const { attempt: run, observations } = attempt();
    run.setStage('pdf');
    expect(run.succeed('printed')).toBe(true);

    expect(events(observations).map(event => event.type)).toEqual(['export-start', 'export-end']);
    expect(events(observations)[1]).toMatchObject({ status: 'printed', stage: 'pdf' });
  });

  it('stamps the scope and operation on every archived observation', () => {
    const { attempt: run, observations } = attempt();
    emitLocalDiagnostic(run.observer, diagnostic('local.binding.unknown'));
    run.cancel();

    expect(observations.every(observation => observation.scope === scope)).toBe(true);
    expect(observations.every(observation => observation.operationId === 'export-lifecycle')).toBe(true);
    expect(observations.every(observation => observation.origin === 'export')).toBe(true);
  });

  it('emits nothing once the caller has invalidated the task', () => {
    let current = false;
    const { attempt: run, observations } = attempt({ current: () => current });
    expect(run.cancel()).toBe(false);
    expect(run.succeed('ok')).toBe(false);
    expect(run.isCurrent()).toBe(false);
    expect(events(observations)).toEqual([]);

    current = true;
    const active = attempt();
    active.attempt.cancel();
    expect(events(active.observations)).toHaveLength(2);
  });
});

describe('export lifecycle in the diagnostic journal', () => {
  it('keeps a cancel under the same scope and clears an earlier export failure', () => {
    const journal = new DiagnosticJournal(scope);
    const failed = attempt();
    failed.attempt.fail('local.export.failure', [diagnostic('local.export.failure')]);
    for (const observation of failed.observations) journal.record(observation);
    expect(latestExportFailureId(scope, journal.events)).toBe('export-lifecycle');

    const cancelled = attempt();
    cancelled.attempt.cancel();
    for (const observation of cancelled.observations) journal.record(observation);
    expect(latestExportFailureId(scope, journal.events)).toBe(null);

    // Even when the event cap dropped the attempt's start, its cancel closes
    // the earlier failure instead of leaving it as the latest outcome.
    expect(latestExportFailureId(scope, [
      {
        scope,
        origin: 'export',
        operationId: 'export-lifecycle',
        event: { type: 'export-error', traceId: 'export-lifecycle', timestamp: 1 },
      },
      {
        scope,
        origin: 'export',
        operationId: 'export-lifecycle',
        event: { type: 'export-cancel', traceId: 'export-lifecycle', timestamp: 2, status: 'cancelled' },
      },
    ])).toBe(null);

    const selection = selectReportObservations({
      scope,
      current: [],
      diagnostics: journal.diagnostics,
      events: journal.events,
    });
    expect(selection.diagnostics).toEqual([]);
    expect(selection.events.map(event => event.type)).toEqual([
      'export-start',
      'export-error',
      'export-start',
      'export-cancel',
    ]);

    const report = createDiagnosticReport(SOURCE, { events: selection.events });
    expect(report.events?.map(event => [event.type, event.status])).toEqual([
      ['export-start', undefined],
      ['export-error', 'failed'],
      ['export-start', undefined],
      ['export-cancel', 'cancelled'],
    ]);
  });

  it('keeps the printed status in the report for the production print path', () => {
    const printed = attempt();
    printed.attempt.setStage('pdf');
    printed.attempt.succeed('printed');
    const report = createDiagnosticReport(SOURCE, {
      events: events(printed.observations),
    });
    expect(report.events?.map(event => [event.type, event.status, event.stage])).toEqual([
      ['export-start', undefined, undefined],
      ['export-end', 'printed', 'pdf'],
    ]);
  });
});