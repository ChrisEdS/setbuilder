/**
 * Adds ONE playlist to a rekordbox stick database (`PIONEER/rekordbox/export.pdb`).
 *
 * Safety model, because a broken stick database makes the stick unreadable:
 *  - No existing row is moved or changed. New rows go into free space of the two playlist
 *    tables (tree = table 7, entries = table 8). When a table is full, ONE new page is taken
 *    the way rekordbox does it: the table's reserved "empty candidate" page.
 *  - A page is only written to when its header agrees with its content (row counts, used and
 *    free bytes, row ends). Anything unexpected makes the writer refuse instead of guess.
 *  - All work happens on a copy. The input is never modified, errors leave nothing behind.
 *  - `verifyPdbUpdate` compares result and original byte for byte and re-reads the result.
 *  - The caller keeps a backup and restores it when verification fails (see rekordbox-stick-write).
 *
 * Layout (crate-digger rekordbox_pdb, checked against real exports): 0x28 byte page header,
 * row heap growing up from 0x28, row index growing down from the page end in groups of 16
 * slots (16 offsets, then present flags and transaction flags, 0x24 bytes for a full group).
 * `free_size = page - 0x28 - used_size - (2 * slots + 4 * groups)`.
 */

import { LocalizedError } from "@/lib/i18n/error";
import { parseRekordboxPdb, type PdbLibrary } from "@/lib/rekordbox-pdb";

const HEAP = 0x28;
const GROUP = 0x24;
const TREE = 7;
const ENTRIES = 8;

export class PdbWriteError extends LocalizedError {}

export type AddPlaylistInput = {
  name: string;
  trackIds: number[];
};

export type Allocation = {
  /** Table type that took a new page. */
  table: number;
  page: number;
};

export type AddPlaylistResult = {
  buffer: ArrayBuffer;
  playlistId: number;
  /** Name as written (made unique among the playlists at the root). */
  name: string;
  changedPages: number[];
  allocated: Allocation[];
};

type TableRef = { type: number; first: number; last: number; empty: number; at: number };

type PageState = {
  index: number;
  start: number;
  rows: number;
  slots: number;
  used: number;
  free: number;
  sequence: number;
};

function unsupported(): PdbWriteError {
  return new PdbWriteError(
    "exports.pdbWrite.unsupported",
    undefined,
    "Diese Stick-Datenbank hat ein Layout, das SETFORM nicht sicher beschreiben kann. Es wurde nichts verändert.",
  );
}

function noRoom(): PdbWriteError {
  return new PdbWriteError(
    "exports.pdbWrite.noRoom",
    undefined,
    "In der Stick-Datenbank ist kein Platz mehr für eine weitere Playlist. Es wurde nichts verändert.",
  );
}

function readHeader(view: DataView) {
  if (view.byteLength < 64) throw unsupported();
  const pageLen = view.getUint32(4, true);
  const tableCount = view.getUint32(8, true);
  if (
    pageLen < 512 ||
    pageLen > 65536 ||
    pageLen % 16 !== 0 ||
    view.byteLength % pageLen !== 0 ||
    tableCount < 1 ||
    tableCount > 64 ||
    28 + tableCount * 16 > pageLen
  ) {
    throw unsupported();
  }
  const tables = new Map<number, TableRef>();
  for (let i = 0; i < tableCount; i++) {
    const at = 28 + i * 16;
    const type = view.getUint32(at, true);
    tables.set(type, {
      type,
      empty: view.getUint32(at + 4, true),
      first: view.getUint32(at + 8, true),
      last: view.getUint32(at + 12, true),
      at,
    });
  }
  return { pageLen, tables, pages: view.byteLength / pageLen };
}

function slotAddress(pageLen: number, start: number, slot: number): number {
  const base = pageLen - Math.floor(slot / 16) * GROUP;
  return start + base - 6 - 2 * (slot % 16);
}

function presentAddress(pageLen: number, start: number, group: number): number {
  return start + pageLen - group * GROUP - 4;
}

function groupsFor(slots: number): number {
  return Math.ceil(slots / 16);
}

/** Bytes the row index takes at the page end. A partial last group is only as big as it is full. */
function indexBytes(slots: number): number {
  return 2 * slots + 4 * groupsFor(slots);
}

function align4(value: number): number {
  return (value + 3) & ~3;
}

