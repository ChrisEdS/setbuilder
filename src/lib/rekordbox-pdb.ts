/**
 * Reader for the DeviceSQL database rekordbox writes to USB/SD media:
 * `PIONEER/rekordbox/export.pdb`.
 *
 * Page layout follows the crate-digger rekordbox_pdb description:
 * fixed-size pages, row index growing backwards from the page end,
 * little-endian integers, DeviceSQL strings.
 */

import { LocalizedError } from "@/lib/i18n/error";

export type PdbTrack = {
  id: number;
  title: string;
  artist: string;
  album: string;
  key: string;
  bpm: string;
  durationMs: number;
  comment: string;
  /** Remix / mix name — Mixed In Key sometimes writes Energy here. */
  mixName: string;
  filePath: string;
  filename: string;
  /** Cover path on the stick, e.g. /PIONEER/Artwork/00001/a1.jpg */
  artworkPath: string;
};

export type PdbPlaylist = {
  id: number;
  name: string;
  path: string;
  kind: "playlist" | "history";
  trackIds: number[];
};

export type PdbLibrary = {
  tracks: PdbTrack[];
  playlists: PdbPlaylist[];
};

const TABLE = {
  tracks: 0,
  artists: 2,
  albums: 3,
  keys: 5,
  artwork: 13,
  playlistTree: 7,
  playlistEntries: 8,
  historyPlaylists: 11,
  historyEntries: 12,
} as const;

const HEAP = 0x28;

export function parseRekordboxPdb(buffer: ArrayBuffer): PdbLibrary {
  if (buffer.byteLength < 64) {
    throw new LocalizedError(
      "exports.pdb.tooSmall",
      undefined,
      "Die Datei ist zu klein für eine rekordbox export.pdb.",
    );
  }
  const view = new DataView(buffer);
  const pageLen = view.getUint32(4, true);
  const tableCount = view.getUint32(8, true);
  if (
    pageLen < 512 ||
    pageLen > 65536 ||
    pageLen % 16 !== 0 ||
    tableCount < 1 ||
    tableCount > 64 ||
    buffer.byteLength < pageLen
  ) {
    throw new LocalizedError(
      "exports.pdb.notPdb",
      undefined,
      "Das ist keine rekordbox export.pdb. Auf dem Stick liegt sie unter PIONEER/rekordbox/export.pdb.",
    );
  }

  const tables = new Map<number, { first: number; last: number }>();
  for (let i = 0; i < tableCount; i++) {
    const at = 28 + i * 16;
    if (at + 16 > pageLen) break;
    tables.set(view.getUint32(at, true), {
      first: view.getUint32(at + 8, true),
      last: view.getUint32(at + 12, true),
    });
  }

  const artists = readNamedRows(view, pageLen, tables.get(TABLE.artists), readArtist);
  const albums = readNamedRows(view, pageLen, tables.get(TABLE.albums), readAlbum);
  const keys = readNamedRows(view, pageLen, tables.get(TABLE.keys), readKey);
  const artwork = readNamedRows(view, pageLen, tables.get(TABLE.artwork), readArtwork);
  const tracks = readTracks(
    view,
    pageLen,
    tables.get(TABLE.tracks),
    artists,
    albums,
    keys,
    artwork,
  );
  const tree = readPlaylistTree(view, pageLen, tables.get(TABLE.playlistTree));
  const entries = readPlaylistEntries(view, pageLen, tables.get(TABLE.playlistEntries));
  const history = readHistoryPlaylists(view, pageLen, tables.get(TABLE.historyPlaylists));
  const historyEntries = readHistoryEntries(view, pageLen, tables.get(TABLE.historyEntries));

  const playlists = [
    ...assemblePlaylists(tree, entries),
    ...assembleHistory(history, historyEntries),
  ];

  if (!tracks.length && !playlists.length) {
    throw new LocalizedError(
      "exports.pdb.empty",
      undefined,
      "export.pdb gelesen, aber ohne Tracks oder Playlists.",
    );
  }

  return { tracks, playlists };
}

function readNamedRows(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
  read: (view: DataView, row: number, pageEnd: number) => { id: number; name: string } | null,
): Map<number, string> {
  const map = new Map<number, string>();
  if (!table) return map;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    const item = read(view, row, pageEnd);
    if (item && item.id) map.set(item.id, item.name);
  });
  return map;
}

function readArtist(view: DataView, row: number, pageEnd: number) {
  if (row + 10 > pageEnd) return null;
  const subtype = view.getUint16(row, true);
  const id = view.getUint32(row + 4, true);
  const name = readOffsetString(view, row, pageEnd, subtype, 9, 0x0a);
  return { id, name };
}

