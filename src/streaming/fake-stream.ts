import type {
  Diagnostic,
  LocalCompileResult,
  LocalCompileStatus,
  LocalSourcePhase,
} from 'reactive-md';

/**
 * Fixed example source. Streaming reveals it by character at the configured
 * rate, so structural boundaries are independent of any segmentation.
 */
export const STREAM_SOURCE = `# Streaming notes

<number bind="hours" label="Hours this week" initial="6" min="0" max="40" step="1">

<checkbox bind="focus" label="Protect a focus block">

## This week

Writing **{{ hours }}** hours{{ focus ? ' with a protected focus block' : '' }}.

<computed name="reading" value="{{ round(hours * 0.4) }}">

<computed name="practice" value="{{ round(hours * 0.6) }}">

| Block | Hours |
| --- | ---: |
| Reading | {{ reading }} |
| Practice | {{ practice }} |
| Total | {{ hours }} |

<alert tone="info">

This paragraph arrived from a fixed example. No model, network or credentials are involved.

</alert>

> Finished at {{ hours }} hours.
`;

export const STREAM_DEFAULT_CPS = 100;
export const STREAM_SPEED_MIN_CPS = 10;
export const STREAM_SPEED_MAX_CPS = 300;
export const STREAM_SPEED_STEP_CPS = 10;
/** Reveal cadence; the number of characters per tick follows the speed. */
export const STREAM_TICK_MS = 100;

export type StreamStatus = 'idle' | 'draft' | 'streaming' | 'finalizing' | 'done' | 'failed' | 'cancelled';
/** `example` streams the built-in source; `custom` streams the host text. */
export type StreamMode = 'example' | 'custom';

/** What the panel renders. Rebuilt on every accepted change. */
export interface StreamState {
  readonly status: StreamStatus;
  readonly mode: StreamMode;
  /** Characters revealed per second for the next ticks. */
  readonly speedCps: number;
  readonly generation: number;
  /** Complete source for the current mode. */
  readonly targetSource: string;
  /** Source revealed so far and submitted to the compiler. */
  readonly source: string;
  readonly running: boolean;
  /** The final snapshot failed; the preview keeps the streaming fallback. */
  readonly finalFailed: boolean;
  /** Fixable issues reported by the latest accepted snapshot. */
  readonly transient: readonly Diagnostic[];
  /** Non-transient issues for the current snapshot before finalization. */
  readonly streamingDiagnostics: readonly Diagnostic[];
  /** Non-transient issues from the final snapshot. */
  readonly finalDiagnostics: readonly Diagnostic[];
  readonly snapshotStatus: LocalCompileStatus | null;
  readonly snapshotPhase: LocalSourcePhase | null;
  /** Results applied for the current generation. */
  readonly accepted: number;
  /** Results ignored because their generation had already ended. */
  readonly discarded: number;
  readonly durationMs: number;
}

export interface StreamOutcome {
  source: string;
  sourcePhase?: LocalSourcePhase;
  result: LocalCompileResult;
  duration?: number;
}

export interface FakeStreamOptions {
  /** Built-in source used by the example mode. */
  source?: string;
  speedCps?: number;
  /** Called once per revealed prefix and for the final snapshot. */
  submit(source: string, phase: LocalSourcePhase): void;
  /**
   * Called before a new run starts. The host should replace its compile
   * transport so results from older generations cannot be delivered under the
   * new generation.
   */
  resetTransport?(generation: number): void;
}

type Timer = ReturnType<typeof setTimeout>;

function clampSpeed(value: number): number {
  if (!Number.isFinite(value)) return STREAM_DEFAULT_CPS;
  const stepped = Math.round(value / STREAM_SPEED_STEP_CPS) * STREAM_SPEED_STEP_CPS;
  return Math.min(STREAM_SPEED_MAX_CPS, Math.max(STREAM_SPEED_MIN_CPS, stepped));
}