function deviceStringBytes(view: DataView, pos: number, limit: number): number {
  if (pos < 0 || pos >= limit) return 0;
  const kind = view.getUint8(pos);
  if (kind & 1) return kind >> 1;
  if (pos + 3 > limit) return 0;
  return view.getUint16(pos + 1, true);
}

/** Page indexes of a table in chain order. Mirrors the reader's chain walk. */
function tableChain(view: DataView, pageLen: number, table: TableRef): number[] {
  const chain: number[] = [];
  const seen = new Set<number>();
  let index = table.first;
  while (
    index > 0 &&
    index < 1_000_000 &&
    index * pageLen + pageLen <= view.byteLength &&
    !seen.has(index)
  ) {
    seen.add(index);
    chain.push(index);
    if (index === table.last) break;
    const next = view.getUint32(index * pageLen + 12, true);
    if (!next || next === index) break;
    if (next * pageLen + 12 <= view.byteLength) {
      if (view.getUint32(next * pageLen + 8, true) !== table.type) break;
    }
    index = next;
  }
  return chain;
}

/** Present rows of a page, read-only and forgiving: used to collect ids. */
function presentRows(view: DataView, pageLen: number, pageIndex: number): number[] {
  const start = pageIndex * pageLen;
  const flags = view.getUint8(start + 27);
  if ((flags & 0x40) !== 0) return [];
  const slots =
    (view.getUint8(start + 24) | (view.getUint8(start + 25) << 8) | (view.getUint8(start + 26) << 16)) &
    0x1fff;
  const rows: number[] = [];
  for (let group = 0; group < groupsFor(slots); group++) {
    const present = view.getUint16(presentAddress(pageLen, start, group), true);
    for (let i = 0; i < 16 && group * 16 + i < slots; i++) {
      if (((present >> i) & 1) === 0) continue;
      const ofs = view.getUint16(slotAddress(pageLen, start, group * 16 + i), true);
      const row = start + HEAP + ofs;
      if (row + 20 > start + pageLen) continue;
      rows.push(row);
    }
  }
  return rows;
}

/**
 * Reads the page header and checks it against the page content.
 * Returns null when the page is not safe to append to.
 */
function readPage(
  view: DataView,
  pageLen: number,
  pageIndex: number,
  type: number,
): PageState | null {
  const start = pageIndex * pageLen;
  if (start + pageLen > view.byteLength) return null;
  if (view.getUint32(start + 4, true) !== pageIndex) return null;
  if (view.getUint32(start + 8, true) !== type) return null;
  if ((view.getUint8(start + 27) & 0x40) !== 0) return null; // not a data page

  const bitfield =
    view.getUint8(start + 24) |
    (view.getUint8(start + 25) << 8) |
    (view.getUint8(start + 26) << 16);
  const slots = bitfield & 0x1fff;
  const rows = (bitfield >> 13) & 0x7ff;
  const free = view.getUint16(start + 0x1c, true);
  const used = view.getUint16(start + 0x1e, true);
  const large = view.getUint16(start + 0x22, true);
  if (rows > slots) return null;
  // A "large" row count other than 0x1fff means the real count is stored there. Not handled.
  if (large > rows && large !== 0x1fff) return null;

  const heapEnd = HEAP + used;
  if (heapEnd + indexBytes(slots) !== pageLen - free) return null;

  // Every present row must start and end inside the heap that `used` claims.
  let present = 0;
  for (let group = 0; group < groupsFor(slots); group++) {
    const flagsAt = view.getUint16(presentAddress(pageLen, start, group), true);
    for (let i = 0; i < 16 && group * 16 + i < slots; i++) {
      if (((flagsAt >> i) & 1) === 0) continue;
      present += 1;
      const ofs = view.getUint16(slotAddress(pageLen, start, group * 16 + i), true);
      const row = HEAP + ofs;
      if (row >= heapEnd) return null;
      const size =
        type === ENTRIES ? 12 : 20 + deviceStringBytes(view, start + row + 20, start + pageLen);
      if ((type === TREE && size <= 20) || row + size > heapEnd) return null;
    }
  }
  if (present !== rows) return null;
  return {
    index: pageIndex,
    start,
    rows,
    slots,
    used,
    free,
    sequence: view.getUint32(start + 0x10, true),
  };
}

function consumption(page: PageState, rowBytes: number): number {
  return align4(page.used) - page.used + rowBytes + 2 + (page.slots % 16 === 0 ? 4 : 0);
}

