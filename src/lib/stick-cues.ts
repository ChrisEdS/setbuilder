import {
  anlzPathsMatch,
  cuesMatch,
  readAnlzBeatGrid,
  readAnlzContentPath,
  readAnlzHotCues,
  readAnlzPhrases,
  shiftAnlzGrid,
  writeAnlzHotCues,
  type AnlzBeat,
  type AnlzCue,
  type AnlzPhrase,
} from "@/lib/anlz-cues";
import { BACKUP_DIR } from "@/lib/brand";
import { getStickFilesEpoch, listRememberedAnalysisFiles, lookupStickAnalysisFile } from "@/lib/stick-audio";
import type { DirLike, FileLike } from "@/lib/rekordbox-stick-write";

export type CueStickStatus = "written" | "missing" | "rejected" | "no-stick" | "no-id";

const DAT = "ANLZ0000.DAT";
const ANALYSIS_DAT = /^ANLZ\d+\.DAT$/i;

function pairedExt(datName: string): string {
  return datName.replace(/DAT$/i, "EXT");
}

export function rekordboxTrackId(track: { id: string; uri?: string }): number | null {
  const uri = track.uri ?? "";
  const fromUri = /^rekordbox:(\d+)$/.exec(uri);
  if (fromUri) return Number(fromUri[1]);
  const parts = track.id.split(":");
  if (parts[0] === "rekordbox" && /^\d+$/.test(parts[2] ?? "")) return Number(parts[2]);
  return null;
}

async function readBytes(file: FileLike): Promise<Uint8Array> {
  const blob = await file.getFile();
  return new Uint8Array(await blob.arrayBuffer());
}

type ByteBlob = {
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
  slice?: (start: number, end?: number) => { arrayBuffer(): Promise<ArrayBuffer> };
};

async function sliceBytes(blob: ByteBlob, start: number, end: number): Promise<Uint8Array> {
  if (blob.slice) return new Uint8Array(await blob.slice(start, end).arrayBuffer());
  const all = new Uint8Array(await blob.arrayBuffer());
  return all.subarray(start, Math.min(all.length, end));
}

function uint32be(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset, false);
}

/** PMAI wrapper around one tag, so the existing grid parser can read a slice. */
function wrapTag(tag: Uint8Array): Uint8Array {
  const out = new Uint8Array(28 + tag.length);
  out.set([0x50, 0x4d, 0x41, 0x49], 0);
  const view = new DataView(out.buffer);
  view.setUint32(4, 28, false);
  view.setUint32(8, out.length, false);
  out.set(tag, 28);
  return out;
}

/**
 * The beat grid is a small tag. The same file also holds the waveform, which is
 * the large part. Read tag headers and then only the grid tag.
 */
async function readGridBuffer(blob: ByteBlob): Promise<Uint8Array | null> {
  if (blob.size < 28 || !blob.slice) return new Uint8Array(await blob.arrayBuffer());
  const head = await sliceBytes(blob, 0, Math.min(32, blob.size));
  const magic = String.fromCharCode(head[0] ?? 0, head[1] ?? 0, head[2] ?? 0, head[3] ?? 0);
  if (magic !== "PMAI") return new Uint8Array(await blob.arrayBuffer());
  let offset = uint32be(head, 4);
  for (let step = 0; step < 32 && offset + 12 <= blob.size; step += 1) {
    const tagHead = await sliceBytes(blob, offset, offset + 12);
    const length = uint32be(tagHead, 8);
    if (length < 12) break;
    const kind = String.fromCharCode(tagHead[0] ?? 0, tagHead[1] ?? 0, tagHead[2] ?? 0, tagHead[3] ?? 0);
    if (kind === "PQTZ") {
      const tag = await sliceBytes(blob, offset, Math.min(blob.size, offset + length));
      return wrapTag(tag);
    }
    offset += length;
  }
  return null;
}

async function writeBytes(file: FileLike, data: Uint8Array): Promise<void> {
  const writable = await file.createWritable();
  try {
    await writable.write(data);
    await writable.close();
  } catch (error) {
    await writable.abort?.();
    throw error;
  }
}

async function findChild(dir: DirLike, name: string): Promise<DirLike | null> {
  const want = name.toLowerCase();
  if (dir.keys) {
    for await (const entry of dir.keys()) {
      if (entry.toLowerCase() !== want) continue;
      try {
        return await dir.getDirectoryHandle(entry);
      } catch {
        return null;
      }
    }
    return null;
  }
  try {
    return await dir.getDirectoryHandle(name);
  } catch {
    return null;
  }
}

