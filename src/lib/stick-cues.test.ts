import assert from "node:assert/strict";
import test from "node:test";
import { readAnlzBeatGrid, readAnlzHotCues, writeAnlzHotCues } from "./anlz-cues.ts";
import { BACKUP_DIR } from "./brand.ts";
import type { DirLike, FileLike } from "./rekordbox-stick-write.ts";
import { readStickBeatGrid, readStickHotCues, rekordboxTrackId, saveStickHotCues } from "./stick-cues.ts";

function ascii(value: string): Uint8Array {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}

function emptyHotCueFile(): Uint8Array {
  const tag = new Uint8Array(24);
  const view = new DataView(tag.buffer);
  tag.set(ascii("PCOB"), 0);
  view.setUint32(4, 0x18, false);
  view.setUint32(8, 24, false);
  view.setUint32(12, 1, false);
  view.setUint32(20, 0xffffffff, false);
  const out = new Uint8Array(28 + tag.length);
  const file = new DataView(out.buffer);
  out.set(ascii("PMAI"), 0);
  file.setUint32(4, 28, false);
  file.setUint32(8, out.length, false);
  out.set(tag, 28);
  return out;
}

class MemoryFile implements FileLike {
  writes = 0;
  corruptReadBack = false;
  corrupted = false;
  name: string;
  data: Uint8Array;

  constructor(name: string, data: Uint8Array) {
    this.name = name;
    this.data = data;
  }

  async getFile() {
    const copy = this.data.slice();
    if (this.corruptReadBack && this.writes >= 1 && !this.corrupted) {
      this.corrupted = true;
      copy[0] ^= 0xff;
    }
    return {
      size: copy.length,
      arrayBuffer: async () => copy.buffer as ArrayBuffer,
    };
  }

  async createWritable() {
    let pending: Uint8Array | null = null;
    return {
      write: async (data: ArrayBuffer | Uint8Array) => {
        pending = new Uint8Array(data).slice();
      },
      close: async () => {
        this.writes += 1;
        if (pending) this.data = pending;
      },
      abort: async () => undefined,
    };
  }
}

class MemoryDir implements DirLike {
  dirs = new Map<string, MemoryDir>();
  files = new Map<string, MemoryFile>();
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async *keys(): AsyncIterable<string> {
    for (const name of [...this.dirs.keys(), ...this.files.keys()]) yield name;
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    let dir = this.dirs.get(name);
    if (!dir && options?.create) {
      dir = new MemoryDir(name);
      this.dirs.set(name, dir);
    }
    if (!dir) throw new Error(`missing ${name}`);
    return dir;
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    let file = this.files.get(name);
    if (!file && options?.create) {
      file = new MemoryFile(name, new Uint8Array());
      this.files.set(name, file);
    }
    if (!file) throw new Error(`missing ${name}`);
    return file;
  }
}

function stickWith(dat: MemoryFile): MemoryDir {
  const root = new MemoryDir("LE_BACKUP");
  const pioneer = new MemoryDir("PIONEER");
  const library = new MemoryDir("USBANLZ");
  const group = new MemoryDir("P045");
  const track = new MemoryDir("0001506B");
  track.files.set(dat.name, dat);
  group.dirs.set(track.name, track);
  library.dirs.set(group.name, group);
  pioneer.dirs.set(library.name, library);
  root.dirs.set(pioneer.name, pioneer);
  return root;
}

test("cue times written to an existing analysis file are read back", async () => {
  const original = emptyHotCueFile();
  const dat = new MemoryFile("ANLZ0000.DAT", original.slice());
  const root = stickWith(dat);
  const status = await saveStickHotCues(root, 0x1506b, [{ slot: 2, timeMs: 42_000, name: "Break" }]);
  assert.equal(status, "written");
  assert.deepEqual(readAnlzHotCues(dat.data), [{ slot: 2, timeMs: 42_000, name: "" }]);
  const backup = root.dirs.get(BACKUP_DIR)?.files.get("ANLZ-0001506B.DAT");
  assert.ok(backup);
  assert.deepEqual([...backup.data], [...original]);
});

