import type { AnlzBeat } from "./anlz-cues";

const MIN_BEATS = 8;
/** Below this, the tracker likely returned half-time. */
const MIN_MIX_BPM = 70;
/** Above this, the tracker likely returned double-time. Drum & bass stays under. */
const MAX_MIX_BPM = 200;

/** Rekordbox stores BPM × 100. The last beat reuses the previous gap. */
export function beatTempo(gapMs: number): number {
  const gap = Number.isFinite(gapMs) ? Math.max(1, Math.round(gapMs)) : 1;
  return Math.min(65535, Math.max(1, Math.round(6_000_000 / gap)));
}

function finiteLevel(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? (value ?? 0) : 0;
}

/** Rising millisecond ticks. Drops junk and anything that goes backwards. */
export function cleanBeatTicks(ticksMs: readonly number[]): number[] {
  const ticks: number[] = [];
  for (let index = 0; index < ticksMs.length; index += 1) {
    const time = Math.round(ticksMs[index] ?? NaN);
    if (!Number.isFinite(time) || time < 0 || time > 0xffffffff) continue;
    const previous = ticks[ticks.length - 1];
    if (previous != null && time <= previous) continue;
    ticks.push(time);
    if (ticks.length >= 100_000) break;
  }
  return ticks;
}

function gapsOf(ticks: readonly number[]): number[] {
  const gaps: number[] = [];
  for (let index = 1; index < ticks.length; index += 1) {
    const gap = (ticks[index] ?? 0) - (ticks[index - 1] ?? 0);
    if (gap > 0) gaps.push(gap);
  }
  return gaps;
}

function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

function bpmOf(ticks: readonly number[]): number {
  const gap = median(gapsOf(ticks));
  return gap > 0 ? 60_000 / gap : 0;
}

function beatNumber(index: number, phase: number): number {
  return ((index - phase) % 4 + 4) % 4 + 1;
}

/**
 * Score a 4/4 phase: kick (bass + onset) on 1, a weaker kick on 3, snare/hat
 * onset on 2 and 4. That is what keeps house from landing beat 1 on the off-bar.
 */
function phaseScore(bass: readonly number[], onset: readonly number[], phase: number): number {
  let score = 0;
  const count = Math.max(bass.length, onset.length);
  for (let index = 0; index < count; index += 1) {
    const beat = beatNumber(index, phase);
    const low = finiteLevel(bass[index]);
    const hit = finiteLevel(onset[index]);
    if (beat === 1) score += low * 2 + hit;
    else if (beat === 3) score += low * 0.8 + hit * 0.5;
    else score += hit;
  }
  return score;
}

function bestPhase(bass: readonly number[], onset: readonly number[]): number {
  let phase = 0;
  let best = -1;
  for (let candidate = 0; candidate < 4; candidate += 1) {
    const score = phaseScore(bass, onset, candidate);
    if (score > best) {
      best = score;
      phase = candidate;
    }
  }
  return phase;
}

function labeledGrid(ticks: readonly number[], phase: number): AnlzBeat[] {
  const beats: AnlzBeat[] = [];
  for (let index = 0; index < ticks.length; index += 1) {
    beats.push({ timeMs: ticks[index] ?? 0, beat: beatNumber(index, phase) });
  }
  return beats;
}

/**
 * A dynamic grid from beat ticks. Each beat keeps its own time. The tempo is
 * the gap to the next tick. Which tick is beat 1 is the phase whose ticks
 * carry the most bass. Equal bass leaves the first tick as beat 1.
 */
export function gridFromTicks(ticksMs: readonly number[], bass: readonly number[]): AnlzBeat[] {
  const ticks: number[] = [];
  const weight: number[] = [];
  for (let index = 0; index < ticksMs.length; index += 1) {
    const time = Math.round(ticksMs[index] ?? NaN);
    if (!Number.isFinite(time) || time < 0 || time > 0xffffffff) continue;
    const previous = ticks[ticks.length - 1];
    if (previous != null && time <= previous) continue;
    ticks.push(time);
    weight.push(finiteLevel(bass[index]));
    if (ticks.length >= 100_000) break;
  }
  if (ticks.length < MIN_BEATS) return [];
  let phase = 0;
  let best = -1;
  for (let candidate = 0; candidate < 4; candidate += 1) {
    let score = 0;
    for (let index = candidate; index < weight.length; index += 4) score += weight[index] ?? 0;
    if (score > best) {
      best = score;
      phase = candidate;
    }
  }
  return labeledGrid(ticks, phase);
}

/**
 * Map ticks onto a 4/4 grid whose beat 1 is the first downbeat.
 * Tick times stay. Empty ticks stay empty.
 */