/** Volume root has PIONEER/USBANLZ. A pick of the PIONEER folder has USBANLZ itself. */
async function analysisLibrary(root: DirLike): Promise<DirLike | null> {
  const pioneer = await findChild(root, "PIONEER");
  const nested = pioneer ? await findChild(pioneer, "USBANLZ") : null;
  if (nested) return nested;
  return findChild(root, "USBANLZ");
}

async function analysisDir(root: DirLike, trackId: number): Promise<DirLike | null> {
  const library = await analysisLibrary(root);
  if (!library?.keys) return null;
  const folder = trackId.toString(16).toUpperCase().padStart(8, "0");
  for await (const parent of library.keys()) {
    let group: DirLike;
    try {
      group = await library.getDirectoryHandle(parent);
    } catch {
      continue;
    }
    const track = await findChild(group, folder);
    if (track) return track;
  }
  return null;
}

async function maybeFile(dir: DirLike, name: string): Promise<FileLike | null> {
  try {
    return await dir.getFileHandle(name);
  } catch {
    return null;
  }
}

type Located = { dir: DirLike; folder: string; datName: string };

async function readHead(file: FileLike): Promise<Uint8Array> {
  const blob = await file.getFile();
  const head = typeof (blob as Blob).slice === "function" ? (blob as Blob).slice(0, 4096) : blob;
  return new Uint8Array(await head.arrayBuffer());
}

const analysisIndexes = new WeakMap<DirLike, Promise<Map<string, Located>>>();
const indexRetried = new WeakSet<DirLike>();

type IndexFile = { dir: DirLike; folder: string; datName: string; file: FileLike };

async function buildAnalysisIndex(root: DirLike): Promise<Map<string, Located>> {
  const map = new Map<string, Located>();
  const library = await analysisLibrary(root);
  if (!library?.keys) return map;
  const files: IndexFile[] = [];
  for await (const parent of library.keys()) {
    let group: DirLike;
    try {
      group = await library.getDirectoryHandle(parent);
    } catch {
      continue;
    }
    if (!group.keys) continue;
    for await (const name of group.keys()) {
      let track: DirLike;
      try {
        track = await group.getDirectoryHandle(name);
      } catch {
        continue;
      }
      if (!track.keys) continue;
      for await (const entry of track.keys()) {
        if (!ANALYSIS_DAT.test(entry)) continue;
        const dat = await maybeFile(track, entry);
        if (!dat) continue;
        files.push({ dir: track, folder: name.toUpperCase(), datName: entry, file: dat });
      }
    }
  }
  const paths = new Array<string | null>(files.length);
  let cursor = 0;
  async function readNext(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= files.length) return;
      try {
        paths[index] = readAnlzContentPath(await readHead(files[index].file));
      } catch {
        paths[index] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, files.length) }, () => readNext()));
  files.forEach((file, index) => {
    const stored = paths[index];
    if (stored) map.set(stored, { dir: file.dir, folder: file.folder, datName: file.datName });
  });
  return map;
}

function analysisIndex(root: DirLike): Promise<Map<string, Located>> {
  let pending = analysisIndexes.get(root);
  if (!pending) {
    pending = buildAnalysisIndex(root).catch((error: unknown) => {
      analysisIndexes.delete(root);
      throw error;
    });
    analysisIndexes.set(root, pending);
  }
  return pending;
}

function matchLocated(map: Map<string, Located>, filePath: string): Located | null {
  for (const [stored, located] of map) {
    if (anlzPathsMatch(filePath, stored)) return located;
  }
  return null;
}

/**
 * The USBANLZ folder is not the track id in export.pdb.
 * The path inside the analysis file is the link.
 */
async function locateAnalysis(root: DirLike, trackId: number, filePath: string): Promise<Located | null> {
  if (filePath) {
    const map = await analysisIndex(root);
    let found = matchLocated(map, filePath);
    // An empty index is cached on the folder handle. A scan that ran before
    // USBANLZ was readable would otherwise miss every later track.
    if (!found && map.size === 0 && !indexRetried.has(root)) {
      indexRetried.add(root);
      analysisIndexes.delete(root);
      found = matchLocated(await analysisIndex(root), filePath);
    }
    if (found) return found;
  }
  if (filePath || !Number.isInteger(trackId) || trackId <= 0) return null;
  const dir = await analysisDir(root, trackId);
  if (!dir) return null;
  const folder = trackId.toString(16).toUpperCase().padStart(8, "0");
  return { dir, folder, datName: DAT };
}

let rememberedEpoch = -1;
let rememberedPaths = new Map<string, File>();

