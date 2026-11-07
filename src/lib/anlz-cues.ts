import { CUE_SLOT_COUNT, type TrackCue } from "@/lib/set";

/**
 * Hot cues inside an existing Pioneer ANLZ file (PMAI, big-endian).
 * Only the hot-cue tag is rewritten. Beatgrid, waveform and memory cues stay.
 */

const HOT_CUE = 1;
const PCPT_LEN = 0x38;
const PCP2_LEN = 0x68;
const NAME_BYTES = 0x10;

export type AnlzCue = {
  slot: number;
  timeMs: number;
  name: string;
};

/** One beat from an existing PQTZ grid. `beat` 1 is the downbeat. */
export type AnlzBeat = {
  timeMs: number;
  beat: number;
};

type Tag = {
  kind: string;
  offset: number;
  length: number;
};

function ascii(value: string): Uint8Array {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}

function kindAt(data: Uint8Array, offset: number): string {
  return String.fromCharCode(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0, data[offset + 3] ?? 0);
}

function viewOf(data: Uint8Array): DataView {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

function listTags(data: Uint8Array): Tag[] {
  if (kindAt(data, 0) !== "PMAI" || data.length < 28) return [];
  const view = viewOf(data);
  const header = view.getUint32(4, false);
  const tags: Tag[] = [];
  let offset = header;
  while (offset + 12 <= data.length) {
    const length = view.getUint32(offset + 8, false);
    if (length < 12 || offset + length > data.length) break;
    tags.push({ kind: kindAt(data, offset), offset, length });
    offset += length;
  }
  return tags;
}

function tagType(data: Uint8Array, tag: Tag): number {
  if (tag.length < 16) return -1;
  return viewOf(data).getUint32(tag.offset + 12, false);
}

function utf16be(data: Uint8Array, offset: number, bytes: number): string {
  let name = "";
  const end = Math.min(data.length, offset + bytes);
  for (let i = offset; i + 1 < end; i += 2) {
    const code = viewOf(data).getUint16(i, false);
    if (code === 0) break;
    name += String.fromCharCode(code);
  }
  return name;
}

function readPcob(data: Uint8Array, tag: Tag): AnlzCue[] {
  const view = viewOf(data);
  const cues: AnlzCue[] = [];
  let offset = tag.offset + 24;
  const end = tag.offset + tag.length;
  while (offset + PCPT_LEN <= end && kindAt(data, offset) === "PCPT") {
    const length = view.getUint32(offset + 8, false);
    if (length < PCPT_LEN || offset + length > end) break;
    const hot = view.getUint32(offset + 12, false);
    const timeMs = view.getUint32(offset + 32, false);
    const slot = hot >= 1 && hot <= CUE_SLOT_COUNT ? hot - 1 : cues.length;
    if (timeMs !== 0xffffffff) cues.push({ slot, timeMs, name: "" });
    offset += length;
  }
  return cues;
}

function readPco2(data: Uint8Array, tag: Tag): AnlzCue[] {
  const view = viewOf(data);
  const cues: AnlzCue[] = [];
  let offset = tag.offset + 20;
  const end = tag.offset + tag.length;
  while (offset + 48 <= end && kindAt(data, offset) === "PCP2") {
    const length = view.getUint32(offset + 8, false);
    if (length < 48 || offset + length > end) break;
    const hot = view.getUint32(offset + 12, false);
    const timeMs = view.getUint32(offset + 20, false);
    const nameBytes = view.getUint32(offset + 40, false);
    const name = utf16be(data, offset + 44, Math.min(nameBytes, length - 44));
    const slot = hot >= 1 && hot <= CUE_SLOT_COUNT ? hot - 1 : cues.length;
    if (timeMs !== 0xffffffff) cues.push({ slot, timeMs, name });
    offset += length;
  }
  return cues;
}

/** Path stored in the analysis file, the same Contents path as on the track. */
export function readAnlzContentPath(data: Uint8Array): string | null {
  const tag = listTags(data).find((item) => item.kind === "PPTH");
  if (!tag || tag.length < 18) return null;
  const bytes = viewOf(data).getUint32(tag.offset + 12, false);
  const path = utf16be(data, tag.offset + 16, Math.min(bytes, tag.length - 16)).trim();
  return path || null;
}

/** Compare a track path with the path stored in an analysis file. */
export function anlzPathsMatch(trackPath: string, storedPath: string): boolean {
  const left = trackPath.replaceAll("\\", "/").replace(/^\/+/, "").trim().toLowerCase();
  const right = storedPath.replaceAll("\\", "/").replace(/^\/+/, "").trim().toLowerCase();
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length < right.length ? left : right;
  const longer = shorter === left ? right : left;
  return shorter.length >= 12 && longer.endsWith(shorter);
}

/**
 * Beat times already stored in this analysis file.
 * Returns null when the file has no beat-grid tag. Does not change the file.
 */
export function readAnlzBeatGrid(data: Uint8Array): AnlzBeat[] | null {
  const tag = listTags(data).find((item) => item.kind === "PQTZ");
  if (!tag || tag.length < 32) return null;
  const view = viewOf(data);
  const count = view.getUint32(tag.offset + 20, false);
  if (count > 100_000) return null;
  const beats: AnlzBeat[] = [];
  let offset = tag.offset + 24;
  const end = tag.offset + tag.length;
  for (let index = 0; index < count && offset + 8 <= end; index += 1) {
    const beat = view.getUint16(offset, false);
    const timeMs = view.getUint32(offset + 4, false);
    if (beat >= 1 && beat <= 4) beats.push({ timeMs, beat });
    offset += 8;
  }
  return beats;
}

const BAR_EDGE_MS = 40;

/**
 * One bar forward or back, landing on a downbeat.
 * A press on a downbeat leaves that beat. Between beats, left is the previous
 * downbeat and right is the next. The ends of the track are the limits.
 * With no downbeat in the grid, the time stays put.
 */
export function barJump(
  timeMs: number,
  durationMs: number,
  beats: readonly AnlzBeat[],
  direction: 1 | -1,
): number {
  const span = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
  const now = Math.min(span, Math.max(0, Number.isFinite(timeMs) ? timeMs : 0));
  let hasDownbeat = false;
  for (let index = 0; index < beats.length; index += 1) {
    if (beats[index]?.beat === 1) {
      hasDownbeat = true;
      break;
    }
  }
  if (!hasDownbeat) return now;
  if (direction > 0) {
    for (let index = 0; index < beats.length; index += 1) {
      const beat = beats[index];
      if (beat && beat.beat === 1 && beat.timeMs > now + BAR_EDGE_MS) return Math.min(span, beat.timeMs);
    }
    return span;
  }
  for (let index = beats.length - 1; index >= 0; index -= 1) {
    const beat = beats[index];
    if (beat && beat.beat === 1 && beat.timeMs < now - BAR_EDGE_MS) return Math.max(0, beat.timeMs);
  }
  return 0;
}

/** Nearest beat 1. Other beats are ignored. The original time stays when there is no downbeat. */
export function nearestDownbeat(timeMs: number, beats: readonly AnlzBeat[]): number {
  if (!beats.length || !Number.isFinite(timeMs)) return timeMs;
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((beats[mid]?.timeMs ?? 0) < timeMs) lo = mid + 1;
    else hi = mid;
  }
  let best = timeMs;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let index = Math.max(0, lo - 16); index <= Math.min(beats.length - 1, lo + 16); index += 1) {
    const beat = beats[index];
    if (!beat || beat.beat !== 1) continue;
    const dist = Math.abs(beat.timeMs - timeMs);
    if (dist < bestDist) {
      bestDist = dist;
      best = beat.timeMs;
    }
  }
  return best;
}

