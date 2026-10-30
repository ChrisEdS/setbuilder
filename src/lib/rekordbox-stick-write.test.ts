import assert from "node:assert/strict";
import test from "node:test";
import { parseRekordboxPdb } from "./rekordbox-pdb.ts";
import { DEFAULT_SET } from "./set.ts";
import {
  BACKUP_DIR,
  BACKUP_KEEP,
  SIDECAR_DIR,
  findStickDatabase,
  latestBackupName,
  matchSetToStick,
  planStickWrite,
  prepareStickForPlayers,
  pruneBackups,
  restoreLatestBackup,
  restorePlayerLibrary,
  rewriteSetToStick,
  writeSetToStick,
  writeStickSidecars,
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
        const chunk = new Uint8Array(data instanceof Uint8Array ? data : new Uint8Array(data)).slice();
        // Browser writable streams append; keep that so chunked copies work in tests.
        if (!pending) {
          pending = chunk;
          return;
        }
        const merged = new Uint8Array(pending.length + chunk.length);
        merged.set(pending, 0);
        merged.set(chunk, pending.length);
        pending = merged;
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
  async removeEntry(name: string) {
    this.files.delete(name);
    this.dirs.delete(name);
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
  assert.equal(plan.playlistName, "SETBUILDER - Friday");
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
  const added = after.playlists.find((item) => item.name === "SETBUILDER - Friday");
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

test("writes alternatives as a second playlist next to the set", async () => {
  const { root, db } = stick();
  const mixed = [
    { name: "Night Drive", artists: ["Ada"], filePath: "/Night Drive.mp3", role: "groove" as const },
    { name: "Morning Light", artists: ["Ada"], filePath: "", role: "safety" as const },
  ];
  const plan = await planStickWrite(root, mixed, "Friday");
  assert.equal(plan.performanceCount, 1);
  assert.equal(plan.alternativesCount, 1);
  assert.equal(plan.match.trackIds.length, 2);
  assert.equal(plan.alternativesName, "SETBUILDER - Friday Alternativen");
  assert.equal(plan.alreadyOnStick, false);

  const done = await writeSetToStick(root, mixed, "Friday", new Date(2026, 9, 14, 2, 0, 0));
  assert.equal(done.playlistName, "SETBUILDER - Friday");
  assert.equal(done.alternativesName, "SETBUILDER - Friday Alternativen");
  const after = parseRekordboxPdb(db.data.slice().buffer as ArrayBuffer);
  assert.deepEqual(after.playlists.find((item) => item.name === "SETBUILDER - Friday")?.trackIds, [7]);
  assert.deepEqual(
    after.playlists.find((item) => item.name === "SETBUILDER - Friday Alternativen")?.trackIds,
    [8],
  );
});

test("a second write does not duplicate the set, it only adds missing alternatives", async () => {
  const { root, db } = stick();
  await writeSetToStick(root, tracks, "Friday", new Date(2026, 9, 14, 2, 10, 0));
  const namesAfterFirst = parseRekordboxPdb(db.data.slice().buffer as ArrayBuffer).playlists.map(
    (item) => item.name,
  );
  assert.equal(namesAfterFirst.filter((name) => name.startsWith("SETBUILDER - Friday")).length, 1);

  const mixed = [
    { name: "Night Drive", artists: ["Ada"], filePath: "/Night Drive.mp3", role: "groove" as const },
    { name: "Morning Light", artists: ["Ada"], filePath: "", role: "safety" as const },
  ];
  const plan = await planStickWrite(root, mixed, "Friday");
  assert.equal(plan.skippedPerformance, true);
  assert.equal(plan.alreadyOnStick, false);
  assert.equal(plan.alternativesName, "SETBUILDER - Friday Alternativen");

  const done = await writeSetToStick(root, mixed, "Friday", new Date(2026, 9, 14, 2, 11, 0));
  assert.equal(done.playlistName, "SETBUILDER - Friday");
  assert.equal(done.alternativesName, "SETBUILDER - Friday Alternativen");
  const names = parseRekordboxPdb(db.data.slice().buffer as ArrayBuffer).playlists.map((item) => item.name);
  assert.equal(names.filter((name) => name === "SETBUILDER - Friday").length, 1);
  assert.ok(names.includes("SETBUILDER - Friday Alternativen"));

  await assert.rejects(writeSetToStick(root, mixed, "Friday"), /liegt schon/);
});

test("an English alternatives label does not create a second playlist", async () => {
  const { root } = stick();
  const mixed = [
    { name: "Night Drive", artists: ["Ada"], filePath: "/Night Drive.mp3", role: "groove" as const },
    { name: "Morning Light", artists: ["Ada"], filePath: "", role: "safety" as const },
  ];
  await writeSetToStick(root, mixed, "Friday", new Date(2026, 9, 14, 3, 0, 0), "Alternativen");
  const plan = await planStickWrite(root, mixed, "Friday", "Alternatives");
  assert.equal(plan.alreadyOnStick, true);
  assert.equal(plan.alternativesName, "SETBUILDER - Friday Alternativen");
});

test("keeps only the newest backups", async () => {
  const { root } = stick();
  await writeSetToStick(root, tracks, "One", new Date(2026, 9, 14, 3, 1, 0));
  await writeSetToStick(root, tracks, "Two", new Date(2026, 9, 14, 3, 2, 0));
  await writeSetToStick(root, tracks, "Three", new Date(2026, 9, 14, 3, 3, 0));
  await writeSetToStick(root, tracks, "Four", new Date(2026, 9, 14, 3, 4, 0));
  const names: string[] = [];
  for await (const name of root.dirs.get(BACKUP_DIR)?.keys() ?? []) names.push(name);
  names.sort();
  assert.equal(names.length, BACKUP_KEEP);
  assert.ok(names.includes("export-20261014-030400.pdb"));
  assert.equal(names.includes("export-20261014-030100.pdb"), false);
  assert.deepEqual(await pruneBackups(root, 1), names.slice(0, -1));
});

test("updating a set changes its entries and preserves unrelated current database changes", async () => {
  const { root, db } = stick();
  await writeSetToStick(root, tracks, "Friday", new Date(2026, 9, 14, 3, 10, 0));
  await writeSetToStick(
    root,
    [{ name: "Morning Light", artists: ["Ada"], filePath: "" }],
    "Current",
    new Date(2026, 9, 14, 3, 10, 30),
  );
  const currentBytes = db.data.slice();
  const onlyDrive = [{ name: "Night Drive", artists: ["Ada"], filePath: "/Night Drive.mp3" }];
  const done = await rewriteSetToStick(root, onlyDrive, "Friday", new Date(2026, 9, 14, 3, 11, 0));
  assert.equal(done.playlistName, "SETBUILDER - Friday");
  const after = parseRekordboxPdb(db.data.slice().buffer as ArrayBuffer);
  assert.deepEqual(after.playlists.find((item) => item.name === "SETBUILDER - Friday")?.trackIds, [7]);
  assert.deepEqual(after.playlists.find((item) => item.name === "SETBUILDER - Current")?.trackIds, [8]);
  const backup = root.dirs.get(BACKUP_DIR)?.files.get(done.backupName);
  assert.deepEqual(backup?.data, currentBytes);
  assert.equal(after.playlists.filter((item) => item.name === "SETBUILDER - Friday").length, 1);
});

test("a failed targeted rewrite restores the immediate current bytes", async () => {
  const behaviour: Behaviour = {};
  const { root, db } = stick(behaviour);
  await writeSetToStick(root, tracks, "Friday", new Date(2026, 9, 14, 4, 0, 0));
  const before = db.data.slice();
  let commits = 0;
  behaviour.onCommit = (name, data) => {
    if (name !== "export.pdb") return data;
    commits += 1;
    if (commits > 1) return data;
    const broken = data.slice();
    broken[4 * 4096 + 0x30] ^= 0xff;
    return broken;
  };
  await assert.rejects(
    rewriteSetToStick(
      root,
      [{ name: "Night Drive", artists: ["Ada"], filePath: "/Night Drive.mp3" }],
      "Friday",
      new Date(2026, 9, 14, 4, 1, 0),
    ),
    /wiederhergestellt/,
  );
  assert.deepEqual(db.data, before);
  assert.equal(commits, 2);
});

test("writes XML and M3U next to the database", async () => {
  const { root } = stick();
  const draft = {
    ...DEFAULT_SET,
    title: "Friday",
    tracks: [
      {
        id: "a",
        name: "Night Drive",
        artists: ["Ada"],
        album: "",
        durationMs: 180_000,
        uri: "",
        externalUrl: "",
        imageUrl: null,
        phase: "lift" as const,
        role: "groove" as const,
        transition: "unset" as const,
        bpm: "128",
        keyCamelot: "8A",
        note: "",
        comment: "",
        safetyAlt: "",
        filePath: "/Night Drive.mp3",
      },
    ],
  };
  const files = await writeStickSidecars(root, draft);
  assert.ok(files.includes("SETBUILDER-rekordbox.xml"));
  const xml = root.dirs.get(SIDECAR_DIR)?.files.get("SETBUILDER-rekordbox.xml");
  assert.ok(xml && new TextDecoder().decode(xml.data).includes("Night Drive"));
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
  assert.ok(names.includes("SETBUILDER - One") && !names.includes("SETBUILDER - Two"));

  const empty = stick();
  await assert.rejects(restoreLatestBackup(empty.root), /Sicherung/);
});

test("prepareStickForPlayers moves exportLibrary.db aside and can put it back", async () => {
  const { root, rekordbox } = stick();
  const lib = new MemFile("exportLibrary.db", {});
  lib.data = new Uint8Array([9, 8, 7, 6]);
  rekordbox.files.set("exportLibrary.db", lib);
  const stages: string[] = [];
  const done = await prepareStickForPlayers(root, new Date(2026, 9, 14, 3, 0, 0), (progress) => {
    stages.push(progress.stage);
  });
  assert.equal(done.aside, true);
  assert.equal(done.backupName, "exportLibrary-aside-20261014-030000.db");
  assert.equal(rekordbox.files.has("exportLibrary.db"), false);
  const stored = root.dirs.get(BACKUP_DIR)?.files.get(done.backupName ?? "");
  assert.deepEqual(stored && [...stored.data], [9, 8, 7, 6]);
  assert.deepEqual(
    [...new Set(stages)],
    ["locate", "copy", "verify", "remove", "done"],
  );
  await restorePlayerLibrary(root);
  assert.deepEqual([...(rekordbox.files.get("exportLibrary.db")?.data ?? [])], [9, 8, 7, 6]);
});

test("prepareStickForPlayers does nothing when there is no OneLibrary", async () => {
  const { root } = stick();
  assert.deepEqual(await prepareStickForPlayers(root), { aside: false, backupName: null });
});
