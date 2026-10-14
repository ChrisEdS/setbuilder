import { readRekordboxStick, type RekordboxStickRead } from "@/lib/rekordbox-stick";
import { rememberStickFiles } from "@/lib/stick-audio";
import { findStickDatabase, type DirLike, type FileLike } from "@/lib/rekordbox-stick-write";

export type PersistableDir = DirLike & {
  queryPermission?(options: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(options: { mode: "read" | "readwrite" }): Promise<PermissionState>;
};

const DB_NAME = "setform-stick";
const STORE = "handles";
const KEY = "root";

type Picker = (options: { mode: "readwrite" }) => Promise<PersistableDir>;

export function stickPicker(): Picker | null {
  const fn = (window as unknown as { showDirectoryPicker?: Picker }).showDirectoryPicker;
  return typeof fn === "function" ? fn.bind(window) : null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function rememberStickHandle(handle: PersistableDir): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadPersistedStickHandle(): Promise<PersistableDir | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const handle = await new Promise<PersistableDir | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve((request.result as PersistableDir) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return handle;
  } catch {
    return null;
  }
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

export async function readStickFromHandle(root: DirLike): Promise<RekordboxStickRead> {
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

export async function pickAndRememberStick(): Promise<PersistableDir | null> {
  const pick = stickPicker();
  if (!pick) return null;
  try {
    const handle = await pick({ mode: "readwrite" });
    await rememberStickHandle(handle);
    return handle;
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") return null;
    throw error;
  }
}