/** Even beats from a BPM, phase at the start. Used only when no stored grid exists. */
export function beatsFromBpm(bpm: number, durationMs: number): AnlzBeat[] {
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 240 || durationMs <= 0) return [];
  const step = 60_000 / bpm;
  const beats: AnlzBeat[] = [];
  for (let index = 0, time = 0; time <= durationMs && index < 8_000; index += 1, time += step) {
    beats.push({ timeMs: Math.round(time), beat: (index % 4) + 1 });
  }
  return beats;
}

/** Hot cues already stored in this analysis file. Names come from PCO2 when it exists. */
export function readAnlzHotCues(data: Uint8Array): AnlzCue[] {
  const tags = listTags(data);
  const named = tags.filter((tag) => tag.kind === "PCO2" && tagType(data, tag) === HOT_CUE);
  const plain = tags.filter((tag) => tag.kind === "PCOB" && tagType(data, tag) === HOT_CUE);
  const fromNamed = named.flatMap((tag) => readPco2(data, tag));
  if (fromNamed.length) return fromNamed.slice(0, CUE_SLOT_COUNT);
  return plain.flatMap((tag) => readPcob(data, tag)).slice(0, CUE_SLOT_COUNT);
}

function prepare(cues: AnlzCue[]): AnlzCue[] {
  const used = new Set<number>();
  const next: AnlzCue[] = [];
  for (const cue of [...cues].sort((a, b) => a.slot - b.slot)) {
    const slot = Math.floor(cue.slot);
    const timeMs = Math.round(cue.timeMs);
    if (slot < 0 || slot >= CUE_SLOT_COUNT || used.has(slot)) continue;
    if (!Number.isFinite(timeMs) || timeMs < 0) continue;
    used.add(slot);
    next.push({ slot, timeMs, name: cue.name.trim().slice(0, 24) });
  }
  return next;
}

