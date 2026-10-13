/**
 * Writes a set as a playlist into the database of a rekordbox stick, so the stick can go
 * straight into a player. Uses the browser's File System Access API (Chrome, Edge, the
 * desktop app), so it works on the real files without any server.
 *
 * Order of events, each step only starts when the one before succeeded:
 *   1. read export.pdb and work out the new file in memory (nothing is written yet)
 *   2. copy the original into SETFORM-Backup/ and read the copy back byte for byte
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
import type { SetTrack } from "@/lib/set";

export const BACKUP_DIR = "SETFORM-Backup";

type Writable = {
  write(data: ArrayBuffer | Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
};

export type FileLike = {
  name: string;
  getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; size: number }>;
  createWritable(): Promise<Writable>;
};

export type DirLike = {
  name: string;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirLike>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileLike>;
  /** Names of the entries, to find backups. */
  keys?(): AsyncIterable<string>;
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
  for (const pioneer of ["PIONEER", ".PIONEER", "Pioneer"]) {
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

type Wanted = Pick<SetTrack, "name" | "artists" | "filePath">;

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

  const result: StickMatch<T> = { trackIds: [], matched: [], missing: [] };
  for (const track of tracks) {
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
  match: StickMatch;
  /** Name the playlist will get (a number is added when it exists). */
  playlistName: string;
  /** Set when the database cannot take the playlist; nothing is written then. */
  refusal: PdbWriteError | null;
  hasLibraryDb: boolean;
  newPages: number;
};

export function stickPlaylistName(title: string): string {
  return `SETFORM - ${title.trim() || "Set"}`;
}

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

/** Reads the stick and does the whole job in memory. Writes nothing. */
export async function planStickWrite(
  root: DirLike,
  tracks: Wanted[],
  title: string,
): Promise<StickPlan> {
  const location = await findStickDatabase(root);
  const original = await readBytes(location.file);
  const library = parseRekordboxPdb(original.slice(0));
  const match = matchSetToStick(tracks, library);
  const playlistName = stickPlaylistName(title);

  let refusal: PdbWriteError | null = null;
  let newPages = 0;
  if (match.trackIds.length) {
    try {
      const trial = addPlaylistToPdb(original, { name: playlistName, trackIds: match.trackIds });
      newPages = trial.allocated.length;
      return {
        location,
        library,
        match,
        playlistName: trial.name,
        refusal,
        hasLibraryDb: location.hasLibraryDb,
        newPages,
      };
    } catch (error) {
      if (!(error instanceof PdbWriteError)) throw error;
      refusal = error;
    }
  }
  return {
    location,
    library,
    match,
    playlistName,
    refusal,
    hasLibraryDb: location.hasLibraryDb,
    newPages,
  };
}

function stamp(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(
    date.getMinutes(),
  )}${p(date.getSeconds())}`;
}

async function replaceFile(handle: FileLike, data: ArrayBuffer) {
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
  trackCount: number;
  backupName: string;
  newPages: number;
};

export async function writeSetToStick(
  root: DirLike,
  tracks: Wanted[],
  title: string,
  now: Date = new Date(),
): Promise<StickWriteDone> {
  const location = await findStickDatabase(root);
  const original = await readBytes(location.file);
  const library = parseRekordboxPdb(original.slice(0));
  const match = matchSetToStick(tracks, library);
  if (!match.trackIds.length) {
    throw stickError(
      "exports.stickWrite.noneOnStick",
      "Keiner der Titel liegt auf diesem Stick. Es wurde nichts verändert.",
    );
  }

  // 1. Everything is computed and checked before the first byte is written.
  const result: AddPlaylistResult = addPlaylistToPdb(original, {
    name: stickPlaylistName(title),
    trackIds: match.trackIds,
  });

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
    await replaceFile(location.file, result.buffer);
  } catch (error) {
    // The swap did not happen, or the stick failed halfway: make sure the original is back.
    await restoreOriginal(location.file, original);
    throw error;
  }

  // 4. Read it back from the stick and check it once more.
  try {
    const written = await readBytes(location.file);
    if (!sameBytes(written, result.buffer)) throw stickError("exports.stickWrite.readBack", "Die geschriebene Datei weicht ab.");
    verifyPdbUpdate(original, written, {
      playlistId: result.playlistId,
      name: result.name,
      trackIds: match.trackIds,
      changedPages: result.changedPages,
      allocated: result.allocated,
    });
  } catch (error) {
    // 5. Not what we meant to write: put the original back.
    await restoreOriginal(location.file, original);
    throw stickError(
      "exports.stickWrite.rolledBack",
      "Die Stick-Datenbank wurde nach dem Schreiben nicht bestanden. Der vorherige Stand ist wiederhergestellt.",
      { detail: error instanceof Error ? error.message : "" },
    );
  }

  return {
    playlistName: result.name,
    trackCount: match.trackIds.length,
    backupName,
    newPages: result.allocated.length,
  };
}

async function restoreOriginal(handle: FileLike, original: ArrayBuffer) {
  const current = await readBytes(handle).catch(() => null);
  if (current && sameBytes(current, original)) return;
  await replaceFile(handle, original);
  if (!sameBytes(await readBytes(handle), original)) {
    throw stickError(
      "exports.stickWrite.restoreFailed",
      "Die Stick-Datenbank konnte nicht zurückgesetzt werden. Bitte den Stick in rekordbox neu exportieren oder die Sicherung in SETFORM-Backup kopieren.",
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Restore

export async function latestBackupName(root: DirLike): Promise<string | null> {
  const dir = await child(root, BACKUP_DIR);
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
  const dir = await child(root, BACKUP_DIR);
  if (!name || !dir) {
    throw stickError(
      "exports.stickWrite.noBackup",
      "Auf diesem Stick gibt es noch keine SETFORM-Sicherung.",
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
      "Die Stick-Datenbank konnte nicht zurückgesetzt werden. Bitte den Stick in rekordbox neu exportieren oder die Sicherung in SETFORM-Backup kopieren.",
    );
  }
  return name;
}
