import type {
  Diagnostic,
  LocalCompileResult,
  LocalCompileStatus,
  LocalSourcePhase,
} from 'reactive-md';

/**
 * Fixed chunks for the streaming sample. Each entry continues the previous
 * one; a compile always receives the concatenation so far. The second and
 * fifth chunks end mid-expression and mid-tag, which exercises the transient
 * diagnostics a growing source produces.
 */
export const STREAM_CHUNKS: readonly string[] = [
  '# Streaming notes\n\n<number bind="hours" label="Hours this week" initial="6" min="0" max="40" step="1">\n\n',
  '<checkbox bind="focus" label="Protect a focus block">\n\n## This week\n\nWriting **{{ ho',
  'urs }}** hours{{ focus ? \' with a protected focus block\' : \'\' }}.\n\n<computed name="reading" value="{{ round(hours * 0.4) }}">\n',
  '<computed name="practice" value="{{ round(hours * 0.6) }}">\n\n| Block | Hours |\n| --- | ---: |\n| Reading | {{ reading }} |\n| Practice | {{ practice }} |\n| Total | {{ hours }} |\n\n',
  '<alert tone="info">\n\nThis paragraph arrived from a fixed chunk list. No model, network or credentials are involved.\n\n',
  '</alert>\n\n> Finished at {{ hours }} hours.\n',
];

/** Gap between chunks. Kept above the scheduler window so each snapshot compiles. */
export const STREAM_INTERVAL_MS = 520;
export const STREAM_SPEED_MIN_MS = 80;
export const STREAM_SPEED_MAX_MS = 2000;
export const STREAM_SPEED_STEP_MS = 20;

export type StreamStatus = 'idle' | 'streaming' | 'finalizing' | 'done' | 'cancelled';
/** Scripted runs replay the fixed chunks; manual runs follow the host text. */
export type StreamMode = 'scripted' | 'manual';

/** What the panel renders. Rebuilt on every accepted change. */
export interface StreamState {
  readonly status: StreamStatus;
  readonly mode: StreamMode;
  /** Delay between scripted chunks, in milliseconds. */
  readonly speedMs: number;
  readonly generation: number;
  readonly source: string;
  readonly chunks: number;
  readonly totalChunks: number;
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
  chunks?: readonly string[];
  intervalMs?: number;
  /** Called once per complete snapshot, in order, with its phase. */
  submit(source: string, phase: LocalSourcePhase): void;
  /**
   * Called before a new generation submits its first snapshot. The host should
   * replace its compile transport so results from older generations cannot be
   * delivered under the new generation.
   */
  resetTransport?(generation: number): void;
}

interface Submission {
  generation: number;
  phase: LocalSourcePhase;
}

type Timer = ReturnType<typeof setTimeout>;

function clampSpeed(value: number): number {
  if (!Number.isFinite(value)) return STREAM_INTERVAL_MS;
  const stepped = Math.round(value / STREAM_SPEED_STEP_MS) * STREAM_SPEED_STEP_MS;
  return Math.min(STREAM_SPEED_MAX_MS, Math.max(STREAM_SPEED_MIN_MS, stepped));
}

/**
 * Deterministic fake stream: it owns the chunk list, the timer and the run
 * generation, and tags every snapshot it submits. Compilation stays the
 * caller's job; results come back through `applyOutcome`, which drops anything
 * that belongs to a generation that is no longer active.
 *
 * The engine reports outcomes by source text only. `resetTransport` lets the
 * host replace its scheduler per generation, and `applyOutcome` accepts the
 * generation that produced the result. A late result from a cancelled run is
 * therefore discarded by generation even when its text matches the next run's
 * first snapshot.
 */
export class FakeStreamController {
  private readonly chunks: readonly string[];
  private readonly submitSnapshot: FakeStreamOptions['submit'];
  private readonly resetTransport: FakeStreamOptions['resetTransport'];
  private readonly ledger = new Map<string, Submission[]>();
  private readonly listeners = new Set<() => void>();
  private timer: Timer | null = null;
  private generation = 0;
  private chunkIndex = 0;
  private source = '';
  private status: StreamStatus = 'idle';
  private mode: StreamMode = 'scripted';
  private speedMs: number;
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
    this.chunks = options.chunks ?? STREAM_CHUNKS;
    this.speedMs = clampSpeed(options.intervalMs ?? STREAM_INTERVAL_MS);
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