async function rememberedDat(filePath: string): Promise<File | null> {
  const epoch = getStickFilesEpoch();
  if (epoch !== rememberedEpoch) {
    rememberedEpoch = epoch;
    const next = new Map<string, File>();
    for (const file of listRememberedAnalysisFiles()) {
      const rel = (file.webkitRelativePath || file.name).replaceAll("\\", "/").toLowerCase();
      if (!/\/anlz\d+\.dat$/.test(rel)) continue;
      try {
        const stored = readAnlzContentPath(new Uint8Array(await file.slice(0, 4096).arrayBuffer()));
        if (stored) next.set(stored, file);
      } catch {
        /* a file the volume no longer serves is skipped */
      }
    }
    rememberedPaths = next;
  }
  if (!filePath) return null;
  for (const [stored, file] of rememberedPaths) {
    if (anlzPathsMatch(filePath, stored)) return file;
  }
  return null;
}

function rememberedExt(dat: File): File | null {
  const rel = (dat.webkitRelativePath || "").replaceAll("\\", "/");
  if (!rel) return null;
  const want = rel.replace(/ANLZ(\d+)\.DAT$/i, "ANLZ$1.EXT").toLowerCase();
  for (const file of listRememberedAnalysisFiles()) {
    const path = (file.webkitRelativePath || file.name).replaceAll("\\", "/").toLowerCase();
    if (path === want) return file;
  }
  return null;
}

async function backup(root: DirLike, name: string, data: Uint8Array): Promise<void> {
  const dir = await root.getDirectoryHandle(BACKUP_DIR, { create: true });
  const file = await dir.getFileHandle(name, { create: true });
  await writeBytes(file, data);
}

async function commitFile(file: FileLike, cues: AnlzCue[]): Promise<"written" | "missing" | "rejected"> {
  const original = await readBytes(file);
  const next = writeAnlzHotCues(original, cues);
  if (!next.wrote) return "missing";
  const expected = readAnlzHotCues(next.bytes);
  await writeBytes(file, next.bytes);
  const back = await readBytes(file);
  if (!cuesMatch(readAnlzHotCues(back), expected) || back.length !== next.bytes.length) {
    await writeBytes(file, original);
    return "rejected";
  }
  return "written";
}

/** Beat grid from the ANLZ file still held after the stick folder was picked. */
export async function readRememberedBeatGrid(trackId: number, filePath = ""): Promise<AnlzBeat[] | null> {
  try {
    const file = filePath
      ? await rememberedDat(filePath)
      : trackId > 0
        ? lookupStickAnalysisFile(trackId)
        : null;
    if (!file) return null;
    const bytes = await readGridBuffer(file);
    return bytes ? readAnlzBeatGrid(bytes) : null;
  } catch {
    return null;
  }
}

/** Hot cues from the remembered analysis files. Read only. */
export async function readRememberedHotCues(trackId: number, filePath = ""): Promise<AnlzCue[] | null> {
  try {
    const dat = filePath
      ? await rememberedDat(filePath)
      : trackId > 0
        ? lookupStickAnalysisFile(trackId)
        : null;
    if (!dat) return null;
    const ext = rememberedExt(dat);
    if (ext) {
      const named = readAnlzHotCues(new Uint8Array(await ext.arrayBuffer()));
      if (named.length) return named;
    }
    return readAnlzHotCues(new Uint8Array(await dat.arrayBuffer()));
  } catch {
    return null;
  }
}

