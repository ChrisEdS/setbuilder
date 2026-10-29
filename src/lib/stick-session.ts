import { LocalizedError } from "@/lib/i18n/error";
import { readRekordboxStick, type RekordboxStickRead } from "@/lib/rekordbox-stick";
import { forgetStickFiles, rememberStickFiles } from "@/lib/stick-audio";
import { findStickDatabase, type DirLike, type FileLike } from "@/lib/rekordbox-stick-write";
import { STICK_IDB_NAME, STICK_IDB_NAME_LEGACY } from "@/lib/storage-keys";

export type PersistableDir = DirLike & {
  queryPermission?(options: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(options: { mode: "read" | "readwrite" }): Promise<PermissionState>;
};

const DB_NAME = STICK_IDB_NAME;
const DB_NAME_LEGACY = STICK_IDB_NAME_LEGACY;
const STORE = "handles";
const KEY = "root";

type PickerMode = "read" | "readwrite";
type Picker = (options?: { mode?: PickerMode }) => Promise<PersistableDir>;

export function stickPicker(): Picker | null {
  if (typeof window === "undefined") return null;
  const fn = (window as unknown as { showDirectoryPicker?: Picker }).showDirectoryPicker;
  return typeof fn === "function" ? fn.bind(window) : null;
}

export function isPickerCancel(error: unknown): boolean {
  return (error as { name?: string }).name === "AbortError";
}

/** Picker exists but the OS dialog cannot open (no user gesture, Electron, iframe). */
export function isPickerBlocked(error: unknown): boolean {
  const name = (error as { name?: string }).name;
  return name === "SecurityError" || name === "NotAllowedError";
}

export function pickerFailureKind(error: unknown): "cancel" | "blocked" | "error" {
  if (isPickerCancel(error)) return "cancel";
  if (isPickerBlocked(error)) return "blocked";
  return "error";
}

let sessionHandle: PersistableDir | null = null;

function openDb(name = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function rememberStickHandle(handle: PersistableDir): Promise<void> {
  sessionHandle = handle;
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function readHandleFromDb(name: string): Promise<PersistableDir | null> {
  const db = await openDb(name);
  try {
    return await new Promise<PersistableDir | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve((request.result as PersistableDir) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

let handleLoad: Promise<PersistableDir | null> | null = null;

async function loadPersistedStickHandleFromDb(): Promise<PersistableDir | null> {
  if (sessionHandle) return sessionHandle;
  if (typeof indexedDB === "undefined") return null;
  try {
    let handle = await readHandleFromDb(DB_NAME);
    if (!handle) {
      handle = await readHandleFromDb(DB_NAME_LEGACY);
      if (handle) await rememberStickHandle(handle);
    }
    if (handle) sessionHandle = handle;
    return handle;
  } catch {
    return null;
  }
}

export function loadPersistedStickHandle(): Promise<PersistableDir | null> {
  if (sessionHandle) return Promise.resolve(sessionHandle);
  if (!handleLoad) {
    handleLoad = loadPersistedStickHandleFromDb().finally(() => {
      handleLoad = null;
    });
  }
  return handleLoad;
}

export async function stickPermission(
  handle: PersistableDir,
  mode: "read" | "readwrite" = "readwrite",
  prompt = false,
): Promise<boolean> {
  const state = handle.queryPermission
    ? await handle.queryPermission({ mode }).catch(() => "denied")
    : "granted";
  if (state === "granted") return true;
  if (!prompt || !handle.requestPermission) return false;
  return (await handle.requestPermission({ mode }).catch(() => "denied")) === "granted";
}

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
    Object.defineProperty(file, "webkitRelativePath", { value: relative, configurable: true });
  } catch {
    /* ignore */
  }
  return file;
}

/** Resolve a rekordbox path against the folder the user picked. */
export async function resolveStickFile(root: DirLike, filePath: string): Promise<File | null> {
  const trimmed = filePath.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!trimmed) return null;
  const variants = [trimmed];
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length > 1) variants.push(parts.slice(1).join("/"));
  for (const variant of variants) {
    const segments = variant.split("/").filter(Boolean);
    let dir: DirLike | null = root;
    for (const segment of segments.slice(0, -1)) {
      dir = dir ? await child(dir, segment) : null;
      if (!dir) break;
    }
    const name = segments[segments.length - 1];
    const handle = dir && name ? await fileHandle(dir, name) : null;
    if (handle) {
      const file = await asFile(handle, variant);
      if (file) return file;
    }
  }
  return null;
}

export async function hydrateStickMedia(root: DirLike, paths: string[]): Promise<number> {
  const unique = [...new Set(paths.filter(Boolean))];
  const files: File[] = [];
  for (const path of unique) {
    const file = await resolveStickFile(root, path);
    if (file) files.push(file);
  }
  if (files.length) rememberStickFiles(files);
  return files.length;
}

const stickReads = new WeakMap<DirLike, Promise<RekordboxStickRead>>();

async function readStickFromHandleNow(root: DirLike): Promise<RekordboxStickRead> {
  const persistable = root as PersistableDir;
  if (
    (persistable.queryPermission || persistable.requestPermission) &&
    !(await stickPermission(persistable, "read", true))
  ) {
    throw new LocalizedError(
      "exports.stick.denied",
      undefined,
      "Kein Lesezugriff auf diesen Ordner. Im Dialog erlauben oder die Datei export.pdb wählen.",
    );
  }
  const location = await findStickDatabase(root);
  const buffer = await (await location.file.getFile()).arrayBuffer();
  const file = new File([buffer], "export.pdb");
  try {
    Object.defineProperty(file, "webkitRelativePath", {
      value: `${root.name || "stick"}/PIONEER/rekordbox/export.pdb`,
      configurable: true,
    });
  } catch {
    /* ignore */
  }
  return readRekordboxStick([file]);
}

/** One in-flight read per folder. Launch reads the stick from two places at once. */
export function readStickFromHandle(root: DirLike): Promise<RekordboxStickRead> {
  const existing = stickReads.get(root);
  if (existing) return existing;
  const job = readStickFromHandleNow(root).finally(() => {
    if (stickReads.get(root) === job) stickReads.delete(root);
  });
  stickReads.set(root, job);
  return job;
}

export async function pickAndRememberStick(
  mode: PickerMode = "readwrite",
): Promise<PersistableDir | null> {
  const pick = stickPicker();
  if (!pick) return null;
  let handle: PersistableDir;
  try {
    handle = await pick({ mode });
  } catch (error) {
    if (isPickerCancel(error)) return null;
    throw error;
  }
  // IndexedDB can abort (same AbortError name) when storing a volume handle.
  // The pick already succeeded — keep the handle for this session.
  try {
    await rememberStickHandle(handle);
  } catch {
    /* optional: write-dialog can ask again */
  }
  return handle;
}

async function deleteHandleFromDb(name: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb(name);
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch {
    /* ignore — eject still proceeds with live refs cleared */
  }
}

/**
 * Drop live stick refs Chromium may hold (session handle + remembered Files /
 * blob URLs). Keeps the IndexedDB handle until eject succeeds so a failed eject
 * can soft-reconnect without re-picking the folder.
 */
export function softReleaseStickSession(): void {
  sessionHandle = null;
  handleLoad = null;
  forgetStickFiles();
}

/** Forget the persisted folder handle after a successful OS eject. */
export async function forgetPersistedStickHandle(): Promise<void> {
  sessionHandle = null;
  handleLoad = null;
  await deleteHandleFromDb(DB_NAME);
  await deleteHandleFromDb(DB_NAME_LEGACY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("setbuilder-stick-released"));
  }
}

/** Brief pause after dropping File System Access handles so diskutil is not Resource busy. */
export function pauseBeforeStickEject(ms = 900): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Preview off → soft-release FSA/Files → wait. Does not clear IndexedDB yet
 * (see forgetPersistedStickHandle after a successful eject).
 */
export async function prepareStickEject(): Promise<void> {
  if (typeof window !== "undefined") {
    // Preview must drop <audio src> before we revoke stick blob URLs.
    window.dispatchEvent(new Event("setbuilder-stick-will-eject"));
  }
  await pauseBeforeStickEject(200);
  softReleaseStickSession();
  await pauseBeforeStickEject();
}

export async function requestStickEject(name: string): Promise<void> {
  const response = await fetch("/api/desktop/eject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const body = (await response.json().catch(() => ({}))) as { ejected?: boolean };
  if (!response.ok || !body.ejected) throw new Error("eject");
  // Only after diskutil succeeded — otherwise the stick is still mounted.
  await forgetPersistedStickHandle();
}

/** diskutil repairVolume — clears dirty FAT that makes CDJs remount the stick read-only. */
export async function requestStickRepair(name: string): Promise<void> {
  const response = await fetch("/api/desktop/repair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const body = (await response.json().catch(() => ({}))) as { repaired?: boolean };
  if (!response.ok || !body.repaired) throw new Error("repair");
}
