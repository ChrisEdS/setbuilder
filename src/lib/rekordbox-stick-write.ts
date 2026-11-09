/**
 * Writes a set as a playlist into the database of a rekordbox stick, so the stick can go
 * straight into a player. Uses the browser's File System Access API (Chrome, Edge, the
 * desktop app), so it works on the real files without any server.
 *
 * Order of events, each step only starts when the one before succeeded:
 *   1. read export.pdb and work out the new file in memory (nothing is written yet)
 *   2. copy the original into SETBUILDER-Backup/ and read the copy back byte for byte
 *   3. replace export.pdb (the browser swaps the file atomically when the write is closed)
 *   4. read export.pdb back and check it is the old file plus exactly the new playlist
 *   5. if that check fails: put the original back and say so
 *   6. the same playlist is written into exportLibrary.db when that file opens.
 *      If it does not open, the file stays byte for byte as it was.
 *
 * exportLibrary.db is never deleted. The rekordbox library on the computer
 * (master.db) is never touched.
 */

import type { MessageKey } from "@/lib/i18n/core";
import { parseRekordboxPdb, type PdbLibrary } from "@/lib/rekordbox-pdb";
import {
  addPlaylistToPdb,
  PdbWriteError,
  replacePlaylistInPdb,
  verifyPdbUpdate,
  verifyPdbReplacement,
  type AddPlaylistResult,
} from "@/lib/rekordbox-pdb-write";
import { buildM3u, buildM3uAlternatives, buildRekordboxXml } from "@/lib/export-booth";
import type { Translate } from "@/lib/i18n/core";
import { tDe } from "@/lib/i18n/core";
import type { SetDraft, SetTrack, TrackRole } from "@/lib/set";
import { anlzPathsMatch } from "@/lib/anlz-cues";
import { suggestStickMatches, type StickSuggestion } from "@/lib/stick-match";
import { BACKUP_DIR, BACKUP_DIR_LEGACY, REKORDBOX_XML_NAME, SIDECAR_DIR } from "@/lib/brand";
import {
  existingAlternativesPlaylistName,
  existingStickPlaylistName,
  stickAlternativesPlaylistName,
  stickPlaylistName,
} from "@/lib/stick-names";
import { updateOneLibrary, type OneLibraryPlaylist } from "@/lib/onelibrary-write";

export { BACKUP_DIR, SIDECAR_DIR };
export const BACKUP_KEEP = 3;
export const LIBRARY_ASIDE_RE = /^exportLibrary-aside-\d{8}-\d{6}\.db$/;

type Writable = {
  write(data: ArrayBuffer | Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
};

export type FileBlobLike = {
  arrayBuffer(): Promise<ArrayBuffer>;
  size: number;
  lastModified?: number;
  stream?: () => ReadableStream<Uint8Array>;
  slice?: (start: number, end?: number) => { arrayBuffer(): Promise<ArrayBuffer> };
};

export type FileLike = {
  name: string;
  getFile(): Promise<FileBlobLike>;
  createWritable(): Promise<Writable>;
};

/** Progress while setting OneLibrary aside (old sticks can be hundreds of MB). */
export type StickPrepareProgress = {
  stage: "locate" | "copy" | "verify" | "remove" | "done";
  bytesDone?: number;
  bytesTotal?: number;
};

export type StickPrepareReporter = (progress: StickPrepareProgress) => void;

const COPY_CHUNK = 4 * 1024 * 1024;
/** USB + an open rekordbox handle can stall forever; fail instead of leaving Preparing stuck. */
const PREPARE_STEP_MS = 45_000;
const LIBRARY_SIDECARS = ["exportLibrary.db-wal", "exportLibrary.db-shm"] as const;

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Stream-copy a file without loading the whole thing into RAM (old OneLibrary can be huge). */
async function copyFileStreaming(
  source: FileLike,
  dest: FileLike,
  onBytes?: (done: number, total: number) => void,
): Promise<number> {
  const blob = await source.getFile();
  const total = blob.size;
  const writable = await dest.createWritable();
  try {
    if (typeof blob.stream === "function") {
      const reader = blob.stream().getReader();
      let done = 0;
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        await writable.write(chunk.value);
        done += chunk.value.byteLength;
        onBytes?.(done, total);
        await yieldToUi();
      }
    } else if (typeof blob.slice === "function" && total > COPY_CHUNK) {
      for (let offset = 0; offset < total; offset += COPY_CHUNK) {
        const end = Math.min(offset + COPY_CHUNK, total);
        const part = await blob.slice(offset, end).arrayBuffer();
        await writable.write(new Uint8Array(part));
        onBytes?.(end, total);
        await yieldToUi();
      }
    } else {
      const data = await blob.arrayBuffer();
      await writable.write(new Uint8Array(data));
      onBytes?.(total, total);
    }
    await writable.close();
  } catch (error) {
    await writable.abort?.().catch(() => undefined);
    throw error;
  }
  return total;
}