test("a bad read-back restores the analysis file", async () => {
  const original = emptyHotCueFile();
  const dat = new MemoryFile("ANLZ0000.DAT", original.slice());
  dat.corruptReadBack = true;
  const root = stickWith(dat);
  const status = await saveStickHotCues(root, 0x1506b, [{ slot: 0, timeMs: 1000, name: "A" }]);
  assert.equal(status, "rejected");
  assert.deepEqual([...dat.data], [...original]);
  assert.equal(writeAnlzHotCues(original, []).wrote, true);
});

function pathTag(path: string): Uint8Array {
  const encoded = new Uint8Array(path.length * 2);
  const encodedView = new DataView(encoded.buffer);
  for (let index = 0; index < path.length; index += 1) {
    encodedView.setUint16(index * 2, path.charCodeAt(index), false);
  }
  const tag = new Uint8Array(16 + encoded.length);
  const view = new DataView(tag.buffer);
  tag.set(ascii("PPTH"), 0);
  view.setUint32(4, 0x10, false);
  view.setUint32(8, tag.length, false);
  view.setUint32(12, encoded.length, false);
  tag.set(encoded, 16);
  return tag;
}

function beatTag(): Uint8Array {
  const tag = new Uint8Array(24 + 8);
  const view = new DataView(tag.buffer);
  tag.set(ascii("PQTZ"), 0);
  view.setUint32(4, 0x18, false);
  view.setUint32(8, tag.length, false);
  view.setUint32(20, 1, false);
  view.setUint16(24, 1, false);
  view.setUint16(26, 12_000, false);
  view.setUint32(28, 1517, false);
  return tag;
}

function fileWith(tags: Uint8Array[]): Uint8Array {
  const body = tags.reduce((sum, tag) => sum + tag.length, 0);
  const out = new Uint8Array(28 + body);
  const view = new DataView(out.buffer);
  out.set(ascii("PMAI"), 0);
  view.setUint32(4, 28, false);
  view.setUint32(8, out.length, false);
  let offset = 28;
  for (const tag of tags) {
    out.set(tag, offset);
    offset += tag.length;
  }
  return out;
}

test("a cue is written to the analysis file that contains the track path", async () => {
  const path = "/Contents/Bless You/Gotta Move/Bless You - Gotta Move.mp3";
  const hot = emptyHotCueFile().slice(28);
  const dat = new MemoryFile("ANLZ0000.DAT", fileWith([pathTag(path), beatTag(), hot]));
  const root = new MemoryDir("LE_BACKUP");
  const pioneer = new MemoryDir("PIONEER");
  const library = new MemoryDir("USBANLZ");
  const group = new MemoryDir("P009");
  const track = new MemoryDir("0000091A");
  track.files.set(dat.name, dat);
  group.dirs.set(track.name, track);
  library.dirs.set(group.name, group);
  pioneer.dirs.set(library.name, library);
  root.dirs.set(pioneer.name, pioneer);
  const wrongId = 1676;
  const beats = await readStickBeatGrid(root, wrongId, path);
  assert.equal(beats?.[0]?.timeMs, 1517);
  const status = await saveStickHotCues(root, wrongId, [{ slot: 0, timeMs: 1517, name: "A" }], path);
  assert.equal(status, "written");
  assert.deepEqual(await readStickHotCues(root, wrongId, path), [{ slot: 0, timeMs: 1517, name: "" }]);
  assert.equal(root.dirs.get(BACKUP_DIR)?.files.has("ANLZ-0000091A.DAT"), true);
  assert.equal(readAnlzBeatGrid(dat.data)?.[0]?.timeMs, 1517);
});

test("rekordbox track ids come from the uri or the set-track id", () => {
  assert.equal(rekordboxTrackId({ id: "rekordbox:12:86123:4", uri: "rekordbox:86123" }), 86123);
  assert.equal(rekordboxTrackId({ id: "rekordbox:12:86123:4" }), 86123);
  assert.equal(rekordboxTrackId({ id: "spotify:1" }), null);
});
