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

/** A stored Rekordbox tempo and, when present, its grid. The auto grid locks to these. */
export type GridLockHint = {
  bpm?: number | null;
  reference?: readonly AnlzBeat[] | null;
};

const FIT_BPM = 0.1;
const FIT_OFFSET_MS = 20;

export type BeatGridCompare = {
  referenceBpm: number | null;
  candidateBpm: number | null;
  bpmDelta: number | null;
  /** Candidate beat 1 minus the reference beat 1, in milliseconds. */
  downbeatOffsetMs: number | null;
  /** How many beats candidate beat 1 sits off the reference beat 1: 0, 1, 2, or 3. */
  phaseShift: number | null;
  errorStartMs: number | null;
  errorMiddleMs: number | null;
  errorEndMs: number | null;
  /** BPM within 0.1, beat 1 on the same beat, offset under 20 ms, and the end no further off than the start. */
  fitsMix: boolean;
};

function tempoOf(beats: readonly AnlzBeat[]): number | null {
  const gap = median(gapsOf(beats.map((beat) => beat.timeMs)));
  if (gap <= 0) return null;
  const bpm = 60_000 / gap;
  if (!Number.isFinite(bpm)) return null;
  return Math.round(bpm * 10) / 10;
}

function firstDownbeat(beats: readonly AnlzBeat[]): AnlzBeat | null {
  for (let index = 0; index < beats.length; index += 1) {
    const beat = beats[index];
    if (beat?.beat === 1) return beat;
  }
  return null;
}

function nearestBeat(beats: readonly AnlzBeat[], timeMs: number): AnlzBeat | null {
  if (!beats.length || !Number.isFinite(timeMs)) return null;
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((beats[mid]?.timeMs ?? 0) < timeMs) lo = mid + 1;
    else hi = mid;
  }
  const previous = Math.max(0, lo - 1);
  const next = beats[lo];
  const prev = beats[previous];
  if (!next) return prev ?? null;
  if (!prev) return next;
  return Math.abs(prev.timeMs - timeMs) <= Math.abs(next.timeMs - timeMs) ? prev : next;
}

function meanNearestError(
  candidate: readonly AnlzBeat[],
  reference: readonly AnlzBeat[],
  from: number,
  to: number,
): number | null {
  let sum = 0;
  let count = 0;
  for (let index = 0; index < candidate.length; index += 1) {
    const beat = candidate[index];
    if (!beat || beat.timeMs < from || beat.timeMs >= to) continue;
    const near = nearestBeat(reference, beat.timeMs);
    if (!near) continue;
    sum += Math.abs(near.timeMs - beat.timeMs);
    count += 1;
  }
  if (!count) return null;
  return Math.round(sum / count);
}

/**
 * Measure an auto grid against the Rekordbox grid.
 * Nothing here is written. A mixable grid stays within 0.1 BPM, on the same
 * beat 1, under about 20 ms, and does not drift further by the end.
 */
export function compareBeatGrids(
  reference: readonly AnlzBeat[],
  candidate: readonly AnlzBeat[],
): BeatGridCompare | null {
  if (reference.length < 2 || candidate.length < 2) return null;
  const referenceBpm = tempoOf(reference);
  const candidateBpm = tempoOf(candidate);
  const bpmDelta =
    referenceBpm != null && candidateBpm != null
      ? Math.round((candidateBpm - referenceBpm) * 10) / 10
      : null;
  const refDown = firstDownbeat(reference);
  const candDown = firstDownbeat(candidate);
  const downbeatOffsetMs = refDown && candDown ? candDown.timeMs - refDown.timeMs : null;
  let phaseShift: number | null = null;
  if (candDown) {
    const near = nearestBeat(reference, candDown.timeMs);
    if (near) phaseShift = (near.beat - 1 + 4) % 4;
  }
  const start = reference[0]?.timeMs ?? 0;
  const end = reference[reference.length - 1]?.timeMs ?? start;
  const third = Math.max(1, end - start) / 3;
  const errorStartMs = meanNearestError(candidate, reference, start, start + third);
  const errorMiddleMs = meanNearestError(candidate, reference, start + third, start + third * 2);
  const errorEndMs = meanNearestError(candidate, reference, start + third * 2, end + 1);
  const fitsMix =
    bpmDelta != null &&
    Math.abs(bpmDelta) <= FIT_BPM &&
    phaseShift === 0 &&
    downbeatOffsetMs != null &&
    Math.abs(downbeatOffsetMs) <= FIT_OFFSET_MS &&
    errorStartMs != null &&
    errorEndMs != null &&
    errorEndMs <= errorStartMs;
  return {
    referenceBpm,
    candidateBpm,
    bpmDelta,
    downbeatOffsetMs,
    phaseShift,
    errorStartMs,
    errorMiddleMs,
    errorEndMs,
    fitsMix,
  };
}

function packTicks(ticksMs: readonly number[], bass: readonly number[], onset: readonly number[]) {
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
  return { ticks, lows, hits };
}

function halvePulse(ticks: number[], lows: number[], hits: number[]) {
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
  return { ticks: next, lows: nextLow, hits: nextHit };
}

function doublePulse(ticks: number[], lows: number[], hits: number[]) {
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
  return { ticks: filled, lows: filledLow, hits: filledHit };
}

function closerBpm(next: number, current: number, target: number): boolean {
  return Math.abs(next - target) + 0.05 < Math.abs(current - target);
}

/**
 * Fold half-time or double-time toward a stored BPM.
 * Without a target, the mixable 70–200 window stays.
 */
