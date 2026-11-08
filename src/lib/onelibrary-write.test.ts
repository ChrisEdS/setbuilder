import assert from "node:assert/strict";
import test from "node:test";
import {
  applyOneLibraryPlaylists,
  decryptOneLibrary,
  encryptOneLibrary,
  updateOneLibrary,
} from "./onelibrary-write.ts";

const PAGE = 4096;

function logicalFixture(): Uint8Array {
  const pages = new Uint8Array(PAGE * 2);
  const header = new Uint8Array([
    0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
  ]);
  pages.set(header, 0);
  const view = new DataView(pages.buffer);
  view.setUint16(16, PAGE);
  pages[20] = 80;
  for (let i = 100; i < PAGE - 80; i++) pages[i] = (i * 17) & 0xff;
  for (let i = PAGE; i < PAGE * 2 - 80; i++) pages[i] = (i * 13) & 0xff;
  pages[PAGE] = 1;
  return pages;
}

test("sqlcipher pages round-trip and a changed byte does not open", async () => {
  const logical = logicalFixture();
  const salt = logical.slice(0, 16);
  const sealed = await encryptOneLibrary(logical, salt);
  assert.ok(sealed);
  assert.equal(sealed.length, logical.length);
  assert.deepEqual(sealed.slice(0, 16), salt);
  const opened = await decryptOneLibrary(sealed);
  assert.ok(opened);
  assert.deepEqual(opened, logical);

  const tampered = sealed.slice();
  tampered[100] ^= 0xff;
  assert.equal(await decryptOneLibrary(tampered), null);

  const sealedCopy = sealed.slice();
  const plan = await updateOneLibrary(sealed, [{ name: "SETBUILDER - Friday", paths: ["/Night Drive.mp3"] }]);
  assert.deepEqual(plan, { status: "untouched" });
  assert.deepEqual(sealed, sealedCopy);
  assert.deepEqual(logical, logicalFixture());
});

test("a file that is not the player library is left untouched", async () => {
  const junk = new Uint8Array([9, 8, 7, 6]);
  const copy = junk.slice();
  const plan = await updateOneLibrary(junk, [{ name: "SETBUILDER - Friday", paths: ["/Night Drive.mp3"] }]);
  assert.deepEqual(plan, { status: "untouched" });
  assert.deepEqual(junk, copy);
});

async function sampleLibrary(): Promise<Uint8Array> {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({
    locateFile: (file: string) => `${process.cwd()}/node_modules/sql.js/dist/${file}`,
  });
  const db = new SQL.Database();
  db.run("PRAGMA page_size = 4096");
  db.run(`CREATE TABLE djmdContent (
    ID TEXT PRIMARY KEY,
    FolderPath TEXT,
    FileNameL TEXT,
    Title TEXT
  )`);
  db.run(`CREATE TABLE djmdPlaylist (
    ID TEXT PRIMARY KEY,
    Seq INTEGER,
    Name TEXT,
    Attribute INTEGER,
    ParentID TEXT,
    usn INTEGER,
    rb_local_usn INTEGER,
    created_at TEXT,
    updated_at TEXT
  )`);
  db.run(`CREATE TABLE djmdSongPlaylist (
    ID TEXT PRIMARY KEY,
    PlaylistID TEXT,
    ContentID TEXT,
    TrackNo INTEGER,
    usn INTEGER,
    created_at TEXT,
    updated_at TEXT
  )`);
  db.run(
    "INSERT INTO djmdContent (ID, FolderPath, FileNameL, Title) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)",
    [
      "10",
      "/PIONEER/Night Drive.mp3",
      "Night Drive.mp3",
      "Night Drive",
      "11",
      "/other/Morning Light.mp3",
      "Morning Light.mp3",
      "Morning Light",
      "12",
      "/skip/Nope.mp3",
      "Nope.mp3",
      "Nope",
    ],
  );
  db.run(
    "INSERT INTO djmdPlaylist (ID, Seq, Name, Attribute, ParentID, usn, rb_local_usn, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["1", 1, "Existing", 0, "root", 5, 5, "2020-01-01 00:00:00", "2020-01-01 00:00:00"],
  );
  const bytes = db.export();
  db.close();
  return bytes;
}

