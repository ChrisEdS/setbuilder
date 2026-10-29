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

type StickKind = "image" | "audio" | "any";
type StickHit = { file: File; order: number };
type StickSlots = { image?: StickHit; audio?: StickHit; any?: StickHit };

let indexedEpoch = -1;
let byEndsWith = new Map<string, StickSlots>();
let byExactRel = new Map<string, StickSlots>();
let byExactName = new Map<string, StickSlots>();
let byStem = new Map<string, StickSlots>();

function kindOf(path: string): StickKind {
  if (isStickImagePath(path)) return "image";
  if (isStickAudioPath(path)) return "audio";
  return "any";
}

function slot(map: Map<string, StickSlots>, key: string): StickSlots {
  let slots = map.get(key);
  if (!slots) {
    slots = {};
    map.set(key, slots);
  }
  return slots;
}

function noteFirst(map: Map<string, StickSlots>, key: string, kind: StickKind, hit: StickHit) {
  const slots = slot(map, key);
  if (!slots.any) slots.any = hit;
  if (kind === "image" && !slots.image) slots.image = hit;
  if (kind === "audio" && !slots.audio) slots.audio = hit;
}

function noteLast(map: Map<string, StickSlots>, key: string, kind: StickKind, hit: StickHit) {
  const slots = slot(map, key);
  slots.any = hit;
  if (kind === "image") slots.image = hit;
  if (kind === "audio") slots.audio = hit;
}

function pick(slots: StickSlots | undefined, kind: StickKind): StickHit | undefined {
  return slots?.[kind];
}

/** First path hit and last name hit. Rebuilt when the remembered file list changes. */
function ensureStickIndex() {
  if (indexedEpoch === stickEpoch) return;
  indexedEpoch = stickEpoch;
  byEndsWith = new Map();
  byExactRel = new Map();
  byExactName = new Map();
  byStem = new Map();
  stickFiles.forEach((file, order) => {
    const name = foldPath(file.name);
    const rel = foldPath(file.webkitRelativePath || file.name);
    if (!rel && !name) return;
    const hit: StickHit = { file, order };
    const kind = kindOf(rel || name);
    if (rel) {
      noteFirst(byExactRel, rel, kind, hit);
      for (let i = 0; i < rel.length; i++) noteFirst(byEndsWith, rel.slice(i), kind, hit);
    }
    for (const label of name && name !== rel ? [name, rel.split("/").pop() || ""] : [rel.split("/").pop() || name]) {
      if (!label) continue;
      noteLast(byExactName, label, kind, hit);
      for (let i = 0; i < label.length; i++) {
        if (label.charCodeAt(i) !== 46) continue;
        const stem = label.slice(0, i);
        if (stem) noteLast(byStem, stem, kind, hit);
      }
    }
  });
}

function earlier(a: StickHit | undefined, b: StickHit | undefined): StickHit | undefined {
  if (!a) return b;
  if (!b) return a;
  return a.order <= b.order ? a : b;
}

/**
 * Same result as matchStickFile over the remembered list, without scanning
 * every file. A folder pick can hold thousands of audio files; the set UI
 * used to do that scan once per library row.
 */
function lookupRemembered(filePath: string, filename: string, kind: StickKind): File | null {
  if (!stickFiles.length) return null;
  ensureStickIndex();
  const wanted = foldPath(filePath);
  const base = foldPath(filename || wanted.split("/").pop() || "");
  let pathHit: StickHit | undefined;
  if (wanted) {
    pathHit = pick(byEndsWith.get(wanted), kind);
    if (pathHit?.order !== 0) {
      for (let i = 0; i < wanted.length; i++) {
        const suffix = i === 0 ? wanted : wanted.slice(i);
        if (!suffix.includes("/") && !suffix.includes(".")) continue;
        pathHit = earlier(pathHit, pick(byExactRel.get(suffix), kind));
        if (pathHit?.order === 0) break;
      }
    }
  }
  if (pathHit) return pathHit.file;
  if (!base) return null;
  const exact = pick(byExactName.get(base), kind);
  if (base.includes(".")) return exact?.file ?? null;
  const stem = pick(byStem.get(base), kind);
  if (!exact) return stem?.file ?? null;
  if (!stem) return exact.file;
  return (stem.order >= exact.order ? stem : exact).file;
}

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

/** Drop remembered stick Files and blob URLs so the volume is not held open. */
export function forgetStickFiles(): void {
  rememberStickFiles([]);
}

export function stickFileCount(): number {
  return stickFiles.length;
}

/**
 * Probe whether a remembered stick File still yields bytes (volume still mounted).
 * `null` means there is nothing in the session to check.
 */
export async function probeRememberedStickByte(
  filePath?: string,
): Promise<boolean | null> {
  if (!stickFiles.length) return null;
  const wanted = filePath?.trim() ?? "";
  const file = wanted
    ? lookupRemembered(wanted, stickAudioBaseName(wanted), "any")
    : stickFiles[0] ?? null;
  if (!file) return null;
  try {
    await file.slice(0, Math.min(1, file.size || 1)).arrayBuffer();
    return true;
  } catch {
    return false;
  }
}

/** True when the current stick session still holds this rekordbox path. */
export function stickFileInSession(filePath: string): boolean {
  const path = filePath.trim();
  if (!path || !stickFiles.length) return false;
  return Boolean(lookupRemembered(path, stickAudioBaseName(path), "any"));
}

function findRememberedFile(
  filePath: string,
  filename: string,
  kind: StickKind,
): File | null {
  return lookupRemembered(filePath, filename, kind);
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
  return findRememberedFile(filePath, filename, "audio");
}

/** Blob URL for a cover file on the stick (`PIONEER/Artwork/...`). */
export function stickArtworkUrl(filePath: string, filename = ""): string | null {
  const file = findRememberedFile(
    filePath,
    filename || stickAudioBaseName(filePath),
    "image",
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
    "audio",
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
