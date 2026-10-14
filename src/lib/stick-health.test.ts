import assert from "node:assert/strict";
import test from "node:test";
import {
  assessStick,
  inspectStick,
  primaryStickAction,
  secondaryStickActions,
  type StickActionCaps,
} from "./stick-health.ts";
import type { DirLike, FileLike } from "./rekordbox-stick-write.ts";
import { fixture } from "./testing/pdb-fixture.ts";

class MemoryFile implements FileLike {
  name: string;
  private data: Uint8Array;
  private lastModified?: number;
  constructor(name: string, data: Uint8Array, lastModified?: number) {
    this.name = name;
    this.data = data;
    this.lastModified = lastModified;
  }
  async getFile() {
    const copy = this.data.slice();
    return {
      size: copy.length,
      lastModified: this.lastModified,
      arrayBuffer: async () => copy.buffer as ArrayBuffer,
    };
  }
  async createWritable(): Promise<never> {
    throw new Error("read-only");
  }
}

class MemoryDir implements DirLike {
  name: string;
  private dirs: Map<string, MemoryDir>;
  private files: Map<string, MemoryFile>;
  constructor(
    name: string,
    dirs = new Map<string, MemoryDir>(),
    files = new Map<string, MemoryFile>(),
  ) {
    this.name = name;
    this.dirs = dirs;
    this.files = files;
  }
  putDir(name: string, dir: MemoryDir) {
    this.dirs.set(name, dir);
  }
  putFile(name: string, file: MemoryFile) {
    this.files.set(name, file);
  }
  async getDirectoryHandle(name: string) {
    const dir = this.dirs.get(name);
    if (!dir) throw new Error("NotFoundError");
    return dir;
  }
  async getFileHandle(name: string) {
    const file = this.files.get(name);
    if (!file) throw new Error("NotFoundError");
    return file;
  }
  async *keys() {
    yield* this.files.keys();
  }
  async removeEntry() {
    /* unused */
  }
}

test("a stick with only export.pdb is ready for players that read that file", () => {
  const health = assessStick({
    pioneer: "PIONEER",
    pdb: { buffer: fixture(), size: fixture().byteLength },
    libraryDb: null,
    exportExt: true,
    analysis: true,
    sidecar: false,
  });
  assert.equal(health.verdict, "ready");
  assert.ok(health.pdb.tracks >= 2);
  assert.ok(health.pdb.playlists >= 1);
  assert.equal(health.libraryDb.present, false);
});

test("exportLibrary.db without a known age still needs rekordbox", () => {
  const health = assessStick({
    pioneer: "PIONEER",
    pdb: { buffer: fixture(), size: fixture().byteLength },
    libraryDb: { size: 2_000_000 },
    exportExt: true,
    analysis: true,
    sidecar: true,
  });
  assert.equal(health.verdict, "needsRekordbox");
  assert.equal(health.libraryDb.present, true);
  assert.equal(health.libraryDb.synced, false);
});

test("a player library at least as new as export.pdb is ready", () => {
  const health = assessStick({
    pioneer: "PIONEER",
    pdb: { buffer: fixture(), size: fixture().byteLength, lastModified: 1 },
    libraryDb: { size: 2_000_000, lastModified: 9 },
    exportExt: true,
    analysis: true,
    sidecar: true,
  });
  assert.equal(health.verdict, "ready");
  assert.equal(health.libraryDb.synced, true);
});

test("a hidden-only PIONEER folder is a reason players miss the library", () => {
  const health = assessStick({
    pioneer: ".PIONEER",
    pdb: { buffer: fixture(), size: fixture().byteLength },
    libraryDb: null,
    exportExt: false,
    analysis: false,
    sidecar: false,
  });
  assert.equal(health.verdict, "hiddenFolder");
});

test("picking only export.pdb cannot say whether a player will find the library", () => {
  const health = assessStick({
    pioneer: "none",
    pdb: { buffer: fixture(), size: fixture().byteLength },
    libraryDb: null,
    exportExt: false,
    analysis: false,
    sidecar: false,
  });
  assert.equal(health.verdict, "incomplete");
});

test("a newer export.pdb than exportLibrary.db is the usual post-write miss", () => {
  const health = assessStick({
    pioneer: "PIONEER",
    pdb: { buffer: fixture(), size: fixture().byteLength, lastModified: 200 },
    libraryDb: { size: 1_000, lastModified: 50 },
    exportExt: false,
    analysis: false,
    sidecar: false,
  });
  assert.equal(health.verdict, "needsRekordbox");
  assert.equal(health.libraryDb.stale, true);
});

