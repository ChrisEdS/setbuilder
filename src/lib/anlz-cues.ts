import { beatTempo } from "./beatgrid";
import { CUE_SLOT_COUNT, type TrackCue } from "@/lib/set";

/**
 * Hot cues and, on request, the beat-grid tag inside an existing Pioneer ANLZ
 * file (PMAI, big-endian). Waveform, memory cues and phrases stay.
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
    if (length < 12) break;
    // A short read still holds the start of the beat grid. Dropping that tag
    // made every long PQTZ look like "no grid".
    if (offset + length > data.length) {
      tags.push({ kind: kindAt(data, offset), offset, length: data.length - offset });
      break;
    }
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

function foldAnlzPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\/+/, "").trim().normalize("NFC").toLowerCase();
}

/** Compare a track path with the path stored in an analysis file. */
export function anlzPathsMatch(trackPath: string, storedPath: string): boolean {
  const left = foldAnlzPath(trackPath);
  const right = foldAnlzPath(storedPath);
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

function pqtzTag(beats: readonly AnlzBeat[]): Uint8Array {
  const tag = new Uint8Array(24 + beats.length * 8);
  const view = new DataView(tag.buffer);
  tag.set(ascii("PQTZ"), 0);
  view.setUint32(4, 0x18, false);
  view.setUint32(8, tag.length, false);
  view.setUint32(16, 0x00080000, false);
  view.setUint32(20, beats.length, false);
  for (let index = 0; index < beats.length; index += 1) {
    const beat = beats[index];
    if (!beat) continue;
    const next = beats[index + 1]?.timeMs ?? beat.timeMs;
    const previous = beats[index - 1]?.timeMs ?? beat.timeMs;
    const gap = Math.max(1, index + 1 < beats.length ? next - beat.timeMs : beat.timeMs - previous);
    const tempo = beatTempo(gap);
    const offset = 24 + index * 8;
    view.setUint16(offset, beat.beat, false);
    view.setUint16(offset + 2, tempo, false);
    view.setUint32(offset + 4, beat.timeMs, false);
  }
  return tag;
}

/**
 * Replace every PQTZ tag with this grid and fix the file length.
 * A file with no beat-grid tag is left unchanged.
 */
export function replaceAnlzBeatGrid(
  data: Uint8Array,
  beats: readonly AnlzBeat[],
): { bytes: Uint8Array; wrote: boolean } {
  if (!beats.length) return { bytes: data, wrote: false };
  const tags = listTags(data).filter((tag) => tag.kind === "PQTZ");
  if (!tags.length) return { bytes: data, wrote: false };
  const next = pqtzTag(beats);
  let bytes = data;
  for (const tag of [...tags].sort((left, right) => right.offset - left.offset)) {
    bytes = splice(bytes, tag.offset, tag.length, next);
  }
  viewOf(bytes).setUint32(8, bytes.length, false);
  return { bytes, wrote: true };
}

/**
 * Point the two known PQT2 header times at the first new beats with those
 * beat numbers. The rest of the tag stays. Returns null when there is no
 * such header, or a beat number has no match.
 */
export function anchorAnlzGrid(data: Uint8Array, beats: readonly AnlzBeat[]): Uint8Array | null {
  const tags = listTags(data).filter(
    (tag) => tag.kind === "PQT2" && tag.length >= 40 && viewOf(data).getUint32(tag.offset + 4, false) === 0x38,
  );
  if (!tags.length) return null;
  const updates: Array<{ offset: number; timeMs: number }> = [];
  const view = viewOf(data);
  for (const tag of tags) {
    const first = view.getUint16(tag.offset + 24, false);
    const second = view.getUint16(tag.offset + 32, false);
    if (first < 1 || first > 4 || second < 1 || second > 4) return null;
    const firstTime = beats.find((beat) => beat.beat === first)?.timeMs;
    const secondTime = beats.find((beat) => beat.beat === second)?.timeMs;
    if (firstTime == null || secondTime == null) return null;
    updates.push({ offset: tag.offset + 28, timeMs: firstTime }, { offset: tag.offset + 36, timeMs: secondTime });
  }
  const bytes = data.slice();
  const next = viewOf(bytes);
  for (const update of updates) next.setUint32(update.offset, update.timeMs, false);
  return bytes;
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

/** Cue time. Quantize lands on the nearest downbeat. Off keeps the time that was asked for. */
export function snapCueTime(timeMs: number, beats: readonly AnlzBeat[], quantize: boolean): number {
  if (!quantize) return timeMs;
  return nearestDownbeat(timeMs, beats);
}

export type StructureCueLabel = "start" | "entry" | "verse" | "drop" | "dropEnd" | "drop2" | "break" | "outro";

export type StructureCue = {
  slot: number;
  timeMs: number;
  label: StructureCueLabel;
};

function phraseRole(name: PhraseName): "intro" | "verse" | "up" | "down" | "chorus" | "outro" | "other" {
  if (name.startsWith("intro")) return "intro";
  if (name.startsWith("verse")) return "verse";
  if (name.startsWith("up")) return "up";
  if (name === "down") return "down";
  if (name.startsWith("chorus")) return "chorus";
  if (name.startsWith("outro")) return "outro";
  return "other";
}

/** Length of the bar that contains this time. Falls back to four beat steps. */
function barSpanMs(timeMs: number, beats: readonly AnlzBeat[]): number {
  let previous = -1;
  let gap = 0;
  for (let index = 0; index < beats.length; index += 1) {
    const beat = beats[index];
    if (!beat || beat.beat !== 1) continue;
    if (previous >= 0) {
      gap = beat.timeMs - previous;
      if (beat.timeMs > timeMs) return Math.max(1, gap);
    }
    previous = beat.timeMs;
  }
  if (gap > 0) return gap;
  if (beats.length >= 2) return Math.max(1, ((beats[1]?.timeMs ?? 0) - (beats[0]?.timeMs ?? 0)) * 4);
  return 1;
}

/**
 * Hot cues for the song places from the Native Instruments cue guide:
 * start, mix-in, verse, drop, end of that drop, second drop, breakdown, outro.
 * A later point closer than one bar to an earlier one is left empty.
 * No phrases means no cues.
 */
export function structureCues(
  phrases: readonly AnlzPhrase[] | null | undefined,
  beats: readonly AnlzBeat[],
  quantize: boolean,
): StructureCue[] {
  if (!phrases?.length) return [];
  const intro = phrases.find((phrase) => phraseRole(phrase.name) === "intro");
  const verse = phrases.find((phrase) => phraseRole(phrase.name) === "verse");
  const up = phrases.find((phrase) => phraseRole(phrase.name) === "up");
  const choruses = phrases.filter((phrase) => phraseRole(phrase.name) === "chorus");
  const down = phrases.find((phrase) => phraseRole(phrase.name) === "down");
  const outro = phrases.find((phrase) => phraseRole(phrase.name) === "outro");
  const entry = intro ? intro.endMs : verse ? verse.timeMs : up ? up.timeMs : null;
  const verseTime = verse && verse.timeMs !== entry ? verse.timeMs : null;
  const firstChorus = choruses[0];
  const secondChorus = choruses[1];
  const start = beats.find((beat) => beat.beat === 1)?.timeMs ?? null;
  const wanted: Array<[number, number | null, StructureCueLabel]> = [
    [0, start, "start"],
    [1, entry, "entry"],
    [2, verseTime, "verse"],
    [3, firstChorus?.timeMs ?? null, "drop"],
    [4, firstChorus?.endMs ?? null, "dropEnd"],
    [5, secondChorus?.timeMs ?? null, "drop2"],
    [6, down?.timeMs ?? null, "break"],
    [7, outro?.timeMs ?? null, "outro"],
  ];
  const placed: StructureCue[] = [];
  for (const [slot, timeMs, label] of wanted) {
    if (timeMs == null || !Number.isFinite(timeMs)) continue;
    const time = snapCueTime(Math.round(timeMs), beats, quantize);
    const crowded = placed.some((cue) => Math.abs(cue.timeMs - time) < barSpanMs(Math.min(cue.timeMs, time), beats));
    if (crowded) continue;
    placed.push({ slot, timeMs: time, label });
  }
  return placed;
}

export const GRID_NUDGE_MS = 5;

/**
 * Move every stored beat by the same amount. Beat numbers and tempo stay.
 * A step that would put a beat before 0 is refused.
 */
export function shiftBeatTimes(beats: readonly AnlzBeat[], deltaMs: number): AnlzBeat[] | null {
  if (!beats.length || !Number.isFinite(deltaMs)) return null;
  const delta = Math.round(deltaMs);
  if (beats.some((beat) => beat.timeMs + delta < 0 || beat.timeMs + delta > 0xffffffff)) return null;
  return beats.map((beat) => ({ beat: beat.beat, timeMs: beat.timeMs + delta }));
}

const PHRASE_MASK = [0xcb, 0xe1, 0xee, 0xfa, 0xe5, 0xee, 0xad, 0xee, 0xe9, 0xd2, 0xe9, 0xeb, 0xe1, 0xe9, 0xf3, 0xe8, 0xe9, 0xf4, 0xe1];

export type PhraseName =
  | "intro"
  | "intro1"
  | "intro2"
  | "up1"
  | "up2"
  | "up3"
  | "down"
  | "chorus"
  | "chorus1"
  | "chorus2"
  | "outro"
  | "outro1"
  | "outro2"
  | "verse1"
  | "verse2"
  | "verse3"
  | "verse4"
  | "verse5"
  | "verse6"
  | "bridge";

/** One rekordbox phrase. `beat` is the 1-based index into the PQTZ grid. */
export type AnlzPhrase = {
  beat: number;
  endBeat: number;
  timeMs: number;
  endMs: number;
  name: PhraseName;
};

export function phraseName(mood: number, kind: number, k1: number, k2: number, k3: number): PhraseName | null {
  if (mood === 1) {
    if (kind === 1) return k1 === 1 ? "intro1" : "intro2";
    if (kind === 2) return k2 === 1 ? "up3" : k3 === 1 ? "up2" : "up1";
    if (kind === 3) return "down";
    if (kind === 5) return k1 === 1 ? "chorus2" : "chorus1";
    if (kind === 6) return k1 === 1 ? "outro1" : "outro2";
    return null;
  }
  const mid: Partial<Record<number, PhraseName>> = {
    1: "intro",
    2: "verse1",
    3: "verse2",
    4: "verse3",
    5: "verse4",
    6: "verse5",
    7: "verse6",
    8: "bridge",
    9: "chorus",
    10: "outro",
  };
  if (mood === 2) return mid[kind] ?? null;
  if (mood === 3) {
    if (kind === 1) return "intro";
    if (kind >= 2 && kind <= 4) return "verse1";
    if (kind >= 5 && kind <= 7) return "verse2";
    if (kind === 8) return "bridge";
    if (kind === 9) return "chorus";
    if (kind === 10) return "outro";
  }
  return null;
}

function beatTime(beats: readonly AnlzBeat[], beat: number): number | null {
  if (!Number.isInteger(beat) || beat < 1 || beat > beats.length) return null;
  return beats[beat - 1]?.timeMs ?? null;
}

/** Place phrase starts on the current grid. The bands follow a grid shift. */
export function phrasesOnGrid(
  phrases: readonly Pick<AnlzPhrase, "beat" | "endBeat" | "name">[],
  beats: readonly AnlzBeat[],
): AnlzPhrase[] | null {
  if (!phrases.length || !beats.length) return null;
  const placed: AnlzPhrase[] = [];
  for (let index = 0; index < phrases.length; index += 1) {
    const phrase = phrases[index];
    if (!phrase) return null;
    const timeMs = beatTime(beats, phrase.beat);
    const endMs = beatTime(beats, phrase.endBeat);
    if (timeMs == null || endMs == null || endMs <= timeMs) return null;
    if (index > 0 && phrase.beat <= (phrases[index - 1]?.beat ?? 0)) return null;
    placed.push({ beat: phrase.beat, endBeat: phrase.endBeat, timeMs, endMs, name: phrase.name });
  }
  return placed;
}

function unmaskPssi(tag: Uint8Array, count: number): Uint8Array {
  const mask = PHRASE_MASK.map((byte) => (byte + count) & 0xff);
  const out = tag.slice();
  for (let index = 18; index < out.length; index += 1) {
    out[index] = (out[index] ?? 0) ^ (mask[(index - 18) % mask.length] ?? 0);
  }
  return out;
}

function phrasesFromTag(tag: Uint8Array, beats: readonly AnlzBeat[]): AnlzPhrase[] | null {
  if (tag.length < 32) return null;
  const view = viewOf(tag);
  const entryBytes = view.getUint32(12, false);
  const count = view.getUint16(16, false);
  if (entryBytes !== 24 || count < 1 || count > 64 || 32 + count * 24 > tag.length) return null;
  const mood = view.getUint16(18, false);
  const endBeat = view.getUint16(26, false);
  if (mood < 1 || mood > 3) return null;
  const raw: Array<Pick<AnlzPhrase, "beat" | "endBeat" | "name">> = [];
  for (let index = 0; index < count; index += 1) {
    const offset = 32 + index * 24;
    const beat = view.getUint16(offset + 2, false);
    const kind = view.getUint16(offset + 4, false);
    const name = phraseName(mood, kind, tag[offset + 7] ?? 0, tag[offset + 9] ?? 0, tag[offset + 19] ?? 0);
    if (!name) return null;
    const nextBeat = index + 1 < count ? view.getUint16(offset + 24 + 2, false) : endBeat;
    raw.push({ beat, endBeat: nextBeat, name });
  }
  return phrasesOnGrid(raw, beats);
}

/**
 * Phrases rekordbox already stored in PSSI.
 * Exported files XOR the body. A tag that does not come out as rising beat indexes is ignored.
 */
export function readAnlzPhrases(data: Uint8Array, beats: readonly AnlzBeat[]): AnlzPhrase[] | null {
  const tagInfo = listTags(data).find((item) => item.kind === "PSSI");
  if (!tagInfo || !beats.length) return null;
  const tag = data.subarray(tagInfo.offset, tagInfo.offset + tagInfo.length);
  const plain = phrasesFromTag(tag, beats);
  if (plain) return plain;
  const count = tag.length >= 18 ? viewOf(tag).getUint16(16, false) : 0;
  if (count < 1 || count > 64) return null;
  return phrasesFromTag(unmaskPssi(tag, count), beats);
}

function gridTimeOffsets(data: Uint8Array): number[] | null {
  const offsets: number[] = [];
  for (const tag of listTags(data)) {
    if (tag.kind === "PQTZ") {
      if (tag.length < 24) return null;
      const view = viewOf(data);
      const count = view.getUint32(tag.offset + 20, false);
      if (count < 1 || count > 100_000 || tag.offset + 24 + count * 8 > tag.offset + tag.length) return null;
      for (let index = 0; index < count; index += 1) offsets.push(tag.offset + 24 + index * 8 + 4);
    }
    if (tag.kind === "PQT2" && tag.length >= 40 && viewOf(data).getUint32(tag.offset + 4, false) === 0x38) {
      const view = viewOf(data);
      const first = view.getUint16(tag.offset + 24, false);
      const second = view.getUint16(tag.offset + 32, false);
      if (first >= 1 && first <= 4 && second >= 1 && second <= 4) {
        offsets.push(tag.offset + 28, tag.offset + 36);
      }
    }
  }
  return offsets.length ? offsets : null;
}

/**
 * Add one delta to every PQTZ time, and to the two time anchors in a PQT2 header.
 * The unknown PQT2 body is left as it was. A negative time refuses the whole shift.
 */
export function shiftAnlzGrid(
  dat: Uint8Array,
  ext: Uint8Array | null,
  deltaMs: number,
): { dat: Uint8Array; ext: Uint8Array | null } | null {
  if (!Number.isFinite(deltaMs)) return null;
  const delta = Math.round(deltaMs);
  const nextDat = dat.slice();
  const nextExt = ext ? ext.slice() : null;
  const datOffsets = gridTimeOffsets(nextDat);
  const extOffsets = nextExt ? (gridTimeOffsets(nextExt) ?? []) : [];
  if (!datOffsets) return null;
  const pairs: Array<[Uint8Array, number[]]> = [[nextDat, datOffsets]];
  if (nextExt) pairs.push([nextExt, extOffsets]);
  for (const [bytes, times] of pairs) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (const at of times) {
      const time = view.getUint32(at, false) + delta;
      if (time < 0 || time > 0xffffffff) return null;
    }
  }
  for (const [bytes, times] of pairs) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (const at of times) view.setUint32(at, view.getUint32(at, false) + delta, false);
  }
  return { dat: nextDat, ext: nextExt };
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
