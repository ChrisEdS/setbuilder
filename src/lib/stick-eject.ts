/**
 * OS-level eject of a Pioneer stick. This flushes the write cache.
 * It is not rekordbox’s eject (that also rewrites OneLibrary).
 *
 * Pioneer CDJ/XDJ remount a stick read-only when FAT was left dirty
 * (“Disk not ejected properly”). So we sync, soft-eject via diskutil, and
 * only report success when the mount is gone — never force-unmount.
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

export function repairCommand(
  platform: string,
  path: string,
): { command: string; args: string[] } | null {
  if (platform === "darwin") return { command: "diskutil", args: ["repairVolume", path] };
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ProcessResult = { code: number; stdout: string; stderr: string };

/** Test seam — real spawn by default. */
export async function runProcess(
  command: string,
  args: string[],
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function detailOf(result: ProcessResult): string {
  return (result.stderr || result.stdout).trim() || `exit ${result.code}`;
}

function isBusy(detail: string): boolean {
  return /busy|in use|unable to unmount|resource busy/i.test(detail);
}

async function waitUntilGone(
  path: string,
  exists: (file: string) => boolean,
  attempts = 8,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (!exists(path)) return true;
    await sleep(120);
  }
  return !exists(path);
}

/** Fire-and-forget (legacy). Prefer `runEject` so the UI learns success vs busy. */
export function launchEject(path: string, platform = process.platform): void {
  const spec = ejectCommand(platform, path);
  if (!spec) throw new Error("eject-unsupported");
  const child = spawn(spec.command, spec.args, { detached: true, stdio: "ignore" });
  child.unref();
}

/**
 * Flush, soft-eject, and confirm the mount point is gone.
 * Retries while the volume is busy; never force-unmounts (that dirties FAT).
 */
export async function runEject(
  path: string,
  platform = process.platform,
  exists: (file: string) => boolean = existsSync,
  exec: typeof runProcess = runProcess,
): Promise<void> {
  const spec = ejectCommand(platform, path);
  if (!spec) throw new Error("eject-unsupported");

  if (platform === "darwin") {
    await exec("/bin/sync", []).catch(() => ({ code: 1, stdout: "", stderr: "" }));
  }

  // Soft eject only. `diskutil unmount force` is what triggers macOS
  // “Disk Not Ejected Properly” / dirty FAT — callers must release FSA first.
  const delays = [0, 500, 1100, 2000, 3200];
  let lastDetail = "";
  for (const delay of delays) {
    if (delay) await sleep(delay);
    if (!exists(path)) return;
    const result = await exec(spec.command, spec.args);
    if (result.code === 0) {
      if (await waitUntilGone(path, exists)) return;
      lastDetail = "eject reported ok but volume still mounted";
      continue;
    }
    lastDetail = detailOf(result);
    if (!isBusy(lastDetail)) break;
  }

  if (!exists(path)) return;
  throw new Error(lastDetail || "eject-failed");
}

/**
 * Clears a dirty FAT volume (common cause of CDJ “readonly”) while the stick is on the Mac.
 * Does not reformat; uses diskutil First Aid equivalent.
 */
export async function runRepairVolume(
  path: string,
  platform = process.platform,
  exec: typeof runProcess = runProcess,
): Promise<void> {
  const spec = repairCommand(platform, path);
  if (!spec) throw new Error("repair-unsupported");
  if (platform === "darwin") {
    await exec("/bin/sync", []).catch(() => ({ code: 1, stdout: "", stderr: "" }));
  }
  const result = await exec(spec.command, spec.args);
  if (result.code !== 0) throw new Error(detailOf(result) || "repair-failed");
}
