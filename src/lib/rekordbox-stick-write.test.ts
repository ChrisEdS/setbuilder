import assert from "node:assert/strict";
import test from "node:test";
import { parseRekordboxPdb } from "./rekordbox-pdb.ts";
import {
  BACKUP_DIR,
  findStickDatabase,
  latestBackupName,
  matchSetToStick,
  planStickWrite,
  restoreLatestBackup,
  writeSetToStick,
  type DirLike,
  type FileLike,
} from "./rekordbox-stick-write.ts";
import { fixture } from "./testing/pdb-fixture.ts";

// ---- an in-memory file system that behaves like the File System Access API --------------------

type Behaviour = {
  /** Called with the data about to be committed to a file; may throw or change it. */
  onCommit?: (name: string, data: Uint8Array) => Uint8Array;
};

class MemFile implements FileLike {
  data = new Uint8Array(0);
  name: string;
  private behaviour: Behaviour;
  constructor(name: string, behaviour: Behaviour) {
    this.name = name;
    this.behaviour = behaviour;
  }
  async getFile() {
    const copy = this.data.slice();
    return { size: copy.length, arrayBuffer: async () => copy.buffer as ArrayBuffer };
  }
  async createWritable() {
    let pending: Uint8Array | null = null;
    return {
      write: async (data: ArrayBuffer | Uint8Array) => {
        pending = new Uint8Array(data instanceof Uint8Array ? data : new Uint8Array(data)).slice();
      },
      // Like the browser: the file only changes when close() succeeds.
      close: async () => {
        if (!pending) return;
        const next = this.behaviour.onCommit ? this.behaviour.onCommit(this.name, pending) : pending;
        this.data = next.slice();
      },
      abort: async () => {
        pending = null;
      },
    };
  }
}

class MemDir implements DirLike {
  dirs = new Map<string, MemDir>();
  files = new Map<string, MemFile>();
  name: string;
  private behaviour: Behaviour;
  constructor(name: string, behaviour: Behaviour = {}) {
    this.name = name;
    this.behaviour = behaviour;
  }
  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    let dir = this.dirs.get(name);
    if (!dir) {
      if (!options?.create) throw new Error("NotFoundError");
      dir = new MemDir(name, this.behaviour);
      this.dirs.set(name, dir);
    }
    return dir;
  }
  async getFileHandle(name: string, options?: { create?: boolean }) {
    let file = this.files.get(name);
    if (!file) {
      if (!options?.create) throw new Error("NotFoundError");
      file = new MemFile(name, this.behaviour);
      this.files.set(name, file);
    }
    return file;
  }
  async *keys() {
    for (const name of this.files.keys()) yield name;
  }
}

function stick(behaviour: Behaviour = {}, pdb: ArrayBuffer = fixture()) {
  const root = new MemDir("STICK", behaviour);
  const pioneer = new MemDir("PIONEER", behaviour);
  const rekordbox = new MemDir("rekordbox", behaviour);
  root.dirs.set("PIONEER", pioneer);
  pioneer.dirs.set("rekordbox", rekordbox);
  const db = new MemFile("export.pdb", behaviour);
  db.data = new Uint8Array(pdb.slice(0));
  rekordbox.files.set("export.pdb", db);
  return { root, db, rekordbox };
}

const tracks = [
  { name: "Night Drive", artists: ["Ada"], filePath: "/Night Drive.mp3" },
  { name: "Morning Light", artists: ["Ada"], filePath: "" },
];

test("finds the database below the stick, in the PIONEER folder or when it is picked directly", async () => {
  const { root, rekordbox } = stick();
  assert.equal((await findStickDatabase(root)).dir, rekordbox);
  assert.equal((await findStickDatabase(rekordbox)).dir, rekordbox);
  await assert.rejects(findStickDatabase(new MemDir("empty")), /export\.pdb/);
});

test("matches set tracks by file path first, then by unique title and artist", () => {
  const library = parseRekordboxPdb(fixture());
  const match = matchSetToStick(
    [
      { name: "whatever", artists: ["x"], filePath: "/Night Drive.mp3" },
      { name: "morning light", artists: ["ADA"], filePath: "/elsewhere/ml.mp3" },
      { name: "Not on the stick", artists: ["Ada"], filePath: "" },
    ],
    library,
  );
  assert.deepEqual(match.trackIds, [7, 8]);
  assert.equal(match.missing.length, 1);
  assert.equal(match.missing[0].name, "Not on the stick");
});