function pcptEntry(cue: AnlzCue): Uint8Array {
  const entry = new Uint8Array(PCPT_LEN);
  const view = new DataView(entry.buffer);
  entry.set(ascii("PCPT"), 0);
  view.setUint32(4, 0x1c, false);
  view.setUint32(8, PCPT_LEN, false);
  view.setUint32(12, cue.slot + 1, false);
  view.setUint32(20, 0x00010000, false);
  view.setUint32(24, 0xffffffff, false);
  view.setUint32(28, 0x010003e8, false);
  view.setUint32(32, cue.timeMs, false);
  view.setUint32(36, 0xffffffff, false);
  return entry;
}

function pcobTag(cues: AnlzCue[]): Uint8Array {
  const len = 24 + cues.length * PCPT_LEN;
  const tag = new Uint8Array(len);
  const view = new DataView(tag.buffer);
  tag.set(ascii("PCOB"), 0);
  view.setUint32(4, 0x18, false);
  view.setUint32(8, len, false);
  view.setUint32(12, HOT_CUE, false);
  view.setUint32(16, cues.length, false);
  view.setUint32(20, 0xffffffff, false);
  cues.forEach((cue, index) => tag.set(pcptEntry(cue), 24 + index * PCPT_LEN));
  return tag;
}

function pcp2Entry(cue: AnlzCue): Uint8Array {
  const entry = new Uint8Array(PCP2_LEN);
  const view = new DataView(entry.buffer);
  entry.set(ascii("PCP2"), 0);
  view.setUint32(4, 0x10, false);
  view.setUint32(8, PCP2_LEN, false);
  view.setUint32(12, cue.slot + 1, false);
  view.setUint32(16, 0x010003e8, false);
  view.setUint32(20, cue.timeMs, false);
  view.setUint32(24, 0xffffffff, false);
  view.setUint32(28, 0x00010000, false);
  view.setUint32(40, NAME_BYTES, false);
  const name = (cue.name || `Cue ${cue.slot + 1}`).slice(0, 7);
  for (let i = 0; i < name.length; i += 1) {
    view.setUint16(44 + i * 2, name.charCodeAt(i), false);
  }
  view.setUint16(60, 0xc4ff, false);
  return entry;
}

function pco2Tag(cues: AnlzCue[]): Uint8Array {
  const len = 20 + cues.length * PCP2_LEN;
  const tag = new Uint8Array(len);
  const view = new DataView(tag.buffer);
  tag.set(ascii("PCO2"), 0);
  view.setUint32(4, 0x14, false);
  view.setUint32(8, len, false);
  view.setUint32(12, HOT_CUE, false);
  view.setUint32(16, cues.length << 16, false);
  cues.forEach((cue, index) => tag.set(pcp2Entry(cue), 20 + index * PCP2_LEN));
  return tag;
}

function splice(data: Uint8Array, offset: number, length: number, next: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length - length + next.length);
  out.set(data.subarray(0, offset), 0);
  out.set(next, offset);
  out.set(data.subarray(offset + length), offset + next.length);
  return out;
}

/**
 * Replace every hot-cue tag (PCOB and PCO2, type 1) and fix the file length.
 * Returns the original bytes when this file has no hot-cue tag to update.
 */
export function writeAnlzHotCues(data: Uint8Array, cues: AnlzCue[]): { bytes: Uint8Array; wrote: boolean } {
  const hot = listTags(data).filter(
    (tag) => (tag.kind === "PCOB" || tag.kind === "PCO2") && tagType(data, tag) === HOT_CUE,
  );
  if (!hot.length) return { bytes: data, wrote: false };
  const prepared = prepare(cues);
  let bytes = data;
  for (const tag of [...hot].sort((a, b) => b.offset - a.offset)) {
    const next = tag.kind === "PCO2" ? pco2Tag(prepared) : pcobTag(prepared);
    bytes = splice(bytes, tag.offset, tag.length, next);
  }
  viewOf(bytes).setUint32(8, bytes.length, false);
  return { bytes, wrote: true };
}

export function cuesMatch(left: readonly AnlzCue[], right: readonly AnlzCue[]): boolean {
  if (left.length !== right.length) return false;
  const bySlot = (cues: readonly AnlzCue[]) => [...cues].sort((a, b) => a.slot - b.slot);
  return bySlot(left).every((cue, index) => {
    const other = bySlot(right)[index];
    return other != null && cue.slot === other.slot && cue.timeMs === other.timeMs;
  });
}

export function toTrackCues(cues: readonly AnlzCue[]): TrackCue[] {
  return cues.map((cue) => ({ slot: cue.slot, timeMs: cue.timeMs, name: cue.name }));
}
