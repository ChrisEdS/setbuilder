import { readFile } from "node:fs/promises";
import { connection, NextResponse } from "next/server";
import { requestT } from "@/lib/i18n/server";
import { parseRekordboxPdb } from "@/lib/rekordbox-pdb";
import { listMountedPioneerVolumes, resolvePioneerFile } from "@/lib/stick-volume-dir";
import {
  cachedPdbCounts,
  type ListedPioneerVolume,
  type PdbCountEntry,
  type PdbCounts,
  type PioneerVolumeInfo,
} from "@/lib/stick-volumes";

const COUNT_LIMIT = 32 * 1024 * 1024;
const pdbCountCache = new Map<string, PdbCountEntry>();

function localRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  return host.startsWith("127.0.0.1:") || host.startsWith("localhost:");
}

async function countsFor(volume: ListedPioneerVolume): Promise<PdbCounts | null> {
  const id = `${volume.name}/${volume.pdbRelative}`;
  const hit = pdbCountCache.get(id);
  if (hit && hit.size === volume.pdbBytes && hit.mtimeMs === volume.pdbMtimeMs) return hit.counts;
  if (volume.pdbBytes > COUNT_LIMIT) {
    pdbCountCache.set(id, { size: volume.pdbBytes, mtimeMs: volume.pdbMtimeMs, counts: null });
    return null;
  }
  const abs = resolvePioneerFile(volume.name, volume.pdbRelative);
  if (!abs) return null;
  try {
    const bytes = new Uint8Array(await readFile(abs));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return cachedPdbCounts(pdbCountCache, id, volume.pdbBytes, volume.pdbMtimeMs, () => {
      const library = parseRekordboxPdb(buffer);
      return {
        tracks: library.tracks.length,
        playlists: library.playlists.filter((item) => item.kind === "playlist").length,
      };
    });
  } catch {
    pdbCountCache.set(id, { size: volume.pdbBytes, mtimeMs: volume.pdbMtimeMs, counts: null });
    return null;
  }
}

export async function GET(request: Request) {
  await connection();
  const t = requestT(request);
  if (!localRequest(request)) {
    return NextResponse.json({ error: t("api.setup.localOnly") }, { status: 403 });
  }
  const listed = listMountedPioneerVolumes();
  const volumes: PioneerVolumeInfo[] = [];
  for (const volume of listed) {
    const counts = await countsFor(volume);
    volumes.push({
      name: volume.name,
      freeBytes: volume.freeBytes,
      pdbBytes: volume.pdbBytes,
      pdbMtimeMs: volume.pdbMtimeMs,
      tracks: counts?.tracks ?? null,
      playlists: counts?.playlists ?? null,
    });
  }
  return NextResponse.json({ volumes }, { headers: { "Cache-Control": "no-store" } });
}