export function gridFromDownbeats(
  ticksMs: readonly number[],
  downbeatMs: readonly number[],
): AnlzBeat[] {
  const ticks = cleanBeatTicks(ticksMs);
  if (ticks.length < MIN_BEATS) return [];
  let first: number | null = null;
  for (let index = 0; index < downbeatMs.length; index += 1) {
    const time = Math.round(downbeatMs[index] ?? NaN);
    if (!Number.isFinite(time) || time < 0) continue;
    first = time;
    break;
  }
  let phase = 0;
  if (first != null) {
    let nearest = 0;
    let distance = Infinity;
    for (let index = 0; index < ticks.length; index += 1) {
      const delta = Math.abs((ticks[index] ?? 0) - first);
      if (delta < distance) {
        distance = delta;
        nearest = index;
      }
    }
    phase = ((nearest % 4) + 4) % 4;
  }
  return labeledGrid(ticks, phase);
}

/** Downbeat times (beat 1) from bass, onset, and a 4/4 lock. */
export function downbeatTimes(
  ticksMs: readonly number[],
  bass: readonly number[],
  onset: readonly number[],
): number[] {
  const ticks: number[] = [];
  const lows: number[] = [];
  const hits: number[] = [];
  for (let index = 0; index < ticksMs.length; index += 1) {
    const time = Math.round(ticksMs[index] ?? NaN);
    if (!Number.isFinite(time) || time < 0 || time > 0xffffffff) continue;
    const previous = ticks[ticks.length - 1];
    if (previous != null && time <= previous) continue;
    ticks.push(time);
    lows.push(finiteLevel(bass[index]));
    hits.push(finiteLevel(onset[index]));
    if (ticks.length >= 100_000) break;
  }
  if (ticks.length < MIN_BEATS) return [];
  const phase = bestPhase(lows, hits);
  const times: number[] = [];
  for (let index = phase; index < ticks.length; index += 4) {
    const time = ticks[index];
    if (time != null) times.push(time);
  }
  return times;
}

function bestPhaseScore(bass: readonly number[], onset: readonly number[]): number {
  return phaseScore(bass, onset, bestPhase(bass, onset));
}

/**
 * Fold half-time / double-time into a mixable DJ range. When the pulse is
 * twice as fast, keep the even or odd subgrid with the stronger 4/4 downbeat.
 */
export function foldBeatTicks(
  ticksMs: readonly number[],
  bass: readonly number[] = [],
  onset: readonly number[] = [],
): number[] {
  let ticks: number[] = [];
  let lows: number[] = [];
  let hits: number[] = [];
  for (let index = 0; index < ticksMs.length; index += 1) {
    const time = Math.round(ticksMs[index] ?? NaN);
    if (!Number.isFinite(time) || time < 0 || time > 0xffffffff) continue;
    const previous = ticks[ticks.length - 1];
    if (previous != null && time <= previous) continue;
    ticks.push(time);
    lows.push(finiteLevel(bass[index]));
    hits.push(finiteLevel(onset[index]));
    if (ticks.length >= 100_000) break;
  }
  if (ticks.length < MIN_BEATS) return [];
  let bpm = bpmOf(ticks);
  while (bpm > MAX_MIX_BPM && ticks.length >= MIN_BEATS * 2) {
    const evenScore = bestPhaseScore(
      lows.filter((_, index) => index % 2 === 0),
      hits.filter((_, index) => index % 2 === 0),
    );
    const oddScore = bestPhaseScore(
      lows.filter((_, index) => index % 2 === 1),
      hits.filter((_, index) => index % 2 === 1),
    );
    const start = evenScore >= oddScore ? 0 : 1;
    const next: number[] = [];
    const nextLow: number[] = [];
    const nextHit: number[] = [];
    for (let index = start; index < ticks.length; index += 2) {
      next.push(ticks[index] ?? 0);
      nextLow.push(lows[index] ?? 0);
      nextHit.push(hits[index] ?? 0);
    }
    if (next.length < MIN_BEATS) break;
    ticks = next;
    lows = nextLow;
    hits = nextHit;
    bpm = bpmOf(ticks);
  }
  while (bpm > 0 && bpm < MIN_MIX_BPM && ticks.length >= 2 && ticks.length < 50_000) {
    const filled: number[] = [];
    const filledLow: number[] = [];
    const filledHit: number[] = [];
    for (let index = 0; index < ticks.length; index += 1) {
      filled.push(ticks[index] ?? 0);
      filledLow.push(lows[index] ?? 0);
      filledHit.push(hits[index] ?? 0);
      const following = ticks[index + 1];
      if (following == null) continue;
      filled.push(Math.round(((ticks[index] ?? 0) + following) / 2));
      filledLow.push(((lows[index] ?? 0) + (lows[index + 1] ?? 0)) / 2);
      filledHit.push(((hits[index] ?? 0) + (hits[index + 1] ?? 0)) / 2);
    }
    if (filled.length <= ticks.length) break;
    ticks = filled;
    lows = filledLow;
    hits = filledHit;
    bpm = bpmOf(ticks);
  }
  return ticks;
}