test("a playlist lands on the matching paths and leaves the other rows alone", async () => {
  const source = await sampleLibrary();
  const before = source.slice();
  const now = new Date(2026, 9, 14, 3, 0, 0);
  const missed = await applyOneLibraryPlaylists(
    source,
    [{ name: "SETBUILDER - Friday", paths: ["/not-here.mp3"] }],
    now,
  );
  assert.deepEqual(missed, { status: "untouched" });
  assert.deepEqual(source, before);

  const written = await applyOneLibraryPlaylists(
    source,
    [{ name: "SETBUILDER - Friday", paths: ["/Night Drive.mp3", "/missing.mp3", "/Morning Light.mp3"] }],
    now,
  );
  assert.equal(written.status, "written");
  if (written.status !== "written") return;
  assert.equal(written.trackCount, 2);

  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({
    locateFile: (file: string) => `${process.cwd()}/node_modules/sql.js/dist/${file}`,
  });
  const db = new SQL.Database(written.bytes);
  const playlist = db.exec("SELECT ID, Name, ParentID FROM djmdPlaylist ORDER BY ID");
  assert.deepEqual(playlist[0]?.values, [
    ["1", "Existing", "root"],
    ["2", "SETBUILDER - Friday", "root"],
  ]);
  const songs = db.exec(
    "SELECT ContentID, TrackNo FROM djmdSongPlaylist WHERE PlaylistID = '2' ORDER BY TrackNo",
  );
  assert.deepEqual(songs[0]?.values, [
    ["10", 1],
    ["11", 2],
  ]);
  const content = db.exec("SELECT ID FROM djmdContent ORDER BY ID");
  assert.deepEqual(content[0]?.values, [["10"], ["11"], ["12"]]);
  db.close();

  const replaced = await applyOneLibraryPlaylists(
    written.bytes,
    [{ name: "SETBUILDER - Friday", paths: ["/Morning Light.mp3"] }],
    now,
  );
  assert.equal(replaced.status, "written");
  if (replaced.status !== "written") return;
  assert.equal(replaced.trackCount, 1);
  const again = new SQL.Database(replaced.bytes);
  const names = again.exec("SELECT Name FROM djmdPlaylist ORDER BY ID");
  assert.deepEqual(names[0]?.values, [["Existing"], ["SETBUILDER - Friday"]]);
  const order = again.exec("SELECT ContentID FROM djmdSongPlaylist WHERE PlaylistID = '2' ORDER BY TrackNo");
  assert.deepEqual(order[0]?.values, [["11"]]);
  again.close();
});

async function deviceLibrary(): Promise<Uint8Array> {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({
    locateFile: (file: string) => `${process.cwd()}/node_modules/sql.js/dist/${file}`,
  });
  const db = new SQL.Database();
  db.run(`CREATE TABLE content (
    content_id INTEGER PRIMARY KEY,
    path TEXT
  )`);
  db.run(`CREATE TABLE playlist (
    playlist_id INTEGER PRIMARY KEY,
    sequenceNo INTEGER,
    name TEXT,
    image_id INTEGER,
    attribute INTEGER,
    playlist_id_parent INTEGER
  )`);
  db.run(`CREATE TABLE playlist_content (
    playlist_id INTEGER,
    content_id INTEGER,
    sequenceNo INTEGER
  )`);
  db.run("INSERT INTO content (content_id, path) VALUES (10, '/Contents/Night Drive.mp3'), (11, '/Contents/Morning Light.mp3'), (12, '/Contents/Nope.mp3')");
  db.run(
    "INSERT INTO playlist (playlist_id, sequenceNo, name, image_id, attribute, playlist_id_parent) VALUES (1, 1, 'Existing', NULL, 0, NULL)",
  );
  db.run("INSERT INTO playlist_content (playlist_id, content_id, sequenceNo) VALUES (1, 12, 1)");
  const bytes = db.export();
  db.close();
  return bytes;
}

