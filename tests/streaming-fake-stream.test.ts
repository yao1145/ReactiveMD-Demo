import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Diagnostic, LocalCompileResult, LocalSourcePhase } from 'reactive-md';
import { FakeStreamController } from '../src/streaming/fake-stream';

interface Submission {
  source: string;
  phase: LocalSourcePhase;
}

function warning(code: string): Diagnostic {
  return {
    code,
    message: code,
    severity: 'warning',
    range: { start: 0, end: 0 },
    line: 1,
    column: 1,
  };
}

/** Only the fields the controller reads; tests never render the document. */
function compiled(
  diagnostics: Diagnostic[] = [],
  transientDiagnostics: Diagnostic[] = [],
): LocalCompileResult {
  return {
    ok: true,
    document: { nodes: [], source: '' },
    diagnostics,
    status: 'partial',
    transientDiagnostics,
  } as unknown as LocalCompileResult;
}

function setup(chunks: readonly string[] = ['a', 'b', 'c'], intervalMs = 100) {
  const submissions: Submission[] = [];
  const controller = new FakeStreamController({
    chunks,
    intervalMs,
    submit: (source, phase) => submissions.push({ source, phase }),
  });
  return { controller, submissions };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fake streaming controller', () => {
  it('submits growing complete snapshots in chunk order', () => {
    const { controller, submissions } = setup();
    controller.start();
    expect(submissions).toEqual([{ source: 'a', phase: 'streaming' }]);
    expect(controller.getSnapshot()).toMatchObject({
      status: 'streaming',
      generation: 1,
      source: 'a',
      chunks: 1,
      totalChunks: 3,
    });

    vi.advanceTimersByTime(100);
    expect(submissions).toEqual([
      { source: 'a', phase: 'streaming' },
      { source: 'ab', phase: 'streaming' },
    ]);
    expect(controller.getSnapshot().source).toBe('ab');

    vi.advanceTimersByTime(100);
    expect(controller.getSnapshot().source).toBe('abc');
    expect(submissions.slice(0, 3).map(submission => submission.source)).toEqual(['a', 'ab', 'abc']);
  });

  it('submits the final snapshot immediately after the last chunk', () => {
    const { controller, submissions } = setup();
    controller.start();
    vi.advanceTimersByTime(200);

    expect(submissions).toEqual([
      { source: 'a', phase: 'streaming' },
      { source: 'ab', phase: 'streaming' },
      { source: 'abc', phase: 'streaming' },
      { source: 'abc', phase: 'final' },
    ]);
    expect(controller.getSnapshot().status).toBe('finalizing');

    // The final dispatch does not wait for another interval, and nothing
    // remains scheduled afterwards.
    vi.advanceTimersByTime(60_000);
    expect(submissions).toHaveLength(4);
  });

  it('stops future chunks when cancelled and starts a new generation on restart', () => {
    const { controller, submissions } = setup();
    controller.start();
    vi.advanceTimersByTime(100);
    expect(submissions).toHaveLength(2);

    controller.cancel();
    expect(controller.getSnapshot().status).toBe('cancelled');
    vi.advanceTimersByTime(5_000);
    expect(submissions).toHaveLength(2);

    controller.restart();
    expect(controller.getSnapshot()).toMatchObject({
      status: 'streaming',
      generation: 2,
      source: 'a',
      chunks: 1,
    });
    expect(submissions).toHaveLength(3);
    expect(submissions[2]).toEqual({ source: 'a', phase: 'streaming' });

    vi.advanceTimersByTime(200);
    expect(submissions).toHaveLength(6);
    expect(controller.getSnapshot().status).toBe('finalizing');
  });

  it('discards results from an older or cancelled generation', () => {
    const { controller } = setup();
    controller.start();
    vi.advanceTimersByTime(100);

    controller.cancel();
    expect(controller.applyOutcome({ source: 'ab', sourcePhase: 'streaming', result: compiled() })).toBe(false);
    expect(controller.getSnapshot().discarded).toBe(1);
    expect(controller.getSnapshot().accepted).toBe(0);

    controller.restart();
    expect(controller.applyOutcome({ source: 'a', sourcePhase: 'streaming', result: compiled() })).toBe(true);
    expect(controller.getSnapshot().accepted).toBe(1);
    expect(controller.getSnapshot().discarded).toBe(1);

    // The previous generation submitted "ab"; the new one has not yet.
    expect(controller.applyOutcome({ source: 'ab', sourcePhase: 'streaming', result: compiled() })).toBe(false);
    expect(controller.getSnapshot().discarded).toBe(2);
    expect(controller.getSnapshot().source).toBe('a');
  });

  it('discards a late result tagged with the cancelled generation', () => {
    const { controller } = setup();
    controller.start();
    controller.cancel();

    controller.restart();
    // The cancelled run's "a" result shares its text with the new run's first
    // snapshot, but its generation still identifies it as stale.
    expect(controller.applyOutcome({ source: 'a', sourcePhase: 'streaming', result: compiled() }, 1)).toBe(false);
    expect(controller.getSnapshot().discarded).toBe(1);
    expect(controller.getSnapshot().accepted).toBe(0);

    // The new run's own result is accepted.
    expect(controller.applyOutcome({ source: 'a', sourcePhase: 'streaming', result: compiled() }, 2)).toBe(true);
    expect(controller.getSnapshot().accepted).toBe(1);
    expect(controller.getSnapshot().discarded).toBe(1);
  });

  it('resets the transport at every generation boundary', () => {
    const generations: number[] = [];
    const controller = new FakeStreamController({
      chunks: ['a'],
      intervalMs: 100,
      submit: () => {},
      resetTransport: (generation) => generations.push(generation),
    });
    controller.start();
    expect(generations).toEqual([1]);
    controller.cancel();
    controller.restart();
    expect(generations).toEqual([1, 2]);
  });

  it('keeps transient diagnostics out of final diagnostics', () => {
    const { controller } = setup();
    controller.start();
    vi.advanceTimersByTime(200);
    expect(controller.getSnapshot().status).toBe('finalizing');

    const transient = warning('local.interpolation');
    expect(controller.applyOutcome({ source: 'a', sourcePhase: 'streaming', result: compiled([], [transient]) })).toBe(true);
    expect(controller.getSnapshot().transient).toEqual([transient]);
    expect(controller.getSnapshot().finalDiagnostics).toEqual([]);

    const laterTransient = warning('local.tag.unclosed');
    const snapshotIssue = warning('local.binding.unknown');
    expect(controller.applyOutcome({
      source: 'abc',
      sourcePhase: 'streaming',
      result: compiled([snapshotIssue], [laterTransient]),
    })).toBe(true);
    expect(controller.getSnapshot().transient).toEqual([laterTransient]);
    expect(controller.getSnapshot().streamingDiagnostics).toEqual([snapshotIssue]);
    expect(controller.getSnapshot().finalDiagnostics).toEqual([]);

    const finalIssue = warning('local.expression.expression-arity');
    expect(controller.applyOutcome({
      source: 'abc',
      sourcePhase: 'final',
      result: compiled([finalIssue], [laterTransient]),
    })).toBe(true);

    const done = controller.getSnapshot();
    expect(done.status).toBe('done');
    expect(done.transient).toEqual([]);
    expect(done.finalDiagnostics).toEqual([finalIssue]);
    expect(done.finalDiagnostics).not.toContainEqual(laterTransient);

    // A late duplicate of the final snapshot has no submission left to match.
    expect(controller.applyOutcome({
      source: 'abc',
      sourcePhase: 'final',
      result: compiled([warning('demo.late')]),
    })).toBe(false);
    expect(controller.getSnapshot().finalDiagnostics).toEqual([finalIssue]);
    expect(controller.getSnapshot().discarded).toBe(1);
  });
});