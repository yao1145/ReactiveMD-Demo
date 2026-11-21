import { decode as decodeGpt4o, encode as encodeGpt4o } from 'gpt-tokenizer/model/gpt-4o';
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

export const STREAM_DEFAULT_TPS = 100;
export const STREAM_SPEED_MIN_TPS = 10;
export const STREAM_SPEED_MAX_TPS = 1000;
/** Log-scale slider positions; 50 is the centre. */
export const STREAM_SPEED_SLIDER_MAX = 100;
/** Reveal cadence; the number of tokens per tick follows the speed. */
export const STREAM_TICK_MS = 100;

/** Tokenizer contract; the default implementation is the GPT-4o encoding. */
export interface StreamTokenizer {
  encode(source: string): readonly number[];
  decode(tokens: readonly number[]): string;
}

const GPT4O_TOKENIZER: StreamTokenizer = {
  encode: (source) => encodeGpt4o(source),
  decode: (tokens) => decodeGpt4o(tokens),
};

export type StreamStatus = 'idle' | 'draft' | 'streaming' | 'finalizing' | 'done' | 'failed' | 'cancelled';
/** `example` streams the built-in source; `custom` streams the host text. */
export type StreamMode = 'example' | 'custom';

/** What the panel renders. Rebuilt on every accepted change. */
export interface StreamState {
  readonly status: StreamStatus;
  readonly mode: StreamMode;
  /** Tokens revealed per second for the next ticks. */
  readonly speedTps: number;
  readonly generation: number;
  /** Complete source for the current mode. */
  readonly targetSource: string;
  /** Source revealed so far and submitted to the compiler. */
  readonly source: string;
  readonly revealedTokens: number;
  readonly totalTokens: number;
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
  speedTps?: number;
  /** Tokenizer override; defaults to the GPT-4o model encoding. */
  tokenizer?: StreamTokenizer;
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
  if (!Number.isFinite(value)) return STREAM_DEFAULT_TPS;
  return Math.min(STREAM_SPEED_MAX_TPS, Math.max(STREAM_SPEED_MIN_TPS, Math.round(value)));
}

/** Map a token rate onto a logarithmic slider; 100 tps sits at the centre. */
export function tpsToSliderPosition(tps: number): number {
  const clamped = clampSpeed(tps);
  const logMin = Math.log10(STREAM_SPEED_MIN_TPS);
  const logMax = Math.log10(STREAM_SPEED_MAX_TPS);
  return Math.round((Math.log10(clamped) - logMin) / (logMax - logMin) * STREAM_SPEED_SLIDER_MAX);
}

/** Map a logarithmic slider position back to a token rate. */
export function sliderPositionToTps(position: number): number {
  const safe = Number.isFinite(position)
    ? Math.min(STREAM_SPEED_SLIDER_MAX, Math.max(0, position))
    : STREAM_SPEED_SLIDER_MAX / 2;
  const logMin = Math.log10(STREAM_SPEED_MIN_TPS);
  const logMax = Math.log10(STREAM_SPEED_MAX_TPS);
  return clampSpeed(Math.round(10 ** (logMin + (logMax - logMin) * safe / STREAM_SPEED_SLIDER_MAX)));
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
  private readonly tokenizer: StreamTokenizer;
  private readonly listeners = new Set<() => void>();
  private timer: Timer | null = null;
  private generation = 0;
  private mode: StreamMode = 'example';
  private targetSource: string;
  private source = '';
  private tokenizedSource = '';
  private tokens: readonly number[] = [];
  private revealedTokens = 0;
  private status: StreamStatus = 'idle';
  private running = false;
  private finalFailed = false;
  private speedTps: number;
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
    this.speedTps = clampSpeed(options.speedTps ?? STREAM_DEFAULT_TPS);
    this.tokenizer = options.tokenizer ?? GPT4O_TOKENIZER;
    this.submitSnapshot = options.submit;
    this.resetTransport = options.resetTransport;
    this.tokenizeTarget();
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
    this.tokenizeTarget();
    this.generation += 1;
    this.revealedTokens = 0;
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

  /** Change the token rate; the next tick uses the new value. */
  readonly setSpeed = (tokensPerSecond: number): void => {
    const next = clampSpeed(tokensPerSecond);
    if (next === this.speedTps) return;
    this.speedTps = next;
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
    this.tokenizeTarget();
    this.source = source;
    this.revealedTokens = this.tokens.length;
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
    this.revealedTokens = this.tokens.length;
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
    const count = Math.max(1, Math.round(this.speedTps * STREAM_TICK_MS / 1000));
    this.revealedTokens = Math.min(this.tokens.length, this.revealedTokens + count);
    this.source = this.tokenizer.decode(this.tokens.slice(0, this.revealedTokens));
    this.submit(this.source, 'streaming');
    if (this.revealedTokens >= this.tokens.length) {
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

  /** Tokenize the current target once per distinct text. */
  private tokenizeTarget(): void {
    if (this.tokenizedSource === this.targetSource) return;
    this.tokenizedSource = this.targetSource;
    this.tokens = this.tokenizer.encode(this.targetSource);
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
      speedTps: this.speedTps,
      generation: this.generation,
      targetSource: this.targetSource,
      source: this.source,
      revealedTokens: this.revealedTokens,
      totalTokens: this.tokens.length,
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