function readAlbum(view: DataView, row: number, pageEnd: number) {
  if (row + 22 > pageEnd) return null;
  const subtype = view.getUint16(row, true);
  const id = view.getUint32(row + 12, true);
  const name = readOffsetString(view, row, pageEnd, subtype, 21, 0x16);
  return { id, name };
}

function readArtwork(view: DataView, row: number, pageEnd: number) {
  if (row + 6 > pageEnd) return null;
  const id = view.getUint32(row, true);
  return { id, name: readDeviceString(view, row + 4, pageEnd) };
}

function readKey(view: DataView, row: number, pageEnd: number) {
  if (row + 8 > pageEnd) return null;
  const id = view.getUint32(row, true);
  return { id, name: readDeviceString(view, row + 8, pageEnd) };
}

function readTracks(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
  artists: Map<number, string>,
  albums: Map<number, string>,
  keys: Map<number, string>,
  artwork: Map<number, string>,
): PdbTrack[] {
  const tracks: PdbTrack[] = [];
  if (!table) return tracks;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    if (row + 136 > pageEnd) return;
    const id = view.getUint32(row + 72, true);
    if (!id) return;
    const tempo = view.getUint32(row + 56, true);
    const duration = view.getUint16(row + 84, true);
    const title = trackString(view, row, pageEnd, 17);
    const filename = trackString(view, row, pageEnd, 19);
    tracks.push({
      id,
      title: title || filename || "Ohne Titel",
      artist: artists.get(view.getUint32(row + 68, true)) || "",
      album: albums.get(view.getUint32(row + 64, true)) || "",
      key: keys.get(view.getUint32(row + 32, true)) || "",
      bpm: tempo ? String(Math.round(tempo / 100)) : "",
      durationMs: duration * 1000,
      comment: trackString(view, row, pageEnd, 16),
      mixName: trackString(view, row, pageEnd, 12),
      filePath: trackString(view, row, pageEnd, 20),
      filename,
      artworkPath: artwork.get(view.getUint32(row + 28, true)) || "",
    });
  });
  return tracks;
}

function trackString(view: DataView, row: number, pageEnd: number, index: number): string {
  const ofs = view.getUint16(row + 94 + index * 2, true);
  if (!ofs) return "";
  return readDeviceString(view, row + ofs, pageEnd);
}

type TreeRow = {
  id: number;
  parentId: number;
  sort: number;
  folder: boolean;
  name: string;
};

function readPlaylistTree(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
): TreeRow[] {
  const rows: TreeRow[] = [];
  if (!table) return rows;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    if (row + 20 > pageEnd) return;
    const id = view.getUint32(row + 12, true);
    if (!id) return;
    rows.push({
      id,
      parentId: view.getUint32(row, true),
      sort: view.getUint32(row + 8, true),
      folder: view.getUint32(row + 16, true) !== 0,
      name: readDeviceString(view, row + 20, pageEnd) || "Playlist",
    });
  });
  return rows;
}

function readPlaylistEntries(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
): Array<{ playlistId: number; trackId: number; index: number }> {
  const rows: Array<{ playlistId: number; trackId: number; index: number }> = [];
  if (!table) return rows;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    if (row + 12 > pageEnd) return;
    rows.push({
      index: view.getUint32(row, true),
      trackId: view.getUint32(row + 4, true),
      playlistId: view.getUint32(row + 8, true),
    });
  });
  return rows;
}

function readHistoryPlaylists(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
): Array<{ id: number; name: string }> {
  const rows: Array<{ id: number; name: string }> = [];
  if (!table) return rows;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    if (row + 4 > pageEnd) return;
    const id = view.getUint32(row, true);
    if (!id) return;
    rows.push({
      id,
      name: readDeviceString(view, row + 4, pageEnd) || `HISTORY ${id}`,
    });
  });
  return rows;
}

function readHistoryEntries(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number } | undefined,
): Array<{ playlistId: number; trackId: number; index: number }> {
  const rows: Array<{ playlistId: number; trackId: number; index: number }> = [];
  if (!table) return rows;
  forEachRow(view, pageLen, table, (row, pageEnd) => {
    if (row + 12 > pageEnd) return;
    rows.push({
      trackId: view.getUint32(row, true),
      playlistId: view.getUint32(row + 4, true),
      index: view.getUint32(row + 8, true),
    });
  });
  return rows;
}

function assemblePlaylists(
  tree: TreeRow[],
  entries: Array<{ playlistId: number; trackId: number; index: number }>,
): PdbPlaylist[] {
  const byId = new Map(tree.map((row) => [row.id, row]));
  return tree
    .filter((row) => !row.folder)
    .map((row) => ({
      sort: row.sort,
      playlist: {
        id: row.id,
        name: row.name,
        path: folderPath(row, byId),
        kind: "playlist" as const,
        trackIds: orderedTrackIds(entries, row.id),
      },
    }))
    .sort((a, b) => a.sort - b.sort || a.playlist.path.localeCompare(b.playlist.path))
    .map((row) => row.playlist);
}

