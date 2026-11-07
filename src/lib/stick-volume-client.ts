/**
 * Browser stand-in for a File System Access directory, backed by the local
 * volume API. Only used when this page is talking to localhost.
 */

import type { PersistableDir } from "@/lib/stick-session";
import type { FileLike } from "@/lib/rekordbox-stick-write";
import { isSafeVolumeName, type PioneerVolumeInfo } from "@/lib/stick-volumes";

const SAVED_VOLUME = "setbuilder.stickVolume";

export type { PioneerVolumeInfo };

function notFound(): Error {
  const error = new Error("not found");
  error.name = "NotFoundError";
  return error;
}

function joinSegment(parent: string, name: string): string | null {
  if (!name || name === "." || name === ".." || /[\\/\0]/.test(name)) return null;
  return parent ? `${parent}/${name}` : name;
}

type Stat = { kind: "file" | "dir"; size: number; mtimeMs: number };

async function postOp(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch("/api/desktop/volume", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const error = new Error(typeof payload.error === "string" ? payload.error : "volume");
    error.name = response.status === 404 ? "NotFoundError" : "NotAllowedError";
    throw error;
  }
  return payload;
}

async function statPath(volume: string, path: string): Promise<Stat | null> {
  const response = await fetch("/api/desktop/volume", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "stat", name: volume, path }),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw notFound();
  return (await response.json()) as Stat;
}

function fileUrl(volume: string, path: string): string {
  return `/api/desktop/volume?name=${encodeURIComponent(volume)}&path=${encodeURIComponent(path)}`;
}

async function readRange(volume: string, path: string, start: number, end: number): Promise<ArrayBuffer> {
  const response = await fetch(fileUrl(volume, path), {
    headers: { Range: `bytes=${start}-${Math.max(start, end) - 1}` },
  });
  if (!response.ok) throw notFound();
  return response.arrayBuffer();
}

function volumeFile(volume: string, path: string, name: string): FileLike {
  return {
    name,
    async getFile() {
      const stat = await statPath(volume, path);
      if (!stat || stat.kind !== "file") {
        return {
          size: 0,
          arrayBuffer: async () => new ArrayBuffer(0),
          slice: () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
        };
      }
      return {
        size: stat.size,
        lastModified: stat.mtimeMs,
        arrayBuffer: () => readRange(volume, path, 0, stat.size),
        slice: (start: number, end?: number) => ({
          arrayBuffer: () => readRange(volume, path, start, end ?? stat.size),
        }),
      };
    },
    async createWritable() {
      let id: string | null = null;
      let aborted = false;
      const ensure = async () => {
        if (id) return id;
        const started = await postOp({ op: "write-begin", name: volume, path });
        if (typeof started.id !== "string" || !started.id) throw new Error("write");
        id = started.id;
        return id;
      };
      return {
        async write(data) {
          if (aborted) return;
          const writeId = await ensure();
          const bytes = data instanceof Uint8Array ? data.slice() : new Uint8Array(data);
          const response = await fetch(
            `/api/desktop/volume?op=chunk&id=${encodeURIComponent(writeId)}`,
            { method: "PUT", body: bytes },
          );
          if (!response.ok) throw new Error("write");
        },
        async close() {
          if (aborted) return;
          const writeId = await ensure();
          await postOp({ op: "write-commit", id: writeId });
        },
        async abort() {
          aborted = true;
          if (!id) return;
          await postOp({ op: "write-abort", id }).catch(() => undefined);
        },
      };
    },
  };
}

function volumeDir(volume: string, relative: string): PersistableDir {
  const dir: PersistableDir = {
    name: relative ? (relative.split("/").pop() ?? volume) : volume,
    async queryPermission() {
      return "granted";
    },
    async requestPermission() {
      return "granted";
    },
    async getDirectoryHandle(name, options) {
      const next = joinSegment(relative, name);
      if (next == null) throw notFound();
      const stat = await statPath(volume, next);
      if (stat?.kind === "dir") return volumeDir(volume, next);
      if (stat) throw notFound();
      if (!options?.create) throw notFound();
      await postOp({ op: "mkdir", name: volume, path: next });
      return volumeDir(volume, next);
    },
    async getFileHandle(name, options) {
      const next = joinSegment(relative, name);
      if (next == null) throw notFound();
      const stat = await statPath(volume, next);
      if (stat?.kind === "dir") throw notFound();
      if (!stat && !options?.create) throw notFound();
      return volumeFile(volume, next, name);
    },
    async *keys() {
      const payload = await postOp({ op: "entries", name: volume, path: relative });
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      for (const entry of entries) {
        if (entry && typeof entry === "object" && "name" in entry && typeof entry.name === "string") {
          yield entry.name;
        }
      }
    },
    async removeEntry(name) {
      const next = joinSegment(relative, name);
      if (next == null) throw notFound();
      await postOp({ op: "remove", name: volume, path: next });
    },
  };
  return dir;
}

/** Directory handle for one mounted Pioneer volume. The name is the volume name. */
export function localStickVolume(name: string): PersistableDir {
  const trimmed = name.trim();
  if (!isSafeVolumeName(trimmed)) {
    const error = new Error("bad volume");
    error.name = "NotAllowedError";
    throw error;
  }
  return volumeDir(trimmed, "");
}

export function readSavedVolumeName(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const value = localStorage.getItem(SAVED_VOLUME)?.trim() ?? "";
    return isSafeVolumeName(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveVolumeName(name: string): void {
  if (!isSafeVolumeName(name)) return;
  try {
    localStorage.setItem(SAVED_VOLUME, name.trim());
  } catch {
    /* private mode */
  }
}

let cachedVolumeName = "";
let cachedVolume: PersistableDir | null = null;

/** One handle per saved volume name, so the analysis index is not rebuilt per track. */
export function savedVolumeHandle(): PersistableDir | null {
  const name = readSavedVolumeName();
  if (!name) {
    cachedVolumeName = "";
    cachedVolume = null;
    return null;
  }
  if (cachedVolume && cachedVolumeName === name) return cachedVolume;
  cachedVolumeName = name;
  cachedVolume = localStickVolume(name);
  return cachedVolume;
}

export function clearSavedVolumeName(): void {
  cachedVolumeName = "";
  cachedVolume = null;
  try {
    localStorage.removeItem(SAVED_VOLUME);
  } catch {
    /* ignore */
  }
}
