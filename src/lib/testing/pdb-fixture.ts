// Test-only: builds a small rekordbox stick database whose page headers are consistent.
export const PAGE = 4096;

// ---------------------------------------------------------------------------------------------
// Fixture: a database whose page headers are fully consistent, with two pages per entries table.

export type Options = { fillEntryLastPage?: boolean; fillEntryFirstPage?: boolean; fillTree?: boolean };

export const ARTIST_PAGE = 1;
export const ALBUM_PAGE = 2;
export const KEY_PAGE = 3;
export const TRACK_PAGE = 4;
export const TREE_PAGE = 5;
export const ENTRY_FIRST = 6;
export const ENTRY_LAST = 7;
export const HISTORY_PAGE = 8;
export const HISTORY_ENTRY_PAGE = 9;
export const TREE_RESERVED = 10; // blank page inside the file, reserved for the tree table
export const ENTRY_RESERVED = 11; // beyond the end of the file, reserved for the entries table
export const TOTAL_PAGES = 11;

export function fixture(options: Options = {}): ArrayBuffer {
  const file = new Uint8Array(TOTAL_PAGES * PAGE);
  const view = new DataView(file.buffer);
  const tables: Array<{ type: number; first: number; last: number; empty?: number }> = [
    { type: 2, first: ARTIST_PAGE, last: ARTIST_PAGE },
    { type: 3, first: ALBUM_PAGE, last: ALBUM_PAGE },
    { type: 5, first: KEY_PAGE, last: KEY_PAGE },
    { type: 0, first: TRACK_PAGE, last: TRACK_PAGE },
    { type: 7, first: TREE_PAGE, last: TREE_PAGE, empty: TREE_RESERVED },
    { type: 8, first: ENTRY_FIRST, last: ENTRY_LAST, empty: ENTRY_RESERVED },
    { type: 11, first: HISTORY_PAGE, last: HISTORY_PAGE },
    { type: 12, first: HISTORY_ENTRY_PAGE, last: HISTORY_ENTRY_PAGE },
  ];
  view.setUint32(4, PAGE, true);
  view.setUint32(8, tables.length, true);
  view.setUint32(12, 12, true);
  view.setUint32(0x14, 5, true);
  tables.forEach((table, index) => {
    const at = 28 + index * 16;
    view.setUint32(at, table.type, true);
    view.setUint32(at + 4, table.empty ?? 0, true);
    view.setUint32(at + 8, table.first, true);
    view.setUint32(at + 12, table.last, true);
  });

  page(file, ARTIST_PAGE, 2, 0, [artistRow()]);
  page(file, ALBUM_PAGE, 3, 0, [albumRow()]);
  page(file, KEY_PAGE, 5, 0, [keyRow()]);
  page(file, TRACK_PAGE, 0, 0, [trackRow(7, "Night Drive"), trackRow(8, "Morning Light")]);
  const treeRows = [
    treeRow(0, 0, 2, true, shortAscii("Sets")),
    treeRow(2, 1, 3, false, utf16("Freitag")),
  ];
  if (options.fillTree) {
    // Many small playlists until the page cannot take another one.
    for (let id = 4; ; id++) {
      const row = treeRow(0, id, id, false, shortAscii(`P${id}`));
      const rows = treeRows.length + 1;
      const used = treeRows.reduce((sum, item) => sum + ((item.length + 3) & ~3), 0) + 28;
      if (0x28 + used + 2 * rows + 4 * Math.ceil(rows / 16) + 8 > PAGE) break;
      treeRows.push(row);
    }
  }
  page(file, TREE_PAGE, 7, TREE_RESERVED, treeRows);

  const firstRows = [entryRow(1, 7, 3)];
  const lastRows = [entryRow(1, 8, 3)];
  if (options.fillEntryFirstPage) fillWithEntries(firstRows);
  if (options.fillEntryLastPage) fillWithEntries(lastRows);
  page(file, ENTRY_FIRST, 8, ENTRY_LAST, firstRows);
  page(file, ENTRY_LAST, 8, ENTRY_RESERVED, lastRows);
  page(file, HISTORY_PAGE, 11, 0, [historyPlaylistRow()]);
  page(file, HISTORY_ENTRY_PAGE, 12, 0, [historyEntryRow()]);
  return file.buffer;
}

/** Fill a page with entry rows until fewer than `leave` bytes are free. */
function fillWithEntries(rows: Uint8Array[], leave = 20) {
  for (;;) {
    const next = rows.length + 1;
    const free = PAGE - 0x28 - next * 12 - (2 * next + 4 * Math.ceil(next / 16));
    if (free < leave) break;
    rows.push(entryRow(rows.length + 1, 8, 3));
  }
}

