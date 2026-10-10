import assert from "node:assert/strict";
import test from "node:test";
import { parseRekordboxPdb } from "./rekordbox-pdb.ts";

const PAGE = 4096;

test("reads a playlist and a history set from export.pdb", () => {
  const library = parseRekordboxPdb(fixture());
  assert.equal(library.tracks.length, 1);
  assert.equal(library.tracks[0].title, "Night Drive");
  assert.equal(library.tracks[0].artist, "Ada");
  assert.equal(library.tracks[0].album, "Floor");
  assert.equal(library.tracks[0].key, "8A");
  assert.equal(library.tracks[0].bpm, "128");
  assert.equal(library.tracks[0].durationMs, 200_000);
  assert.equal(library.tracks[0].comment, "opener");
  assert.equal(library.tracks[0].filePath, "/Night Drive.mp3");

  const playlist = library.playlists.find((item) => item.kind === "playlist");
  const history = library.playlists.find((item) => item.kind === "history");
  assert.ok(playlist);
  assert.equal(playlist.path, "Sets / Freitag");
  assert.deepEqual(playlist.trackIds, [7]);
  assert.ok(history);
  assert.equal(history.name, "HISTORY 001");
  assert.deepEqual(history.trackIds, [7]);
});

test("rejects a file that is not a rekordbox database", () => {
  assert.throws(() => parseRekordboxPdb(new ArrayBuffer(32)), /export\.pdb/);
});

function fixture(): ArrayBuffer {
  const tables = [
    { type: 2, page: 1 },
    { type: 3, page: 2 },
    { type: 5, page: 3 },
    { type: 0, page: 4 },
    { type: 7, page: 5 },
    { type: 8, page: 6 },
    { type: 11, page: 7 },
    { type: 12, page: 8 },
  ];
  const file = new Uint8Array((tables.length + 1) * PAGE);
  const header = new DataView(file.buffer);
  header.setUint32(4, PAGE, true);
  header.setUint32(8, tables.length, true);
  tables.forEach((table, index) => {
    const at = 28 + index * 16;
    header.setUint32(at, table.type, true);
    header.setUint32(at + 8, table.page, true);
    header.setUint32(at + 12, table.page, true);
  });

  writeRow(file, 1, 2, artistRow());
  writeRow(file, 2, 3, albumRow());
  writeRow(file, 3, 5, keyRow());
  writeRow(file, 4, 0, trackRow());
  writeRows(file, 5, 7, playlistRows());
  writeRow(file, 6, 8, entryRow());
  writeRow(file, 7, 11, historyPlaylistRow());
  writeRow(file, 8, 12, historyEntryRow());
  return file.buffer;
}

function writeRow(file: Uint8Array, pageIndex: number, type: number, row: Uint8Array) {
  writeRows(file, pageIndex, type, [row]);
}

function writeRows(file: Uint8Array, pageIndex: number, type: number, rows: Uint8Array[]) {
  const page = pageIndex * PAGE;
  const view = new DataView(file.buffer);
  view.setUint32(page + 4, pageIndex, true);
  view.setUint32(page + 8, type, true);
  const bitfield = rows.length | (rows.length << 13);
  view.setUint8(page + 24, bitfield & 0xff);
  view.setUint8(page + 25, (bitfield >> 8) & 0xff);
  view.setUint8(page + 26, (bitfield >> 16) & 0xff);
  view.setUint8(page + 27, 0x24);
  let cursor = 0;
  rows.forEach((row, index) => {
    file.set(row, page + 0x28 + cursor);
    view.setUint16(page + PAGE - 6 - index * 2, cursor, true);
    cursor += row.length;
  });
  view.setUint16(page + PAGE - 4, (1 << rows.length) - 1, true);
}

function shortAscii(text: string): Uint8Array {
  const bytes = new Uint8Array(1 + text.length);
  bytes[0] = ((text.length + 1) << 1) | 1;
  for (let i = 0; i < text.length; i++) bytes[i + 1] = text.charCodeAt(i);
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

function trackRow(): Uint8Array {
  const title = shortAscii("Night Drive");
  const comment = shortAscii("opener");
  const filePath = shortAscii("/Night Drive.mp3");
  const row = new Uint8Array(136 + title.length + comment.length + filePath.length);
  const view = new DataView(row.buffer);
  view.setUint16(0, 0x24, true);
  view.setUint32(32, 1, true);
  view.setUint32(56, 12800, true);
  view.setUint32(64, 4, true);
  view.setUint32(68, 1, true);
  view.setUint32(72, 7, true);
  view.setUint16(84, 200, true);
  const commentAt = 136;
  const titleAt = commentAt + comment.length;
  const pathAt = titleAt + title.length;
  view.setUint16(94 + 16 * 2, commentAt, true);
  view.setUint16(94 + 17 * 2, titleAt, true);
  view.setUint16(94 + 20 * 2, pathAt, true);
  row.set(comment, commentAt);
  row.set(title, titleAt);
  row.set(filePath, pathAt);
  return row;
}

function playlistRows(): Uint8Array[] {
  return [
    namedPlaylist(0, 0, 2, true, shortAscii("Sets")),
    namedPlaylist(2, 1, 3, false, utf16("Freitag")),
  ];
}

function utf16(text: string): Uint8Array {
  const body = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    body[i * 2] = code & 0xff;
    body[i * 2 + 1] = code >> 8;
  }
  const bytes = new Uint8Array(4 + body.length);
  bytes[0] = 0x90;
  bytes[1] = bytes.length & 0xff;
  bytes[2] = (bytes.length >> 8) & 0xff;
  bytes.set(body, 4);
  return bytes;
}

function namedPlaylist(
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

function entryRow(): Uint8Array {
  const row = new Uint8Array(12);
  const view = new DataView(row.buffer);
  view.setUint32(4, 7, true);
  view.setUint32(8, 3, true);
  return row;
}

function historyPlaylistRow(): Uint8Array {
  const name = shortAscii("HISTORY 001");
  const row = new Uint8Array(4 + name.length);
  const view = new DataView(row.buffer);
  view.setUint32(0, 9, true);
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