export type DirLike = {
  name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirLike>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileLike>;
  /** Names of the entries, to find backups. */
  keys?(): AsyncIterable<string>;
  removeEntry?(name: string): Promise<void>;
};

export type StickLocation = {
  /** The folder that holds export.pdb. */
  dir: DirLike;
  file: FileLike;
  /** Newer players read exportLibrary.db instead of export.pdb. */
  hasLibraryDb: boolean;
};

function stickError(
  key: MessageKey,
  german: string,
  vars?: Record<string, string | number>,
) {
  return new PdbWriteError(key, vars, german);
}

function withTimeout<T>(promise: Promise<T>, ms: number, key: MessageKey, german: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timer !== undefined) clearTimeout(timer);
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(stickError(key, german)), ms);
    }),
  ]);
}

async function child(dir: DirLike, name: string): Promise<DirLike | null> {
  try {
    return await dir.getDirectoryHandle(name);
  } catch {
    return null;
  }
}

async function file(dir: DirLike, name: string): Promise<FileLike | null> {
  try {
    return await dir.getFileHandle(name);
  } catch {
    return null;
  }
}

/** Finds PIONEER/rekordbox/export.pdb below the folder the user picked (or the folder itself). */
export async function findStickDatabase(root: DirLike): Promise<StickLocation> {
  const candidates: DirLike[] = [];
  for (const pioneer of ["PIONEER", ".PIONEER", "Pioneer", "pioneer"]) {
    const dir = await child(root, pioneer);
    const rekordbox = dir ? await child(dir, "rekordbox") : null;
    if (rekordbox) candidates.push(rekordbox);
  }
  const direct = await child(root, "rekordbox");
  if (direct) candidates.push(direct);
  candidates.push(root);

  for (const dir of candidates) {
    const db = await file(dir, "export.pdb");
    if (!db) continue;
    const hasLibraryDb = Boolean(await file(dir, "exportLibrary.db"));
    return { dir, file: db, hasLibraryDb };
  }
  throw stickError(
    "exports.stickWrite.notFound",
    "Auf diesem Laufwerk wurde keine PIONEER/rekordbox/export.pdb gefunden. Den ganzen Stick wählen.",
  );
}

// ---------------------------------------------------------------------------------------------
// Which tracks of the set are on the stick

type Wanted = Pick<SetTrack, "name" | "artists" | "filePath"> & {
  role?: TrackRole;
  /** Accepted near-match from the write dialog. */
  stickId?: number;
};

function splitForStick(tracks: Wanted[]) {
  const alternatives = tracks.filter((track) => track.role === "safety");
  const performance = alternatives.length
    ? tracks.filter((track) => track.role !== "safety")
    : tracks;
  return { performance, alternatives };
}

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pathKey(path: string): string {
  return path.replaceAll("\\", "/").toLowerCase();
}

/** File name only. Stick rows live under /Contents/…; a set track may still say /Collection/…/file. */
function fileBase(path: string): string {
  const slash = path.replaceAll("\\", "/").replace(/^\/+/, "").normalize("NFC").toLowerCase();
  return slash.split("/").pop() ?? "";
}

function usableFileBase(base: string): boolean {
  const dot = base.lastIndexOf(".");
  return dot > 0 && base.length >= 8;
}

function uniqueId(ids: Iterable<number>): number | null {
  let found: number | null = null;
  const seen = new Set<number>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (seen.size > 1) return null;
    found = id;
  }
  return found;
}

/** Several database rows for one path are the same file. Different paths stay ambiguous. */
function sameFileId(ids: Iterable<number>, pathOf: Map<number, string>): number | null {
  const unique = [...new Set(ids)];
  if (unique.length === 1) return unique[0] ?? null;
  if (unique.length < 2) return null;
  const paths = new Set(unique.map((id) => pathKey(pathOf.get(id) ?? "")));
  if (paths.size !== 1 || paths.has("")) return null;
  return Math.min(...unique);
}

export type StickMatch<T extends Wanted = Wanted> = {
  trackIds: number[];
  matched: T[];
  missing: T[];
};

/**
 * Maps set tracks to track ids on this stick.
 * Path first (exact, then the same looseness as analysis files: slash, case,
 * leading slash, PIONEER prefix). A unique file name still counts when the
 * folders differ. Title and artist are only used when that is still one row.
 */