function assembleHistory(
  playlists: Array<{ id: number; name: string }>,
  entries: Array<{ playlistId: number; trackId: number; index: number }>,
): PdbPlaylist[] {
  return playlists.map((row) => ({
    id: row.id,
    name: row.name,
    path: `History / ${row.name}`,
    kind: "history" as const,
    trackIds: orderedTrackIds(entries, row.id),
  }));
}

function orderedTrackIds(
  entries: Array<{ playlistId: number; trackId: number; index: number }>,
  playlistId: number,
): number[] {
  return entries
    .filter((entry) => entry.playlistId === playlistId && entry.trackId)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.trackId);
}

function folderPath(row: TreeRow, byId: Map<number, TreeRow>): string {
  const names = [row.name];
  const seen = new Set<number>([row.id]);
  let parentId = row.parentId;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    if (parent.name && parent.name.toUpperCase() !== "ROOT") names.push(parent.name);
    parentId = parent.parentId;
  }
  return names.reverse().join(" / ");
}

function readOffsetString(
  view: DataView,
  row: number,
  pageEnd: number,
  subtype: number,
  nearAt: number,
  farAt: number,
): string {
  const far = (subtype & 0x04) === 0x04;
  if (far) {
    if (row + farAt + 2 > pageEnd) return "";
    const ofs = view.getUint16(row + farAt, true);
    return ofs ? readDeviceString(view, row + ofs, pageEnd) : "";
  }
  if (row + nearAt >= pageEnd) return "";
  const ofs = view.getUint8(row + nearAt);
  return ofs ? readDeviceString(view, row + ofs, pageEnd) : "";
}

function readDeviceString(view: DataView, pos: number, pageEnd: number): string {
  if (pos < 0 || pos >= pageEnd) return "";
  const kind = view.getUint8(pos);
  try {
    if (kind & 1) {
      const length = kind >> 1;
      const size = length - 1;
      if (size <= 0 || pos + 1 + size > pageEnd) return "";
      let text = "";
      for (let i = 0; i < size; i++) text += String.fromCharCode(view.getUint8(pos + 1 + i));
      return text.replace(/\u0000+$/g, "");
    }
    if (pos + 4 > pageEnd) return "";
    const length = view.getUint16(pos + 1, true);
    let size = length - 4;
    if (size <= 0 || pos + 4 + size > pageEnd) return "";
    if ((kind === 0x90 || (kind & 0x10) !== 0) && size % 2 === 1) size -= 1;
    const bytes = new Uint8Array(view.buffer, view.byteOffset + pos + 4, size);
    const encoding = kind === 0x90 || (kind & 0x10) !== 0 ? "utf-16le" : "latin1";
    return new TextDecoder(encoding).decode(bytes).replace(/\u0000+$/g, "");
  } catch {
    return "";
  }
}

function forEachRow(
  view: DataView,
  pageLen: number,
  table: { first: number; last: number },
  visit: (row: number, pageEnd: number) => void,
) {
  const seen = new Set<number>();
  let index = table.first;
  while (
    index > 0 &&
    index < 1_000_000 &&
    index * pageLen + pageLen <= view.byteLength &&
    !seen.has(index)
  ) {
    seen.add(index);
    const page = index * pageLen;
    const pageEnd = page + pageLen;
    const flags = view.getUint8(page + 27);
    const bitfield =
      view.getUint8(page + 24) |
      (view.getUint8(page + 25) << 8) |
      (view.getUint8(page + 26) << 16);
    const offsets = bitfield & 0x1fff;
    if ((flags & 0x40) === 0 && offsets > 0) {
      const groups = Math.min(64, Math.floor((offsets - 1) / 16) + 1);
      for (let group = 0; group < groups; group++) {
        const base = pageLen - group * 0x24;
        if (base < HEAP + 6) break;
        const present = view.getUint16(page + base - 4, true);
        const count = Math.min(16, offsets - group * 16);
        for (let i = 0; i < count; i++) {
          if (((present >> i) & 1) === 0) continue;
          const ofs = view.getUint16(page + base - 6 - 2 * i, true);
          const row = page + HEAP + ofs;
          if (row < page + HEAP || row >= pageEnd) continue;
          visit(row, pageEnd);
        }
      }
    }
    if (index === table.last) break;
    const next = view.getUint32(page + 12, true);
    const nextType = view.getUint32(page + 8, true);
    if (!next || next === index) break;
    if (next * pageLen + 12 <= view.byteLength) {
      const followedType = view.getUint32(next * pageLen + 8, true);
      if (followedType !== nextType) break;
    }
    index = next;
  }
}
