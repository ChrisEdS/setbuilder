/**
 * Resolve a set track's rekordbox filePath to a File (and optional writable handle)
 * on the remembered stick directory.
 */

import { id3PrefixLength } from "@/lib/openkey/decode-window";
import { artworkFromId3, energyLevelFromId3 } from "@/lib/openkey/writeEnergy";
import { hasKnownEnergy } from "@/lib/energy";
import type { EnergySource, SetDraft } from "@/lib/set";
import { lookupRememberedStickFile, rememberArtworkBlob } from "@/lib/stick-audio";
import type { DirLike, FileLike } from "@/lib/rekordbox-stick-write";
import {
  loadPersistedStickHandle,
  resolveStickFile,
  stickPermission,
  type PersistableDir,
} from "@/lib/stick-session";

export type StickTrackFile = {
  file: File;
  /** Present when resolved from the directory handle — needed to write ID3. */
  handle: FileLike | null;
  relativePath: string;
};

async function child(dir: DirLike, name: string): Promise<DirLike | null> {
  try {
    return await dir.getDirectoryHandle(name);
  } catch {
    return null;
  }
}

async function fileHandle(dir: DirLike, name: string): Promise<FileLike | null> {
  try {
    return await dir.getFileHandle(name);
  } catch {
    return null;
  }
}

async function asFile(handle: FileLike, relative: string): Promise<File | null> {
  const blob = await handle.getFile();
  if (typeof File === "undefined") return null;
  const file =
    blob instanceof File
      ? blob
      : new File([await blob.arrayBuffer()], relative.split("/").pop() || "file");
  try {
    Object.defineProperty(file, "webkitRelativePath", {
      value: relative,
      configurable: true,
    });
  } catch {
    /* ignore */
  }
  return file;
}

/** Path variants like resolveStickFile: full path, or stripped leading folder. */
function pathVariants(filePath: string): string[] {
  const trimmed = filePath.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!trimmed) return [];
  const variants = [trimmed];
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length > 1) variants.push(parts.slice(1).join("/"));
  return variants;
}

/** Resolve filePath → File + FileSystemFileHandle when the stick root is available. */
export async function resolveStickTrackFile(
  root: DirLike,
  filePath: string,
): Promise<StickTrackFile | null> {
  for (const variant of pathVariants(filePath)) {
    const segments = variant.split("/").filter(Boolean);
    let dir: DirLike | null = root;
    for (const segment of segments.slice(0, -1)) {
      dir = dir ? await child(dir, segment) : null;
      if (!dir) break;
    }
    const name = segments[segments.length - 1];
    const handle = dir && name ? await fileHandle(dir, name) : null;
    if (!handle) continue;
    const file = await asFile(handle, variant);
    if (file) return { file, handle, relativePath: variant };
  }
  return null;
}

/**
 * Resolve a track file for analysis (and write when possible).
 * Prefers the persisted stick directory handle; falls back to remembered Files
 * (analyze-only, no write handle).
 */
export async function resolveTrackAudio(
  filePath: string,
  root?: DirLike | null,
): Promise<StickTrackFile | null> {
  const stick =
    root ??
    (await loadPersistedStickHandle().catch(() => null));
  if (stick) {
    const fromHandle = await resolveStickTrackFile(stick, filePath);
    if (fromHandle) return fromHandle;
    // Read-only path walk without write handle (older resolveStickFile).
    const file = await resolveStickFile(stick, filePath);
    if (file) {
      return {
        file,
        handle: null,
        relativePath: filePath.replaceAll("\\", "/").replace(/^\/+/, ""),
      };
    }
  }
  const remembered = lookupRememberedStickFile(filePath);
  if (!remembered) return null;
  return {
    file: remembered,
    handle: null,
    relativePath: remembered.webkitRelativePath || remembered.name,
  };
}