/** Advance by code points so a surrogate pair is never split mid-snapshot. */
function advanceByCharacters(text: string, index: number, count: number): number {
  let next = index;
  for (let step = 0; step < count && next < text.length; step += 1) {
    const code = text.charCodeAt(next);
    next += 1;
    if (code >= 0xd800 && code <= 0xdbff && next < text.length) {
      const low = text.charCodeAt(next);
      if (low >= 0xdc00 && low <= 0xdfff) next += 1;
    }
  }
  return next;
}

/**
 * Character-paced fake stream. It owns the complete source, the revealed
 * prefix, the timer and the run generation. Compilation stays the caller's
 * job; results come back through `applyOutcome`, which ignores stale prefixes
 * and results from older generations.
 *
 * The example runs the built-in source. Editing switches to a custom source;
 * Start then streams that text, and Restore example returns to the built-in
 * script. Only a new run increments the generation, so editing reuses the
 * current runtime.
 */
export class FakeStreamController {
  private readonly exampleSource: string;
  private readonly submitSnapshot: FakeStreamOptions['submit'];
  private readonly resetTransport: FakeStreamOptions['resetTransport'];
  private readonly listeners = new Set<() => void>();
  private timer: Timer | null = null;
  private generation = 0;
  private mode: StreamMode = 'example';
  private targetSource: string;
  private source = '';
  private revealIndex = 0;
  private status: StreamStatus = 'idle';
  private running = false;
  private finalFailed = false;
  private speedCps: number;
  private transient: Diagnostic[] = [];
  private streamingDiagnostics: Diagnostic[] = [];
  private finalDiagnostics: Diagnostic[] = [];
  private snapshotStatus: LocalCompileStatus | null = null;
  private snapshotPhase: LocalSourcePhase | null = null;
  private accepted = 0;
  private discarded = 0;
  private durationMs = 0;
  private state: StreamState;

  constructor(options: FakeStreamOptions) {
    this.exampleSource = options.source ?? STREAM_SOURCE;
    this.targetSource = this.exampleSource;
    this.speedCps = clampSpeed(options.speedCps ?? STREAM_DEFAULT_CPS);
    this.submitSnapshot = options.submit;
    this.resetTransport = options.resetTransport;
    this.state = this.describe();
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): StreamState => this.state;

  /** Stream the complete source for the current mode from the beginning. */
  readonly start = (): void => {
    this.stopTimer();
    if (this.mode === 'example') this.targetSource = this.exampleSource;
    if (!this.targetSource) {
      this.running = false;
      this.status = 'idle';
      this.publish();
      return;
    }
    this.generation += 1;
    this.revealIndex = 0;
    this.source = '';
    this.running = true;
    this.status = 'streaming';
    this.finalFailed = false;
    this.transient = [];
    this.streamingDiagnostics = [];
    this.finalDiagnostics = [];
    this.snapshotStatus = null;
    this.snapshotPhase = null;
    this.accepted = 0;
    this.durationMs = 0;
    this.resetTransport?.(this.generation);
    this.revealNext();
  };

  /** Stop revealing characters. The host source stays available for editing. */
  readonly cancel = (): void => {
    if (!this.running) return;
    this.stopTimer();
    this.running = false;
    this.status = 'cancelled';
    this.publish();
  };

  /** Switch back to the built-in example and stream it again. */
  readonly restoreExample = (): void => {
    this.stopTimer();
    this.mode = 'example';
    this.targetSource = this.exampleSource;
    this.start();
  };

  /** Change the character rate; the next tick uses the new value. */
  readonly setSpeed = (charactersPerSecond: number): void => {
    const next = clampSpeed(charactersPerSecond);
    if (next === this.speedCps) return;
    this.speedCps = next;
    this.publish();
  };

  /**
   * Replace the source with host-authored text. Allowed while stopped; the
   * text becomes a streaming draft and Start streams it from the beginning.
   */
  readonly editSource = (source: string): void => {
    if (this.running) return;
    this.stopTimer();
    this.mode = 'custom';
    this.targetSource = source;
    this.source = source;
    this.revealIndex = source.length;
    this.running = false;
    this.finalFailed = false;
    this.transient = [];
    this.streamingDiagnostics = [];
    this.finalDiagnostics = [];
    this.snapshotStatus = null;
    this.snapshotPhase = null;
    if (!source) {
      this.status = 'idle';
      this.publish();
      return;
    }
    this.status = 'draft';
    this.submit(source, 'streaming');
    this.publish();
  };