test("a device-library playlist is joined by path and other rows stay", async () => {
  const source = await deviceLibrary();
  const before = source.slice();
  const missed = await applyOneLibraryPlaylists(source, [
    { name: "SETBUILDER - Friday", paths: ["/not-here.mp3"] },
  ]);
  assert.deepEqual(missed, { status: "untouched" });
  assert.deepEqual(source, before);

  const written = await applyOneLibraryPlaylists(source, [
    { name: "SETBUILDER - Friday", paths: ["/Night Drive.mp3", "/missing.mp3", "/Morning Light.mp3"] },
  ]);
  assert.equal(written.status, "written");
  if (written.status !== "written") return;
  assert.equal(written.trackCount, 2);

  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({
    locateFile: (file: string) => `${process.cwd()}/node_modules/sql.js/dist/${file}`,
  });
  const db = new SQL.Database(written.bytes);
  const lists = db.exec("SELECT playlist_id, name, attribute FROM playlist ORDER BY playlist_id");
  assert.deepEqual(lists[0]?.values, [
    [1, "Existing", 0],
    [2, "SETBUILDER - Friday", 0],
  ]);
  const songs = db.exec(
    "SELECT content_id, sequenceNo FROM playlist_content WHERE playlist_id = 2 ORDER BY sequenceNo",
  );
  assert.deepEqual(songs[0]?.values, [
    [10, 1],
    [11, 2],
  ]);
  const kept = db.exec("SELECT content_id FROM playlist_content WHERE playlist_id = 1");
  assert.deepEqual(kept[0]?.values, [[12]]);
  const tracks = db.exec("SELECT content_id FROM content ORDER BY content_id");
  assert.deepEqual(tracks[0]?.values, [[10], [11], [12]]);
  db.close();

  const replaced = await applyOneLibraryPlaylists(written.bytes, [
    { name: "SETBUILDER - Friday", paths: ["/Morning Light.mp3"] },
  ]);
  assert.equal(replaced.status, "written");
  if (replaced.status !== "written") return;
  assert.equal(replaced.trackCount, 1);
  const again = new SQL.Database(replaced.bytes);
  const names = again.exec("SELECT name FROM playlist ORDER BY playlist_id");
  assert.deepEqual(names[0]?.values, [["Existing"], ["SETBUILDER - Friday"]]);
  const order = again.exec(
    "SELECT content_id FROM playlist_content WHERE playlist_id = 2 ORDER BY sequenceNo",
  );
  assert.deepEqual(order[0]?.values, [[11]]);
  const still = again.exec("SELECT content_id FROM playlist_content WHERE playlist_id = 1");
  assert.deepEqual(still[0]?.values, [[12]]);
  again.close();
});

async function reservedDeviceLibrary(): Promise<Uint8Array> {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({
    locateFile: (file: string) => `${process.cwd()}/node_modules/sql.js/dist/${file}`,
  });
  const created = new SQL.Database();
  created.run("PRAGMA page_size = 4096");
  created.run("VACUUM");
  const empty = created.export();
  created.close();
  empty[20] = 80;
  new DataView(empty.buffer, empty.byteOffset, empty.byteLength).setUint16(105, 4096 - 80);
  const db = new SQL.Database(empty);
  db.run("CREATE TABLE content (content_id INTEGER PRIMARY KEY, path TEXT)");
  db.run(`CREATE TABLE playlist (
    playlist_id INTEGER PRIMARY KEY,
    sequenceNo INTEGER,
    name TEXT,
    image_id INTEGER,
    attribute INTEGER,
    playlist_id_parent INTEGER
  )`);
  db.run("CREATE TABLE playlist_content (playlist_id INTEGER, content_id INTEGER, sequenceNo INTEGER)");
  db.run("INSERT INTO content (content_id, path) VALUES (10, '/Contents/Night Drive.mp3')");
  db.run(
    "INSERT INTO playlist (playlist_id, sequenceNo, name, image_id, attribute, playlist_id_parent) VALUES (1, 1, 'Existing', NULL, 0, NULL)",
  );
  const bytes = db.export();
  db.close();
  return bytes;
}

test("a reserved player library keeps its page reserve and the playlist survives encryption", async () => {
  const logical = await reservedDeviceLibrary();
  const before = logical.slice();
  assert.equal(logical[20], 80);
  const salt = logical.slice(0, 16);
  const sealed = await encryptOneLibrary(logical, salt);
  assert.ok(sealed);
  const sealedCopy = sealed.slice();
  const plan = await updateOneLibrary(sealed, [
    { name: "SETBUILDER - Friday", paths: ["/Night Drive.mp3"] },
  ]);
  assert.equal(plan.status, "written");
  if (plan.status !== "written") return;
  assert.equal(plan.trackCount, 1);
  assert.notDeepEqual(plan.bytes, sealedCopy);
  const opened = await decryptOneLibrary(plan.bytes);
  assert.ok(opened);
  assert.equal(opened[20], 80);
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs({
    locateFile: (file: string) => `${process.cwd()}/node_modules/sql.js/dist/${file}`,
  });
  const db = new SQL.Database(opened);
  const names = db.exec("SELECT name FROM playlist ORDER BY playlist_id");
  assert.deepEqual(names[0]?.values, [["Existing"], ["SETBUILDER - Friday"]]);
  const songs = db.exec("SELECT content_id, sequenceNo FROM playlist_content ORDER BY sequenceNo");
  assert.deepEqual(songs[0]?.values, [[10, 1]]);
  db.close();
  assert.deepEqual(logical, before);
});