/** MP3 / MPEG only — ID3 write is unsupported for other formats. */
export function isWritableMp3(file: File, filePath = ""): boolean {
  const name = (file.name || "").toLowerCase();
  const path = filePath.toLowerCase();
  if (
    name.endsWith(".mp3") ||
    name.endsWith(".mp2") ||
    path.endsWith(".mp3") ||
    path.endsWith(".mp2")
  ) {
    return true;
  }
  const type = (file.type || "").toLowerCase();
  return type === "audio/mpeg" || type === "audio/mp3" || type === "audio/mpeg3";
}

/** Prompt once for batch readwrite on the stick root. */
export async function ensureStickWriteAccess(
  handle?: PersistableDir | null,
): Promise<PersistableDir | null> {
  const root = handle ?? (await loadPersistedStickHandle().catch(() => null));
  if (!root) return null;
  if (!(await stickPermission(root, "readwrite", true))) return null;
  return root;
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

async function commitStickFileBytes(
  handle: FileLike,
  data: Uint8Array,
): Promise<void> {
  const writable = await handle.createWritable();
  try {
    // Copy into a fresh ArrayBuffer — some browsers reject SharedArrayBuffer views.
    const buffer = new Uint8Array(data.byteLength);
    buffer.set(data);
    await writable.write(buffer);
    await writable.close();
  } catch (error) {
    await writable.abort?.().catch(() => undefined);
    throw error;
  }
}

async function readHandleBytes(handle: FileLike): Promise<Uint8Array> {
  return new Uint8Array(await (await handle.getFile()).arrayBuffer());
}

/**
 * Replace a stick file, verify the exact bytes by reopening it, and restore the
 * captured original on every failed commit or mismatch.
 */
export async function writeVerifiedStickFileBytes(
  handle: FileLike,
  data: Uint8Array,
): Promise<void> {
  const original = (await readHandleBytes(handle)).slice();
  const expected = data.slice();
  try {
    await commitStickFileBytes(handle, expected);
    if (!sameBytes(await readHandleBytes(handle), expected)) {
      throw new Error("The written stick file did not match the expected bytes.");
    }
  } catch (error) {
    try {
      const current = await readHandleBytes(handle).catch(() => null);
      if (!current || !sameBytes(current, original)) {
        await commitStickFileBytes(handle, original);
        if (!sameBytes(await readHandleBytes(handle), original)) {
          throw new Error("The original stick file could not be restored.");
        }
      }
    } catch (restoreError) {
      throw new AggregateError(
        [error, restoreError],
        "The stick file write failed and rollback could not be verified.",
      );
    }
    throw error;
  }
}

export type EnergyReadProgress = (done: number, total: number) => void;

/** ID3 Energy Level from the front of an MP3. Does not decode audio. */
export async function energyTagFromFile(file: Blob): Promise<number | undefined> {
  const header = new Uint8Array(
    await file.slice(0, Math.min(file.size, 10)).arrayBuffer(),
  );
  const length = id3PrefixLength(header, file.size);
  const bytes = new Uint8Array(await file.slice(0, length).arrayBuffer());
  return energyLevelFromId3(bytes);
}

/**
 * Energy levels found in MP3 tags for tracks that do not have one yet.
 * An anonymous Energy 1 counts as missing. Keyed by track id. Callers merge
 * this into the latest draft so a slow read cannot replace edits made while
 * the files were open.
 */
export async function missingEnergyFromFiles(
  tracks: Array<{
    id: string;
    energyLevel?: number;
    energySource?: EnergySource;
    filePath?: string;
  }>,
  root?: DirLike | null,
  onProgress?: EnergyReadProgress,
): Promise<Map<string, number>> {
  const pending = tracks.filter(
    (track) => !hasKnownEnergy(track) && Boolean(track.filePath?.trim()),
  );
  const levels = new Map<string, number>();
  onProgress?.(0, pending.length);
  if (pending.length) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
  let done = 0;
  for (const track of pending) {
    try {
      const resolved = await resolveTrackAudio(track.filePath ?? "", root);
      if (resolved && isWritableMp3(resolved.file, track.filePath)) {
        const energy = await energyTagFromFile(resolved.file);
        if (energy != null) levels.set(track.id, energy);
      }
    } catch {
      // A missing or unreadable file stays without energy.
    }
    done += 1;
    onProgress?.(done, pending.length);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
  return levels;
}

/** Fill gaps only. Tracks that already have energy, and unknown ids, stay as they are. */
export function applyEnergyLevels(
  draft: SetDraft,
  levels: ReadonlyMap<string, number>,
): SetDraft {
  return stampTaggedEnergy(draft, levels, "fill");
}

/**
 * Replace the set's energy with the tag, including a level the user already
 * had. Tracks with no tag in the map stay as they are.
 */
export function applyRereadEnergyLevels(
  draft: SetDraft,
  levels: ReadonlyMap<string, number>,
): SetDraft {
  return stampTaggedEnergy(draft, levels, "replace");
}

function stampTaggedEnergy(
  draft: SetDraft,
  levels: ReadonlyMap<string, number>,
  mode: "fill" | "replace",
): SetDraft {
  if (levels.size === 0) return draft;
  let changed = false;
  const stamp = <T extends { id: string; energyLevel?: number; energySource?: EnergySource; filePath?: string }>(
    track: T,
  ): T => {
    if (mode === "fill" && hasKnownEnergy(track)) return track;
    const level = levels.get(track.id);
    if (level == null) return track;
    if (track.energyLevel === level && track.energySource === "tag") return track;
    changed = true;
    return { ...track, energyLevel: level, energySource: "tag" as const };
  };
  const tracks = draft.tracks.map(stamp);
  const sourcePool = draft.sourcePool?.map(stamp);
  if (!changed) return draft;
  return { ...draft, tracks, sourcePool };
}

/** ID3 APIC cover from the front of an MP3. Does not decode audio. */
export async function artworkFromFile(
  file: Blob,
): Promise<{ mime: string; bytes: Uint8Array } | null> {
  const header = new Uint8Array(
    await file.slice(0, Math.min(file.size, 10)).arrayBuffer(),
  );
  const length = id3PrefixLength(header, file.size);
  const bytes = new Uint8Array(await file.slice(0, length).arrayBuffer());
  return artworkFromId3(bytes);
}

/**
 * Embedded MP3 covers for tracks that still have no Artwork-folder JPEG.
 * Keyed by track id. Callers merge into the latest draft so a slow read cannot
 * replace a cover the stick JPEG already supplied.
 */
export async function missingCoversFromFiles(
  tracks: Array<{ id: string; imageUrl: string | null; filePath?: string }>,
  root?: DirLike | null,
): Promise<Map<string, string>> {
  const pending = tracks.filter(
    (track) => !track.imageUrl?.trim() && Boolean(track.filePath?.trim()),
  );
  const covers = new Map<string, string>();
  for (const track of pending) {
    try {
      const resolved = await resolveTrackAudio(track.filePath ?? "", root);
      if (!resolved || !isWritableMp3(resolved.file, track.filePath)) continue;
      const picture = await artworkFromFile(resolved.file);
      if (!picture) continue;
      const copy = new Uint8Array(picture.bytes);
      const url = rememberArtworkBlob(
        `id3:${track.filePath}`,
        new Blob([copy], { type: picture.mime }),
      );
      if (url) covers.set(track.id, url);
    } catch {
      // Missing or unreadable files stay without a cover.
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
  return covers;
}

export function applyCoverUrls(
  draft: SetDraft,
  covers: ReadonlyMap<string, string>,
): SetDraft {
  if (covers.size === 0) return draft;
  let changed = false;
  const stamp = <T extends { id: string; imageUrl: string | null }>(track: T): T => {
    if (track.imageUrl?.trim()) return track;
    const url = covers.get(track.id);
    if (!url) return track;
    changed = true;
    return { ...track, imageUrl: url };
  };
  const tracks = draft.tracks.map(stamp);
  const sourcePool = draft.sourcePool?.map(stamp);
  if (!changed) return draft;
  return { ...draft, tracks, sourcePool };
}