export function foldTowardBpm(
  ticksMs: readonly number[],
  bass: readonly number[] = [],
  onset: readonly number[] = [],
  targetBpm: number | null = null,
): number[] {
  if (targetBpm == null || !Number.isFinite(targetBpm) || targetBpm <= 0) {
    return foldBeatTicks(ticksMs, bass, onset);
  }
  let { ticks, lows, hits } = packTicks(ticksMs, bass, onset);
  if (ticks.length < MIN_BEATS) return [];
  for (let guard = 0; guard < 8; guard += 1) {
    const bpm = bpmOf(ticks);
    if (!(bpm > 0)) break;
    const canHalf = ticks.length >= MIN_BEATS * 2 && closerBpm(bpm / 2, bpm, targetBpm);
    const canDouble = ticks.length >= 2 && ticks.length < 50_000 && closerBpm(bpm * 2, bpm, targetBpm);
    if (canHalf && (!canDouble || Math.abs(bpm / 2 - targetBpm) <= Math.abs(bpm * 2 - targetBpm))) {
      const next = halvePulse(ticks, lows, hits);
      if (next.ticks.length < MIN_BEATS) break;
      ticks = next.ticks;
      lows = next.lows;
      hits = next.hits;
      continue;
    }
    if (canDouble) {
      const next = doublePulse(ticks, lows, hits);
      if (next.ticks.length <= ticks.length) break;
      ticks = next.ticks;
      lows = next.lows;
      hits = next.hits;
      continue;
    }
    break;
  }
  return ticks;
}

function nearestLevel(time: number, times: readonly number[], levels: readonly number[]): number {
  if (!times.length || !levels.length) return 0;
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((times[mid] ?? 0) < time) lo = mid + 1;
    else hi = mid;
  }
  const previous = Math.max(0, lo - 1);
  const pick =
    Math.abs((times[previous] ?? 0) - time) <= Math.abs((times[lo] ?? 0) - time) ? previous : lo;
  return finiteLevel(levels[pick]);
}

function constantFromAnchor(anchorMs: number, gapMs: number, durationMs: number, earliestMs: number): AnlzBeat[] {
  const gap = Math.max(1, Math.round(gapMs));
  const anchor = Math.round(anchorMs);
  const end = Math.max(anchor, Math.round(durationMs));
  const earliest = Math.max(0, Math.min(anchor, Math.round(earliestMs)));
  const stepsBack = Math.floor(Math.max(0, anchor - earliest) / gap);
  const beats: AnlzBeat[] = [];
  for (let step = -stepsBack; beats.length < 100_000; step += 1) {
    const time = anchor + step * gap;
    if (time > end) break;
    if (time < earliest) continue;
    beats.push({ timeMs: time, beat: ((step % 4) + 4) % 4 + 1 });
  }
  return beats.length >= MIN_BEATS ? beats : [];
}

/**
 * One tempo, one downbeat, one phase. Beat times stay on that spacing, so a
 * late tick cannot drag the rest of the bar. A stored BPM wins over the
 * 70–200 fold. A Rekordbox downbeat keeps beat 1. Without that downbeat, the
 * grid does not march back to zero from a tracker that started late.
 */
export function lockedFourFour(
  ticksMs: readonly number[],
  durationMs: number,
  bass: readonly number[] = [],
  onset: readonly number[] = [],
  hint: GridLockHint = {},
): AnlzBeat[] {
  const target = hint.bpm != null && Number.isFinite(hint.bpm) && hint.bpm > 0 ? hint.bpm : null;
  const packed = packTicks(ticksMs, bass, onset);
  const ticks = foldTowardBpm(ticksMs, bass, onset, target);
  if (ticks.length < MIN_BEATS) return [];
  const lows = ticks.map((time) => nearestLevel(time, packed.ticks, packed.lows));
  const hits = ticks.map((time) => nearestLevel(time, packed.ticks, packed.hits));
  const rounded = target != null ? Math.round(target * 10) / 10 : 0;
  const gap =
    rounded > 0 ? Math.max(1, Math.round(60_000 / rounded)) : Math.max(1, Math.round(median(gapsOf(ticks))));
  const reference = hint.reference ?? null;
  const refDown = reference ? firstDownbeat(reference) : null;
  let anchor = ticks[0] ?? 0;
  if (refDown) {
    let nearest = ticks[0] ?? refDown.timeMs;
    let distance = Infinity;
    for (let index = 0; index < ticks.length; index += 1) {
      const time = ticks[index] ?? nearest;
      const delta = Math.abs(time - refDown.timeMs);
      if (delta < distance) {
        distance = delta;
        nearest = time;
      }
    }
    anchor = distance <= gap * 0.5 ? nearest : refDown.timeMs;
  } else {
    const phase = bestPhase(lows, hits);
    let weight = -1;
    for (let index = phase; index < ticks.length; index += 4) {
      const level = lows[index] ?? 0;
      if (level > weight) {
        weight = level;
        anchor = ticks[index] ?? anchor;
      }
    }
  }
  const firstTick = ticks[0] ?? anchor;
  let earliest = Math.max(0, firstTick - gap);
  if (refDown && refDown.timeMs < firstTick) {
    const refStart = reference?.[0]?.timeMs ?? refDown.timeMs;
    earliest = Math.max(0, Math.min(refStart, refDown.timeMs));
  }
  const end = Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs)) : (ticks[ticks.length - 1] ?? 0);
  return constantFromAnchor(anchor, gap, end, earliest);
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