function fits(page: PageState, rowBytes: number): boolean {
  return page.slots < 0x1fff && page.rows < 0x7ff && consumption(page, rowBytes) <= page.free;
}

function deviceString(text: string): Uint8Array {
  const ascii = /^[\x20-\x7e]*$/.test(text);
  if (ascii && text.length <= 126) {
    const bytes = new Uint8Array(1 + text.length);
    bytes[0] = ((text.length + 1) << 1) | 1;
    for (let i = 0; i < text.length; i++) bytes[i + 1] = text.charCodeAt(i);
    return bytes;
  }
  const bytes = new Uint8Array(4 + text.length * 2);
  bytes[0] = 0x90;
  bytes[1] = bytes.length & 0xff;
  bytes[2] = (bytes.length >> 8) & 0xff;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes[4 + i * 2] = code & 0xff;
    bytes[4 + i * 2 + 1] = code >> 8;
  }
  return bytes;
}

function padded(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(align4(bytes.length));
  out.set(bytes);
  return out;
}

type TreeRow = { id: number; parentId: number; sort: number; name: string };

function readTreeRows(view: DataView, pageLen: number, chain: number[]): TreeRow[] {
  const rows: TreeRow[] = [];
  for (const pageIndex of chain) {
    const limit = pageIndex * pageLen + pageLen;
    for (const row of presentRows(view, pageLen, pageIndex)) {
      rows.push({
        parentId: view.getUint32(row, true),
        sort: view.getUint32(row + 8, true),
        id: view.getUint32(row + 12, true),
        name: readName(view, row + 20, limit),
      });
    }
  }
  return rows;
}

function readName(view: DataView, pos: number, limit: number): string {
  if (pos >= limit) return "";
  const kind = view.getUint8(pos);
  if (kind & 1) {
    let text = "";
    for (let i = 1; i < (kind >> 1) && pos + i < limit; i++) {
      text += String.fromCharCode(view.getUint8(pos + i));
    }
    return text.replace(/\u0000+$/g, "");
  }
  const length = view.getUint16(pos + 1, true);
  let text = "";
  for (let i = 4; i + 1 < length && pos + i + 1 < limit; i += 2) {
    text += String.fromCharCode(view.getUint16(pos + i, true));
  }
  return text.replace(/\u0000+$/g, "");
}

/** The name as it is stored: no control characters, trimmed, not absurdly long. */
export function cleanPlaylistName(raw: string): string {
  const name = raw.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return (name || "SETFORM").slice(0, 80);
}

function uniqueName(wanted: string, taken: Set<string>): string {
  if (!taken.has(wanted.toLowerCase())) return wanted;
  for (let n = 2; n < 1000; n++) {
    const suffix = ` (${n})`;
    const next = wanted.slice(0, 80 - suffix.length) + suffix;
    if (!taken.has(next.toLowerCase())) return next;
  }
  return `${wanted.slice(0, 70)} ${Date.now()}`;
}

/** All the state one write touches. Works on its own copy of the file. */
class Work {
  bytes: Uint8Array;
  view: DataView;
  readonly pageLen: number;
  readonly headerSequence: number;
  readonly sequence: number;
  readonly changed = new Set<number>();
  readonly allocated: Allocation[] = [];

  constructor(source: ArrayBuffer) {
    this.bytes = new Uint8Array(source.byteLength);
    this.bytes.set(new Uint8Array(source));
    this.view = new DataView(this.bytes.buffer);
    this.pageLen = readHeader(this.view).pageLen;
    this.headerSequence = this.view.getUint32(0x14, true);
    this.sequence = this.headerSequence + 1;
  }

  get pages(): number {
    return this.bytes.length / this.pageLen;
  }