  /** Submit the complete custom source as the final snapshot. */
  readonly finalizeSource = (): void => {
    if (this.running || this.mode !== 'custom' || !this.targetSource) return;
    if (this.status === 'finalizing' || this.status === 'done') return;
    this.stopTimer();
    this.source = this.targetSource;
    this.revealIndex = this.source.length;
    this.status = 'finalizing';
    this.finalFailed = false;
    this.submit(this.source, 'final');
    this.publish();
  };

  /** Release the timer and subscribers; no callbacks fire afterwards. */
  readonly dispose = (): void => {
    this.stopTimer();
    this.listeners.clear();
  };

  /**
   * Apply a compile outcome. Only a result for the current prefix and the
   * active generation is accepted; older prefixes are ignored and results from
   * a previous run count as discarded.
   */
  readonly applyOutcome = (outcome: StreamOutcome, generation: number = this.generation): boolean => {
    if (generation !== this.generation) {
      this.discarded += 1;
      this.publish();
      return false;
    }
    const active = this.running || this.status === 'draft' || this.status === 'finalizing';
    if (!active) {
      this.discarded += 1;
      this.publish();
      return false;
    }
    if (outcome.source !== this.source) return false;
    const phase = outcome.sourcePhase ?? (this.status === 'finalizing' ? 'final' : 'streaming');
    const result = outcome.result;
    this.accepted += 1;
    this.snapshotStatus = result.status ?? (result.ok ? 'valid' : 'failed');
    this.snapshotPhase = phase;
    this.durationMs = outcome.duration ?? this.durationMs;
    if (phase === 'final') {
      this.finalDiagnostics = result.diagnostics.slice();
      this.streamingDiagnostics = [];
      // A final snapshot retracts provisional issues, even when the result
      // carries no diagnostics of its own.
      this.transient = [];
      this.finalFailed = !result.ok;
      this.status = result.ok ? 'done' : 'failed';
      this.running = false;
    } else {
      this.transient = (result.transientDiagnostics ?? []).slice();
      this.streamingDiagnostics = result.diagnostics.slice();
    }
    this.publish();
    return true;
  };

  private revealNext(): void {
    if (!this.running) return;
    const count = Math.max(1, Math.round(this.speedCps * STREAM_TICK_MS / 1000));
    this.revealIndex = advanceByCharacters(this.targetSource, this.revealIndex, count);
    this.source = this.targetSource.slice(0, this.revealIndex);
    this.submit(this.source, 'streaming');
    if (this.revealIndex >= this.targetSource.length) {
      this.stopTimer();
      this.running = false;
      this.status = 'finalizing';
      this.submit(this.targetSource, 'final');
      this.publish();
      return;
    }
    this.scheduleNext();
    this.publish();
  }

  private scheduleNext(): void {
    this.stopTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.running && this.status === 'streaming') this.revealNext();
    }, STREAM_TICK_MS);
  }

  private submit(source: string, phase: LocalSourcePhase): void {
    this.submitSnapshot(source, phase);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private publish(): void {
    this.state = this.describe();
    for (const listener of this.listeners) listener();
  }

  private describe(): StreamState {
    return {
      status: this.status,
      mode: this.mode,
      speedCps: this.speedCps,
      generation: this.generation,
      targetSource: this.targetSource,
      source: this.source,
      running: this.running,
      finalFailed: this.finalFailed,
      transient: this.transient,
      streamingDiagnostics: this.streamingDiagnostics,
      finalDiagnostics: this.finalDiagnostics,
      snapshotStatus: this.snapshotStatus,
      snapshotPhase: this.snapshotPhase,
      accepted: this.accepted,
      discarded: this.discarded,
      durationMs: this.durationMs,
    };
  }
}