test("a missing or empty database is broken", () => {
  assert.equal(
    assessStick({
      pioneer: "none",
      pdb: null,
      libraryDb: null,
      exportExt: false,
      analysis: false,
      sidecar: false,
    }).verdict,
    "broken",
  );
  assert.equal(
    assessStick({
      pioneer: "PIONEER",
      pdb: { buffer: new ArrayBuffer(0), size: 0 },
      libraryDb: null,
      exportExt: false,
      analysis: false,
      sidecar: false,
    }).verdict,
    "broken",
  );
});

const ALL: StickActionCaps = { canPrepare: true, canEject: true, canOpenRekordbox: true };
const NONE: StickActionCaps = { canPrepare: false, canEject: false, canOpenRekordbox: false };

test("one primary action per verdict", () => {
  const at = (verdict: Parameters<typeof primaryStickAction>[0]["verdict"], libraryAside = false) => ({
    verdict,
    libraryAside,
  });
  assert.equal(primaryStickAction(at("ready"), ALL), "eject");
  assert.equal(primaryStickAction(at("ready", true), ALL), "eject");
  assert.equal(primaryStickAction(at("needsRekordbox"), ALL), "prepare");
  assert.equal(primaryStickAction(at("broken"), ALL), "openRekordbox");
  assert.equal(primaryStickAction(at("hiddenFolder"), ALL), "openRekordbox");
  assert.equal(primaryStickAction(at("hiddenFolder", true), ALL), "eject");
  assert.equal(primaryStickAction(at("empty"), ALL), null);
  assert.equal(primaryStickAction(at("incomplete"), ALL), null);
});

test("the primary action falls back when a capability is missing", () => {
  const files = { ...NONE, canOpenRekordbox: true };
  // Only export.pdb picked: we cannot move exportLibrary.db, rekordbox is the way.
  assert.equal(primaryStickAction({ verdict: "needsRekordbox", libraryAside: false }, files), "openRekordbox");
  assert.equal(primaryStickAction({ verdict: "needsRekordbox", libraryAside: false }, NONE), null);
  assert.equal(primaryStickAction({ verdict: "ready", libraryAside: false }, NONE), null);
  assert.equal(primaryStickAction({ verdict: "broken", libraryAside: false }, NONE), null);
  // No rekordbox installed: eject and try the player anyway.
  assert.equal(
    primaryStickAction({ verdict: "hiddenFolder", libraryAside: false }, { ...ALL, canOpenRekordbox: false }),
    "eject",
  );
  assert.equal(
    primaryStickAction({ verdict: "hiddenFolder", libraryAside: true }, { ...ALL, canEject: false }),
    "openRekordbox",
  );
});

test("secondary actions never repeat the primary and only restore when a backup exists", () => {
  const caps = { ...ALL, canRestore: true };
  assert.deepEqual(secondaryStickActions({ verdict: "ready", libraryAside: false }, caps), ["openRekordbox"]);
  assert.deepEqual(secondaryStickActions({ verdict: "ready", libraryAside: true }, caps), [
    "openRekordbox",
    "restore",
  ]);
  assert.deepEqual(secondaryStickActions({ verdict: "needsRekordbox", libraryAside: false }, caps), [
    "eject",
    "openRekordbox",
  ]);
  assert.deepEqual(secondaryStickActions({ verdict: "broken", libraryAside: false }, caps), ["eject"]);
  assert.deepEqual(
    secondaryStickActions({ verdict: "ready", libraryAside: true }, { ...caps, canRestore: false }),
    ["openRekordbox"],
  );
  assert.deepEqual(secondaryStickActions({ verdict: "empty", libraryAside: false }, { ...NONE, canRestore: false }), []);
});

test("inspectStick reads PIONEER/rekordbox and flags a player library", async () => {
  const rekordbox = new MemoryDir("rekordbox");
  rekordbox.putFile("export.pdb", new MemoryFile("export.pdb", new Uint8Array(fixture()), 200));
  rekordbox.putFile(
    "exportLibrary.db",
    new MemoryFile("exportLibrary.db", new Uint8Array(80), 50),
  );
  const pioneer = new MemoryDir("PIONEER");
  pioneer.putDir("rekordbox", rekordbox);
  pioneer.putDir("USBANLZ", new MemoryDir("USBANLZ"));
  const root = new MemoryDir("STICK");
  root.putDir("PIONEER", pioneer);
  root.putDir("SETFORM", new MemoryDir("SETFORM"));

  const health = await inspectStick(root);
  assert.equal(health.verdict, "needsRekordbox");
  assert.equal(health.pioneer, "PIONEER");
  assert.equal(health.libraryDb.stale, true);
  assert.equal(health.analysis, true);
  assert.equal(health.sidecar, true);
  assert.ok(health.pdb.playlists >= 1);
});