export function matchSetToStick<T extends Wanted>(tracks: T[], library: PdbLibrary): StickMatch<T> {
  const byPath = new Map<string, number[]>();
  const byBase = new Map<string, number[]>();
  const byName = new Map<string, number[]>();
  const stickPaths: { id: number; filePath: string }[] = [];
  for (const stick of library.tracks) {
    if (stick.filePath) {
      const key = pathKey(stick.filePath);
      const pathIds = byPath.get(key);
      if (pathIds) pathIds.push(stick.id);
      else byPath.set(key, [stick.id]);
      const base = fileBase(stick.filePath);
      if (usableFileBase(base)) {
        const baseIds = byBase.get(base);
        if (baseIds) baseIds.push(stick.id);
        else byBase.set(base, [stick.id]);
      }
      stickPaths.push({ id: stick.id, filePath: stick.filePath });
    }
    const nameKey = `${fold(stick.title)}|${fold(stick.artist)}`;
    const nameIds = byName.get(nameKey);
    if (nameIds) nameIds.push(stick.id);
    else byName.set(nameKey, [stick.id]);
  }

  const known = new Set(library.tracks.map((item) => item.id));
  const pathOf = new Map(library.tracks.map((item) => [item.id, item.filePath]));
  const result: StickMatch<T> = { trackIds: [], matched: [], missing: [] };
  for (const track of tracks) {
    if (track.stickId && known.has(track.stickId)) {
      result.trackIds.push(track.stickId);
      result.matched.push(track);
      continue;
    }
    const filePath = track.filePath;
    // Same path under several row ids is still the one file the set already uses.
    let id = filePath ? sameFileId(byPath.get(pathKey(filePath)) ?? [], pathOf) : null;
    if (id == null && filePath) {
      id = sameFileId(
        stickPaths
          .filter((stick) => anlzPathsMatch(filePath, stick.filePath))
          .map((stick) => stick.id),
        pathOf,
      );
    }
    if (id == null && filePath) {
      const base = fileBase(filePath);
      if (usableFileBase(base)) id = uniqueId(byBase.get(base) ?? []);
    }
    if (id == null) {
      const artists = track.artists.filter((name) => name && name !== "Unknown");
      const keys = artists.length
        ? artists.map((artist) => `${fold(track.name)}|${fold(artist)}`)
        : [`${fold(track.name)}|`];
      const found = new Set<number>();
      for (const key of keys) for (const nameId of byName.get(key) ?? []) found.add(nameId);
      id = sameFileId(found, pathOf);
    }
    if (id == null) result.missing.push(track);
    else {
      result.trackIds.push(id);
      result.matched.push(track);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// Preview and write

export type StickPlan = {
  location: StickLocation;
  library: PdbLibrary;
  /** Performance tracks only. The found / missing warning is about the set. */
  match: StickMatch;
  performanceCount: number;
  alternativesCount: number;
  /** Alternatives that are not on the stick. They are not missing set tracks. */
  alternativesMissing: number;
  /** Name the playlist will get (a number is added when it exists). */
  playlistName: string;
  /** Alternatives playlist, when the set has Plan B tracks that are on the stick. */
  alternativesName: string | null;
  /** Performance playlist is already there; only alternatives still need writing. */
  skippedPerformance: boolean;
  /** Both playlists are already on the stick. */
  alreadyOnStick: boolean;
  /** Missing tracks that look like a title on this stick. */
  suggestions: StickSuggestion[];
  /** Set when the database cannot take the playlist; nothing is written then. */
  refusal: PdbWriteError | null;
  hasLibraryDb: boolean;
  newPages: number;
};

export { stickAlternativesPlaylistName, stickPlaylistName };

async function readBytes(handle: FileLike): Promise<ArrayBuffer> {
  const buffer = await (await handle.getFile()).arrayBuffer();
  return buffer.slice(0);
}

function sameBytes(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}

type StagedWrite = {
  perfMatch: StickMatch;
  altMatch: StickMatch;
  match: StickMatch;
  playlistName: string;
  alternativesName: string | null;
  writePerf: boolean;
  writeAlt: boolean;
  skippedPerformance: boolean;
  alreadyOnStick: boolean;
  result: AddPlaylistResult | null;
  altResult: AddPlaylistResult | null;
  final: ArrayBuffer;
  newPages: number;
  refusal: PdbWriteError | null;
};

/** Builds both playlists in memory. Writes nothing. Skips a name that is already there. */
function stageStickWrite(
  original: ArrayBuffer,
  library: PdbLibrary,
  tracks: Wanted[],
  title: string,
  alternativesLabel: string,
): StagedWrite {
  const { performance, alternatives } = splitForStick(tracks);
  const perfMatch = matchSetToStick(performance, library);
  const altMatch = matchSetToStick(alternatives, library);
  const match: StickMatch = {
    trackIds: [...perfMatch.trackIds, ...altMatch.trackIds],
    matched: [...perfMatch.matched, ...altMatch.matched],
    missing: [...perfMatch.missing, ...altMatch.missing],
  };
  const wanted = stickPlaylistName(title);
  const altWanted = stickAlternativesPlaylistName(title, alternativesLabel);
  const havePerfName = existingStickPlaylistName(library.playlists, title);
  const havePerf = Boolean(havePerfName);
  const haveAltName = existingAlternativesPlaylistName(library.playlists, title);
  const haveAlt = Boolean(haveAltName);
  const writePerf = perfMatch.trackIds.length > 0 && !havePerf;
  const writeAlt = altMatch.trackIds.length > 0 && !haveAlt;

  const empty: StagedWrite = {
    perfMatch,
    altMatch,
    match,
    playlistName: wanted,
    alternativesName: altMatch.trackIds.length ? haveAltName ?? null : null,
    writePerf,
    writeAlt,
    skippedPerformance: havePerf && perfMatch.trackIds.length > 0,
    alreadyOnStick: !writePerf && !writeAlt && (havePerf || haveAlt),
    result: null,
    altResult: null,
    final: original,
    newPages: 0,
    refusal: null,
  };

  if (!writePerf && !writeAlt) return empty;

  try {
    let current = original;
    let result: AddPlaylistResult | null = null;
    let altResult: AddPlaylistResult | null = null;
    let newPages = 0;
    if (writePerf) {
      result = addPlaylistToPdb(current, { name: wanted, trackIds: perfMatch.trackIds });
      current = result.buffer;
      newPages += result.allocated.length;
    }
    if (writeAlt) {
      altResult = addPlaylistToPdb(current, {
        name: altWanted,
        trackIds: altMatch.trackIds,
      });
      current = altResult.buffer;
      newPages += altResult.allocated.length;
    }
    return {
      ...empty,
      playlistName: result?.name ?? wanted,
      alternativesName: altResult?.name ?? empty.alternativesName,
      result,
      altResult,
      final: current,
      newPages,
    };
  } catch (error) {
    if (!(error instanceof PdbWriteError)) throw error;
    return { ...empty, refusal: error };
  }
}

/** Reads the stick and does the whole job in memory. Writes nothing. */
export async function planStickWrite(
  root: DirLike,
  tracks: Wanted[],
  title: string,
  alternativesLabel = "Alternativen",
): Promise<StickPlan> {
  const location = await findStickDatabase(root);
  const original = await readBytes(location.file);
  const library = parseRekordboxPdb(original.slice(0));
  const staged = stageStickWrite(original, library, tracks, title, alternativesLabel);
  return {
    location,
    library,
    match: staged.perfMatch,
    performanceCount: staged.perfMatch.trackIds.length,
    alternativesCount: staged.altMatch.trackIds.length,
    alternativesMissing: staged.altMatch.missing.length,
    playlistName: staged.playlistName,
    alternativesName: staged.alternativesName,
    skippedPerformance: staged.skippedPerformance,
    alreadyOnStick: staged.alreadyOnStick,
    suggestions: suggestStickMatches(staged.perfMatch.missing, library),
    refusal: staged.refusal,
    hasLibraryDb: location.hasLibraryDb,
    newPages: staged.newPages,
  };
}

function stamp(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(
    date.getMinutes(),
  )}${p(date.getSeconds())}`;
}

async function replaceFile(handle: FileLike, data: ArrayBuffer | Uint8Array) {
  const writable = await handle.createWritable();
  try {
    await writable.write(data);
    await writable.close();
  } catch (error) {
    await writable.abort?.().catch(() => undefined);
    throw error;
  }
}

export type StickLibraryResult = "written" | "untouched" | "missing";

export type StickWriteDone = {
  playlistName: string;
  alternativesName: string | null;
  /** Tracks in the set playlist the user is looking at (performance order). */
  trackCount: number;
  /** Tracks in the alternatives playlist. Not part of trackCount. */
  alternativesCount: number;
  backupName: string;
  newPages: number;
  /** Which player library the write reached. */
  library: StickLibraryResult;
  libraryTrackCount: number;
  libraryBackupName: string | null;
};

function playlistTrackCount(library: PdbLibrary, name: string | null): number {
  if (!name) return 0;
  const found = library.playlists.find((item) => item.kind === "playlist" && item.name === name);
  return found?.trackIds.length ?? 0;
}

function bytesToBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function pathsForIds(library: PdbLibrary, ids: number[]): string[] {
  const byId = new Map(library.tracks.map((track) => [track.id, track.filePath]));
  return ids.map((id) => byId.get(id) ?? "");
}

const LIBRARY_BACKUP_RE = /^exportLibrary-\d{8}-\d{6}\.db$/;

async function pruneLibraryBackups(root: DirLike): Promise<void> {
  const dir = await resolveBackupDir(root);
  if (!dir?.keys || !dir.removeEntry) return;
  const names: string[] = [];
  for await (const name of dir.keys()) if (LIBRARY_BACKUP_RE.test(name)) names.push(name);
  names.sort();
  const drop = names.slice(0, Math.max(0, names.length - BACKUP_KEEP));
  for (const name of drop) await dir.removeEntry(name);
}

/** Writes the same playlists into exportLibrary.db, or leaves that file untouched. */
async function commitPlayerLibrary(
  root: DirLike,
  dir: DirLike,
  library: PdbLibrary,
  lists: { name: string; ids: number[] }[],
  now: Date,
): Promise<Pick<StickWriteDone, "library" | "libraryTrackCount" | "libraryBackupName">> {
  const missing = { library: "missing" as const, libraryTrackCount: 0, libraryBackupName: null };
  const untouched = { library: "untouched" as const, libraryTrackCount: 0, libraryBackupName: null };
  const handle = await file(dir, "exportLibrary.db");
  if (!handle) return missing;
  // A non-empty WAL still holds pages. An empty WAL is a leftover and does not block the write.
  const wal = await file(dir, LIBRARY_SIDECARS[0]);
  if (wal && (await wal.getFile()).size > 0) return untouched;

  const playlists: OneLibraryPlaylist[] = lists.map((list) => ({
    name: list.name,
    paths: pathsForIds(library, list.ids),
  }));
  const original = await readBytes(handle);
  const planned = await updateOneLibrary(new Uint8Array(original), playlists, now);
  if (planned.status !== "written") return untouched;

  const backupDir = await root.getDirectoryHandle(BACKUP_DIR, { create: true });
  const backupName = `exportLibrary-${stamp(now)}.db`;
  const backup = await backupDir.getFileHandle(backupName, { create: true });
  try {
    await replaceFile(backup, original);
    if (!sameBytes(await readBytes(backup), original)) return untouched;
  } catch {
    return untouched;
  }

  const next = bytesToBuffer(planned.bytes);
  try {
    await replaceFile(handle, planned.bytes);
    const written = await readBytes(handle);
    if (!sameBytes(written, next)) throw new Error("readback");
  } catch (error) {
    try {
      await restoreOriginal(handle, original);
    } catch {
      throw stickError(
        "exports.stickWrite.restoreFailed",
        "Die Player-Bibliothek konnte nach dem Schreiben nicht zurückgesetzt werden. export.pdb enthält die Playlist. Die Sicherung liegt in SETBUILDER-Backup.",
      );
    }
    if (!sameBytes(await readBytes(handle), original)) {
      throw error;
    }
    return untouched;
  }
  await pruneLibraryBackups(root).catch(() => undefined);
  return { library: "written", libraryTrackCount: planned.trackCount, libraryBackupName: backupName };
}

export async function writeSetToStick(
  root: DirLike,
  tracks: Wanted[],
  title: string,
  now: Date = new Date(),
  alternativesLabel = "Alternativen",
): Promise<StickWriteDone> {
  const location = await findStickDatabase(root);
  const original = await readBytes(location.file);
  const library = parseRekordboxPdb(original.slice(0));
  const staged = stageStickWrite(original, library, tracks, title, alternativesLabel);
  if (!staged.match.trackIds.length) {
    throw stickError(
      "exports.stickWrite.noneOnStick",
      "Keiner der Titel liegt auf diesem Stick. Es wurde nichts verändert.",
    );
  }
  if (staged.alreadyOnStick || (!staged.writePerf && !staged.writeAlt)) {
    throw stickError(
      "exports.stickWrite.alreadyThere",
      "Das Set liegt schon auf diesem Stick. Es wurde nichts verändert.",
    );
  }
  if (staged.refusal) throw staged.refusal;

  // 1. Everything is computed and checked before the first byte is written.
  const { result, altResult, final, perfMatch, altMatch } = staged;

  // 2. A copy of the original, checked by reading it back.
  const backupDir = await root.getDirectoryHandle(BACKUP_DIR, { create: true });
  const backupName = `export-${stamp(now)}.pdb`;
  const backup = await backupDir.getFileHandle(backupName, { create: true });
  await replaceFile(backup, original);
  if (!sameBytes(await readBytes(backup), original)) {
    throw stickError(
      "exports.stickWrite.backupFailed",
      "Die Sicherung konnte nicht geschrieben werden. Es wurde nichts verändert.",
    );
  }

  // 3. Replace the database. The browser swaps the file in one step on close.
  try {
    await replaceFile(location.file, final);
  } catch (error) {
    // The swap did not happen, or the stick failed halfway: make sure the original is back.
    await restoreOriginal(location.file, original);
    throw error;
  }

  // 4. Read it back from the stick and check it once more.
  try {
    const written = await readBytes(location.file);
    if (!sameBytes(written, final)) throw stickError("exports.stickWrite.readBack", "Die geschriebene Datei weicht ab.");
    if (altResult) {
      verifyPdbUpdate(result?.buffer ?? original, written, {
        playlistId: altResult.playlistId,
        name: altResult.name,
        trackIds: altMatch.trackIds,
        changedPages: altResult.changedPages,
        allocated: altResult.allocated,
      });
    } else if (result) {
      verifyPdbUpdate(original, written, {
        playlistId: result.playlistId,
        name: result.name,
        trackIds: perfMatch.trackIds,
        changedPages: result.changedPages,
        allocated: result.allocated,
      });
    }
  } catch (error) {
    // 5. Not what we meant to write: put the original back.
    await restoreOriginal(location.file, original);
    throw stickError(
      "exports.stickWrite.rolledBack",
      "Die Stick-Datenbank wurde nach dem Schreiben nicht bestanden. Der vorherige Stand ist wiederhergestellt.",
      { detail: error instanceof Error ? error.message : "" },
    );
  }

  await pruneBackups(root, BACKUP_KEEP);

  const libraryState = await commitPlayerLibrary(
    root,
    location.dir,
    library,
    [
      ...(result ? [{ name: result.name, ids: perfMatch.trackIds }] : []),
      ...(altResult ? [{ name: altResult.name, ids: altMatch.trackIds }] : []),
    ],
    now,
  );

  const playlistName = result?.name ?? staged.playlistName;
  const alternativesName = altResult?.name ?? staged.alternativesName;
  const already = playlistTrackCount(library, playlistName);
  return {
    playlistName,
    alternativesName,
    // The set playlist receives only the performance tracks. Alternatives are a second playlist.
    trackCount: result ? perfMatch.trackIds.length : already || perfMatch.trackIds.length,
    alternativesCount: altResult
      ? altMatch.trackIds.length
      : playlistTrackCount(library, alternativesName),
    backupName,
    newPages: staged.newPages,
    ...libraryState,
  };
}

/** Transactionally replaces one existing playlist against the current database bytes. */
export async function rewriteSetToStick(
  root: DirLike,
  tracks: Wanted[],
  title: string,
  now: Date = new Date(),
): Promise<StickWriteDone> {
  const location = await findStickDatabase(root);
  const original = await readBytes(location.file);
  const library = parseRekordboxPdb(original.slice(0));
  const existingName = existingStickPlaylistName(library.playlists, title);
  const candidates = library.playlists.filter(
    (item) => item.kind === "playlist" && item.name === existingName,
  );
  if (!existingName || candidates.length !== 1) {
    throw stickError(
      "exports.stickWrite.alreadyThere",
      "Die bestehende Playlist konnte nicht eindeutig gefunden werden. Es wurde nichts verändert.",
    );
  }
  const { performance } = splitForStick(tracks);
  const match = matchSetToStick(performance, library);
  if (!match.trackIds.length) {
    throw stickError(
      "exports.stickWrite.noneOnStick",
      "Keiner der Titel liegt auf diesem Stick. Es wurde nichts verändert.",
    );
  }

  // Build and fully validate against the current bytes before any database write.
  const playlist = candidates[0];
  const result = replacePlaylistInPdb(original, {
    playlistId: playlist.id,
    trackIds: match.trackIds,
  });
  verifyPdbReplacement(original, result.buffer, {
    playlistId: playlist.id,
    name: playlist.name,
    trackIds: match.trackIds,
  });

  // Keep an immediate, byte-verified backup of exactly the current database.
  const backupDir = await root.getDirectoryHandle(BACKUP_DIR, { create: true });
  const backupName = `export-${stamp(now)}.pdb`;
  const backup = await backupDir.getFileHandle(backupName, { create: true });
  await replaceFile(backup, original);
  if (!sameBytes(await readBytes(backup), original)) {
    throw stickError(
      "exports.stickWrite.backupFailed",
      "Die Sicherung konnte nicht geschrieben werden. Es wurde nichts verändert.",
    );
  }

  try {
    // One commit to export.pdb, followed by exact and semantic read-back verification.
    await replaceFile(location.file, result.buffer);
    const written = await readBytes(location.file);
    if (!sameBytes(written, result.buffer)) {
      throw stickError("exports.stickWrite.readBack", "Die geschriebene Datei weicht ab.");
    }
    verifyPdbReplacement(original, written, {
      playlistId: playlist.id,
      name: playlist.name,
      trackIds: match.trackIds,
    });
  } catch (error) {
    await restoreOriginal(location.file, original);
    throw stickError(
      "exports.stickWrite.rolledBack",
      "Die Stick-Datenbank wurde nach dem Schreiben nicht bestanden. Der vorherige Stand ist wiederhergestellt.",
      { detail: error instanceof Error ? error.message : "" },
    );
  }

  await pruneBackups(root, BACKUP_KEEP);
  const libraryState = await commitPlayerLibrary(
    root,
    location.dir,
    library,
    [{ name: playlist.name, ids: match.trackIds }],
    now,
  );
  const alternativesName = existingAlternativesPlaylistName(library.playlists, title);
  return {
    playlistName: playlist.name,
    alternativesName,
    trackCount: match.trackIds.length,
    alternativesCount: playlistTrackCount(library, alternativesName),
    backupName,
    newPages: result.allocated.length,
    ...libraryState,
  };
}

async function writeTextFile(dir: DirLike, name: string, text: string) {
  const handle = await dir.getFileHandle(name, { create: true });
  await replaceFile(handle, new TextEncoder().encode(text));
}

/** Prefer SETBUILDER-Backup; fall back to legacy SETFORM-Backup for reads. */
async function resolveBackupDir(root: DirLike): Promise<DirLike | null> {
  return (await child(root, BACKUP_DIR)) ?? (await child(root, BACKUP_DIR_LEGACY));
}

/** XML and M3U next to the database, for players that ignore export.pdb. */
export async function writeStickSidecars(
  root: DirLike,
  draft: SetDraft,
  t: Translate = tDe,
): Promise<string[]> {
  const dir = await root.getDirectoryHandle(SIDECAR_DIR, { create: true });
  const slug = (draft.title || "setbuilder")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "setbuilder";
  const written = [REKORDBOX_XML_NAME, `${slug}.m3u`];
  await writeTextFile(dir, REKORDBOX_XML_NAME, buildRekordboxXml(draft, t));
  await writeTextFile(dir, `${slug}.m3u`, buildM3u(draft, t));
  if (draft.tracks.some((track) => track.role === "safety")) {
    const altName = `${slug}-alternatives.m3u`;
    await writeTextFile(dir, altName, buildM3uAlternatives(draft, t));
    written.push(altName);
  }
  return written;
}

/** Keeps the newest backups, deletes the rest. */
export async function pruneBackups(root: DirLike, keep = BACKUP_KEEP): Promise<string[]> {
  const dir = await resolveBackupDir(root);
  if (!dir?.keys || !dir.removeEntry) return [];
  const names: string[] = [];
  for await (const name of dir.keys()) if (/^export-\d{8}-\d{6}\.pdb$/.test(name)) names.push(name);
  names.sort();
  const drop = names.slice(0, Math.max(0, names.length - keep));
  for (const name of drop) await dir.removeEntry(name);
  return drop;
}

async function restoreOriginal(handle: FileLike, original: ArrayBuffer) {
  const current = await readBytes(handle).catch(() => null);
  if (current && sameBytes(current, original)) return;
  await replaceFile(handle, original);
  if (!sameBytes(await readBytes(handle), original)) {
    throw stickError(
      "exports.stickWrite.restoreFailed",
      "Die Stick-Datenbank konnte nicht zurückgesetzt werden. Bitte den Stick in rekordbox neu exportieren oder die Sicherung in SETBUILDER-Backup kopieren.",
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Restore

export async function latestBackupName(root: DirLike): Promise<string | null> {
  const dir = await resolveBackupDir(root);
  if (!dir?.keys) return null;
  const names: string[] = [];
  for await (const name of dir.keys()) if (/^export-\d{8}-\d{6}\.pdb$/.test(name)) names.push(name);
  names.sort();
  return names.length ? names[names.length - 1] : null;
}

/** Puts the newest backup back as export.pdb, after checking it is a readable database. */
export async function restoreLatestBackup(root: DirLike): Promise<string> {
  const location = await findStickDatabase(root);
  const name = await latestBackupName(root);
  const dir = await resolveBackupDir(root);
  if (!name || !dir) {
    throw stickError(
      "exports.stickWrite.noBackup",
      "Auf diesem Stick gibt es noch keine SETBUILDER-Sicherung.",
    );
  }
  const backup = await readBytes(await dir.getFileHandle(name));
  parseRekordboxPdb(backup.slice(0));
  const current = await readBytes(location.file);
  await replaceFile(location.file, backup);
  if (!sameBytes(await readBytes(location.file), backup)) {
    // Put back what was there before this attempt.
    await replaceFile(location.file, current);
    throw stickError(
      "exports.stickWrite.restoreFailed",
      "Die Stick-Datenbank konnte nicht zurückgesetzt werden. Bitte den Stick in rekordbox neu exportieren oder die Sicherung in SETBUILDER-Backup kopieren.",
    );
  }
  return name;
}

export async function listLibraryAsides(root: DirLike): Promise<string[]> {
  const dir = await resolveBackupDir(root);
  if (!dir?.keys) return [];
  const names: string[] = [];
  for await (const name of dir.keys()) if (LIBRARY_ASIDE_RE.test(name)) names.push(name);
  names.sort();
  return names;
}

async function latestLibraryAside(root: DirLike): Promise<string | null> {
  const names = await listLibraryAsides(root);
  return names.at(-1) ?? null;
}

/** Drops WAL leftovers only after the live player library is confirmed back. */
async function clearLibrarySidecars(dir: DirLike): Promise<void> {
  if (!dir.removeEntry) return;
  for (const name of LIBRARY_SIDECARS) {
    try {
      await withTimeout(
        dir.removeEntry(name),
        5_000,
        "exports.stickWrite.libraryBusy",
        "rekordbox hält die Player-Library noch offen. rekordbox schließen und erneut vorbereiten.",
      );
    } catch {
      /* wal/shm may stay locked; the main db is what players prefer */
    }
  }
}

/**
 * Leaves the player library on the stick. When the live file is missing and a
 * backup remains, that backup is copied back. Nothing is deleted.
 */
export async function prepareStickForPlayers(
  root: DirLike,
  now = new Date(),
  report?: StickPrepareReporter,
): Promise<{
  aside: boolean;
  backupName: string | null;
  restored: boolean;
}> {
  void now;
  report?.({ stage: "locate" });
  const location = await withTimeout(
    findStickDatabase(root),
    PREPARE_STEP_MS,
    "exports.stickWrite.prepareTimeout",
    "Die Player-Library wurde zu lange nicht gefunden. Stick stecken lassen, rekordbox schließen, erneut versuchen.",
  );
  const lib = await file(location.dir, "exportLibrary.db");
  if (lib) {
    report?.({ stage: "done" });
    return { aside: false, backupName: null, restored: false };
  }
  const existing = await latestLibraryAside(root);
  if (!existing) {
    report?.({ stage: "done" });
    return { aside: false, backupName: null, restored: false };
  }
  const backupName = await restorePlayerLibrary(root, report);
  if (!(await file(location.dir, "exportLibrary.db"))) {
    throw stickError(
      "exports.stickWrite.restoreFailed",
      "Die Player-Bibliothek konnte nicht aus der Sicherung zurückgelegt werden. Es wurde nichts gelöscht.",
    );
  }
  await clearLibrarySidecars(location.dir);
  report?.({ stage: "done" });
  return { aside: false, backupName, restored: true };
}

/** Puts the newest set-aside OneLibrary back as exportLibrary.db. */
export async function restorePlayerLibrary(
  root: DirLike,
  report?: StickPrepareReporter,
): Promise<string> {
  report?.({ stage: "locate" });
  const location = await findStickDatabase(root);
  const names = await listLibraryAsides(root);
  const dir = await resolveBackupDir(root);
  const name = names.at(-1);
  if (!name || !dir) {
    throw stickError(
      "exports.stickWrite.noAside",
      "Auf diesem Stick liegt keine beiseitegelegte Player-Library.",
    );
  }
  const source = await dir.getFileHandle(name);
  const sourceMeta = await source.getFile();
  const handle = await location.dir.getFileHandle("exportLibrary.db", { create: true });
  report?.({ stage: "copy", bytesDone: 0, bytesTotal: sourceMeta.size });
  const copied = await copyFileStreaming(source, handle, (bytesDone, bytesTotal) => {
    report?.({ stage: "copy", bytesDone, bytesTotal });
  });
  report?.({ stage: "verify", bytesDone: copied, bytesTotal: copied });
  const written = await handle.getFile();
  if (written.size !== copied || written.size !== sourceMeta.size) {
    throw stickError(
      "exports.stickWrite.restoreFailed",
      "Die Stick-Datenbank konnte nicht zurückgesetzt werden. Bitte den Stick in rekordbox neu exportieren oder die Datei aus SETBUILDER-Backup zurückkopieren.",
    );
  }
  report?.({ stage: "done" });
  return name;
}