  /** Begin a new scripted generation, submitting the first chunk immediately. */
  readonly start = (): void => {
    this.stopTimer();
    this.generation += 1;
    this.mode = 'scripted';
    this.chunkIndex = 0;
    this.source = '';
    this.status = 'streaming';
    this.transient = [];
    this.streamingDiagnostics = [];
    this.finalDiagnostics = [];
    this.snapshotStatus = null;
    this.snapshotPhase = null;
    this.accepted = 0;
    this.durationMs = 0;
    // A new generation owns a fresh transport. Results from the previous
    // generation may still be in flight, so the ledger also starts empty; any
    // late outcome is matched by its explicit generation and discarded.
    this.ledger.clear();
    this.resetTransport?.(this.generation);
    this.appendChunk();
  };

  /** Stop the run. Results already in flight become stale. */
  readonly cancel = (): void => {
    if (this.status !== 'streaming' && this.status !== 'finalizing') return;
    this.stopTimer();
    this.status = 'cancelled';
    this.publish();
  };

  readonly restart = (): void => {
    this.start();
  };

  /** Change the scripted chunk interval; the next chunk uses the new speed. */
  readonly setSpeed = (milliseconds: number): void => {
    const next = clampSpeed(milliseconds);
    if (next === this.speedMs) return;
    this.speedMs = next;
    if (this.mode === 'scripted' && this.status === 'streaming' && this.timer !== null) {
      this.scheduleNext();
    }
    this.publish();
  };

  /**
   * Take over the stream with host-authored text. The first edit replaces the
   * scripted transport; every edit previews as a streaming snapshot, and
   * `finalizeManual` applies the completed source.
   */
  readonly editSource = (source: string): void => {
    const enteredManual = this.mode !== 'manual';
    this.stopTimer();
    if (enteredManual) {
      this.mode = 'manual';
      this.ledger.clear();
      this.resetTransport?.(this.generation);
    }
    this.source = source;
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
    this.status = 'streaming';
    this.submit(source, 'streaming');
    this.publish();
  };

  /** Submit the current manual source as the final snapshot. */
  readonly finalizeManual = (): void => {
    if (this.mode !== 'manual' || !this.source) return;
    if (this.status === 'finalizing' || this.status === 'done') return;
    this.stopTimer();
    this.status = 'finalizing';
    this.submit(this.source, 'final');
    this.publish();
  };

  /** Release the timer and subscribers; no callbacks fire afterwards. */
  readonly dispose = (): void => {
    this.stopTimer();
    this.listeners.clear();
  };

  /**
   * Apply a compile outcome. `generation` defaults to the active run, but a
   * host that keeps an old transport alive passes the generation captured when
   * the snapshot was submitted. Returns whether it belongs to the active run;
   * stale results only increment the discarded counter.
   */
  readonly applyOutcome = (outcome: StreamOutcome, generation: number = this.generation): boolean => {
    const active = this.status === 'streaming' || this.status === 'finalizing';
    if (!active || generation !== this.generation) {
      this.discarded += 1;
      this.publish();
      return false;
    }
    let phase: LocalSourcePhase;
    if (this.mode === 'manual') {
      // Manual edits supersede each other inside one generation. A result for
      // an older text is ignored without polluting the stale-result counter.
      if (outcome.source !== this.source) return false;
      phase = outcome.sourcePhase ?? 'streaming';
    } else {
      const queue = this.ledger.get(outcome.source);
      const index = queue?.findIndex((entry) => entry.generation === generation) ?? -1;
      if (index < 0) {
        this.discarded += 1;
        this.publish();
        return false;
      }
      const [entry] = queue!.splice(index, 1);
      phase = outcome.sourcePhase ?? entry.phase;
    }
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
      this.status = 'done';
    } else {
      this.transient = (result.transientDiagnostics ?? []).slice();
      this.streamingDiagnostics = result.diagnostics.slice();
    }
    this.publish();
    return true;
  };

  private appendChunk(): void {
    this.source += this.chunks[this.chunkIndex] ?? '';
    this.chunkIndex += 1;
    this.submit(this.source, 'streaming');
    if (this.chunkIndex >= this.chunks.length) {
      this.stopTimer();
      this.status = 'finalizing';
      this.submit(this.source, 'final');
      this.publish();
      return;
    }
    this.scheduleNext();
    this.publish();
  }

  /** Schedule the next scripted chunk at the current speed. */
  private scheduleNext(): void {
    this.stopTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.status === 'streaming' && this.mode === 'scripted') this.appendChunk();
    }, this.speedMs);
  }

  private submit(source: string, phase: LocalSourcePhase): void {
    if (this.mode === 'scripted') {
      const queue = this.ledger.get(source) ?? [];
      queue.push({ generation: this.generation, phase });
      this.ledger.set(source, queue);
    }
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
      speedMs: this.speedMs,
      generation: this.generation,
      source: this.source,
      chunks: this.chunkIndex,
      totalChunks: this.chunks.length,
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