test("the preview writes nothing", async () => {
  const { root, db } = stick();
  const before = db.data.slice();
  const plan = await planStickWrite(root, tracks, "Friday");
  assert.equal(plan.refusal, null);
  assert.equal(plan.match.trackIds.length, 2);
  assert.equal(plan.playlistName, "SETFORM - Friday");
  assert.deepEqual(db.data, before);
  assert.equal(root.dirs.has(BACKUP_DIR), false);
});

test("writes the playlist, keeps a verified backup and leaves the rest alone", async () => {
  const { root, db } = stick();
  const original = db.data.slice();
  const done = await writeSetToStick(root, tracks, "Friday", new Date(2026, 9, 13, 18, 5, 9));

  assert.equal(done.backupName, "export-20261013-180509.pdb");
  assert.equal(done.trackCount, 2);
  const backup = root.dirs.get(BACKUP_DIR)?.files.get(done.backupName);
  assert.deepEqual(backup?.data, original);

  const after = parseRekordboxPdb(db.data.slice().buffer as ArrayBuffer);
  const before = parseRekordboxPdb(original.slice().buffer as ArrayBuffer);
  const added = after.playlists.find((item) => item.name === "SETFORM - Friday");
  assert.deepEqual(added?.trackIds, [7, 8]);
  assert.deepEqual(after.tracks, before.tracks);
  assert.equal(await latestBackupName(root), done.backupName);
});

test("refuses a set with no track on the stick and changes nothing", async () => {
  const { root, db } = stick();
  const before = db.data.slice();
  await assert.rejects(
    writeSetToStick(root, [{ name: "Nope", artists: ["Nobody"], filePath: "" }], "X"),
    /Keiner der Titel/,
  );
  assert.deepEqual(db.data, before);
  assert.equal(root.dirs.has(BACKUP_DIR), false);
});

test("a backup that does not match stops everything before the database is touched", async () => {
  const { root, db } = stick({
    onCommit: (name, data) => {
      if (!name.startsWith("export-")) return data;
      const broken = data.slice();
      broken[100] ^= 0xff;
      return broken;
    },
  });
  const before = db.data.slice();
  await assert.rejects(writeSetToStick(root, tracks, "X"), /Sicherung/);
  assert.deepEqual(db.data, before);
});

test("a write that fails leaves the original database in place", async () => {
  const { root, db } = stick({
    onCommit: (name, data) => {
      if (name === "export.pdb") throw new Error("disk full");
      return data;
    },
  });
  const before = db.data.slice();
  await assert.rejects(writeSetToStick(root, tracks, "X"), /disk full/);
  assert.deepEqual(db.data, before);
});

test("a database that fails the check after writing is rolled back", async () => {
  let commits = 0;
  const { root, db } = stick({
    onCommit: (name, data) => {
      if (name !== "export.pdb") return data;
      commits += 1;
      if (commits > 1) return data; // the rollback itself must work
      const broken = data.slice();
      // damage a byte inside the track page
      broken[4 * 4096 + 0x30] ^= 0xff;
      return broken;
    },
  });
  const before = db.data.slice();
  await assert.rejects(writeSetToStick(root, tracks, "X"), /wiederhergestellt/);
  assert.deepEqual(db.data, before);
  assert.equal(commits, 2);
});

test("restores the newest backup", async () => {
  const { root, db } = stick();
  const original = db.data.slice();
  await writeSetToStick(root, tracks, "One", new Date(2026, 9, 13, 10, 0, 0));
  await writeSetToStick(root, tracks, "Two", new Date(2026, 9, 13, 11, 0, 0));
  assert.notDeepEqual(db.data, original);
  const name = await restoreLatestBackup(root);
  assert.equal(name, "export-20261013-110000.pdb");
  const names = parseRekordboxPdb(db.data.slice().buffer as ArrayBuffer).playlists.map((item) => item.name);
  assert.ok(names.includes("SETFORM - One") && !names.includes("SETFORM - Two"));

  const empty = stick();
  await assert.rejects(restoreLatestBackup(empty.root), /Sicherung/);
});
