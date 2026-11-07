import assert from "node:assert/strict";
import test from "node:test";
import { readAnlzBeatGrid, readAnlzHotCues, writeAnlzHotCues } from "./anlz-cues.ts";
import { BACKUP_DIR } from "./brand.ts";
import type { DirLike, FileLike } from "./rekordbox-stick-write.ts";
import {
  readStickBeatGrid,
  readStickHotCues,
  rekordboxTrackId,
  saveStickAnalyzedGrid,
  saveStickHotCues,
} from "./stick-cues.ts";

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

test("a later analysis file in the same folder is the grid when its path is this track", async () => {
  const other = "/Contents/Other/Artist/Other - Track.mp3";
  const path = "/Contents/Bless You/Gotta Move/Bless You - Gotta Move.mp3";
  const decoy = new MemoryFile("ANLZ0000.DAT", fileWith([pathTag(other), beatTag()]));
  const realTag = beatTag();
  new DataView(realTag.buffer).setUint32(28, 4242, false);
  const real = new MemoryFile("ANLZ0001.DAT", fileWith([pathTag(path), realTag]));
  const root = new MemoryDir("LE_BACKUP");
  const pioneer = new MemoryDir("PIONEER");
  const library = new MemoryDir("USBANLZ");
  const group = new MemoryDir("P009");
  const track = new MemoryDir("0001918A");
  track.files.set(decoy.name, decoy);
  track.files.set(real.name, real);
  group.dirs.set(track.name, track);
  library.dirs.set(group.name, group);
  pioneer.dirs.set(library.name, library);
  root.dirs.set(pioneer.name, pioneer);
  const beats = await readStickBeatGrid(root, 1676, path);
  assert.equal(beats?.[0]?.timeMs, 4242);
  const otherBeats = await readStickBeatGrid(root, 1676, other);
  assert.equal(otherBeats?.[0]?.timeMs, 1517);
});

test("USBANLZ directly under the chosen folder still matches the track path", async () => {
  const path = "/Contents/Bless You/Gotta Move/Bless You - Gotta Move.mp3";
  const dat = new MemoryFile("ANLZ0000.DAT", fileWith([pathTag(path), beatTag()]));
  const pioneer = new MemoryDir("PIONEER");
  const library = new MemoryDir("USBANLZ");
  const group = new MemoryDir("P009");
  const track = new MemoryDir("0000091A");
  track.files.set(dat.name, dat);
  group.dirs.set(track.name, track);
  library.dirs.set(group.name, group);
  pioneer.dirs.set(library.name, library);
  const beats = await readStickBeatGrid(pioneer, 99, path);
  assert.equal(beats?.[0]?.timeMs, 1517);
});

test("a grid past the first 4 KB is found even after an empty scan", async () => {
  const path = "/Contents/Toman/Verano En NY/Toman - Verano En NY_2.mp3";
  const count = 400;
  const beats = new Uint8Array(24 + count * 8);
  const beatView = new DataView(beats.buffer);
  beats.set(ascii("PQTZ"), 0);
  beatView.setUint32(4, 0x18, false);
  beatView.setUint32(8, beats.length, false);
  beatView.setUint32(20, count, false);
  for (let index = 0; index < count; index += 1) {
    const offset = 24 + index * 8;
    beatView.setUint16(offset, (index % 4) + 1, false);
    beatView.setUint32(offset + 4, 1000 + index * 500, false);
  }
  const pad = new Uint8Array(3600);
  const padView = new DataView(pad.buffer);
  pad.set(ascii("PVBR"), 0);
  padView.setUint32(4, 0x10, false);
  padView.setUint32(8, pad.length, false);
  const bytes = fileWith([pathTag(path), pad, beats]);
  assert.ok(bytes.length > 4096);
  const dat = new MemoryFile("ANLZ0000.DAT", bytes);
  const full = dat.getFile.bind(dat);
  dat.getFile = async () => {
    const blob = await full();
    const data = new Uint8Array(await blob.arrayBuffer());
    return {
      size: data.byteLength,
      arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      slice: (start = 0, end = data.byteLength) => {
        const view = data.subarray(start, end);
        const copy = view.slice();
        return {
          arrayBuffer: async () => copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength),
        };
      },
    };
  };
  const root = new MemoryDir("LE_BACKUP");
  const pioneer = new MemoryDir("PIONEER");
  const library = new MemoryDir("USBANLZ");
  const group = new MemoryDir("P005");
  const track = new MemoryDir("0002184B");
  track.files.set(dat.name, dat);
  group.dirs.set(track.name, track);
  library.dirs.set(group.name, group);
  pioneer.dirs.set(library.name, library);
  root.dirs.set(pioneer.name, pioneer);
  let scans = 0;
  const listed = library.keys.bind(library);
  library.keys = async function* () {
    scans += 1;
    if (scans === 1) return;
    yield* listed();
  };
  const read = await readStickBeatGrid(root, 91, path);
  assert.equal(scans, 2);
  assert.equal(read?.length, count);
  assert.equal(read?.[0]?.timeMs, 1000);
});

test("an analyzed grid replaces the existing one and a file without one stays untouched", async () => {
  const path = "/Contents/Bless You/Gotta Move/Bless You - Gotta Move.mp3";
  const dat = new MemoryFile("ANLZ0000.DAT", fileWith([pathTag(path), beatTag()]));
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
  const beats = [
    { timeMs: 10, beat: 1 },
    { timeMs: 510, beat: 2 },
    { timeMs: 1010, beat: 3 },
  ];
  assert.equal(await saveStickAnalyzedGrid(root, 1676, beats, path), "written");
  assert.deepEqual(await readStickBeatGrid(root, 1676, path), beats);
  assert.equal(root.dirs.get(BACKUP_DIR)?.files.has("ANLZ-0000091A.DAT"), true);

  const quiet = "/Contents/Bless You/Gotta Move/Bless You - Quiet.mp3";
  const bare = new MemoryFile("ANLZ0000.DAT", fileWith([pathTag(quiet)]));
  const quietRoot = new MemoryDir("LE_BACKUP");
  const quietPioneer = new MemoryDir("PIONEER");
  const quietLibrary = new MemoryDir("USBANLZ");
  const quietGroup = new MemoryDir("P009");
  const quietTrack = new MemoryDir("0000091B");
  quietTrack.files.set(bare.name, bare);
  quietGroup.dirs.set(quietTrack.name, quietTrack);
  quietLibrary.dirs.set(quietGroup.name, quietGroup);
  quietPioneer.dirs.set(quietLibrary.name, quietLibrary);
  quietRoot.dirs.set(quietPioneer.name, quietPioneer);
  const before = bare.data.byteLength;
  assert.equal(await saveStickAnalyzedGrid(quietRoot, 1677, beats, quiet), "missing");
  assert.equal(bare.data.byteLength, before);
});

test("rekordbox track ids come from the uri or the set-track id", () => {
  assert.equal(rekordboxTrackId({ id: "rekordbox:12:86123:4", uri: "rekordbox:86123" }), 86123);
  assert.equal(rekordboxTrackId({ id: "rekordbox:12:86123:4" }), 86123);
  assert.equal(rekordboxTrackId({ id: "spotify:1" }), null);
});