  insert(page: PageState, row: Uint8Array) {
    const { view, bytes, pageLen } = this;
    const start = page.start;
    const at = align4(page.used);
    const slot = page.slots;
    const group = Math.floor(slot / 16);
    const flagsAt = presentAddress(pageLen, start, group);
    const bit = 1 << (slot % 16);

    // A new group of 16 slots starts with clean flags.
    if (slot % 16 === 0) {
      view.setUint16(flagsAt, 0, true);
      view.setUint16(flagsAt + 2, 0, true);
    }

    bytes.set(row, start + HEAP + at);
    view.setUint16(slotAddress(pageLen, start, slot), at, true);
    view.setUint16(flagsAt, view.getUint16(flagsAt, true) | bit, true);
    // rekordbox marks the rows written by the latest transaction.
    view.setUint16(flagsAt + 2, view.getUint16(flagsAt + 2, true) | bit, true);

    const used = at + row.length;
    const free = page.free - consumption(page, row.length);
    view.setUint16(start + 0x1c, free, true);
    view.setUint16(start + 0x1e, used, true);

    const rows = page.rows + 1;
    const bitfield = (slot + 1) | (rows << 13);
    view.setUint8(start + 24, bitfield & 0xff);
    view.setUint8(start + 25, (bitfield >> 8) & 0xff);
    view.setUint8(start + 26, (bitfield >> 16) & 0xff);
    // On untouched pages this field is "rows - 1"; keep that relation.
    if (page.rows > 0 && view.getUint16(start + 0x22, true) === page.rows - 1) {
      view.setUint16(start + 0x22, rows - 1, true);
    }
    if (page.sequence <= this.headerSequence) {
      view.setUint32(start + 0x10, this.sequence, true);
    }

    page.used = used;
    page.free = free;
    page.slots = slot + 1;
    page.rows = rows;
    page.sequence = Math.max(page.sequence, this.sequence);
    this.changed.add(page.index);
  }

  /**
   * Takes the table's reserved empty page, the way rekordbox grows a table:
   * the last page already points to it; it becomes the new last page and a fresh
   * page number is reserved as the next empty candidate.
   */
  allocate(table: TableRef): PageState {
    const { view, pageLen } = this;
    const reserved = table.empty;
    const lastStart = table.last * pageLen;
    if (
      !reserved ||
      table.last * pageLen + pageLen > this.bytes.length ||
      view.getUint32(lastStart + 12, true) !== reserved
    ) {
      throw unsupported();
    }

    if (reserved < this.pages) {
      // Reserved and inside the file: must be completely blank.
      const from = reserved * pageLen;
      for (let i = 0; i < pageLen; i++) if (this.bytes[from + i] !== 0) throw unsupported();
    } else if (reserved === this.pages) {
      const grown = new Uint8Array(this.bytes.length + pageLen);
      grown.set(this.bytes);
      this.bytes = grown;
      this.view = new DataView(grown.buffer);
    } else {
      throw unsupported();
    }

    const nextUnused = this.view.getUint32(0x0c, true);
    if (nextUnused <= reserved || nextUnused < this.pages) throw unsupported();
    const v = this.view;
    v.setUint32(0x0c, nextUnused + 1, true);

    const start = reserved * pageLen;
    v.setUint32(start + 4, reserved, true);
    v.setUint32(start + 8, table.type, true);
    v.setUint32(start + 12, nextUnused, true);
    v.setUint32(start + 0x10, this.sequence, true);
    this.bytes[start + 27] = 0x34;
    v.setUint16(start + 0x1c, pageLen - HEAP, true);

    v.setUint32(table.at + 12, reserved, true);
    v.setUint32(table.at + 4, nextUnused, true);
    table.last = reserved;
    table.empty = nextUnused;

    this.changed.add(reserved);
    this.allocated.push({ table: table.type, page: reserved });
    const state = readPage(v, pageLen, reserved, table.type);
    if (!state) throw unsupported();
    return state;
  }
}

/** Puts rows into the table: free space first (last page first), then a new page. */
function place(
  work: Work,
  table: TableRef,
  chain: PageState[],
  rows: Uint8Array[],
) {
  for (const row of rows) {
    let target = chain.find((page) => fits(page, row.length));
    if (!target) {
      target = work.allocate(table);
      chain.unshift(target);
      if (!fits(target, row.length)) throw noRoom();
    }
    work.insert(target, row);
  }
}

