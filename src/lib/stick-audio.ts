export type StickFileRef = {
  name: string;
  path: string;
};

function foldPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\/+/, "").toLowerCase();
}

/** Formats Chromium / Electron can decode for preview. */
const PLAYABLE =
  /\.(mp3|mp4|m4a|aac|ogg|opus|wav|flac|webm)$/i;
/** Audio containers we recognize but cannot preview in this browser. */
const AUDIO_KNOWN =
  /\.(mp3|mp4|m4a|aac|ogg|opus|wav|flac|webm|aiff|aif|caf|wma|alac)$/i;
const IMAGE_KNOWN = /\.(jpe?g|png|webp|bmp|gif)$/i;

export function isStickAudioPath(path: string): boolean {
  return AUDIO_KNOWN.test(path);
}

export function isStickImagePath(path: string): boolean {
  return IMAGE_KNOWN.test(path);
}

export function isPlayableStickAudio(path: string): boolean {
  return PLAYABLE.test(path);
}

export function stickAudioBaseName(filePath: string): string {
  const trimmed = filePath.replaceAll("\\", "/").replace(/^\/+/, "");
  return trimmed.split("/").pop() || "";
}

function nameMatches(fileName: string, base: string): boolean {
  const file = foldPath(fileName);
  const want = foldPath(base);
  if (!want) return false;
  if (file === want) return true;
  // Track title "Night Drive" matches "Night Drive.mp3"
  if (!want.includes(".") && file.startsWith(`${want}.`)) return true;
  return false;
}

/** Match a rekordbox file path to a file the browser still holds from the stick folder. */
export function matchStickFile(
  files: StickFileRef[],
  filePath: string,
  filename: string,
): StickFileRef | null {
  const wanted = foldPath(filePath);
  const base = foldPath(filename || wanted.split("/").pop() || "");
  let byName: StickFileRef | null = null;
  for (const file of files) {
    const rel = foldPath(file.path || file.name);
    if (!rel) continue;
    // Require a real path segment or extension so short/empty rel never matches via endsWith("").
    if (
      wanted &&
      (rel.endsWith(wanted) ||
        (wanted.endsWith(rel) && (rel.includes("/") || rel.includes("."))))
    ) {
      return file;
    }
    if (base && (nameMatches(file.name, base) || nameMatches(rel.split("/").pop() || "", base))) {
      byName = file;
    }
  }
  return byName;
}

const urls = new Map<string, string>();
let stickFiles: File[] = [];
let stickEpoch = 0;
const stickListeners = new Set<() => void>();

function bumpStickEpoch() {
  stickEpoch += 1;
  for (const listener of stickListeners) listener();
}

/** React subscription: re-render when remembered stick files change (blob URLs refresh). */
export function subscribeStickFiles(onStoreChange: () => void): () => void {
  stickListeners.add(onStoreChange);
  return () => {
    stickListeners.delete(onStoreChange);
  };
}

export function getStickFilesEpoch(): number {
  return stickEpoch;
}

export function rememberStickFiles(files: File[]) {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
  stickFiles = files;
  bumpStickEpoch();
}

export function stickFileCount(): number {
  return stickFiles.length;
}

/** True when the current stick session still holds this rekordbox path. */
export function stickFileInSession(filePath: string): boolean {
  const path = filePath.trim();
  if (!path || !stickFiles.length) return false;
  return Boolean(matchStickFile(rememberedRefs(), path, stickAudioBaseName(path)));
}

function rememberedRefs(): StickFileRef[] {
  return stickFiles.map((file) => ({
    name: file.name,
    path: file.webkitRelativePath || file.name,
  }));
}

function findRememberedFile(
  filePath: string,
  filename: string,
  allow: (path: string) => boolean,
): File | null {
  if (!stickFiles.length) return null;
  const match = matchStickFile(
    rememberedRefs().filter((file) => allow(file.path || file.name)),
    filePath,
    filename,
  );
  if (!match) return null;
  const key = match.path || match.name;
  return (
    stickFiles.find((item) => (item.webkitRelativePath || item.name) === key) ?? null
  );
}

function blobUrlFor(file: File, key: string): string | null {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return null;
  }
  if (file.size <= 0) return null;
  const existing = urls.get(key);
  if (existing) return existing;
  const url = URL.createObjectURL(file);
  urls.set(key, url);
  return url;
}

/** Look up a remembered stick File by rekordbox path (analyze-only fallback). */
export function lookupRememberedStickFile(
  filePath: string,
  filename = "",
): File | null {
  return findRememberedFile(filePath, filename, isStickAudioPath);
}

/** Blob URL for a cover file on the stick (`PIONEER/Artwork/...`). */
export function stickArtworkUrl(filePath: string, filename = ""): string | null {
  const file = findRememberedFile(
    filePath,
    filename || stickAudioBaseName(filePath),
    isStickImagePath,
  );
  if (!file) return null;
  return blobUrlFor(file, file.webkitRelativePath || file.name);
}

/** Cache an extracted ID3 cover so TrackArt can show it like a stick JPEG. */
export function rememberArtworkBlob(key: string, blob: Blob): string | null {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return null;
  }
  if (!key.trim() || blob.size <= 0) return null;
  const existing = urls.get(key);
  if (existing) return existing;
  const url = URL.createObjectURL(blob);
  urls.set(key, url);
  return url;
}

export type StickAudioLookup =
  | { kind: "url"; url: string }
  | { kind: "unsupported"; path: string }
  | { kind: "missing" };

/** Resolve a playable blob URL, or explain why preview cannot start. */
export function lookupStickAudio(
  filePath: string,
  filename = "",
): StickAudioLookup {
  if (typeof URL === "undefined" || !stickFiles.length) return { kind: "missing" };
  const file = findRememberedFile(
    filePath,
    filename || stickAudioBaseName(filePath),
    isStickAudioPath,
  );
  if (!file) return { kind: "missing" };
  const path = file.webkitRelativePath || file.name;
  if (!isPlayableStickAudio(path)) {
    return { kind: "unsupported", path };
  }
  const url = blobUrlFor(file, path);
  if (!url) return { kind: "missing" };
  return { kind: "url", url };
}

export function stickAudioUrl(filePath: string, filename = ""): string | null {
  const hit = lookupStickAudio(filePath, filename);
  return hit.kind === "url" ? hit.url : null;
}
