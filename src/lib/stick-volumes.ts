/**
 * Pioneer sticks mounted on this Mac. Names and paths stay lexical so a
 * choice cannot walk out of /Volumes/<stick> with `..` or an absolute path.
 * Playlist counts are cached by export.pdb size + mtime — callers must not
 * re-read a large database on a poll when those two are unchanged.
 */

const BLOCKED_NAMES = new Set(["Macintosh HD", "Macintosh HD - Data", "/", ""]);
const SAFE_VOLUME = /^[A-Za-z0-9 ._-]{1,80}$/;
const ARTWORK_FILE = /\.(jpe?g|png|gif|webp|bmp)$/i;

/** localStorage key for the Pioneer volume the desktop API is reading. */
export const SAVED_STICK_VOLUME = "setbuilder.stickVolume";

export const PIONEER_PDB_RELATIVES = [
  "PIONEER/rekordbox/export.pdb",
  ".PIONEER/rekordbox/export.pdb",
] as const;

/** Same allow-list as `volumePath` on macOS, without pulling in node:fs. */
export function isSafeVolumeName(name: string): boolean {
  const trimmed = name.trim();
  if (BLOCKED_NAMES.has(trimmed)) return false;
  return SAFE_VOLUME.test(trimmed);
}

const DATABASE_SEGMENT = new Set(["pioneer", ".pioneer", "rekordbox"]);

/**
 * The name a DJ recognises: the volume itself, or the first folder of the
 * “Found:” path when the handle is only the PIONEER folder.
 */
export function stickVolumeName(
  rootName: string | null | undefined,
  foundLabel: string | null | undefined,
): string | null {
  const root = rootName?.trim() ?? "";
  if (root && !DATABASE_SEGMENT.has(root.toLowerCase())) return root;
  const first = (foundLabel ?? "").replaceAll("\\", "/").split("/").filter(Boolean)[0] ?? "";
  if (!first || DATABASE_SEGMENT.has(first.toLowerCase()) || /\.(pdb|xml)$/i.test(first)) {
    return null;
  }
  return first;
}

/**
 * Free space in GiB (what `df -h` calls G) once it reaches a gigabyte,
 * and smaller files in decimal MB (what Finder shows for export.pdb).
 */
export function formatMacBytes(bytes: number, locale: string): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 MB";
  if (bytes >= 1024 ** 3) {
    const gib = bytes / 1024 ** 3;
    const digits = gib >= 10 ? 0 : 1;
    return `${gib.toLocaleString(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits })} GB`;
  }
  const mb = bytes / 1000 ** 2;
  return `${mb.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`;
}

/**
 * Absolute path under a volume root, or null when the relative path escapes.
 * Rejects `..`, `.`, absolute paths, and NUL. Does not look at the filesystem.
 */
export function resolveUnderVolume(volumeRoot: string, relative: string): string | null {
  if (!volumeRoot.startsWith("/") || volumeRoot.includes("\0") || relative.includes("\0")) {
    return null;
  }
  if (relative.startsWith("/") || /^[A-Za-z]:/.test(relative)) return null;
  const parts = relative.replaceAll("\\", "/").split("/");
  const clean = parts.filter((part) => part.length > 0);
  if (parts.some((part) => part === "." || part === "..")) return null;
  const root = volumeRoot.replace(/\/+$/, "") || "/";
  const target = clean.length ? `${root}/${clean.join("/")}` : root;
  if (target !== root && !target.startsWith(`${root}/`)) return null;
  return target;
}

function parentPath(absolute: string): string {
  const cut = absolute.replace(/\/+$/, "");
  const slash = cut.lastIndexOf("/");
  if (slash <= 0) return "/";
  return cut.slice(0, slash);
}

function baseName(absolute: string): string {
  const cut = absolute.replace(/\/+$/, "");
  const slash = cut.lastIndexOf("/");
  return cut.slice(slash + 1);
}

function insideRoot(root: string, candidate: string): boolean {
  const base = root.replace(/\/+$/, "") || "/";
  return candidate === base || candidate.startsWith(`${base}/`);
}

/**
 * Like `resolveUnderVolume`, then follow the longest existing ancestor.
 * A symlink that leaves the volume fails closed.
 */
export function confineToVolume(
  volumeRoot: string,
  relative: string,
  realpath: (absolute: string) => string | null,
): string | null {
  const lexical = resolveUnderVolume(volumeRoot, relative);
  if (!lexical) return null;
  const rootReal = realpath(volumeRoot.replace(/\/+$/, "") || "/");
  if (!rootReal || !insideRoot(rootReal, rootReal)) return null;
  let cursor = lexical;
  const missing: string[] = [];
  for (let guard = 0; guard < 64; guard++) {
    const found = realpath(cursor);
    if (found) {
      if (!insideRoot(rootReal, found)) return null;
      return missing.length ? `${found}/${missing.join("/")}` : found;
    }
    if (cursor === "/" || cursor === rootReal) return null;
    missing.unshift(baseName(cursor));
    const parent = parentPath(cursor);
    if (parent === cursor) return null;
    cursor = parent;
  }
  return null;
}