export function addPlaylistToPdb(source: ArrayBuffer, input: AddPlaylistInput): AddPlaylistResult {
  const work = new Work(source);
  const { pageLen } = work;
  const { tables } = readHeader(work.view);

  const tree = tables.get(TREE);
  const entries = tables.get(ENTRIES);
  if (!tree || !entries) throw unsupported();

  const library = parseRekordboxPdb(source.slice(0));
  const known = new Set(library.tracks.map((track) => track.id));
  const trackIds = input.trackIds;
  if (!trackIds.length || trackIds.some((id) => !known.has(id))) {
    throw new PdbWriteError(
      "exports.pdbWrite.unknownTracks",
      undefined,
      "Ein Titel des Sets liegt nicht in dieser Stick-Datenbank.",
    );
  }

  const treeChain = tableChain(work.view, pageLen, tree);
  const entryChain = tableChain(work.view, pageLen, entries);
  if (!treeChain.length || !entryChain.length) throw unsupported();
  if (treeChain[treeChain.length - 1] !== tree.last || entryChain[entryChain.length - 1] !== entries.last) {
    throw unsupported();
  }

  const treeRows = readTreeRows(work.view, pageLen, treeChain);
  const rootNames = new Set(
    treeRows.filter((row) => row.parentId === 0).map((row) => row.name.toLowerCase()),
  );
  const name = uniqueName(cleanPlaylistName(input.name), rootNames);
  const playlistId = treeRows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  const sort =
    treeRows.filter((row) => row.parentId === 0).reduce((max, row) => Math.max(max, row.sort), 0) +
    1;

  const nameBytes = deviceString(name);
  const treeBytes = new Uint8Array(20 + nameBytes.length);
  const treeView = new DataView(treeBytes.buffer);
  treeView.setUint32(8, sort, true);
  treeView.setUint32(12, playlistId, true);
  treeBytes.set(nameBytes, 20);

  const entryRows = trackIds.map((trackId, index) => {
    const row = new Uint8Array(12);
    const rowView = new DataView(row.buffer);
    rowView.setUint32(0, index + 1, true);
    rowView.setUint32(4, trackId, true);
    rowView.setUint32(8, playlistId, true);
    return row;
  });

  // Last page first. Pages that do not pass the header check are never written to.
  const states = (chain: number[], type: number) =>
    chain
      .map((index) => readPage(work.view, pageLen, index, type))
      .filter((page): page is PageState => page !== null)
      .reverse();

  place(work, tree, states(treeChain, TREE), [padded(treeBytes)]);
  place(work, entries, states(entryChain, ENTRIES), entryRows);
  work.view.setUint32(0x14, work.sequence, true);

  const changedPages = [...work.changed].sort((a, b) => a - b);
  const result: AddPlaylistResult = {
    buffer: work.bytes.buffer as ArrayBuffer,
    playlistId,
    name,
    changedPages,
    allocated: work.allocated,
  };
  verifyPdbUpdate(source, result.buffer, {
    playlistId,
    name,
    trackIds,
    changedPages,
    allocated: work.allocated,
  });
  return result;
}

export type ExpectedUpdate = {
  playlistId: number;
  name: string;
  trackIds: number[];
  changedPages: number[];
  allocated: Allocation[];
};

function failed(detail: string): PdbWriteError {
  return new PdbWriteError(
    "exports.pdbWrite.verifyFailed",
    { detail },
    `Die Prüfung der neuen Stick-Datenbank ist fehlgeschlagen (${detail}).`,
  );
}

/**
 * Throws unless `after` is exactly `before` plus the one new playlist.
 * Pure, so the same check runs on the bytes read back from the stick.
 */
