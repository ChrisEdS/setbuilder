import assert from "node:assert/strict";
import test from "node:test";
import { readAnlzBeatGrid, readAnlzHotCues, writeAnlzHotCues } from "./anlz-cues.ts";
import { BACKUP_DIR } from "./brand.ts";
import { tDe, tEn } from "./i18n/core.ts";
import type { DirLike, FileLike } from "./rekordbox-stick-write.ts";
import {
  formatGridReadingNote,
  indexWalkPercent,
  preloadStickAnalysisIndex,
  readStickBeatGrid,
  readStickHotCues,
  rekordboxTrackId,
  saveStickAnalyzedGrid,
  saveStickHotCues,
  subscribeStickIndexProgress,
  type StickIndexWalk,
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

function readingText(lang: "de" | "en") {
  const translate = lang === "de" ? tDe : tEn;
  return {
    reading: translate("crates.player.gridReading"),
    first: translate("crates.player.gridReadingFirst"),
    withPercent: (percent: number) =>
      translate("crates.player.gridReadingFirstPercent", { percent }),
  };
}

test("the first beatgrid sentence names the wait and shows a real percent", () => {
  assert.equal(indexWalkPercent(0, 0), null);
  assert.equal(indexWalkPercent(0, 10), 0);
  assert.equal(indexWalkPercent(42, 100), 42);
  assert.equal(indexWalkPercent(1, 3), 33);
  assert.equal(indexWalkPercent(3, 3), 100);
  const german = readingText("de");
  const english = readingText("en");
  assert.equal(formatGridReadingNote(null, german), "Beatgrid wird gelesen.");
  assert.equal(
    formatGridReadingNote({ finished: 0, total: 0 }, german),
    "Beatgrid wird zum ersten Mal gelesen.",
  );
  assert.equal(
    formatGridReadingNote({ finished: 42, total: 100 }, german),
    "Beatgrid wird zum ersten Mal gelesen. 42 %",
  );
  assert.equal(formatGridReadingNote(null, english), "Reading the beatgrid.");
  assert.equal(
    formatGridReadingNote({ finished: 0, total: 0 }, english),
    "Reading the beatgrid for the first time.",
  );
  assert.equal(
    formatGridReadingNote({ finished: 42, total: 100 }, english),
    "Reading the beatgrid for the first time. 42%",
  );
});

test("the first index walk reports files finished over files to read, and the next read does not", async () => {
  const paths = [
    "/Contents/A/One.mp3",
    "/Contents/B/Two.mp3",
    "/Contents/C/Three.mp3",
  ];
  const root = new MemoryDir("LE_BACKUP");
  const pioneer = new MemoryDir("PIONEER");
  const library = new MemoryDir("USBANLZ");
  const group = new MemoryDir("P009");
  paths.forEach((path, index) => {
    const folder = `0000000${index}`;
    const track = new MemoryDir(folder);
    const dat = new MemoryFile("ANLZ0000.DAT", fileWith([pathTag(path), beatTag()]));
    track.files.set(dat.name, dat);
    group.dirs.set(track.name, track);
  });
  library.dirs.set(group.name, group);
  pioneer.dirs.set(library.name, library);
  root.dirs.set(pioneer.name, pioneer);
  const seen: Array<StickIndexWalk | null> = [];
  const stop = subscribeStickIndexProgress(root, (walk) => {
    seen.push(walk);
  });
  const beats = await readStickBeatGrid(root, 1, paths[0] ?? "");
  stop();
  assert.equal(beats?.[0]?.timeMs, 1517);
  assert.equal(seen[0]?.total, 0);
  const counted = seen.filter((walk): walk is StickIndexWalk => walk !== null && walk.total > 0);
  assert.equal(counted[0]?.finished, 0);
  assert.equal(counted[0]?.total, 3);
  const last = counted[counted.length - 1];
  assert.equal(last?.finished, 3);
  assert.equal(last?.total, 3);
  assert.equal(indexWalkPercent(last?.finished ?? 0, last?.total ?? 0), 100);
  assert.equal(seen[seen.length - 1], null);
  const later: Array<StickIndexWalk | null> = [];
  const stopLater = subscribeStickIndexProgress(root, (walk) => {
    later.push(walk);
  });
  const again = await readStickBeatGrid(root, 1, paths[1] ?? "");
  stopLater();
  assert.equal(again?.[0]?.timeMs, 1517);
  assert.deepEqual(later, []);
});

test("the file count is known before analysis folders are opened", async () => {
  const paths = ["/Contents/A/One.mp3", "/Contents/B/Two.mp3", "/Contents/C/Three.mp3"];
  const root = new MemoryDir("LE_BACKUP");
  const pioneer = new MemoryDir("PIONEER");
  const library = new MemoryDir("USBANLZ");
  const group = new MemoryDir("P009");
  paths.forEach((path, index) => {
    const track = new MemoryDir(`0000000${index}`);
    const dat = new MemoryFile("ANLZ0000.DAT", fileWith([pathTag(path), beatTag()]));
    track.files.set(dat.name, dat);
    group.dirs.set(track.name, track);
  });
  library.dirs.set(group.name, group);
  pioneer.dirs.set(library.name, library);
  root.dirs.set(pioneer.name, pioneer);
  const seen: Array<StickIndexWalk | null> = [];
  const openedAfterCount: boolean[] = [];
  const open = group.getDirectoryHandle.bind(group);
  group.getDirectoryHandle = async (name: string, options?: { create?: boolean }) => {
    openedAfterCount.push(seen.some((walk) => walk !== null && walk.total === paths.length));
    return open(name, options);
  };
  const stop = subscribeStickIndexProgress(root, (walk) => {
    seen.push(walk);
  });
  const beats = await readStickBeatGrid(root, 1, paths[0] ?? "");
  stop();
  assert.equal(beats?.[0]?.timeMs, 1517);
  assert.equal(openedAfterCount.length, paths.length);
  assert.equal(openedAfterCount.every(Boolean), true);
  const counted = seen.filter((walk): walk is StickIndexWalk => walk !== null && walk.total > 0);
  assert.equal(counted[0]?.finished, 0);
  assert.equal(counted[0]?.total, paths.length);
  assert.ok(counted.some((walk) => walk.finished > 0 && walk.finished < walk.total));
});

test("a background preload fills the index the player uses, and a second start does not walk", async () => {
  const paths = ["/Contents/A/One.mp3", "/Contents/B/Two.mp3", "/Contents/C/Three.mp3"];
  const root = new MemoryDir("LE_BACKUP");
  const pioneer = new MemoryDir("PIONEER");
  const library = new MemoryDir("USBANLZ");
  const group = new MemoryDir("P009");
  const files: MemoryFile[] = [];
  paths.forEach((path, index) => {
    const track = new MemoryDir(`0000000${index}`);
    const dat = new MemoryFile("ANLZ0000.DAT", fileWith([pathTag(path), beatTag()]));
    files.push(dat);
    track.files.set(dat.name, dat);
    group.dirs.set(track.name, track);
  });
  library.dirs.set(group.name, group);
  pioneer.dirs.set(library.name, library);
  root.dirs.set(pioneer.name, pioneer);

  let walks = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const list = library.keys.bind(library);
  library.keys = async function* () {
    walks += 1;
    await gate;
    yield* list();
  };

  const during: Array<StickIndexWalk | null> = [];
  const stopDuring = subscribeStickIndexProgress(root, (walk) => {
    during.push(walk);
  });
  const first = preloadStickAnalysisIndex(root);
  try {
    for (let attempt = 0; attempt < 20 && walks === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const second = preloadStickAnalysisIndex(root);
    assert.equal(walks, 1);
    release();
    await first;
    await second;
  } finally {
    release();
    stopDuring();
  }
  assert.equal(walks, 1);
  assert.equal(during[during.length - 1], null);
  assert.equal(files.every((file) => file.writes === 0), true);

  const later: Array<StickIndexWalk | null> = [];
  const stopLater = subscribeStickIndexProgress(root, (walk) => {
    later.push(walk);
  });
  const beats = await readStickBeatGrid(root, 1, paths[0] ?? "");
  stopLater();
  assert.equal(beats?.[0]?.timeMs, 1517);
  assert.equal(walks, 1);
  assert.deepEqual(later, []);

  await preloadStickAnalysisIndex(root);
  assert.equal(walks, 1);

  const other = new MemoryDir("OTHER");
  const otherPioneer = new MemoryDir("PIONEER");
  const otherLibrary = new MemoryDir("USBANLZ");
  const otherGroup = new MemoryDir("P009");
  const otherTrack = new MemoryDir("00000000");
  const otherDat = new MemoryFile(
    "ANLZ0000.DAT",
    fileWith([pathTag(paths[0] ?? ""), beatTag()]),
  );
  otherTrack.files.set(otherDat.name, otherDat);
  otherGroup.dirs.set(otherTrack.name, otherTrack);
  otherLibrary.dirs.set(otherGroup.name, otherGroup);
  otherPioneer.dirs.set(otherLibrary.name, otherLibrary);
  other.dirs.set(otherPioneer.name, otherPioneer);
  let otherWalks = 0;
  const otherList = otherLibrary.keys.bind(otherLibrary);
  otherLibrary.keys = async function* () {
    otherWalks += 1;
    yield* otherList();
  };
  await preloadStickAnalysisIndex(other);
  assert.equal(otherWalks, 1);
  assert.equal(walks, 1);
  assert.equal((await readStickBeatGrid(other, 1, paths[0] ?? ""))?.[0]?.timeMs, 1517);
  assert.equal(otherWalks, 1);
});
