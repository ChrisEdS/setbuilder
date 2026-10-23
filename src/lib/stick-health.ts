/**
 * Whether a Pioneer player is likely to find a library on this stick.
 * We cannot talk to the CDJ. We can see the files the player looks for,
 * and whether rekordbox's device library is newer than the file SETBUILDER writes.
 */

import { isBrandPlaylistName, SIDECAR_DIR, SIDECAR_DIR_LEGACY } from "@/lib/brand";
import { parseRekordboxPdb } from "@/lib/rekordbox-pdb";
import {
  listLibraryAsides,
  type DirLike,
  type FileLike,
} from "@/lib/rekordbox-stick-write";

export type StickHealthVerdict =
  | "ready"
  | "needsRekordbox"
  | "hiddenFolder"
  | "empty"
  | "broken"
  | "incomplete";

export type StickHealth = {
  verdict: StickHealthVerdict;
  pioneer: "PIONEER" | ".PIONEER" | "both" | "none";
  pdb: {
    present: boolean;
    size: number;
    lastModified: number | null;
    tracks: number;
    playlists: number;
    setform: string[];
    error: string | null;
  };
  libraryDb: {
    present: boolean;
    size: number;
    lastModified: number | null;
    stale: boolean;
    /** Known to be at least as new as export.pdb — rekordbox has rewritten it. */
    synced: boolean;
  };
  exportExt: boolean;
  analysis: boolean;
  sidecar: boolean;
  /** OneLibrary was moved to SETBUILDER-Backup so Device Library players read export.pdb. */
  libraryAside: boolean;
};

export type PdbSummary = {
  tracks: number;
  /** Playlists only — history sets are not counted. */
  playlists: number;
  names: string[];
};

export function pdbSummaryOf(
  trackCount: number,
  sets: ReadonlyArray<{ kind: string; name: string }>,
): PdbSummary {
  let playlists = 0;
  const names: string[] = [];
  for (const set of sets) {
    if (set.kind === "playlist") playlists += 1;
    names.push(set.name);
  }
  return { tracks: trackCount, playlists, names };
}

export type StickHealthInput = {
  pioneer: StickHealth["pioneer"];
  pdb: {
    buffer?: ArrayBuffer;
    size: number;
    lastModified?: number;
    /** Already parsed. Skips a second read of export.pdb. */
    summary?: PdbSummary;
  } | null;
  libraryDb: { size: number; lastModified?: number } | null;
  exportExt: boolean;
  analysis: boolean;
  sidecar: boolean;
  libraryAside?: boolean;
};

function brandPlaylistNames(names: string[]): string[] {
  return names.filter((name) => isBrandPlaylistName(name));
}

/** Pure check. Used by the file-list and directory-handle readers. */
export function assessStick(input: StickHealthInput): StickHealth {
  const pdb: StickHealth["pdb"] = {
    present: Boolean(input.pdb && input.pdb.size > 0),
    size: input.pdb?.size ?? 0,
    lastModified: input.pdb?.lastModified ?? null,
    tracks: 0,
    playlists: 0,
    setform: [],
    error: null,
  };
  if (input.pdb && input.pdb.size > 0) {
    if (input.pdb.summary) {
      pdb.tracks = input.pdb.summary.tracks;
      pdb.playlists = input.pdb.summary.playlists;
      pdb.setform = brandPlaylistNames(input.pdb.summary.names);
    } else if (input.pdb.buffer) {
      try {
        const library = parseRekordboxPdb(input.pdb.buffer.slice(0));
        pdb.tracks = library.tracks.length;
        pdb.playlists = library.playlists.filter((item) => item.kind === "playlist").length;
        pdb.setform = brandPlaylistNames(library.playlists.map((item) => item.name));
      } catch (error) {
        pdb.error = error instanceof Error ? error.message : "unreadable";
      }
    } else {
      pdb.error = "unreadable";
    }
  } else if (!input.pdb) {
    pdb.error = "missing";
  } else {
    pdb.error = "empty";
  }

  const libraryLast = input.libraryDb?.lastModified ?? null;
  const pdbTime = pdb.lastModified;
  const present = Boolean(input.libraryDb && input.libraryDb.size > 0);
  const comparable = present && pdbTime != null && libraryLast != null;
  const stale = Boolean(comparable && pdbTime != null && libraryLast != null && libraryLast < pdbTime);
  const synced = Boolean(comparable && pdbTime != null && libraryLast != null && libraryLast >= pdbTime);
  const libraryDb = {
    present,
    size: input.libraryDb?.size ?? 0,
    lastModified: libraryLast,
    stale,
    synced,
  };

  let verdict: StickHealthVerdict = "ready";
  if (!pdb.present || pdb.error) verdict = "broken";
  else if (pdb.playlists === 0) verdict = "empty";
  else if (libraryDb.present && !libraryDb.synced) verdict = "needsRekordbox";
  else if (input.pioneer === "none") verdict = "incomplete";
  // .PIONEER alone is a soft warning — after prepare (OneLibrary aside) the stick
  // is ready for Device Library players; don't keep alarming the DJ.
  else if (input.pioneer === ".PIONEER" && !input.libraryAside) {
    verdict = "hiddenFolder";
  }

  return {
    verdict,
    pioneer: input.pioneer,
    pdb,
    libraryDb,
    exportExt: input.exportExt,
    analysis: input.analysis,
    sidecar: input.sidecar,
    libraryAside: Boolean(input.libraryAside),
  };
}