export function verifyPdbUpdate(
  before: ArrayBuffer,
  after: ArrayBuffer,
  expected: ExpectedUpdate,
): void {
  const a = new Uint8Array(before);
  const b = new Uint8Array(after);
  const viewBefore = new DataView(before);
  const viewAfter = new DataView(after);
  const { pageLen, tables } = readHeader(viewBefore);
  const afterHeader = readHeader(viewAfter);
  if (afterHeader.pageLen !== pageLen) throw failed("page size");
  const pagesBefore = a.length / pageLen;
  const pagesAfter = b.length / pageLen;
  if (pagesAfter < pagesBefore) throw failed("size");
  const grown = pagesAfter - pagesBefore;
  if (grown > expected.allocated.length) throw failed("size");

  // Header page: only the sequence, the "next unused page" counter and the table entries
  // of tables that got a page may differ.
  const allowed = new Set<number>();
  for (let i = 0x14; i < 0x18; i++) allowed.add(i);
  if (expected.allocated.length) for (let i = 0x0c; i < 0x10; i++) allowed.add(i);
  for (const { table } of expected.allocated) {
    const entry = tables.get(table);
    if (!entry) throw failed("table");
    for (let i = 4; i < 8; i++) allowed.add(entry.at + i);
    for (let i = 12; i < 16; i++) allowed.add(entry.at + i);
  }
  for (let i = 0; i < pageLen; i++) {
    if (a[i] !== b[i] && !allowed.has(i)) throw failed("header");
  }
  if (viewAfter.getUint32(0x14, true) <= viewBefore.getUint32(0x14, true)) throw failed("sequence");

  const changedSet = new Set(expected.changedPages);
  for (let page = 1; page < pagesBefore; page++) {
    const from = page * pageLen;
    if (changedSet.has(page)) {
      verifyChangedPage(a, b, pageLen, page);
      continue;
    }
    for (let i = 0; i < pageLen; i++) {
      if (a[from + i] !== b[from + i]) throw failed(`page ${page}`);
    }
  }
  // Pages beyond the old end are new; each one must have been announced.
  for (let page = pagesBefore; page < pagesAfter; page++) {
    if (!expected.allocated.some((item) => item.page === page)) throw failed(`new page ${page}`);
  }
  for (const item of expected.allocated) {
    if (item.page >= pagesBefore) continue;
    // A page that was blank inside the file.
    const from = item.page * pageLen;
    for (let i = 0; i < pageLen; i++) if (a[from + i] !== 0) throw failed(`reserved page ${item.page}`);
  }

  const libBefore = parseRekordboxPdb(before.slice(0));
  const libAfter = parseRekordboxPdb(after.slice(0));
  sameLibrary(libBefore, libAfter);

  const added = libAfter.playlists.filter(
    (playlist) =>
      !libBefore.playlists.some((old) => old.kind === playlist.kind && old.id === playlist.id),
  );
  if (added.length !== 1) throw failed("playlist count");
  const [playlist] = added;
  if (
    playlist.id !== expected.playlistId ||
    playlist.kind !== "playlist" ||
    playlist.name !== expected.name ||
    playlist.trackIds.length !== expected.trackIds.length ||
    playlist.trackIds.some((id, i) => id !== expected.trackIds[i])
  ) {
    throw failed("new playlist");
  }
}

function verifyChangedPage(a: Uint8Array, b: Uint8Array, pageLen: number, page: number) {
  const start = page * pageLen;
  const viewA = new DataView(a.buffer, a.byteOffset, a.byteLength);
  const viewB = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const blank = a.subarray(start, start + pageLen).every((byte) => byte === 0);
  if (blank) return; // a reserved page that was taken: checked by the re-read below

  // Identity: page index, type, next page and the flags byte never change.
  for (let i = 0; i < 0x10; i++) {
    if (a[start + i] !== b[start + i]) throw failed(`page ${page} header`);
  }
  if (a[start + 27] !== b[start + 27]) throw failed(`page ${page} flags`);
  const slotsOf = (view: DataView) =>
    (view.getUint8(start + 24) | (view.getUint8(start + 25) << 8) | (view.getUint8(start + 26) << 16)) &
    0x1fff;
  const slotsBefore = slotsOf(viewA);
  const slotsAfter = slotsOf(viewB);
  if (slotsAfter <= slotsBefore) throw failed(`page ${page} rows`);
  const usedBefore = viewA.getUint16(start + 0x1e, true);

  // Old heap bytes stay exactly as they were.
  for (let i = HEAP; i < HEAP + usedBefore; i++) {
    if (a[start + i] !== b[start + i]) throw failed(`page ${page} heap`);
  }
  // Old rows keep their offset and stay present.
  for (let slot = 0; slot < slotsBefore; slot++) {
    const at = slotAddress(pageLen, start, slot);
    if (viewA.getUint16(at, true) !== viewB.getUint16(at, true)) throw failed(`page ${page} index`);
  }
  for (let group = 0; group < groupsFor(slotsBefore); group++) {
    const at = presentAddress(pageLen, start, group);
    const oldBits = viewA.getUint16(at, true);
    if ((viewB.getUint16(at, true) & oldBits) !== oldBits) throw failed(`page ${page} present`);
  }
  // The header must still describe the page exactly.
  const type = viewB.getUint32(start + 8, true);
  if (!readPage(viewB, pageLen, page, type)) throw failed(`page ${page} consistency`);
}

function sameLibrary(before: PdbLibrary, after: PdbLibrary) {
  if (JSON.stringify(before.tracks) !== JSON.stringify(after.tracks)) throw failed("tracks");
  for (const old of before.playlists) {
    const now = after.playlists.find((item) => item.kind === old.kind && item.id === old.id);
    if (!now || JSON.stringify(now) !== JSON.stringify(old)) throw failed("playlists");
  }
}