function page(file: Uint8Array, index: number, type: number, next: number, rows: Uint8Array[]) {
  const view = new DataView(file.buffer);
  const start = index * PAGE;
  view.setUint32(start + 4, index, true);
  view.setUint32(start + 8, type, true);
  view.setUint32(start + 12, next, true);
  view.setUint32(start + 0x10, 3, true);
  const bitfield = rows.length | (rows.length << 13);
  view.setUint8(start + 24, bitfield & 0xff);
  view.setUint8(start + 25, (bitfield >> 8) & 0xff);
  view.setUint8(start + 26, (bitfield >> 16) & 0xff);
  view.setUint8(start + 27, 0x34);
  let cursor = 0;
  rows.forEach((row, i) => {
    file.set(row, start + 0x28 + cursor);
    const group = Math.floor(i / 16);
    view.setUint16(start + PAGE - group * 0x24 - 6 - (i % 16) * 2, cursor, true);
    cursor += (row.length + 3) & ~3;
  });
  const groups = Math.ceil(rows.length / 16);
  const indexBytes = 2 * rows.length + 4 * groups;
  for (let group = 0; group < groups; group++) {
    const count = Math.min(16, rows.length - group * 16);
    const bits = (1 << count) - 1;
    view.setUint16(start + PAGE - group * 0x24 - 4, bits, true);
    view.setUint16(start + PAGE - group * 0x24 - 2, 0, true);
  }
  view.setUint16(start + 0x1c, PAGE - 0x28 - cursor - indexBytes, true);
  view.setUint16(start + 0x1e, cursor, true);
  view.setUint16(start + 0x22, Math.max(0, rows.length - 1), true);
}

function shortAscii(text: string): Uint8Array {
  const bytes = new Uint8Array(1 + text.length);
  bytes[0] = ((text.length + 1) << 1) | 1;
  for (let i = 0; i < text.length; i++) bytes[i + 1] = text.charCodeAt(i);
  return bytes;
}

function utf16(text: string): Uint8Array {
  const bytes = new Uint8Array(4 + text.length * 2);
  bytes[0] = 0x90;
  bytes[1] = bytes.length & 0xff;
  bytes[2] = (bytes.length >> 8) & 0xff;
  for (let i = 0; i < text.length; i++) {
    bytes[4 + i * 2] = text.charCodeAt(i) & 0xff;
    bytes[4 + i * 2 + 1] = text.charCodeAt(i) >> 8;
  }
  return bytes;
}

function artistRow(): Uint8Array {
  const name = shortAscii("Ada");
  const row = new Uint8Array(10 + name.length);
  const view = new DataView(row.buffer);
  view.setUint16(0, 0x60, true);
  view.setUint32(4, 1, true);
  row[8] = 0x03;
  row[9] = 10;
  row.set(name, 10);
  return row;
}

function albumRow(): Uint8Array {
  const name = shortAscii("Floor");
  const row = new Uint8Array(22 + name.length);
  const view = new DataView(row.buffer);
  view.setUint16(0, 0x80, true);
  view.setUint32(8, 1, true);
  view.setUint32(12, 4, true);
  row[20] = 0x03;
  row[21] = 22;
  row.set(name, 22);
  return row;
}

function keyRow(): Uint8Array {
  const name = shortAscii("8A");
  const row = new Uint8Array(8 + name.length);
  const view = new DataView(row.buffer);
  view.setUint32(0, 1, true);
  view.setUint32(4, 1, true);
  row.set(name, 8);
  return row;
}

function trackRow(id: number, titleText: string): Uint8Array {
  const title = shortAscii(titleText);
  const filePath = shortAscii(`/${titleText}.mp3`);
  const row = new Uint8Array(136 + title.length + filePath.length);
  const view = new DataView(row.buffer);
  view.setUint16(0, 0x24, true);
  view.setUint32(32, 1, true);
  view.setUint32(56, 12800, true);
  view.setUint32(64, 4, true);
  view.setUint32(68, 1, true);
  view.setUint32(72, id, true);
  view.setUint16(84, 200, true);
  const titleAt = 136;
  const pathAt = titleAt + title.length;
  view.setUint16(94 + 17 * 2, titleAt, true);
  view.setUint16(94 + 20 * 2, pathAt, true);
  row.set(title, titleAt);
  row.set(filePath, pathAt);
  return row;
}

function treeRow(
  parentId: number,
  sort: number,
  id: number,
  folder: boolean,
  label: Uint8Array,
): Uint8Array {
  const row = new Uint8Array(20 + label.length);
  const view = new DataView(row.buffer);
  view.setUint32(0, parentId, true);
  view.setUint32(8, sort, true);
  view.setUint32(12, id, true);
  view.setUint32(16, folder ? 1 : 0, true);
  row.set(label, 20);
  return row;
}

function entryRow(index: number, trackId: number, playlistId: number): Uint8Array {
  const row = new Uint8Array(12);
  const view = new DataView(row.buffer);
  view.setUint32(0, index, true);
  view.setUint32(4, trackId, true);
  view.setUint32(8, playlistId, true);
  return row;
}

function historyPlaylistRow(): Uint8Array {
  const name = shortAscii("HISTORY 001");
  const row = new Uint8Array(4 + name.length);
  new DataView(row.buffer).setUint32(0, 9, true);
  row.set(name, 4);
  return row;
}

function historyEntryRow(): Uint8Array {
  const row = new Uint8Array(12);
  const view = new DataView(row.buffer);
  view.setUint32(0, 7, true);
  view.setUint32(4, 9, true);
  return row;
}
