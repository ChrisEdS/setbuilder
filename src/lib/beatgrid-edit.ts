import { shiftBeatTimes, type AnlzBeat, type AnlzPhrase } from "./anlz-cues";

/** Fine grid slide. One millisecond, same direction as Ord's inner chevrons. */
export const GRID_SLIDE_FINE_MS = 1;
/** Coarse grid slide. The outer chevrons. */
export const GRID_SLIDE_COARSE_MS = 10;
export const GRID_BPM_MIN = 40;
export const GRID_BPM_MAX = 300;
/** Wait before a held chevron starts repeating. */
export const GRID_HOLD_DELAY_MS = 350;
/** First repeat interval. Later repeats shrink toward GRID_HOLD_MIN_MS. */
export const GRID_HOLD_FIRST_MS = 90;
export const GRID_HOLD_MIN_MS = 22;

export function nextGridHoldDelay(delayMs: number): number {
  if (!Number.isFinite(delayMs) || delayMs <= GRID_HOLD_MIN_MS) return GRID_HOLD_MIN_MS;
  return Math.max(GRID_HOLD_MIN_MS, Math.round(delayMs * 0.8));
}

export function cloneGrid(beats: readonly AnlzBeat[]): AnlzBeat[] {
  return beats.map((beat) => ({ timeMs: beat.timeMs, beat: beat.beat }));
}

export function gridsEqual(left: readonly AnlzBeat[] | null, right: readonly AnlzBeat[] | null): boolean {
  if (left === right) return true;
  if (!left || !right || left.length !== right.length) return false;
  return left.every((beat, index) => beat.timeMs === right[index]?.timeMs && beat.beat === right[index]?.beat);
}

function gaps(beats: readonly AnlzBeat[]): number[] {
  const found: number[] = [];
  for (let index = 1; index < beats.length; index += 1) {
    const gap = (beats[index]?.timeMs ?? 0) - (beats[index - 1]?.timeMs ?? 0);
    if (gap > 0) found.push(gap);
  }
  return found;
}

function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/** Tempo from the median gap, one decimal. Null when the grid has no gap. */
export function gridBpm(beats: readonly AnlzBeat[]): number | null {
  const gap = median(gaps(beats));
  if (gap <= 0) return null;
  const bpm = 60_000 / gap;
  if (!Number.isFinite(bpm)) return null;
  return Math.round(bpm * 10) / 10;
}

function rawBpm(beats: readonly AnlzBeat[]): number | null {
  const gap = median(gaps(beats));
  if (gap <= 0) return null;
  const bpm = 60_000 / gap;
  return Number.isFinite(bpm) ? bpm : null;
}

/** Index of the beat closest to this time. -1 when the grid is empty. */
export function nearestBeatIndex(beats: readonly AnlzBeat[], timeMs: number): number {
  if (!beats.length || !Number.isFinite(timeMs)) return -1;
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((beats[mid]?.timeMs ?? 0) < timeMs) lo = mid + 1;
    else hi = mid;
  }
  const previous = Math.max(0, lo - 1);
  const nextDist = Math.abs((beats[lo]?.timeMs ?? 0) - timeMs);
  const prevDist = Math.abs((beats[previous]?.timeMs ?? 0) - timeMs);
  return prevDist <= nextDist ? previous : lo;
}

/**
 * Milliseconds a lane drag should slide the grid.
 * Dragging right (positive pixels) moves the lines later.
 * `visibleMs` is the time span currently drawn across `widthPx`.
 */
export function gridDragDeltaMs(deltaPx: number, widthPx: number, visibleMs: number): number {
  if (!Number.isFinite(deltaPx) || !Number.isFinite(widthPx) || widthPx <= 0) return 0;
  if (!Number.isFinite(visibleMs) || visibleMs <= 0) return 0;
  return (deltaPx / widthPx) * visibleMs;
}

/** Move every beat by the same delta. Spacing and beat numbers stay. */
export function slideGrid(beats: readonly AnlzBeat[], deltaMs: number): AnlzBeat[] | null {
  return shiftBeatTimes(beats, deltaMs);
}

function phaseBeat(beat: number, oneBeat: number): number {
  return ((((beat - oneBeat) % 4) + 4) % 4) + 1;
}

/**
 * The beat nearest the playhead becomes beat 1 and lands on the playhead.
 * Every other beat keeps its distance from that one.
 */
export function flagGrid(beats: readonly AnlzBeat[], playheadMs: number): AnlzBeat[] | null {
  if (!beats.length || !Number.isFinite(playheadMs)) return null;
  const index = nearestBeatIndex(beats, playheadMs);
  const nearest = beats[index];
  if (!nearest) return null;
  const rotated = beats.map((beat) => ({
    timeMs: beat.timeMs,
    beat: phaseBeat(beat.beat, nearest.beat),
  }));
  return shiftBeatTimes(rotated, Math.round(playheadMs) - nearest.timeMs);
}