/**
 * Keep the tracker times when they sit on the pulse. Fill a missed beat and
 * drop a double so the grid stays mixable without drifting a bar later.
 */
export function stabilizeBeatTicks(ticksMs: readonly number[]): number[] {
  const ticks = cleanBeatTicks(ticksMs);
  if (ticks.length < MIN_BEATS) return [];
  const gap = Math.max(1, Math.round(median(gapsOf(ticks))));
  const last = ticks[ticks.length - 1] ?? 0;
  const out: number[] = [];
  let expected = ticks[0] ?? 0;
  let index = 0;
  let guard = 0;
  while (out.length < 100_000 && guard < 100_000) {
    guard += 1;
    while (
      index + 1 < ticks.length &&
      Math.abs((ticks[index + 1] ?? 0) - expected) <= Math.abs((ticks[index] ?? 0) - expected)
    ) {
      index += 1;
    }
    const near = ticks[index];
    const previous = out[out.length - 1];
    if (near != null && Math.abs(near - expected) <= gap * 0.35) {
      if (previous != null && near <= previous) {
        expected = previous + gap;
        continue;
      }
      out.push(near);
      expected = near + gap;
    } else {
      const time = Math.round(expected);
      if (previous != null && time <= previous) break;
      out.push(time);
      expected += gap;
    }
    if (expected > last + gap * 0.35) break;
  }
  return out.length >= MIN_BEATS ? out : ticks;
}

/** Continue a 4/4 grid back to 0 and forward to the end of the file. */
export function extendFourFour(beats: readonly AnlzBeat[], durationMs: number): AnlzBeat[] {
  if (beats.length < MIN_BEATS) return beats.map((beat) => ({ timeMs: beat.timeMs, beat: beat.beat }));
  const gap = Math.max(1, Math.round(median(gapsOf(beats.map((beat) => beat.timeMs)))));
  const end = Number.isFinite(durationMs)
    ? Math.max(0, Math.round(durationMs))
    : (beats[beats.length - 1]?.timeMs ?? 0);
  const out = beats.map((beat) => ({ timeMs: beat.timeMs, beat: beat.beat }));
  while (out.length < 100_000) {
    const first = out[0];
    if (!first || first.timeMs - gap < 0) break;
    out.unshift({ timeMs: first.timeMs - gap, beat: first.beat === 1 ? 4 : first.beat - 1 });
  }
  while (out.length < 100_000) {
    const last = out[out.length - 1];
    if (!last || last.timeMs + gap > end) break;
    out.push({ timeMs: last.timeMs + gap, beat: last.beat === 4 ? 1 : last.beat + 1 });
  }
  return out;
}

function windowAround(
  samples: Float32Array,
  sampleRate: number,
  tickMs: number,
): { start: number; end: number; rate: number } {
  const rate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 44100;
  const window = Math.max(1, Math.round(rate * 0.05));
  const center = Math.round((tickMs / 1000) * rate);
  return {
    rate,
    start: Math.max(0, center - window),
    end: Math.min(samples.length, center + window),
  };
}

/** Mean absolute level of a simple low-pass around one tick. */
export function bassAtTicks(
  samples: Float32Array,
  sampleRate: number,
  ticksMs: readonly number[],
): number[] {
  const probe = windowAround(samples, sampleRate, 0);
  const alpha = 1 - Math.exp((-2 * Math.PI * 150) / probe.rate);
  return ticksMs.map((tick) => {
    const { start, end } = windowAround(samples, sampleRate, tick);
    if (end <= start) return 0;
    let low = 0;
    let sum = 0;
    for (let index = start; index < end; index += 1) {
      low += alpha * ((samples[index] ?? 0) - low);
      sum += Math.abs(low);
    }
    return sum / (end - start);
  });
}

/** High-band energy plus a simple flux around one tick. Snares and hats score here. */
export function onsetAtTicks(
  samples: Float32Array,
  sampleRate: number,
  ticksMs: readonly number[],
): number[] {
  const probe = windowAround(samples, sampleRate, 0);
  const alpha = 1 - Math.exp((-2 * Math.PI * 150) / probe.rate);
  return ticksMs.map((tick) => {
    const { start, end } = windowAround(samples, sampleRate, tick);
    if (end <= start) return 0;
    let low = 0;
    let high = 0;
    let flux = 0;
    let previous = 0;
    for (let index = start; index < end; index += 1) {
      const value = samples[index] ?? 0;
      low += alpha * (value - low);
      high += Math.abs(value - low);
      flux += Math.max(0, Math.abs(value) - Math.abs(previous));
      previous = value;
    }
    const span = end - start;
    return high / span + flux / span;
  });
}