/** The one button the strip shows. Everything else goes into the details fold. */
export type StickAction = "prepare" | "eject" | "openRekordbox";

export type StickActionCaps = {
  /** We hold a writable directory handle and exportLibrary.db can be set aside. */
  canPrepare: boolean;
  /** The desktop helper can eject this volume. */
  canEject: boolean;
  /** rekordbox is installed on this machine. */
  canOpenRekordbox: boolean;
};

/**
 * One next step per verdict, pure and testable.
 * broken → rekordbox; needsRekordbox → prepare (or rekordbox when we only saw files);
 * hidden folder → rekordbox recreates PIONEER, else eject and try; ready or set aside → eject.
 */
export type StickActionOpts = {
  /** Import / read context: fix problems first; eject belongs after writing the set. */
  deprioritizeEject?: boolean;
};

export function primaryStickAction(
  health: Pick<StickHealth, "verdict" | "libraryAside">,
  caps: StickActionCaps,
  opts?: StickActionOpts,
): StickAction | null {
  const rekordbox = caps.canOpenRekordbox ? "openRekordbox" : null;
  const eject = caps.canEject && !opts?.deprioritizeEject ? "eject" : null;
  switch (health.verdict) {
    case "broken":
      return rekordbox;
    case "empty":
      return null;
    case "needsRekordbox":
      return caps.canPrepare ? "prepare" : rekordbox;
    case "ready":
      return eject;
    case "hiddenFolder":
      return health.libraryAside ? (eject ?? rekordbox) : (rekordbox ?? eject);
    case "incomplete":
      return null;
  }
}

/** The actions that still make sense but are not the next step. */
export function secondaryStickActions(
  health: Pick<StickHealth, "verdict" | "libraryAside">,
  caps: StickActionCaps & { canRestore: boolean },
  opts?: StickActionOpts,
): Array<StickAction | "restore"> {
  const primary = primaryStickAction(health, caps, opts);
  const list: Array<StickAction | "restore"> = [];
  if (caps.canEject && primary !== "eject") list.push("eject");
  if (caps.canOpenRekordbox && primary !== "openRekordbox") list.push("openRekordbox");
  if (caps.canRestore && health.libraryAside) list.push("restore");
  return list;
}

function foldPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\/+/, "").toLowerCase();
}

