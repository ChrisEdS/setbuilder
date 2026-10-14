/**
 * Resolve a set track's rekordbox filePath to a File (and optional writable handle)
 * on the remembered stick directory.
 */

import { lookupRememberedStickFile } from "@/lib/stick-audio";
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

/** Write bytes back through a File System Access handle. */
export async function writeStickFileBytes(
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
