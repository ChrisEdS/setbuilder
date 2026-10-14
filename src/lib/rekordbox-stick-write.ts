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
 *
 * The rekordbox library on the computer (master.db) is never touched.
 */

import type { MessageKey } from "@/lib/i18n/core";
import { parseRekordboxPdb, type PdbLibrary } from "@/lib/rekordbox-pdb";
import {
  addPlaylistToPdb,
  PdbWriteError,
  verifyPdbUpdate,
  type AddPlaylistResult,
} from "@/lib/rekordbox-pdb-write";
import { buildM3u, buildM3uAlternatives, buildRekordboxXml } from "@/lib/export-booth";
import type { Translate } from "@/lib/i18n/core";
import { tDe } from "@/lib/i18n/core";
import type { SetDraft, SetTrack, TrackRole } from "@/lib/set";
import { suggestStickMatches, type StickSuggestion } from "@/lib/stick-match";
import { BACKUP_DIR, BACKUP_DIR_LEGACY, REKORDBOX_XML_NAME, SIDECAR_DIR } from "@/lib/brand";
import {
  existingAlternativesPlaylistName,
  existingStickPlaylistName,
  stickAlternativesPlaylistName,
  stickPlaylistName,
} from "@/lib/stick-names";

export { BACKUP_DIR, SIDECAR_DIR };
export const BACKUP_KEEP = 3;
export const LIBRARY_ASIDE_RE = /^exportLibrary-aside-\d{8}-\d{6}\.db$/;

type Writable = {
  write(data: ArrayBuffer | Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
};

export type FileLike = {
  name: string;
  getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; size: number; lastModified?: number }>;
  createWritable(): Promise<Writable>;
};

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

export type StickMatch<T extends Wanted = Wanted> = {
  trackIds: number[];
  matched: T[];
  missing: T[];
};

/** Maps set tracks to track ids of this stick: by file path, else by unique title and artist. */
export function matchSetToStick<T extends Wanted>(tracks: T[], library: PdbLibrary): StickMatch<T> {
  const byPath = new Map<string, number[]>();
  const byName = new Map<string, number[]>();
  for (const stick of library.tracks) {
    if (stick.filePath) {
      const key = pathKey(stick.filePath);
      byPath.set(key, [...(byPath.get(key) ?? []), stick.id]);
    }
    const nameKey = `${fold(stick.title)}|${fold(stick.artist)}`;
    byName.set(nameKey, [...(byName.get(nameKey) ?? []), stick.id]);
  }

  const known = new Set(library.tracks.map((item) => item.id));
  const result: StickMatch<T> = { trackIds: [], matched: [], missing: [] };
  for (const track of tracks) {
    if (track.stickId && known.has(track.stickId)) {
      result.trackIds.push(track.stickId);
      result.matched.push(track);
      continue;
    }
    let ids = track.filePath ? byPath.get(pathKey(track.filePath)) : undefined;
    if (!ids || ids.length !== 1) {
      const artists = track.artists.filter((name) => name && name !== "Unknown");
      const keys = artists.length
        ? artists.map((artist) => `${fold(track.name)}|${fold(artist)}`)
        : [`${fold(track.name)}|`];
      const found = new Set<number>();
      for (const key of keys) for (const id of byName.get(key) ?? []) found.add(id);
      ids = [...found];
    }
    if (ids.length === 1) {
      result.trackIds.push(ids[0]);
      result.matched.push(track);
    } else {
      result.missing.push(track);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// Preview and write

export type StickPlan = {
  location: StickLocation;
  library: PdbLibrary;
  /** Performance and alternatives together, for the “found / missing” list. */
  match: StickMatch;
  performanceCount: number;
  alternativesCount: number;
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

function playlistExists(library: PdbLibrary, name: string): boolean {
  return library.playlists.some((item) => item.name === name);
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
    match: staged.match,
    performanceCount: staged.perfMatch.trackIds.length,
    alternativesCount: staged.altMatch.trackIds.length,
    playlistName: staged.playlistName,
    alternativesName: staged.alternativesName,
    skippedPerformance: staged.skippedPerformance,
    alreadyOnStick: staged.alreadyOnStick,
    suggestions: suggestStickMatches(staged.match.missing, library),
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

export type StickWriteDone = {
  playlistName: string;
  alternativesName: string | null;
  trackCount: number;
  backupName: string;
  newPages: number;
};

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

  return {
    playlistName: result?.name ?? staged.playlistName,
    alternativesName: altResult?.name ?? staged.alternativesName,
    trackCount: perfMatch.trackIds.length + altMatch.trackIds.length,
    backupName,
    newPages: staged.newPages,
  };
}

/** Puts the last backup back, then writes the current set. That is how a set is updated. */
export async function rewriteSetToStick(
  root: DirLike,
  tracks: Wanted[],
  title: string,
  now: Date = new Date(),
  alternativesLabel = "Alternativen",
): Promise<StickWriteDone> {
  await restoreLatestBackup(root);
  return writeSetToStick(root, tracks, title, now, alternativesLabel);
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

/**
 * Newer players that prefer OneLibrary (exportLibrary.db) ignore SETBUILDER’s export.pdb.
 * We cannot write that encrypted file. Setting it aside (with a backup) makes
 * Device Library players — CDJ-3000, XDJ-XZ and older — read export.pdb instead.
 * CDJ-3000X, XDJ-AZ and OPUS-QUAD still need rekordbox.
 */
export async function prepareStickForPlayers(root: DirLike, now = new Date()): Promise<{
  aside: boolean;
  backupName: string | null;
}> {
  const location = await findStickDatabase(root);
  const lib = await file(location.dir, "exportLibrary.db");
  if (!lib) return { aside: false, backupName: null };
  if (!location.dir.removeEntry) {
    throw stickError(
      "exports.stickWrite.removeDenied",
      "Dieser Stick darf die Player-Library nicht beiseitelegen. Chrome, Edge oder die Desktop-App verwenden.",
    );
  }
  const original = await readBytes(lib);
  const backupDir = await root.getDirectoryHandle(BACKUP_DIR, { create: true });
  const backupName = `exportLibrary-aside-${stamp(now)}.db`;
  const backup = await backupDir.getFileHandle(backupName, { create: true });
  await replaceFile(backup, original);
  if (!sameBytes(await readBytes(backup), original)) {
    throw stickError(
      "exports.stickWrite.backupFailed",
      "Die Sicherung konnte nicht geschrieben werden. Es wurde nichts verändert.",
    );
  }
  await location.dir.removeEntry("exportLibrary.db");
  if (await file(location.dir, "exportLibrary.db")) {
    throw stickError(
      "exports.stickWrite.asideFailed",
      "exportLibrary.db konnte nicht beiseitegelegt werden. Die Sicherung liegt in SETBUILDER-Backup.",
    );
  }
  return { aside: true, backupName };
}

/** Puts the newest set-aside OneLibrary back as exportLibrary.db. */
export async function restorePlayerLibrary(root: DirLike): Promise<string> {
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
  const backup = await readBytes(await dir.getFileHandle(name));
  const handle = await location.dir.getFileHandle("exportLibrary.db", { create: true });
  await replaceFile(handle, backup);
  if (!sameBytes(await readBytes(handle), backup)) {
    throw stickError(
      "exports.stickWrite.restoreFailed",
      "Die Stick-Datenbank konnte nicht zurückgesetzt werden. Bitte den Stick in rekordbox neu exportieren oder die Datei aus SETBUILDER-Backup zurückkopieren.",
    );
  }
  return name;
}
