/**
 * Live stick presence: FileSystemHandle permission + a cheap I/O probe, or a
 * one-byte read on a remembered File when there is no directory handle.
 */

import { findStickDatabase } from "@/lib/rekordbox-stick-write";
import { probeRememberedStickByte } from "@/lib/stick-audio";
import {
  loadPersistedStickHandle,
  stickPermission,
  type PersistableDir,
} from "@/lib/stick-session";

export type StickAliveState = "idle" | "alive" | "gone";

async function probeHandle(root: PersistableDir): Promise<boolean> {
  if (!(await stickPermission(root, "read", false))) return false;
  try {
    const location = await findStickDatabase(root);
    await location.file.getFile();
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns whether the current stick session can still read the volume.
 * `idle` = no handle and no remembered files (nothing to reconnect).
 */
export async function probeStickAlive(samplePath?: string): Promise<StickAliveState> {
  const handle = await loadPersistedStickHandle().catch(() => null);
  if (handle) {
    if (await probeHandle(handle)) return "alive";
  }
  const readable = await probeRememberedStickByte(samplePath);
  if (readable === true) return "alive";
  if (readable === false) return "gone";
  if (handle) return "gone";
  return "idle";
}
