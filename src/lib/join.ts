import type { AnlzBeat, AnlzPhrase, PhraseName } from "./anlz-cues";
import { pitchRate, playedBpm } from "./pitch";

/** File time shown before the mix so the overlap edge can move. */
export const JOIN_CONTEXT_MS = 8_000;

/** The mix start sits here on both strips, even when a file has no audio before it. */
export const JOIN_PLAYHEAD = 0.3;

/** Closer than this turns one wheel flick into a handful of beats. */
export const JOIN_ZOOM_MAX = 8;

/** Incoming clock is trimmed around this offset. A seek waits for JOIN_SEEK_MS. */
export const JOIN_DRIFT_MS = 20;

/** Seek the incoming file only when it has slipped this far. */
export const JOIN_SEEK_MS = 80;

const RATE_MIN = 0.5;
const RATE_MAX = 2;

/** Held nudge bends the incoming tempo by this fraction, then lets go. */
export const JOIN_NUDGE = 0.03;

export type JoinPlan = {
  outStartMs: number;
  inStartMs: number;
  outRate: number;
  inRate: number;
  /** True when both grids supplied a downbeat and sync shifted the incoming start. */
  phase: boolean;
  outViewStartMs: number;
  outViewEndMs: number;
  inViewStartMs: number;
  inViewEndMs: number;
};

/** Hot cue A, otherwise the start of the file. */
export function cueStartMs(cues: readonly { slot: number; timeMs: number }[] | undefined): number {
  if (!cues) return 0;
  for (const cue of cues) {
    if (cue.slot === 0 && Number.isFinite(cue.timeMs) && cue.timeMs >= 0) return cue.timeMs;
  }
  return 0;
}

/** Outgoing file time where the overlap begins. */
export function outgoingStartMs(durationMs: number, overlapMs: number): number {
  if (!(durationMs > 0)) return 0;
  const overlap = Number.isFinite(overlapMs) ? Math.min(durationMs, Math.max(0, overlapMs)) : 0;
  return durationMs - overlap;
}

/** Incoming rate so its played BPM matches the outgoing fader. Null when either BPM is missing. */
export function syncRate(outgoingBpm: number, pitchPercent: number, incomingBpm: number): number | null {
  const played = playedBpm(outgoingBpm, pitchPercent);
  if (played == null || !(incomingBpm > 0)) return null;
  const rate = played / incomingBpm;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return Math.min(RATE_MAX, Math.max(RATE_MIN, rate));
}

/** Equal-power crossfade. 0 is the start of the overlap, outgoing full. */
export function equalPowerGains(progress: number): { outgoing: number; incoming: number } {
  const t = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const angle = t * (Math.PI / 2);
  return { outgoing: Math.cos(angle), incoming: Math.sin(angle) };
}

function downbeatsOf(beats: readonly AnlzBeat[]): number[] {
  const times: number[] = [];
  for (const beat of beats) {
    if (beat.beat !== 1 || !Number.isFinite(beat.timeMs)) continue;
    times.push(beat.timeMs);
  }
  return times;
}

function previousDownbeat(beats: readonly AnlzBeat[], timeMs: number): number | null {
  let found: number | null = null;
  for (const time of downbeatsOf(beats)) {
    if (time <= timeMs + 1) found = time;
  }
  return found;
}

function nextDownbeat(beats: readonly AnlzBeat[], timeMs: number): number | null {
  for (const time of downbeatsOf(beats)) {
    if (time > timeMs + 1) return time;
  }
  return null;
}

/** Spacing of the bar that contains this time, from the grid itself. */
function actualBeatMs(beats: readonly AnlzBeat[], aroundMs: number, bpm: number): number {
  const fallback = bpm > 0 ? 60_000 / bpm : 0;
  const prev = previousDownbeat(beats, aroundMs);
  const next = nextDownbeat(beats, prev ?? aroundMs);
  if (prev != null && next != null && next > prev) return next - prev;
  if (prev != null) {
    const earlier = previousDownbeat(beats, prev - 1);
    if (earlier != null && prev > earlier) return prev - earlier;
  }
  const downs = downbeatsOf(beats);
  const first = downs[0];
  const second = downs[1];
  if (first != null && second != null && second > first) return second - first;
  return fallback;
}