export type PioneerVolumeInfo = {
  name: string;
  freeBytes: number | null;
  pdbBytes: number;
  pdbMtimeMs: number;
  tracks: number | null;
  playlists: number | null;
};

export type ListedPioneerVolume = {
  name: string;
  freeBytes: number | null;
  pdbBytes: number;
  pdbMtimeMs: number;
  pdbRelative: string;
};

export type VolumeListDeps = {
  names: readonly string[];
  volumePath(name: string, platform?: string): string | null;
  exists(file: string): boolean;
  stat(file: string): { size: number; mtimeMs: number } | null;
  freeBytes(dir: string): number | null;
  platform?: string;
};

/** Mounted volumes that actually hold a rekordbox export.pdb. */
export function listPioneerVolumes(deps: VolumeListDeps): ListedPioneerVolume[] {
  const platform = deps.platform ?? "darwin";
  const found: ListedPioneerVolume[] = [];
  for (const raw of deps.names) {
    const name = raw.trim();
    const root = deps.volumePath(name, platform);
    if (!root || !deps.exists(root)) continue;
    let pdbRelative: string | null = null;
    let stat: { size: number; mtimeMs: number } | null = null;
    for (const relative of PIONEER_PDB_RELATIVES) {
      const file = `${root}/${relative}`;
      if (!deps.exists(file)) continue;
      const next = deps.stat(file);
      if (!next || next.size <= 0) continue;
      pdbRelative = relative;
      stat = next;
      break;
    }
    if (!pdbRelative || !stat) continue;
    found.push({
      name,
      freeBytes: deps.freeBytes(root),
      pdbBytes: stat.size,
      pdbMtimeMs: stat.mtimeMs,
      pdbRelative,
    });
  }
  found.sort((a, b) => a.name.localeCompare(b.name));
  return found;
}

export type PdbCounts = { tracks: number; playlists: number };

export type PdbCountEntry = {
  size: number;
  mtimeMs: number;
  counts: PdbCounts | null;
};

/** Volume name saved by the desktop stick loader, or null in node and private mode. */
export function readSavedVolumeName(): string | null {
  const storage = globalThis.localStorage;
  if (!storage) return null;
  try {
    const value = storage.getItem(SAVED_STICK_VOLUME)?.trim() ?? "";
    return isSafeVolumeName(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Rekordbox artwork path with the device slash removed.
 * Rejects anything that is not an image under the stick, including `..`.
 */
export function stickArtworkRelative(artworkPath: string): string | null {
  if (artworkPath.includes("\0")) return null;
  const relative = artworkPath.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!relative || !ARTWORK_FILE.test(relative)) return null;
  const parts = relative.split("/");
  if (parts.some((part) => part.length === 0 || part === "." || part === "..")) return null;
  return relative;
}

/** Larger `_m` sibling first, then the path rekordbox stored. Already-large paths stay once. */
export function stickArtworkCandidates(artworkPath: string): string[] {
  const relative = stickArtworkRelative(artworkPath);
  if (!relative) return [];
  if (/_m\.[^.]+$/i.test(relative)) return [relative];
  const large = relative.replace(/(\.[^.]+)$/i, "_m$1");
  return large === relative ? [relative] : [large, relative];
}

export function artworkContentType(path: string): string | null {
  const ext = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase() ?? "";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "bmp") return "image/bmp";
  return null;
}

/** Same-origin URL for a cover on a mounted Pioneer volume. Null when the path is not an image. */
export function volumeArtworkUrl(volume: string, artworkPath: string): string | null {
  const name = volume.trim();
  if (!isSafeVolumeName(name)) return null;
  const relative = stickArtworkRelative(artworkPath);
  if (!relative) return null;
  return `/api/desktop/artwork?name=${encodeURIComponent(name)}&path=${encodeURIComponent(relative)}`;
}

/**
 * Returns the cached parse when size and mtime match. `load` runs only on a miss
 * (including a file that changed). A thrown load is not cached.
 */
export function cachedPdbCounts(
  cache: Map<string, PdbCountEntry>,
  id: string,
  size: number,
  mtimeMs: number,
  load: () => PdbCounts | null,
): PdbCounts | null {
  const hit = cache.get(id);
  if (hit && hit.size === size && hit.mtimeMs === mtimeMs) return hit.counts;
  const counts = load();
  cache.set(id, { size, mtimeMs, counts });
  return counts;
}