/**
 * Move the nearest beat onto the playhead.
 * Beat numbers stay, so the bar phase does not rotate.
 */
export function snapGrid(beats: readonly AnlzBeat[], playheadMs: number): AnlzBeat[] | null {
  if (!beats.length || !Number.isFinite(playheadMs)) return null;
  const nearest = beats[nearestBeatIndex(beats, playheadMs)];
  if (!nearest) return null;
  return shiftBeatTimes(beats, Math.round(playheadMs) - nearest.timeMs);
}

function downbeatIndex(beats: readonly AnlzBeat[], playheadMs: number): number {
  let best = -1;
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < beats.length; index += 1) {
    const beat = beats[index];
    if (!beat || beat.beat !== 1) continue;
    const delta = Math.abs(beat.timeMs - playheadMs);
    if (delta < distance) {
      distance = delta;
      best = index;
    }
  }
  return best >= 0 ? best : nearestBeatIndex(beats, playheadMs);
}

function numberedFrom(times: readonly number[], anchorAt: number): AnlzBeat[] {
  const beats: AnlzBeat[] = [];
  for (let index = 0; index < times.length; index += 1) {
    const timeMs = times[index];
    if (timeMs == null) continue;
    const delta = index - anchorAt;
    beats.push({ timeMs, beat: ((delta % 4) + 4) % 4 + 1 });
  }
  return beats;
}

/**
 * Half or double the tempo. The downbeat nearest the playhead stays at the
 * same time and stays beat 1. A variable grid keeps its relative gaps.
 * Outside about 40–300 BPM the change is refused.
 */
export function scaleGridTempo(
  beats: readonly AnlzBeat[],
  factor: 0.5 | 2,
  playheadMs: number,
): AnlzBeat[] | null {
  if (beats.length < 2 || (factor !== 0.5 && factor !== 2) || !Number.isFinite(playheadMs)) return null;
  const bpm = rawBpm(beats);
  if (bpm == null) return null;
  const nextBpm = bpm * factor;
  if (nextBpm < GRID_BPM_MIN || nextBpm > GRID_BPM_MAX) return null;
  const anchor = downbeatIndex(beats, playheadMs);
  const anchorBeat = beats[anchor];
  if (!anchorBeat) return null;
  if (factor === 2) {
    const times: number[] = [];
    for (let index = 0; index < beats.length; index += 1) {
      const time = beats[index]?.timeMs;
      if (time == null) continue;
      const previous = times[times.length - 1];
      if (previous != null && time <= previous) continue;
      times.push(time);
      const following = beats[index + 1]?.timeMs;
      if (following == null || following <= time) continue;
      const mid = Math.round((time + following) / 2);
      if (mid > time && mid < following) times.push(mid);
    }
    let anchorAt = 0;
    let best = Number.POSITIVE_INFINITY;
    for (let index = 0; index < times.length; index += 1) {
      const delta = Math.abs((times[index] ?? 0) - anchorBeat.timeMs);
      if (delta < best) {
        best = delta;
        anchorAt = index;
      }
    }
    times[anchorAt] = anchorBeat.timeMs;
    const grid = numberedFrom(times, anchorAt);
    return grid.length >= 2 ? grid : null;
  }
  const times: number[] = [];
  let anchorAt = 0;
  for (let index = 0; index < beats.length; index += 1) {
    if ((((index - anchor) % 2) + 2) % 2 !== 0) continue;
    const time = beats[index]?.timeMs;
    if (time == null) continue;
    const previous = times[times.length - 1];
    if (previous != null && time <= previous) continue;
    if (index === anchor) anchorAt = times.length;
    times.push(time);
  }
  if (times.length < 2) return null;
  return numberedFrom(times, anchorAt);
}

/**
 * Point phrase indexes at the nearest beats of a replaced grid so a later
 * slide still carries the colored bands. Times that no longer fit stay put
 * by returning null.
 */
export function reindexPhrases(
  phrases: readonly AnlzPhrase[],
  beats: readonly AnlzBeat[],
): AnlzPhrase[] | null {
  if (!phrases.length || beats.length < 2) return null;
  const placed: AnlzPhrase[] = [];
  for (let index = 0; index < phrases.length; index += 1) {
    const phrase = phrases[index];
    if (!phrase) return null;
    const start = nearestBeatIndex(beats, phrase.timeMs);
    let end = nearestBeatIndex(beats, phrase.endMs);
    if (start < 0 || end < 0) return null;
    if (end <= start) end = Math.min(beats.length - 1, start + 1);
    if (end <= start) return null;
    const timeMs = beats[start]?.timeMs;
    const endMs = beats[end]?.timeMs;
    if (timeMs == null || endMs == null || endMs <= timeMs) return null;
    placed.push({ beat: start + 1, endBeat: end + 1, timeMs, endMs, name: phrase.name });
  }
  return placed;
}
