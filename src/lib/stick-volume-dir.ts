/**
 * Directory handle for one validated Pioneer volume. Every child path is
 * confined to that volume. Writes land in a temp file beside the target and
 * replace it with rename, so a failed write does not leave a half file.
 */

import { randomBytes } from "node:crypto";
import {
  existsSync,
  realpathSync,
  readdirSync,
  statfsSync,
  statSync,
} from "node:fs";
import { appendFile, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { isPioneerVolume, volumePath } from "@/lib/stick-eject";
import type { DirLike, FileLike } from "@/lib/rekordbox-stick-write";
import {
  confineToVolume,
  listPioneerVolumes,
  type ListedPioneerVolume,
  type VolumeListDeps,
} from "@/lib/stick-volumes";

export type VolumeIo = {
  exists(path: string): boolean;
  stat(path: string): { size: number; mtimeMs: number; isDirectory: boolean } | null;
  readdir(path: string): string[];
  realpath(path: string): string | null;
  readFile(path: string): Promise<Uint8Array>;
  mkdir(path: string): Promise<void>;
  writeAtomic(path: string, data: Uint8Array): Promise<void>;
  remove(path: string): Promise<void>;
};

function notFound(): Error {
  const error = new Error("not found");
  error.name = "NotFoundError";
  return error;
}

function joinSegment(parent: string, name: string): string | null {
  if (!name || name === "." || name === ".." || /[\\/\0]/.test(name)) return null;
  return parent ? `${parent}/${name}` : name;
}

type PendingWrite = { tmp: string; target: string };
const pendingWrites = new Map<string, PendingWrite>();
const pendingOrder: string[] = [];

async function dropPending(id: string): Promise<void> {
  const pending = pendingWrites.get(id);
  if (!pending) return;
  pendingWrites.delete(id);
  const index = pendingOrder.indexOf(id);
  if (index >= 0) pendingOrder.splice(index, 1);
  await rm(pending.tmp, { force: true }).catch(() => undefined);
}

/** Temp file on the same volume, then rename over the target. */
export async function replaceFileAtomic(target: string, data: Uint8Array): Promise<void> {
  const tmp = `${target}.${randomBytes(8).toString("hex")}.setbuilder-tmp`;
  try {
    await writeFile(tmp, data);
    await rename(tmp, target);
  } catch (error) {
    await rm(tmp, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function beginAtomicWrite(target: string): Promise<string> {
  while (pendingOrder.length > 12) {
    const oldest = pendingOrder[0];
    if (!oldest) break;
    await dropPending(oldest);
  }
  const id = randomBytes(16).toString("hex");
  const tmp = `${target}.${id}.setbuilder-tmp`;
  await writeFile(tmp, new Uint8Array());
  pendingWrites.set(id, { tmp, target });
  pendingOrder.push(id);
  return id;
}

export async function appendAtomicWrite(id: string, chunk: Uint8Array): Promise<boolean> {
  const pending = pendingWrites.get(id);
  if (!pending) return false;
  await appendFile(pending.tmp, chunk);
  return true;
}

export async function commitAtomicWrite(id: string): Promise<boolean> {
  const pending = pendingWrites.get(id);
  if (!pending) return false;
  pendingWrites.delete(id);
  const index = pendingOrder.indexOf(id);
  if (index >= 0) pendingOrder.splice(index, 1);
  try {
    await rename(pending.tmp, pending.target);
    return true;
  } catch (error) {
    await rm(pending.tmp, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function abortAtomicWrite(id: string): Promise<void> {
  await dropPending(id);
}

/** Inclusive start, exclusive end. The caller already checked the bounds. */
export async function readFileRange(file: string, start: number, end: number): Promise<Uint8Array> {
  const length = Math.max(0, end - start);
  const buffer = new Uint8Array(length);
  if (!length) return buffer;
  const handle = await open(file, "r");
  try {
    await handle.read(buffer, 0, length, start);
    return buffer;
  } finally {
    await handle.close();
  }
}

export const nodeVolumeIo: VolumeIo = {
  exists: existsSync,
  stat(path) {
    try {
      const stat = statSync(path);
      return { size: stat.size, mtimeMs: stat.mtimeMs, isDirectory: stat.isDirectory() };
    } catch {
      return null;
    }
  },
  readdir(path) {
    return readdirSync(path);
  },
  realpath(path) {
    try {
      return realpathSync(path);
    } catch {
      return null;
    }
  },
  async readFile(path) {
    return new Uint8Array(await readFile(path));
  },
  async mkdir(path) {
    await mkdir(path);
  },
  writeAtomic: replaceFileAtomic,
  async remove(path) {
    await rm(path);
  },
};

export function volumeDirectory(root: string, volumeName: string, io: VolumeIo): DirLike {
  function at(relative: string): DirLike {
    const abs = (rel: string) => {
      const confined = confineToVolume(root, rel, io.realpath);
      if (!confined) throw notFound();
      return confined;
    };
    const dir: DirLike = {
      name: relative ? (relative.split("/").pop() ?? volumeName) : volumeName,
      async getDirectoryHandle(name, options) {
        const next = joinSegment(relative, name);
        if (next == null) throw notFound();
        const target = abs(next);
        const stat = io.stat(target);
        if (stat?.isDirectory) return at(next);
        if (stat) throw notFound();
        if (!options?.create) throw notFound();
        await io.mkdir(target);
        return at(next);
      },
      async getFileHandle(name, options) {
        const next = joinSegment(relative, name);
        if (next == null) throw notFound();
        const target = abs(next);
        const stat = io.stat(target);
        if (stat?.isDirectory) throw notFound();
        if (!stat && !options?.create) throw notFound();
        return fileAt(target, name);
      },
      async *keys() {
        for (const name of io.readdir(abs(relative))) yield name;
      },
      async removeEntry(name) {
        const next = joinSegment(relative, name);
        if (next == null) throw notFound();
        await io.remove(abs(next));
      },
    };
    return dir;
  }

  function fileAt(target: string, name: string): FileLike {
    return {
      name,
      async getFile() {
        const stat = io.stat(target);
        const data = stat ? await io.readFile(target) : new Uint8Array();
        const copy = data.slice();
        return {
          size: copy.byteLength,
          lastModified: stat?.mtimeMs,
          arrayBuffer: async () =>
            copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength),
        };
      },
      async createWritable() {
        const chunks: Uint8Array[] = [];
        let settled = false;
        return {
          async write(data) {
            const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
            chunks.push(bytes.slice());
          },
          async close() {
            if (settled) return;
            settled = true;
            const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
            const merged = new Uint8Array(total);
            let offset = 0;
            for (const chunk of chunks) {
              merged.set(chunk, offset);
              offset += chunk.byteLength;
            }
            await io.writeAtomic(target, merged);
          },
          async abort() {
            settled = true;
            chunks.length = 0;
          },
        };
      },
    };
  }

  return at("");
}

/** The mounted Pioneer volume, or null when the name is not one. */
export function openPioneerVolume(name: string, platform = process.platform): DirLike | null {
  const root = volumePath(name, platform);
  if (!root || !existsSync(root) || !isPioneerVolume(root)) return null;
  return volumeDirectory(root, name.trim(), nodeVolumeIo);
}

export function resolvePioneerFile(
  name: string,
  relative: string,
  platform = process.platform,
): string | null {
  const root = volumePath(name, platform);
  if (!root || !existsSync(root) || !isPioneerVolume(root)) return null;
  return confineToVolume(root, relative, nodeVolumeIo.realpath);
}

export function darwinVolumeNames(): string[] {
  if (process.platform !== "darwin") return [];
  try {
    return readdirSync("/Volumes", { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

export function freeBytesOf(dir: string): number | null {
  try {
    const space = statfsSync(dir);
    return Number(space.bavail) * Number(space.bsize);
  } catch {
    return null;
  }
}

export function listMountedPioneerVolumes(
  deps?: Partial<VolumeListDeps>,
): ListedPioneerVolume[] {
  return listPioneerVolumes({
    names: deps?.names ?? darwinVolumeNames(),
    volumePath: deps?.volumePath ?? volumePath,
    exists: deps?.exists ?? existsSync,
    stat(file) {
      const stat = nodeVolumeIo.stat(file);
      return stat && !stat.isDirectory ? { size: stat.size, mtimeMs: stat.mtimeMs } : null;
    },
    freeBytes: deps?.freeBytes ?? freeBytesOf,
    platform: deps?.platform,
  });
}