/**
 * Incoming rate from the bar lengths at the mix. Longer incoming bars play
 * faster so one wall-time takt matches. Metadata BPM is the fallback.
 */
export function gridSyncRate(
  outgoingBeats: readonly AnlzBeat[] | null,
  incomingBeats: readonly AnlzBeat[] | null,
  outgoingStartMs: number,
  incomingStartMs: number,
  outgoingBpm: number,
  incomingBpm: number,
  pitchPercent: number,
): number | null {
  const outRate = pitchRate(pitchPercent);
  if (outgoingBeats?.length && incomingBeats?.length) {
    const outBar = actualBeatMs(outgoingBeats, outgoingStartMs, outgoingBpm);
    const inBar = actualBeatMs(incomingBeats, incomingStartMs, incomingBpm);
    if (outBar > 0 && inBar > 0) {
      const rate = (inBar / outBar) * outRate;
      if (Number.isFinite(rate) && rate > 0) {
        return Math.min(RATE_MAX, Math.max(RATE_MIN, rate));
      }
    }
  }
  return syncRate(outgoingBpm, pitchPercent, incomingBpm);
}

/**
 * Nearest downbeat within half a bar. Farther than that, the mix point stays
 * where the overlap put it instead of jumping to another phrase.
 */
export function nearestDownbeatMs(
  beats: readonly AnlzBeat[] | null,
  timeMs: number,
  bpm: number,
): number | null {
  if (!beats?.length || !(bpm > 0) || !Number.isFinite(timeMs)) return null;
  const limit = (60_000 / bpm) * 2;
  let best: number | null = null;
  let bestDist = Infinity;
  for (const time of downbeatsOf(beats)) {
    const dist = Math.abs(time - timeMs);
    if (dist > limit + 0.5) continue;
    if (best == null || dist < bestDist - 0.5 || (Math.abs(dist - bestDist) <= 0.5 && time > best)) {
      best = time;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Move the incoming start so the last downbeat before the mix shares the
 * wall time of the outgoing downbeat. Spacing comes from the grid, not the
 * metadata BPM. A shift that would leave the file takes another downbeat.
 */
export function phaseAlignedStartMs(
  incomingStartMs: number,
  outgoingStartMs: number,
  outgoingBeats: readonly AnlzBeat[] | null,
  incomingBeats: readonly AnlzBeat[] | null,
  outgoingBpm: number,
  incomingBpm: number,
): { startMs: number; phase: boolean } {
  if (!outgoingBeats?.length || !incomingBeats?.length) return { startMs: incomingStartMs, phase: false };
  const outBeat = actualBeatMs(outgoingBeats, outgoingStartMs, outgoingBpm);
  const inBeat = actualBeatMs(incomingBeats, incomingStartMs, incomingBpm);
  if (!(outBeat > 0) || !(inBeat > 0)) return { startMs: incomingStartMs, phase: false };
  const outPrev = previousDownbeat(outgoingBeats, outgoingStartMs);
  const outFirst = downbeatsOf(outgoingBeats)[0];
  const origin = outPrev ?? outFirst;
  if (origin == null) return { startMs: incomingStartMs, phase: false };
  let outPhase = (outgoingStartMs - origin) / outBeat;
  outPhase -= Math.floor(outPhase);
  const downs = downbeatsOf(incomingBeats);
  const candidates: number[] = [];
  const inPrev = previousDownbeat(incomingBeats, incomingStartMs);
  const inNext = nextDownbeat(incomingBeats, incomingStartMs);
  if (inPrev != null) candidates.push(inPrev);
  if (inNext != null) candidates.push(inNext);
  const inFirst = downs[0];
  if (inFirst != null && !candidates.includes(inFirst)) candidates.push(inFirst);
  let best: number | null = null;
  let bestDist = Infinity;
  for (const down of candidates) {
    const beat = actualBeatMs(incomingBeats, down, incomingBpm);
    if (!(beat > 0)) continue;
    const start = down + outPhase * beat;
    if (start < 0) continue;
    const dist = Math.abs(start - incomingStartMs);
    if (best == null || dist < bestDist - 0.5) {
      best = start;
      bestDist = dist;
    }
  }
  if (best == null) return { startMs: incomingStartMs, phase: false };
  return { startMs: best, phase: true };
}

const OUT_PHRASES: readonly PhraseName[] = ["outro", "outro1", "outro2", "down"];
const IN_PHRASES: readonly PhraseName[] = ["intro", "intro1", "intro2", "up1", "up2", "up3"];

function isOutPhrase(name: PhraseName): boolean {
  return OUT_PHRASES.includes(name);
}

function isInPhrase(name: PhraseName): boolean {
  return IN_PHRASES.includes(name);
}

/** Phrase that contains this file time, or the last one that started before it. */
export function phraseAt(phrases: readonly AnlzPhrase[] | null | undefined, timeMs: number): AnlzPhrase | null {
  if (!phrases?.length || !Number.isFinite(timeMs)) return null;
  let last: AnlzPhrase | null = null;
  for (const phrase of phrases) {
    if (timeMs >= phrase.timeMs - 1 && timeMs < phrase.endMs) return phrase;
    if (phrase.timeMs <= timeMs + 1) last = phrase;
  }
  return last;
}

function incomingMixPhrase(phrases: readonly AnlzPhrase[], aroundMs: number): AnlzPhrase | null {
  const preferred = phrases.filter((phrase) => isInPhrase(phrase.name));
  const pool = preferred.length ? preferred : phrases;
  let best: AnlzPhrase | null = null;
  let dist = Infinity;
  for (const phrase of pool) {
    const gap = Math.abs(phrase.timeMs - aroundMs);
    if (best == null || gap < dist - 0.5) {
      best = phrase;
      dist = gap;
    }
  }
  return best;
}

/**
 * Keep beat phase, then sit the incoming start on the intro/up that shares
 * the outgoing outro/down at the mix. The phrase offset is whole bars so the
 * grid stays locked.
 */
export function phraseAlignedStartMs(
  incomingStartMs: number,
  outgoingStartMs: number,
  outgoingBeats: readonly AnlzBeat[] | null,
  incomingBeats: readonly AnlzBeat[] | null,
  outgoingBpm: number,
  incomingBpm: number,
  outgoingPhrases?: readonly AnlzPhrase[] | null,
  incomingPhrases?: readonly AnlzPhrase[] | null,
): { startMs: number; phase: boolean } {
  const beat = phaseAlignedStartMs(
    incomingStartMs,
    outgoingStartMs,
    outgoingBeats,
    incomingBeats,
    outgoingBpm,
    incomingBpm,
  );
  if (!outgoingPhrases?.length || !incomingPhrases?.length) return beat;
  const outPhrase = phraseAt(outgoingPhrases, outgoingStartMs);
  const inPhrase = incomingMixPhrase(incomingPhrases, incomingStartMs);
  if (!outPhrase || !inPhrase) return beat;
  if (!isOutPhrase(outPhrase.name) && !isInPhrase(inPhrase.name)) return beat;
  const outBar = actualBeatMs(outgoingBeats ?? [], outgoingStartMs, outgoingBpm);
  const inBar = actualBeatMs(incomingBeats ?? [], inPhrase.timeMs, incomingBpm);
  if (!(outBar > 0) || !(inBar > 0)) return beat;
  const offset = Math.max(0, outgoingStartMs - outPhrase.timeMs);
  const bars = Math.round(offset / outBar);
  const target = Math.max(0, inPhrase.timeMs + bars * inBar);
  return phaseAlignedStartMs(
    target,
    outgoingStartMs,
    outgoingBeats,
    incomingBeats,
    outgoingBpm,
    incomingBpm,
  );
}

/** Whole bars left in this remaining file time at the played BPM. */
export function mixBarsLeft(remainingMs: number, bpm: number): number {
  if (!(bpm > 0) || !(remainingMs > 0)) return 0;
  const barMs = (60_000 / bpm) * 4;
  return Math.max(0, Math.round(remainingMs / barMs));
}

/** mm:ss for a remaining mix. */
export function mixClock(remainingMs: number): string {
  const total = Math.max(0, Math.round(remainingMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Slip, then snap to the nearest downbeat when a grid is there. */
export function quantizeSlipMs(
  startMs: number,
  beats: readonly AnlzBeat[] | null,
  bpm: number,
  durationMs: number,
): number {
  const clamped = durationMs > 0 ? Math.min(durationMs, Math.max(0, startMs)) : Math.max(0, startMs);
  const snapped = nearestDownbeatMs(beats, clamped, bpm);
  if (snapped == null) return clamped;
  return durationMs > 0 ? Math.min(durationMs, Math.max(0, snapped)) : Math.max(0, snapped);
}

/** Where the incoming file should be after this much wall-clock time. */
export function expectedIncomingMs(inStartMs: number, elapsedWallMs: number, inRate: number): number {
  if (!Number.isFinite(elapsedWallMs) || elapsedWallMs < 0) return inStartMs;
  const rate = Number.isFinite(inRate) && inRate > 0 ? inRate : 1;
  return inStartMs + elapsedWallMs * rate;
}

/**
 * Incoming rate while Sync is on. Drift eases the tempo (PLL).
 * A held nudge bends it further. A large drift is left for a seek.
 */
export function syncedIncomingRate(
  rate: number,
  driftMs: number,
  nudge: -1 | 0 | 1,
): number {
  const base = Number.isFinite(rate) && rate > 0 ? rate : 1;
  const bend = nudge === 0 ? 1 : nudge > 0 ? 1 + JOIN_NUDGE : 1 - JOIN_NUDGE;
  let trim = 1;
  if (Number.isFinite(driftMs)) {
    trim = Math.min(1.04, Math.max(0.96, 1 + driftMs / 4_000));
  }
  return Math.min(RATE_MAX, Math.max(RATE_MIN, base * bend * trim));
}

/** The corrected file time, or null when the clock is close enough to leave alone. */
export function driftCorrection(actualMs: number, expectedMs: number, thresholdMs = JOIN_SEEK_MS): number | null {
  if (!Number.isFinite(actualMs) || !Number.isFinite(expectedMs)) return null;
  if (Math.abs(actualMs - expectedMs) <= thresholdMs) return null;
  return expectedMs;
}

/** Drag the wave under a fixed playhead. Positive pixels pull the start earlier. */
export function slipStartMs(
  startMs: number,
  deltaPx: number,
  widthPx: number,
  spanMs: number,
  durationMs: number,
): number {
  const width = widthPx > 0 ? widthPx : 1;
  const span = spanMs > 0 ? spanMs : 0;
  const next = startMs - (deltaPx / width) * span;
  if (!(durationMs > 0)) return Math.max(0, next);
  return Math.min(durationMs, Math.max(0, next));
}

/**
 * One wall-time window for both strips. The start is always at JOIN_PLAYHEAD.
 * A start at the top of a file leaves the lead empty instead of sliding the line.
 */
export function sharedJoinView(
  startMs: number,
  rate: number,
  wallOverlapMs: number,
  zoom: number,
): { startMs: number; endMs: number } {
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 1;
  const overlap = Math.max(0, Number.isFinite(wallOverlapMs) ? wallOverlapMs : 0);
  const baseWall = Math.max(JOIN_CONTEXT_MS, overlap / (1 - JOIN_PLAYHEAD));
  const level = Math.min(JOIN_ZOOM_MAX, Math.max(1, Number.isFinite(zoom) && zoom > 0 ? zoom : 1));
  const span = (baseWall / level) * safeRate;
  const viewStart = startMs - JOIN_PLAYHEAD * span;
  return { startMs: viewStart, endMs: viewStart + span };
}

/** Dragging the right edge of the overlap. Positive pixels lengthen the mix. */
export function overlapFromEndDrag(
  startOverlapMs: number,
  deltaPx: number,
  widthPx: number,
  visibleMs: number,
  durationMs: number,
): number {
  const width = widthPx > 0 ? widthPx : 1;
  const span = visibleMs > 0 ? visibleMs : 0;
  const next = startOverlapMs + (deltaPx / width) * span;
  const limit = durationMs > 0 ? durationMs : 0;
  return Math.min(limit, Math.max(0, next));
}

/** Dragging the overlap edge across the pixels actually on screen. Positive pixels shorten the mix. */
export function overlapFromVisibleDrag(
  startOverlapMs: number,
  deltaPx: number,
  widthPx: number,
  visibleMs: number,
  durationMs: number,
): number {
  const width = widthPx > 0 ? widthPx : 1;
  const span = visibleMs > 0 ? visibleMs : 0;
  const next = startOverlapMs - (deltaPx / width) * span;
  const limit = durationMs > 0 ? durationMs : 0;
  return Math.min(limit, Math.max(0, next));
}

/** Dragging the overlap edge. Positive pixels move the edge to the right and shorten the mix. */
export function overlapFromDrag(
  startOverlapMs: number,
  deltaPx: number,
  widthPx: number,
  contextMs: number,
  durationMs: number,
): number {
  const width = widthPx > 0 ? widthPx : 1;
  const span = Math.max(0, startOverlapMs) + Math.max(0, contextMs);
  const next = startOverlapMs - deltaPx * (span / width);
  const limit = durationMs > 0 ? durationMs : 0;
  return Math.min(limit, Math.max(0, next));
}

export function joinPlan(input: {
  outgoingDurationMs: number;
  overlapMs: number;
  incomingCueMs: number;
  /** When set, the outgoing mix starts at this cue instead of the file end minus the overlap. */
  outgoingAnchorMs?: number | null;
  /** A chosen incoming cue stays on that time. The default cue may still be phase-aligned. */
  incomingLocked?: boolean;
  outgoingBpm: number;
  incomingBpm: number;
  pitchPercent: number;
  sync: boolean;
  outgoingBeats: readonly AnlzBeat[] | null;
  incomingBeats: readonly AnlzBeat[] | null;
  outgoingPhrases?: readonly AnlzPhrase[] | null;
  incomingPhrases?: readonly AnlzPhrase[] | null;
}): JoinPlan {
  const duration = input.outgoingDurationMs > 0 ? input.outgoingDurationMs : 0;
  const overlap = Math.min(duration, Math.max(0, input.overlapMs || 0));
  const anchor = input.outgoingAnchorMs;
  const anchored = typeof anchor === "number" && Number.isFinite(anchor) && anchor >= 0;
  let outStartMs = anchored ? Math.min(duration, anchor) : outgoingStartMs(duration, overlap);
  if (input.sync) {
    const downbeat = nearestDownbeatMs(input.outgoingBeats, outStartMs, input.outgoingBpm);
    if (downbeat != null) outStartMs = Math.min(duration, Math.max(0, downbeat));
  }
  const outRate = pitchRate(input.pitchPercent);
  const aligned = input.sync && !input.incomingLocked
    ? phraseAlignedStartMs(
        input.incomingCueMs,
        outStartMs,
        input.outgoingBeats,
        input.incomingBeats,
        input.outgoingBpm,
        input.incomingBpm,
        input.outgoingPhrases,
        input.incomingPhrases,
      )
    : { startMs: Math.max(0, input.incomingCueMs), phase: false };
  let inStartMs = aligned.startMs;
  if (input.sync && !input.incomingLocked) {
    const downbeat = nearestDownbeatMs(input.incomingBeats, inStartMs, input.incomingBpm);
    if (downbeat != null) inStartMs = Math.max(0, downbeat);
  }
  const matched = input.sync
    ? gridSyncRate(
        input.outgoingBeats,
        input.incomingBeats,
        outStartMs,
        inStartMs,
        input.outgoingBpm,
        input.incomingBpm,
        input.pitchPercent,
      )
    : null;
  const inRate = matched ?? 1;
  const heard = Math.min(overlap, Math.max(0, duration - outStartMs));
  const wantedContext = Math.min(JOIN_CONTEXT_MS, outStartMs);
  const wallOverlap = outRate > 0 ? heard / outRate : heard;
  const wallRoom = inRate > 0 ? inStartMs / inRate : 0;
  const wallContext = Math.min(wantedContext / (outRate > 0 ? outRate : 1), wallRoom);
  const fileContext = wallContext * outRate;
  return {
    outStartMs,
    inStartMs,
    outRate,
    inRate,
    phase: aligned.phase,
    outViewStartMs: outStartMs - fileContext,
    outViewEndMs: outStartMs + heard,
    inViewStartMs: inStartMs - wallContext * inRate,
    inViewEndMs: inStartMs + wallOverlap * inRate,
  };
}