function pioneerFromPaths(paths: string[]): StickHealth["pioneer"] {
  let plain = false;
  let hidden = false;
  for (const path of paths) {
    const rel = foldPath(path);
    if (rel.includes("/.pioneer/") || rel.startsWith(".pioneer/")) hidden = true;
    else if (/(^|\/)pioneer\//.test(rel)) plain = true;
  }
  if (plain && hidden) return "both";
  if (hidden) return ".PIONEER";
  if (plain) return "PIONEER";
  return "none";
}

function named(files: File[], name: string): File | undefined {
  const needle = foldPath(name);
  return files.find((file) => {
    const rel = foldPath(file.webkitRelativePath || file.name);
    return rel.endsWith(`/${needle}`) || foldPath(file.name) === needle;
  });
}

/** From a folder the browser listed (webkitdirectory). */
export async function inspectStickFiles(
  files: File[],
  known?: PdbSummary,
): Promise<StickHealth> {
  const paths = files.map((file) => file.webkitRelativePath || file.name);
  const pdbFile = named(files, "export.pdb");
  const libraryFile = named(files, "exportLibrary.db");
  const buffer = pdbFile && !known ? await pdbFile.arrayBuffer() : null;
  return assessStick({
    pioneer: pioneerFromPaths(paths),
    pdb: pdbFile
      ? known
        ? { size: pdbFile.size, lastModified: pdbFile.lastModified, summary: known }
        : buffer
          ? { buffer, size: pdbFile.size, lastModified: pdbFile.lastModified }
          : null
      : null,
    libraryDb: libraryFile ? { size: libraryFile.size, lastModified: libraryFile.lastModified } : null,
    exportExt: Boolean(named(files, "exportExt.pdb")),
    analysis: paths.some((path) => foldPath(path).includes("usbanlz")),
    sidecar: paths.some((path) => {
      const rel = foldPath(path);
      return rel.includes("/setform/") || rel.startsWith("setform/");
    }),
    libraryAside: paths.some((path) =>
      /exportlibrary-aside-\d{8}-\d{6}\.db$/i.test(foldPath(path)),
    ),
  });
}

async function child(dir: DirLike, name: string): Promise<DirLike | null> {
  try {
    return await dir.getDirectoryHandle(name);
  } catch {
    return null;
  }
}

async function file(dir: DirLike, name: string): Promise<FileLike | null> {
  try {
    return await dir.getFileHandle(name);
  } catch {
    return null;
  }
}

type Statted = { size: number; lastModified?: number; arrayBuffer(): Promise<ArrayBuffer> };

async function stat(handle: FileLike): Promise<Statted> {
  return (await handle.getFile()) as Statted;
}

/** From the directory handle of the whole stick. */
export async function inspectStick(root: DirLike, known?: PdbSummary): Promise<StickHealth> {
  const found: Array<{ pioneer: DirLike; name: "PIONEER" | ".PIONEER" }> = [];
  for (const name of ["PIONEER", ".PIONEER", "Pioneer"] as const) {
    const dir = await child(root, name);
    if (!dir) continue;
    found.push({ pioneer: dir, name: name === ".PIONEER" ? ".PIONEER" : "PIONEER" });
  }
  const names = new Set(found.map((item) => item.name));
  const pioneer: StickHealth["pioneer"] = names.has("PIONEER") && names.has(".PIONEER")
    ? "both"
    : names.has(".PIONEER")
      ? ".PIONEER"
      : names.has("PIONEER")
        ? "PIONEER"
        : "none";

  let pdb: StickHealthInput["pdb"] = null;
  let libraryDb: StickHealthInput["libraryDb"] = null;
  let exportExt = false;
  let analysis = false;
  for (const item of found) {
    if (await child(item.pioneer, "USBANLZ") || await child(item.pioneer, "usbanlz")) analysis = true;
    const rekordbox = await child(item.pioneer, "rekordbox");
    if (!rekordbox) continue;
    const pdbHandle = await file(rekordbox, "export.pdb");
    if (pdbHandle && !pdb) {
      const meta = await stat(pdbHandle);
      pdb = known
        ? { size: meta.size, lastModified: meta.lastModified, summary: known }
        : { buffer: await meta.arrayBuffer(), size: meta.size, lastModified: meta.lastModified };
    }
    const libHandle = await file(rekordbox, "exportLibrary.db");
    if (libHandle && !libraryDb) {
      const meta = await stat(libHandle);
      libraryDb = { size: meta.size, lastModified: meta.lastModified };
    }
    if (await file(rekordbox, "exportExt.pdb")) exportExt = true;
  }
  const sidecar = Boolean(
    (await child(root, SIDECAR_DIR)) ?? (await child(root, SIDECAR_DIR_LEGACY)),
  );
  const libraryAside = (await listLibraryAsides(root)).length > 0;

  return assessStick({ pioneer, pdb, libraryDb, exportExt, analysis, sidecar, libraryAside });
}