async function cuesIn(dir: DirLike, datName = DAT): Promise<AnlzCue[] | null> {
  const ext = await maybeFile(dir, pairedExt(datName));
  const dat = await maybeFile(dir, datName);
  if (ext) {
    const named = readAnlzHotCues(await readBytes(ext));
    if (named.length) return named;
  }
  if (!dat) return null;
  return readAnlzHotCues(await readBytes(dat));
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

async function commitBytes(file: FileLike, next: Uint8Array): Promise<"written" | "rejected"> {
  const original = await readBytes(file);
  await writeBytes(file, next);
  const back = await readBytes(file);
  if (!sameBytes(back, next)) {
    await writeBytes(file, original);
    return "rejected";
  }
  return "written";
}

/** Read the stored beat grid. Null when this track has no analysis file or no grid tag. */
export async function readStickBeatGrid(root: DirLike, trackId: number, filePath = ""): Promise<AnlzBeat[] | null> {
  const located = await locateAnalysis(root, trackId, filePath);
  if (!located) return null;
  const dat = await maybeFile(located.dir, located.datName);
  if (!dat) return null;
  const bytes = await readGridBuffer(await dat.getFile());
  return bytes ? readAnlzBeatGrid(bytes) : null;
}

/** Phrases from the exported PSSI tag. Null when the file has none, or the mask does not read as phrases. */
export async function readStickPhrases(
  root: DirLike,
  trackId: number,
  beats: readonly AnlzBeat[],
  filePath = "",
): Promise<AnlzPhrase[] | null> {
  const located = await locateAnalysis(root, trackId, filePath);
  if (!located || !beats.length) return null;
  const ext = await maybeFile(located.dir, pairedExt(located.datName));
  if (!ext) return null;
  return readAnlzPhrases(await readBytes(ext), beats);
}

export async function readRememberedPhrases(
  trackId: number,
  beats: readonly AnlzBeat[],
  filePath = "",
): Promise<AnlzPhrase[] | null> {
  try {
    const dat = filePath
      ? await rememberedDat(filePath)
      : trackId > 0
        ? lookupStickAnalysisFile(trackId)
        : null;
    if (!dat || !beats.length) return null;
    const ext = rememberedExt(dat);
    if (!ext) return null;
    return readAnlzPhrases(new Uint8Array(await ext.arrayBuffer()), beats);
  } catch {
    return null;
  }
}

/**
 * Shift the existing beat grid by one delta and write those times back.
 * A step before zero is refused and nothing is written.
 */
export async function saveStickBeatGrid(
  root: DirLike,
  trackId: number,
  deltaMs: number,
  filePath = "",
): Promise<CueStickStatus> {
  const located = await locateAnalysis(root, trackId, filePath);
  if (!located) return "missing";
  const dat = await maybeFile(located.dir, located.datName);
  if (!dat) return "missing";
  const ext = await maybeFile(located.dir, pairedExt(located.datName));
  const datBytes = await readBytes(dat);
  const extBytes = ext ? await readBytes(ext) : null;
  const shifted = shiftAnlzGrid(datBytes, extBytes, deltaMs);
  if (!shifted) return "rejected";
  const expected = readAnlzBeatGrid(shifted.dat);
  if (!expected?.length) return "rejected";
  const hex = located.folder.replace(/[^0-9A-F]/gi, "").toUpperCase().padStart(8, "0").slice(-8);
  const writeExt = Boolean(ext && shifted.ext && !sameBytes(extBytes ?? new Uint8Array(), shifted.ext));
  await backup(root, `ANLZ-${hex}.DAT`, datBytes);
  if (writeExt && ext && extBytes) await backup(root, `ANLZ-${hex}.EXT`, extBytes);
  const datStatus = await commitBytes(dat, shifted.dat);
  if (datStatus === "rejected") return "rejected";
  if (!sameBytes(await readBytes(dat), shifted.dat) || !beatTimes(readAnlzBeatGrid(await readBytes(dat)), expected)) {
    await writeBytes(dat, datBytes);
    return "rejected";
  }
  if (writeExt && ext && shifted.ext) {
    const extStatus = await commitBytes(ext, shifted.ext);
    if (extStatus === "rejected") {
      await writeBytes(dat, datBytes);
      if (extBytes) await writeBytes(ext, extBytes);
      return "rejected";
    }
  }
  return "written";
}

function beatTimes(left: AnlzBeat[] | null, right: readonly AnlzBeat[]): boolean {
  if (!left || left.length !== right.length) return false;
  return left.every((beat, index) => beat.timeMs === right[index]?.timeMs && beat.beat === right[index]?.beat);
}

export async function readStickHotCues(root: DirLike, trackId: number, filePath = ""): Promise<AnlzCue[] | null> {
  const located = await locateAnalysis(root, trackId, filePath);
  if (!located) return null;
  return cuesIn(located.dir, located.datName);
}

/**
 * Rewrite the hot-cue tag of the track's existing ANLZ files.
 * The original bytes are copied into SETBUILDER-Backup first.
 * A mismatched read-back puts those bytes back.
 */
export async function saveStickHotCues(
  root: DirLike,
  trackId: number,
  cues: AnlzCue[],
  filePath = "",
): Promise<CueStickStatus> {
  const located = await locateAnalysis(root, trackId, filePath);
  if (!located) return "missing";
  const { dir } = located;
  const dat = await maybeFile(dir, located.datName);
  const ext = await maybeFile(dir, pairedExt(located.datName));
  if (!dat && !ext) return "missing";
  const originals = new Map<FileLike, Uint8Array>();
  const hex = located.folder.replace(/[^0-9A-F]/gi, "").toUpperCase().padStart(8, "0").slice(-8);
  for (const [file, suffix] of [
    [dat, "DAT"],
    [ext, "EXT"],
  ] as const) {
    if (!file) continue;
    const original = await readBytes(file);
    originals.set(file, original);
    await backup(root, `ANLZ-${hex}.${suffix}`, original);
  }
  let status: CueStickStatus = "missing";
  for (const file of originals.keys()) {
    const result = await commitFile(file, cues);
    if (result === "rejected") {
      for (const [item, original] of originals) await writeBytes(item, original);
      return "rejected";
    }
    if (result === "written") status = "written";
  }
  return status;
}
