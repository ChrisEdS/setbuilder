/**
 * OS-level eject of a Pioneer stick. This flushes the write cache.
 * It is not rekordbox’s eject (that also rewrites OneLibrary).
 */

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const SAFE_VOLUME = /^[A-Za-z0-9 ._-]{1,80}$/;
const BLOCKED = new Set(["Macintosh HD", "Macintosh HD - Data", "/", ""]);

export function volumePath(name: string, platform = process.platform): string | null {
  const trimmed = name.trim();
  if (BLOCKED.has(trimmed)) return null;
  if (platform === "win32" && /^[A-Za-z]:$/.test(trimmed)) return `${trimmed}\\`;
  if (!SAFE_VOLUME.test(trimmed)) return null;
  if (platform === "darwin") return `/Volumes/${trimmed}`;
  return null;
}

export function isPioneerVolume(
  path: string,
  exists: (file: string) => boolean = existsSync,
): boolean {
  return (
    exists(`${path}/PIONEER/rekordbox/export.pdb`) ||
    exists(`${path}/.PIONEER/rekordbox/export.pdb`) ||
    exists(`${path}\\PIONEER\\rekordbox\\export.pdb`)
  );
}

export function ejectCommand(
  platform: string,
  path: string,
): { command: string; args: string[] } | null {
  if (platform === "darwin") return { command: "diskutil", args: ["eject", path] };
  return null;
}

export function launchEject(path: string, platform = process.platform): void {
  const spec = ejectCommand(platform, path);
  if (!spec) throw new Error("eject-unsupported");
  const child = spawn(spec.command, spec.args, { detached: true, stdio: "ignore" });
  child.unref();
}
