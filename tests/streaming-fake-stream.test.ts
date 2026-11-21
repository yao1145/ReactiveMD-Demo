import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Diagnostic, LocalCompileResult, LocalSourcePhase } from 'reactive-md';
import { FakeStreamController, STREAM_SOURCE } from '../src/streaming/fake-stream';

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

function wellFormed(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const low = value.charCodeAt(index + 1);
      if (!(low >= 0xdc00 && low <= 0xdfff)) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function setup(source = 'abcdefghij', speedCps = 20) {
  const submissions: Submission[] = [];
  const generations: number[] = [];
  const controller = new FakeStreamController({
    source,
    speedCps,
    submit: (snapshot, phase) => submissions.push({ source: snapshot, phase }),
    resetTransport: (generation) => generations.push(generation),
  });
  return { controller, submissions, generations };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('character-paced fake stream', () => {
  it('reveals the source by character at the selected speed', () => {
    const { controller, submissions } = setup('abcdefghij', 20);
    controller.start();

    expect(controller.getSnapshot()).toMatchObject({
      status: 'streaming',
      mode: 'example',
      running: true,
      speedCps: 20,
      source: 'ab',
      targetSource: 'abcdefghij',
    });
    expect(submissions).toEqual([{ source: 'ab', phase: 'streaming' }]);

    vi.advanceTimersByTime(100);
    expect(controller.getSnapshot().source).toBe('abcd');
    vi.advanceTimersByTime(300);
    const finishing = controller.getSnapshot();
    expect(finishing.status).toBe('finalizing');
    expect(finishing.running).toBe(false);
    expect(finishing.source).toBe('abcdefghij');
    expect(submissions.at(-2)).toEqual({ source: 'abcdefghij', phase: 'streaming' });
    expect(submissions.at(-1)).toEqual({ source: 'abcdefghij', phase: 'final' });

    controller.applyOutcome({ source: 'abcdefghij', sourcePhase: 'final', result: compiled() });
    expect(controller.getSnapshot().status).toBe('done');
  });

  it('applies a new character rate to the next ticks', () => {
    const { controller } = setup('abcdefghij', 20);
    controller.start();
    expect(controller.getSnapshot().source).toBe('ab');

    controller.setSpeed(100);
    expect(controller.getSnapshot().speedCps).toBe(100);
    vi.advanceTimersByTime(100);
    expect(controller.getSnapshot().source).toBe('abcdefghij');
    expect(controller.getSnapshot().status).toBe('finalizing');

    controller.setSpeed(1);
    expect(controller.getSnapshot().speedCps).toBe(10);
    controller.setSpeed(10_000);
    expect(controller.getSnapshot().speedCps).toBe(300);
  });

  it('keeps the revealed prefix on cancel while restoring the full target', () => {
    const { controller, submissions } = setup('abcdefghij', 20);
    controller.start();
    vi.advanceTimersByTime(100);
    expect(controller.getSnapshot().source).toBe('abcd');

    controller.cancel();
    expect(controller.getSnapshot()).toMatchObject({
      status: 'cancelled',
      running: false,
      source: 'abcd',
      targetSource: 'abcdefghij',
    });
    const count = submissions.length;
    vi.advanceTimersByTime(5_000);
    expect(submissions).toHaveLength(count);
  });

  it('switches to a custom draft and streams that source after Start', () => {
    const { controller, submissions } = setup('abcdefghij', 20);
    controller.start();
    controller.cancel();
    controller.editSource('hello world');

    expect(controller.getSnapshot()).toMatchObject({
      status: 'draft',
      mode: 'custom',
      running: false,
      source: 'hello world',
      targetSource: 'hello world',
    });
    expect(submissions.at(-1)).toEqual({ source: 'hello world', phase: 'streaming' });

    controller.start();
    expect(controller.getSnapshot()).toMatchObject({
      status: 'streaming',
      mode: 'custom',
      running: true,
      source: 'he',
      targetSource: 'hello world',
    });
    vi.advanceTimersByTime(500);
    expect(controller.getSnapshot().status).toBe('finalizing');
    expect(controller.getSnapshot().source).toBe('hello world');
    expect(submissions.at(-1)).toEqual({ source: 'hello world', phase: 'final' });
    controller.applyOutcome({ source: 'hello world', sourcePhase: 'final', result: compiled() });
    expect(controller.getSnapshot().status).toBe('done');
  });

  it('finalizes the complete custom source without replaying it', () => {
    const { controller, submissions } = setup('example', 20);
    controller.editSource('custom {{ 1 + 2 }}');
    controller.finalizeSource();

    expect(controller.getSnapshot().status).toBe('finalizing');
    expect(submissions.at(-1)).toEqual({ source: 'custom {{ 1 + 2 }}', phase: 'final' });

    const finalIssue = warning('local.binding.unknown');
    expect(controller.applyOutcome({
      source: 'custom {{ 1 + 2 }}',
      sourcePhase: 'final',
      result: compiled([finalIssue]),
    })).toBe(true);
    expect(controller.getSnapshot().status).toBe('done');
    expect(controller.getSnapshot().finalDiagnostics).toEqual([finalIssue]);
  });

  it('returns to the built-in example only through restoreExample', () => {
    const { controller, generations } = setup(STREAM_SOURCE, 20);
    controller.editSource('custom');
    controller.start();
    controller.cancel();

    controller.restoreExample();
    expect(controller.getSnapshot()).toMatchObject({
      status: 'streaming',
      mode: 'example',
      running: true,
      targetSource: STREAM_SOURCE,
      source: '# ',
    });
    expect(generations).toEqual([1, 2]);
  });

  it('ignores older prefixes and discards results from a previous generation', () => {
    const { controller } = setup('abcdefghij', 20);
    controller.start();
    const firstGeneration = controller.getSnapshot().generation;
    vi.advanceTimersByTime(100);
    expect(controller.getSnapshot().source).toBe('abcd');

    expect(controller.applyOutcome({ source: 'ab', sourcePhase: 'streaming', result: compiled() })).toBe(false);
    expect(controller.getSnapshot().discarded).toBe(0);
    expect(controller.applyOutcome({ source: 'abcd', sourcePhase: 'streaming', result: compiled() })).toBe(true);
    expect(controller.getSnapshot().accepted).toBe(1);

    controller.cancel();
    controller.restoreExample();
    const current = controller.getSnapshot();
    expect(current.generation).not.toBe(firstGeneration);
    expect(controller.applyOutcome({
      source: 'abcd',
      sourcePhase: 'streaming',
      result: compiled(),
    }, firstGeneration)).toBe(false);
    expect(controller.getSnapshot().discarded).toBe(1);
    expect(controller.applyOutcome({
      source: current.source,
      sourcePhase: 'streaming',
      result: compiled(),
    }, current.generation)).toBe(true);
  });

  it('does not accept edits while a run is active', () => {
    const { controller } = setup('abcdefghij', 20);
    controller.start();
    const before = controller.getSnapshot();
    controller.editSource('replacement');
    const after = controller.getSnapshot();
    expect(after.targetSource).toBe(before.targetSource);
    expect(after.mode).toBe('example');
    expect(after.running).toBe(true);
  });

  it('never submits a split surrogate pair', () => {
    const { controller, submissions } = setup('a😀b', 10);
    controller.start();
    vi.advanceTimersByTime(300);

    for (const submission of submissions) {
      expect(wellFormed(submission.source)).toBe(true);
    }
    expect(submissions.at(-2)?.source).toBe('a😀b');
    expect(submissions.at(-1)).toEqual({ source: 'a😀b', phase: 'final' });
  });
});